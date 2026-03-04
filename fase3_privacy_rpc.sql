-- ==============================================================================
-- 🛡️ FASE 3: DERECHO DE CANCELACIÓN (OLVIDO) - LEY N.º 21.719
-- ==============================================================================
-- Instrucciones: 
-- Copia y pega todo este código en el "SQL Editor" de tu panel de Supabase 
-- y haz clic en "RUN". Esto creará la función segura que permite a un usuario
-- eliminar su propia cuenta definivivamente desde la Forja.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- FUNCIÓN RPC: delete_own_user_account()
-- ------------------------------------------------------------------------------
-- Contexto: Por seguridad, la API cliente de Supabase no permite que un usuario
-- elimine su propia cuenta de la tabla `auth.users` directamente con código JS.
-- Para cumplir con la ley, creamos esta función 'SECURITY DEFINER'.
--
-- Esta función:
-- 1. Verifica quién es el usuario que está ejecutando la llamada.
-- 2. Elimina al propio usuario del esquema de autenticación `auth.users`, lo que 
--    detona un EFECTO CASCADA: borrando su perfil público, posts y votos gracias 
--    a las relaciones (FOREIGN KEYS con ON DELETE CASCADE).
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_own_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER   -- IMPORTANTE: Ejecuta la función con privilegios de administrador para poder tocar el esquema auth.
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
BEGIN
    -- Obtener el ID del usuario que está solicitando la eliminación
    current_user_id := auth.uid();

    -- Capa de seguridad extra: Si no hay usuario (llamada anónima), abortamos.
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No autorizado. Debes iniciar sesión para eliminar tu cuenta.';
    END IF;

    -- Ejecutar la eliminación en el esquema central de autenticación.
    -- OJO: Al estar relacionadas, esto debería borrar automáticamente 
    -- su fila en public.profiles si la tabla profiles se creó correctamente 
    -- con 'ON DELETE CASCADE'. Si no, la aplicación cliente (JS) puede 
    -- borrar el perfil instantes antes de llamar a esta función.
    DELETE FROM auth.users WHERE id = current_user_id;

END;
$$;

-- ------------------------------------------------------------------------------
-- ✅ FIN DEL SCRIPT: Los usuarios ya pueden ejecutar el "Derecho a Cancelación"
-- de forma autónoma desde la pantalla "Mi Perfil / Privacidad" de la Forja.
-- ==============================================================================
