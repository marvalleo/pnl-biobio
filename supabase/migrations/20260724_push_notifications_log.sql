-- ============================================================
-- Tabla: push_notifications_log
-- Registra cada envío masivo de notificaciones push.
-- Usada por la edge function send-push y por push-manager.js
-- (getUnreadCount() la consulta para el badge de notificaciones).
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS public.push_notifications_log;
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_notifications_log (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    title        text        NOT NULL,
    body         text        NOT NULL,
    url          text        NOT NULL DEFAULT '/',
    topic        text        NOT NULL DEFAULT 'pnl-general',
    sent_count   integer     NOT NULL DEFAULT 0,
    failed_count integer     NOT NULL DEFAULT 0,
    sent_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- Solo los admins pueden insertar/leer; los militantes solo pueden ver
-- el conteo para el badge (via get_push_log_count RPC)
ALTER TABLE public.push_notifications_log ENABLE ROW LEVEL SECURITY;

-- Admins (super_admin, admin) leen y crean
CREATE POLICY "Admins gestionan push_log"
    ON public.push_notifications_log
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.auth_id = auth.uid()
              AND p.role IN ('super_admin', 'admin')
        )
    );

-- Militantes autenticados pueden leer el log para el contador de badge
-- (no ven datos sensibles, solo created_at para comparar con su último visto)
CREATE POLICY "Militantes leen push_log"
    ON public.push_notifications_log
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Índice para la consulta del badge (gt created_at)
CREATE INDEX IF NOT EXISTS idx_push_log_created_at
    ON public.push_notifications_log (created_at DESC);
