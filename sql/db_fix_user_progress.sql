-- ==========================================================
-- 🛠️ CORRECCIÓN DE TABLA user_progress
-- ==========================================================
-- Si recibes un error 400 en user_progress, es probable que las 
-- columnas de seguimiento de video no existan aún.
-- Ejecuta este script en el SQL EDITOR de Supabase.

-- 1. Asegurar que la tabla existe
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    minutes_watched INTEGER DEFAULT 0,
    last_video_second INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, lesson_id)
);

-- 2. Agregar columnas si la tabla ya existía pero estaba incompleta
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_progress' AND column_name='minutes_watched') THEN
        ALTER TABLE public.user_progress ADD COLUMN minutes_watched INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_progress' AND column_name='last_video_second') THEN
        ALTER TABLE public.user_progress ADD COLUMN last_video_second INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_progress' AND column_name='is_completed') THEN
        ALTER TABLE public.user_progress ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_progress' AND column_name='last_heartbeat') THEN
        ALTER TABLE public.user_progress ADD COLUMN last_heartbeat TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 3. Habilitar RLS si no estaba habilitado
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Seguridad (Modificación propia)
DROP POLICY IF EXISTS "Usuarios gestionan su propio progreso" ON public.user_progress;
CREATE POLICY "Usuarios gestionan su propio progreso" 
ON public.user_progress FOR ALL 
TO authenticated 
USING (profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()))
WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()));
