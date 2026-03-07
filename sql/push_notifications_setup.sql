-- ==========================================================
-- 🔔 IMPLEMENTACIÓN DE NOTIFICACIONES PUSH
-- ==========================================================

-- 1. Tabla para almacenar suscripciones push de cada dispositivo
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    keys_p256dh TEXT NOT NULL,
    keys_auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. Tabla para historial de notificaciones enviadas
CREATE TABLE IF NOT EXISTS push_notifications_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    url TEXT,
    icon TEXT,
    sent_by UUID REFERENCES auth.users(id),
    target_audience TEXT DEFAULT 'all', -- 'all', 'region', 'role'
    total_sent INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para optimización
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_active ON push_subscriptions(is_active) WHERE is_active = TRUE;

-- 4. Habilitar RLS (Seguridad de Fila)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications_log ENABLE ROW LEVEL SECURITY;

-- 5. Políticas para push_subscriptions
-- Cada usuario solo puede ver/gestionar sus propias suscripciones
CREATE POLICY "Users can manage own subscriptions"
ON push_subscriptions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Los administradores pueden ver todas las suscripciones (para enviar)
CREATE POLICY "Admins can read all subscriptions"
ON push_subscriptions FOR SELECT
USING (
    public.get_my_role() IN ('super_admin', 'admin', 'admin_usuarios')
);

-- 6. Políticas para push_notifications_log
-- Solo admins pueden leer el log
CREATE POLICY "Admins can read logs"
ON push_notifications_log FOR SELECT
USING (
    public.get_my_role() IN ('super_admin', 'admin', 'admin_usuarios')
);

-- Solo admins pueden insertar logs (via serverless functions)
CREATE POLICY "Admins can insert logs"
ON push_notifications_log FOR INSERT
WITH CHECK (
    public.get_my_role() IN ('super_admin', 'admin', 'admin_usuarios')
);
