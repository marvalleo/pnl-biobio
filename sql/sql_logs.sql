-- 📋 Script de Base de Datos: Sistema de Auditoría y Logs
-- Tabla para registrar eventos críticos, errores y accesos del sistema.

-- 1. Crear la tabla
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- 'login', 'error', 'registration', 'export', 'security'
    level TEXT DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    user_agent TEXT,
    page_url TEXT
);

-- 2. Habilitar RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso

-- Permitir que cualquier usuario autenticado inserte logs (para capturar errores de cliente)
DROP POLICY IF EXISTS "Usuarios insertan logs" ON public.system_logs;
CREATE POLICY "Usuarios insertan logs" ON public.system_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Solo super_admins pueden ver los logs
DROP POLICY IF EXISTS "Admins ven logs" ON public.system_logs;
CREATE POLICY "Admins ven logs" ON public.system_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- 4. Índice para búsquedas rápidas por fecha y tipo
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_event_type ON public.system_logs(event_type);
