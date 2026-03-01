-- Tabla para anuncios/modales de impacto regionales
CREATE TABLE IF NOT EXISTS public.regional_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    cta_text TEXT DEFAULT 'Entendido',
    cta_url TEXT,
    is_active BOOLEAN DEFAULT true,
    target_audience TEXT DEFAULT 'all', -- 'all' o 'militants'
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ
);

-- Habilitar RLS
ALTER TABLE public.regional_announcements ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad
-- 1. Cualquiera puede leer anuncios activos
CREATE POLICY "Enable read access for all active announcements" ON public.regional_announcements
    FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- 2. Solo súper administradores pueden gestionar anuncios
-- Nota: Usamos la función check_is_admin_usuarios si existe, o validamos el rol directamente
CREATE POLICY "Enable all access for super admins" ON public.regional_announcements
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.auth_id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.auth_id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );
