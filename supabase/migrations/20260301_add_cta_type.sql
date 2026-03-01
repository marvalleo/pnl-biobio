-- Añadir columna cta_type a regional_announcements
ALTER TABLE public.regional_announcements ADD COLUMN IF NOT EXISTS cta_type TEXT DEFAULT 'link';

-- Comentario para documentación
COMMENT ON COLUMN public.regional_announcements.cta_type IS 'Tipo de acción: link, email, whatsapp';
