-- ============================================================================
-- S-02 — Endurecimiento de PII en `profiles` + RPC de estadísticas
-- Fecha: 2026-07-22
-- ============================================================================
--
-- OBJETIVO
--   Impedir que un militante autenticado pueda descargar el "padrón" con datos
--   personales sensibles (RUT, fecha de nacimiento, teléfono, email, comuna) de
--   TODOS los demás — dato protegido por la Ley 21.719 de Chile.
--
-- ENFOQUE (protección a NIVEL DE COLUMNA, no de fila)
--   El foro muestra el NOMBRE/rango de otros militantes (muro de honor, autores
--   de posts) mediante joins a `profiles`. Por eso NO podemos restringir las
--   filas a "solo el propio usuario" sin romper el foro. En su lugar:
--     * Cualquier autenticado puede LEER columnas NO sensibles de cualquier fila
--       (id, full_name, avatar_url, role, rank, reputation_score, ...).
--     * Las columnas SENSIBLES (rut, birth_date, phone_number, email, comuna)
--       quedan REVOCADAS para el rol `authenticated`.
--     * El propio usuario lee SUS datos sensibles vía `get_my_profile()`
--       (SECURITY DEFINER).
--     * Los administradores leen datos sensibles vía las Edge/Netlify Functions
--       que ya usan `service_role` (bypass total), o vía `get_dashboard_stats()`.
--
-- IMPORTANTE
--   * Esta migración es IDEMPOTENTE (se puede correr más de una vez).
--   * NO cambia las políticas RLS de fila existentes (para no romper el foro).
--   * Requiere cambios coordinados en el frontend (ver "CHECKLIST DE INTEGRACIÓN"
--     al final). Probar en un entorno de staging antes de producción.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Helper: ¿el usuario es parte del staff (algún rol admin)?
--    SECURITY DEFINER para poder leer `profiles` sin recursión de RLS.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE auth_id = uid
          AND role IN ('super_admin', 'admin_forja', 'admin_votos',
                       'admin_foros', 'admin_usuarios')
    );
$$;

REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;


-- ----------------------------------------------------------------------------
-- 2. RPC: estadísticas agregadas del dashboard (solo staff).
--    Reemplaza el escaneo directo de `profiles` desde el cliente (S-02).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    IF NOT public.is_staff(auth.uid()) THEN
        RAISE EXCEPTION 'No autorizado: se requiere rol administrativo';
    END IF;

    SELECT json_build_object(
        'users',   (SELECT count(*) FROM public.profiles),
        'courses', (SELECT count(*) FROM public.courses),
        'ballots', (SELECT count(*) FROM public.ballots)
    ) INTO result;

    RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;


-- ----------------------------------------------------------------------------
-- 3. RPC: el propio usuario obtiene SU perfil completo (incluye sensibles).
--    Usar en perfil.html en lugar de `select('*')`.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT * FROM public.profiles WHERE auth_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;


-- ----------------------------------------------------------------------------
-- 4. Protección a nivel de COLUMNA sobre `profiles`.
--    Concede SELECT sobre TODAS las columnas EXCEPTO las sensibles.
--    (Dinámico: robusto ante columnas nuevas/desconocidas del esquema.)
--
--    Ajusta el array `sensitive` si tu tabla tiene más campos personales
--    (p. ej. 'address', 'national_id', etc.).
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    sensitive text[] := ARRAY['rut', 'birth_date', 'phone_number', 'email', 'comuna'];
    safe_cols text;
BEGIN
    SELECT string_agg(quote_ident(column_name), ', ')
    INTO safe_cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND NOT (column_name = ANY (sensitive));

    IF safe_cols IS NULL THEN
        RAISE EXCEPTION 'No se encontraron columnas para profiles; abortando.';
    END IF;

    -- Revocar acceso amplio previo (idempotente)
    EXECUTE 'REVOKE SELECT ON public.profiles FROM authenticated';
    EXECUTE 'REVOKE SELECT ON public.profiles FROM anon';

    -- Conceder SELECT SOLO sobre columnas no sensibles al rol authenticated.
    -- `anon` (público sin login) no recibe acceso a profiles.
    EXECUTE format('GRANT SELECT (%s) ON public.profiles TO authenticated', safe_cols);

    RAISE NOTICE 'Columnas legibles por authenticated: %', safe_cols;
