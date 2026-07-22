-- ============================================================================
-- S-02 — FASE 2 (final): Protección a NIVEL DE COLUMNA sobre `profiles`
-- Fecha: 2026-07-22
-- Estado: VALIDADA en transacción revertida. PENDIENTE de aplicar en prod.
--
-- ⚠️  ORDEN DE DESPLIEGUE OBLIGATORIO:
--     Aplicar este archivo SOLO DESPUÉS de que el frontend que usa los RPCs
--     (get_my_profile, admin_list_profiles, admin_event_registrations,
--      admin_lesson_registrations) esté DESPLEGADO en producción.
--     Si se aplica antes, el código viejo con `select('*')` sobre profiles
--     fallará (navbar en todas las páginas, admin-usuarios, etc.).
--
-- QUÉ HACE:
--   Concede a `authenticated` SELECT sobre TODAS las columnas de profiles
--   EXCEPTO las sensibles (rut, email, phone_number, birth_date, comuna).
--   El foro sigue mostrando nombre/rango (columnas no sensibles). El PII
--   deja de ser legible directamente:
--     * el titular lo obtiene por get_my_profile()
--     * los administradores por admin_list_profiles() / admin_*_registrations()
--   Es idempotente y robusto ante columnas nuevas (se calcula dinámicamente).
-- ============================================================================

DO $$
DECLARE
    sensitive text[] := ARRAY['rut', 'email', 'phone_number', 'birth_date', 'comuna'];
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

    -- `anon` (público sin login) no recibe acceso a profiles.
    EXECUTE 'REVOKE SELECT ON public.profiles FROM authenticated';
    EXECUTE 'REVOKE SELECT ON public.profiles FROM anon';
    EXECUTE format('GRANT SELECT (%s) ON public.profiles TO authenticated', safe_cols);

    RAISE NOTICE 'Columnas legibles por authenticated: %', safe_cols;
END $$;

-- ============================================================================
-- VERIFICACIÓN (como usuario NORMAL autenticado)
--   -- FUNCIONA:  select id, full_name, role, rank, reputation_score from profiles;
--   -- FALLA:     select rut, phone_number, email from profiles;  -> permission denied
--   -- FUNCIONA:  select * from get_my_profile();  -> solo la fila propia, completa
--
-- ROLLBACK:
--   GRANT SELECT ON public.profiles TO authenticated;
-- ============================================================================
