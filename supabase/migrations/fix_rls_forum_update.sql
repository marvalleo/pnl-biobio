-- Fix: las policies UPDATE en forum_posts y forum_topics tienen with_check=NULL,
-- lo que permitiría a un usuario cambiar moderation_status='clean' en sus propios posts
-- para desbloquear contenido rechazado por la IA.
--
-- No existe feature de edición de posts en el frontend actual.
-- Los admins usan service_role (bypasea RLS). Se eliminan las policies permisivas.
-- Si se agrega edición de posts en el futuro, debe ir por Netlify Function.

DROP POLICY IF EXISTS "Propios posts editables" ON public.forum_posts;
DROP POLICY IF EXISTS "Propios hilos editables" ON public.forum_topics;
