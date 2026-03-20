-- 📊 Script de Monitoreo de Uso y Límites (Tier Gratuito)
-- Este script crea funciones para consultar el estado del servidor desde el Dashboard Admin.

-- 1. Función para obtener estadísticas de uso
CREATE OR REPLACE FUNCTION public.get_server_health()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog -- Seguridad: Limita el path de búsqueda
AS $$
DECLARE
    total_db_size_bytes BIGINT;
    public_schema_size_bytes BIGINT;
    profiles_count BIGINT;
    logs_count BIGINT;
    critical_logs_count BIGINT;
    response JSONB;
BEGIN
    -- 🛡️ Solo permitimos la ejecución a usuarios con rol administrativo
    -- (Asumiendo que la tabla profiles tiene una columna 'role')
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE auth_id = auth.uid() 
        AND role IN ('super_admin', 'admin_usuarios')
    ) THEN
        RAISE EXCEPTION 'Acceso denegado: Se requieren privilegios administrativos.';
    END IF;

    -- Tamaño total de la base de datos (incluye índices y metadatos)
    SELECT pg_database_size(current_database()) INTO total_db_size_bytes;

    -- Tamaño específico del esquema público (lo que más cuenta para el límite de 500MB)
    SELECT sum(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename)))
    INTO public_schema_size_bytes
    FROM pg_tables
    WHERE schemaname = 'public';

    -- Conteo de registros clave
    SELECT count(*) INTO profiles_count FROM public.profiles;
    SELECT count(*) INTO logs_count FROM public.system_logs;
    SELECT count(*) FROM public.system_logs WHERE level = 'critical' INTO critical_logs_count;

    -- Construcción del objeto de respuesta
    response := jsonb_build_object(
        'database', jsonb_build_object(
            'total_size_bytes', total_db_size_bytes,
            'total_size_human', pg_size_pretty(total_db_size_bytes),
            'public_size_bytes', public_schema_size_bytes,
            'public_size_human', pg_size_pretty(public_schema_size_bytes),
            'limit_bytes', 524288000, -- 500 MB en bytes
            'usage_percent', ROUND((public_schema_size_bytes::numeric / 524288000::numeric) * 100, 2)
        ),
        'resources', jsonb_build_object(
            'militantes_count', profiles_count,
            'militantes_limit', 50000,
            'logs_count', logs_count,
            'critical_events', critical_logs_count
        ),
        'status', CASE 
            WHEN (public_schema_size_bytes::numeric / 524288000::numeric) > 0.9 THEN 'critical'
            WHEN (public_schema_size_bytes::numeric / 524288000::numeric) > 0.75 THEN 'warning'
            ELSE 'healthy'
        END,
        'last_updated', now()
    );

    RETURN response;
END;
$$;

-- 2. Función para limpiar logs antiguos (Mantenimiento)
CREATE OR REPLACE FUNCTION public.cleanup_old_logs(days_to_keep INT DEFAULT 30)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INT;
BEGIN
    -- 🛡️ Solo super_admin puede ejecutar esto
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE auth_id = auth.uid() 
        AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'No autorizado.';
    END IF;

    DELETE FROM public.system_logs
    WHERE created_at < (now() - (days_to_keep || ' days')::interval)
    AND level NOT IN ('critical', 'security');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Registrar la limpieza
    INSERT INTO public.system_logs (event_type, level, message, metadata)
    VALUES ('maintenance', 'info', 'Limpieza automática de logs completada.', jsonb_build_object('deleted_rows', deleted_count));

    RETURN deleted_count;
END;
$$;

-- 3. Permisos
REVOKE ALL ON FUNCTION public.get_server_health() FROM public;
GRANT EXECUTE ON FUNCTION public.get_server_health() TO authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_logs(INT) FROM public;
GRANT EXECUTE ON FUNCTION public.cleanup_old_logs(INT) TO authenticated;

-- Comentarios
COMMENT ON FUNCTION public.get_server_health() IS 'Retorna estadísticas de uso del servidor.';
COMMENT ON FUNCTION public.cleanup_old_logs(INT) IS 'Elimina logs antiguos para liberar espacio.';
