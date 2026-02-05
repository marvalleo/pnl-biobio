-- Esquema de Base de Datos: Soberanía Digital PNL (Biobío)

-- 1. Perfiles de Usuario (Militantes)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  rut TEXT UNIQUE NOT NULL,
  full_name TEXT,
  region TEXT DEFAULT 'Biobío',
  commune TEXT,
  role TEXT DEFAULT 'miembro' CHECK (role IN ('miembro', 'admin', 'superuser')),
  is_validated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Biblioteca de la Libertad (Documentos)
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- ej: 'Estatutos', 'Programa', 'Minutas'
  url TEXT NOT NULL, -- URL de Supabase Storage
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Círculos de Debate (Foros)
CREATE TABLE forums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('temático', 'territorial')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE forum_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  forum_id UUID REFERENCES forums(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE forum_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES forum_threads(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Motor de Consultas (Votación Anónima)
CREATE TABLE votaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  options JSONB, -- ej: ["Sí", "No", "Abstención"]
  ends_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Registro de quién ya votó (para evitar duplicados)
CREATE TABLE votacion_registry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voter_id UUID REFERENCES profiles(id),
  votacion_id UUID REFERENCES votaciones(id),
  UNIQUE(voter_id, votacion_id)
);

-- Resultados anónimos (sin relación con profiles)
CREATE TABLE votacion_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  votacion_id UUID REFERENCES votaciones(id),
  option_index INTEGER NOT NULL,
  vote_hash TEXT NOT NULL, -- Hash para verificación de transparencia
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Academia (Cursos)
CREATE TABLE courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT CHECK (content_type IN ('video', 'pdf', 'text')),
  content_url TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE votaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE votacion_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE votacion_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Políticas de ejemplo (Solo lectura para validados)
CREATE POLICY "Solo miembros validados leen documentos" ON documents
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_validated = TRUE));
