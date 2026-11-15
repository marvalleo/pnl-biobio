-- Aplicada manualmente en SQL Editor el 2026-11-14
-- Bandeja personal: mensajes dirigidos a un solo usuario (recipient_id) y imagen opcional.
-- recipient_id NULL = difusion (comportamiento actual).

ALTER TABLE public.push_notifications_log
  ADD COLUMN IF NOT EXISTS recipient_id uuid NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS image_url text NULL;

CREATE INDEX IF NOT EXISTS idx_push_notifications_log_recipient_id
  ON public.push_notifications_log (recipient_id);

-- El tipo de retorno cambia (image_url), por eso DROP + CREATE.
DROP FUNCTION IF EXISTS public.get_my_push_history(integer);

CREATE FUNCTION public.get_my_push_history(max_records integer DEFAULT 50)
RETURNS TABLE(id uuid, title text, body text, url text, icon text, image_url text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        l.id,
        l.title,
        l.body,
        l.url,
        l.icon,
        l.image_url,
        l.created_at
    FROM push_notifications_log l
    WHERE (l.recipient_id IS NULL AND (l.target_audience = 'all' OR l.target_audience = public.get_my_role()))
       OR l.recipient_id = auth.uid()
    ORDER BY l.created_at DESC
    LIMIT max_records;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_push_history(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_push_history(integer) TO authenticated, service_role;

-- RLS: cada militante solo lee difusiones y sus propios mensajes.
DROP POLICY IF EXISTS "Militantes leen push_log" ON public.push_notifications_log;
DROP POLICY IF EXISTS "Militantes pueden contar notificaciones" ON public.push_notifications_log;

CREATE POLICY "Militantes leen sus notificaciones"
  ON public.push_notifications_log
  FOR SELECT TO authenticated
  USING (recipient_id IS NULL OR recipient_id = auth.uid());

-- ROLLBACK
-- DROP POLICY IF EXISTS "Militantes leen sus notificaciones" ON public.push_notifications_log;
-- CREATE POLICY "Militantes leen push_log" ON public.push_notifications_log
--   FOR SELECT TO public USING (auth.uid() IS NOT NULL);
-- CREATE POLICY "Militantes pueden contar notificaciones" ON public.push_notifications_log
--   FOR SELECT TO authenticated USING (true);
-- DROP FUNCTION IF EXISTS public.get_my_push_history(integer);
-- CREATE FUNCTION public.get_my_push_history(max_records integer DEFAULT 50)
-- RETURNS TABLE(id uuid, title text, body text, url text, icon text, created_at timestamptz)
-- LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
-- AS $function$
-- BEGIN
--     RETURN QUERY
--     SELECT l.id, l.title, l.body, l.url, l.icon, l.created_at
--     FROM push_notifications_log l
--     WHERE l.target_audience = 'all' OR l.target_audience = public.get_my_role()
--     ORDER BY l.created_at DESC
--     LIMIT max_records;
-- END;
-- $function$;
-- GRANT EXECUTE ON FUNCTION public.get_my_push_history(integer) TO PUBLIC, anon, authenticated, service_role;
-- DROP INDEX IF EXISTS public.idx_push_notifications_log_recipient_id;
-- ALTER TABLE public.push_notifications_log DROP COLUMN IF EXISTS image_url, DROP COLUMN IF EXISTS recipient_id;
