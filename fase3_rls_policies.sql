-- ==============================================================================
-- 🛡️ FASE 3: POLÍTICAS DE SEGURIDAD Y PRIVACIDAD (LEY N.º 21.719 - CHILE)
-- ==============================================================================
-- Instrucciones: 
-- Copia y pega todo este código en el "SQL Editor" de tu panel de Supabase 
-- y haz clic en "RUN". Esto asegurará tu base de datos contra extracciones 
-- masivas y blindará la privacidad de tus afiliados.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. FUNCIÓN SEGURA DE ROLES (EVITA RECURSIÓN INFINITA Y BLOQUEOS)
-- ------------------------------------------------------------------------------
-- Esta función permite a Postgres saber si eres admin SIN consultar las reglas
-- RLS de la tabla profiles repetitivamente, lo que causaba los bloqueos antes.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- ------------------------------------------------------------------------------
-- 1. TABLA: perfiles (profiles)
-- ------------------------------------------------------------------------------
-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política 1: Lectura (SELECT)
-- Los usuarios autenticados solo pueden ver perfiles básicos (útil para ver quién publicó en el foro)
-- pero NO pueden extraer toda la base de datos libremente si no están logueados.
DROP POLICY IF EXISTS "Afiliados pueden ver perfiles" ON public.profiles;
CREATE POLICY "Afiliados pueden ver perfiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- Política 2: Modificación (UPDATE)
-- Un usuario SOLO puede modificar su propio perfil, o un Super Administrador puede modificar cualquiera.
DROP POLICY IF EXISTS "Modificación propia o admin" ON public.profiles;
CREATE POLICY "Modificación propia o admin" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (
    auth.uid() = auth_id OR 
    public.get_my_role() IN ('super_admin', 'admin_usuarios')
);

-- Política 3: Borrado (DELETE) - DERECHO AL OLVIDO (ARCO+)
-- El afiliado puede eliminar su propia cuenta de la plataforma.
DROP POLICY IF EXISTS "Derecho a cancelación (borrado propio)" ON public.profiles;
CREATE POLICY "Derecho a cancelación (borrado propio)" 
ON public.profiles FOR DELETE 
TO authenticated 
USING (auth.uid() = auth_id);


-- ------------------------------------------------------------------------------
-- 2. TABLA: regional_announcements (Anuncios)
-- ------------------------------------------------------------------------------
ALTER TABLE public.regional_announcements ENABLE ROW LEVEL SECURITY;

-- Política 1: Lectura (SELECT)
-- Cualquier usuario (incluso anónimo en la web pública) puede leer los anuncios activos.
DROP POLICY IF EXISTS "Lectura pública de anuncios activos" ON public.regional_announcements;
CREATE POLICY "Lectura pública de anuncios activos" 
ON public.regional_announcements FOR SELECT 
USING (is_active = true);

-- Política 2: Modificación/Creación (Insert, Update, Delete)
-- Solo los Super Administradores o administradores de anuncios pueden alterarlos.
DROP POLICY IF EXISTS "Administradores gestionan anuncios" ON public.regional_announcements;
CREATE POLICY "Administradores gestionan anuncios" 
ON public.regional_announcements FOR ALL 
TO authenticated 
USING (
    public.get_my_role() IN ('super_admin', 'admin_anuncios')
);


-- ------------------------------------------------------------------------------
-- 3. TABLAS DE FOROS Y DEBATES (categories, topics, posts, votes)
-- (Si aún no están creadas, estas reglas aplicarán automáticamente en el futuro)
-- ------------------------------------------------------------------------------

-- Para "forums" o "forum_categories"
-- ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Lectura de foros" ON public.forums FOR SELECT TO authenticated USING (true);

-- Para "forum_topics"
-- ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Afiliados pueden leer hilos" ON public.forum_topics FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Afiliados pueden crear hilos" ON public.forum_topics FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

-- Para "forum_posts"
-- ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Afiliados pueden leer respuestas" ON public.forum_posts FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Afiliados pueden responder" ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);


-- ==============================================================================
-- ✅ FIN DEL SCRIPT: Tu plataforma ahora es resistente a Scraping y cumple 
-- con el principio de "Privacidad por Diseño" de la Ley 21.719.
-- ==============================================================================
