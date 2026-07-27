-- ============================================================================
-- GAMIFICACIÓN DE LA FORJA — PNL Biobío
-- Fecha: 2026-07-27
-- Agrega: login_streak, last_activity_date a profiles
--         tabla user_achievements con RLS
-- ============================================================================

-- 1. Columnas de racha en profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS login_streak       integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_activity_date date;

-- 2. Tabla de logros ganados
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_key text NOT NULL,
    earned_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (profile_id, achievement_key)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Militante puede ver sus propios logros
CREATE POLICY "ua_select_own" ON public.user_achievements
    FOR SELECT TO authenticated
    USING (
        profile_id = (
            SELECT id FROM public.profiles WHERE auth_id = auth.uid() LIMIT 1
        )
    );

-- Militante puede insertar (el cliente concede logros ganados)
CREATE POLICY "ua_insert_own" ON public.user_achievements
    FOR INSERT TO authenticated
    WITH CHECK (
        profile_id = (
            SELECT id FROM public.profiles WHERE auth_id = auth.uid() LIMIT 1
        )
    );

-- Admins pueden ver todos los logros
CREATE POLICY "ua_select_admin" ON public.user_achievements
    FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE auth_id = auth.uid() LIMIT 1)
        IN ('super_admin','admin_forja','admin_usuarios')
    );
