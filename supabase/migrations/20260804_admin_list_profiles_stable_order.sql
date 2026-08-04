-- ============================================================================
-- Padrón completo: orden determinista para paginar admin_list_profiles()
-- Fecha: 2026-08-04
-- Estado: APLICADA a producción (pnl-BD) el 2026-08-04.
--
-- Problema
-- --------
-- PostgREST corta cada respuesta en `max_rows` (1.000 por defecto en Supabase),
-- así que admin-usuarios.html pasa a traer el padrón por lotes con .range().
-- Paginar con OFFSET solo es correcto si el ORDER BY define un orden TOTAL:
-- `ORDER BY created_at DESC` no lo es, porque created_at se repite entre filas
-- (una importación masiva del padrón inserta todas las filas en la misma
-- transacción y now() devuelve el mismo timestamp para todas). Con empates, el
-- motor puede devolver las filas empatadas en distinto orden en cada lote, y
-- eso no solo duplica filas: también SALTEA militantes que nunca se muestran.
--
-- Solución
-- --------
-- Agregar `id` como desempate. Es la PK, así que (created_at, id) sí es un
-- orden total y estable entre lotes.
--
-- Cambio aditivo: misma firma, mismos permisos, mismo control de acceso. Lo
-- único que cambia es el desempate del ORDER BY.
--
-- Rollback
-- --------
-- Volver a la versión previa (sin el desempate por id):
--   CREATE OR REPLACE FUNCTION public.admin_list_profiles()
--   RETURNS SETOF public.profiles
--   LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
--   AS $$
--   BEGIN
--       IF NOT public.is_admin_usuarios() THEN
--           RAISE EXCEPTION 'No autorizado: se requiere rol de administración de usuarios';
--       END IF;
--       RETURN QUERY SELECT * FROM public.profiles ORDER BY created_at DESC;
--   END;
--   $$;
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS SETOF public.profiles
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin_usuarios() THEN
        RAISE EXCEPTION 'No autorizado: se requiere rol de administración de usuarios';
    END IF;
    -- El desempate por id hace que el orden sea total y estable, requisito para
    -- que la paginación por lotes (.range) no duplique ni saltee militantes.
    RETURN QUERY SELECT * FROM public.profiles ORDER BY created_at DESC, id DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;

-- Índice de apoyo: el orden por (created_at DESC, id DESC) sobre todo el padrón
-- se resuelve con un index scan en vez de ordenar la tabla completa en cada lote.
CREATE INDEX IF NOT EXISTS profiles_created_at_id_desc_idx
    ON public.profiles (created_at DESC, id DESC);
