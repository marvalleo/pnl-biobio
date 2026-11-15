-- Aplicada manualmente en SQL Editor el 2026-11-14
-- Registro de saludos de cumpleanos (idempotencia por perfil y ano) y listado para el cron.

CREATE TABLE IF NOT EXISTS public.birthday_greetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  greeting_year int NOT NULL,
  celebration_date date NOT NULL,
  inbox_log_id uuid NULL REFERENCES public.push_notifications_log(id) ON DELETE SET NULL,
  push_status text NOT NULL DEFAULT 'pending',   -- pending|sent|no_subscription|failed
  email_status text NOT NULL DEFAULT 'pending',  -- pending|sent|no_email|skipped_quota|failed
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (profile_id, greeting_year)
);

ALTER TABLE public.birthday_greetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin lee saludos"
  ON public.birthday_greetings
  FOR SELECT
  USING (public.get_my_role() IN ('super_admin'));

CREATE OR REPLACE FUNCTION public.list_birthday_profiles(p_month_days text[])
RETURNS TABLE(profile_id uuid, auth_id uuid, full_name text, email text, birth_date date)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id, p.auth_id, p.full_name, p.email, p.birth_date
  FROM public.profiles p
  WHERE p.birth_date IS NOT NULL
    AND to_char(p.birth_date, 'MM-DD') = ANY(p_month_days);
$function$;

REVOKE ALL ON FUNCTION public.list_birthday_profiles(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_birthday_profiles(text[]) TO service_role;

-- ROLLBACK
-- DROP FUNCTION IF EXISTS public.list_birthday_profiles(text[]);
-- DROP TABLE IF EXISTS public.birthday_greetings;