END $$;

-- Las columnas sensibles quedan sin GRANT para `authenticated`:
--   un `select('rut,phone_number,email')` sobre cualquier fila -> "permission denied".
-- El propio usuario las obtiene por get_my_profile(); el staff por service_role.

-- Nota: UPDATE/INSERT/DELETE NO se tocan aquí; siguen dependiendo de las
-- políticas RLS existentes (el usuario edita/borra su propia fila; admins
-- operan por funciones con service_role).


-- ============================================================================
-- VERIFICACIÓN (ejecutar como un usuario NORMAL autenticado para validar)
-- ============================================================================
--   -- Debe FUNCIONAR (columnas no sensibles de otros):
--   select id, full_name, role, rank, reputation_score from profiles limit 5;
--
--   -- Debe FALLAR con "permission denied for column ...":
--   select rut, phone_number, email from profiles;
--
--   -- Debe devolver SOLO la fila propia con todas las columnas:
--   select * from get_my_profile();
--
--   -- Debe FALLAR para un no-admin y funcionar para staff:
--   select get_dashboard_stats();
-- ============================================================================


-- ============================================================================
-- CHECKLIST DE INTEGRACIÓN FRONTEND (aplicar junto con esta migración)
-- ============================================================================
-- Tras aplicar la protección de columnas, TODO `select('*')` sobre `profiles`
-- desde el cliente fallará (porque `*` incluye columnas sensibles). Cambiar:
--
--   [ ] admin-dashboard.html -> loadDashboardStats(): YA usa rpc('get_dashboard_stats')
--       con fallback (implementado en el commit que acompaña esta migración). ✔
--
--   [ ] perfil.html  (~línea 200, 235 y formulario de edición):
--       Reemplazar `from('profiles').select('*'|'...phone_number...')` por
--       `rpc('get_my_profile')` (o .select() SOLO de columnas no sensibles para
--       lo que se muestre públicamente). Es la página del propio usuario, así
--       que get_my_profile() devuelve sus datos completos.
--
--   [ ] public/assets/js/modules/auth.js (~línea 46): cambiar `select('*')`
--       por columnas explícitas no sensibles, p.ej.:
--       .select('id, auth_id, full_name, avatar_url, role, rank,
--                reputation_score, accepted_forum_rules, must_change_password')
--
--   [ ] forja-foros.html (~línea 390) y forja-foros-post.html (~línea 266):
--       ídem: `select('*')` del PROPIO perfil -> columnas explícitas no sensibles
--       (incluir 'accepted_forum_rules' que usa el gate del foro).
--
--   [ ] Joins embebidos del foro que ya seleccionan solo columnas seguras
--       (`profiles (id, full_name, role, rank, reputation_score)`,
--        `profiles(full_name)`): NO requieren cambios (siguen permitidos). ✔
--
--   [ ] Verificar la política RLS de fila de `profiles`: para que el muro de
--       honor y los nombres de autores funcionen, `authenticated` debe poder
--       SELECT filas de otros (la protección de columnas ya impide ver PII).
--       Si en el futuro se quiere ocultar incluso la existencia de perfiles a
--       usuarios normales, migrar el muro/joins a una VISTA `public_profiles`.
-- ============================================================================


-- ============================================================================
-- ROLLBACK (si algo se rompe en producción)
-- ============================================================================
--   GRANT SELECT ON public.profiles TO authenticated;   -- restablece acceso amplio
--   DROP FUNCTION IF EXISTS public.get_my_profile();
--   DROP FUNCTION IF EXISTS public.get_dashboard_stats();
--   DROP FUNCTION IF EXISTS public.is_staff(uuid);
-- ============================================================================
