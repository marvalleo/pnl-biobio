-- 📁 Script de Base de Datos: Módulo de Recursos Multimedia
-- Tabla para gestionar documentos, videos, presentaciones, etc.

-- 1. Crear la tabla
CREATE TABLE IF NOT EXISTS public.multimedia_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'pdf', 'video', 'ppt', 'audio', 'image'
    content_url TEXT NOT NULL,
    file_size TEXT, -- Ej: '2.4 MB'
    duration TEXT, -- Ej: '45:20 min'
    date_label TEXT, -- Ej: '15 Mar 2024'
    is_active BOOLEAN DEFAULT true,
    category TEXT DEFAULT 'General'
);

-- 2. Habilitar RLS
ALTER TABLE public.multimedia_resources ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso (Usando DROP para evitar error 42710)

DROP POLICY IF EXISTS "Recursos visibles para todos" ON public.multimedia_resources;
CREATE POLICY "Recursos visibles para todos" ON public.multimedia_resources
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins gestionan todo" ON public.multimedia_resources;
CREATE POLICY "Admins gestionan todo" ON public.multimedia_resources
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- 4. Trigger para autocompletar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;   
END;
$$ language 'plpgsql';

-- DROP TRIGGER IF EXISTS para evitar errores en re-ejecución
DROP TRIGGER IF EXISTS update_multimedia_resources_updated_at ON public.multimedia_resources;
CREATE TRIGGER update_multimedia_resources_updated_at
    BEFORE UPDATE ON public.multimedia_resources
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 📦 CONFIGURACIÓN DE STORAGE (BUCKET)
-- Nota: El bucket 'multimedia' debe crearse manualmente en la UI de Supabase o vía API.

-- 1. Permitir lectura pública
DROP POLICY IF EXISTS "Acceso público multimedia" ON storage.objects;
CREATE POLICY "Acceso público multimedia"
ON storage.objects FOR SELECT
USING ( bucket_id = 'multimedia' );

-- 2. Permitir a admins subir archivos
DROP POLICY IF EXISTS "Admins suben multimedia" ON storage.objects;
CREATE POLICY "Admins suben multimedia"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'multimedia' AND
    (SELECT role FROM public.profiles WHERE auth_id = auth.uid()) = 'super_admin'
);

-- 3. Permitir a admins borrar archivos
DROP POLICY IF EXISTS "Admins borran multimedia" ON storage.objects;
CREATE POLICY "Admins borran multimedia"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'multimedia' AND
    (SELECT role FROM public.profiles WHERE auth_id = auth.uid()) = 'super_admin'
);
