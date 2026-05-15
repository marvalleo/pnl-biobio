-- Fix: eliminar policies INSERT permisivas que permiten bypass de moderación IA
-- Los INSERT en forum_topics y forum_posts SOLO deben ocurrir via Netlify Function
-- (service_role bypasea RLS). Un cliente autenticado NO debe poder insertar directamente
-- porque saltaría el sanitizador HTML y la moderación IA.

DROP POLICY IF EXISTS "Miembros pueden crear posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Miembros pueden crear hilos" ON public.forum_topics;
