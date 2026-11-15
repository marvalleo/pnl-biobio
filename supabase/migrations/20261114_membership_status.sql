-- Pendiente: aplicar manualmente en SQL Editor
-- Estado de militancia (altas y bajas). Solo 'baja' bloquea el acceso (ban en Supabase Auth,
-- aplicado por la edge function set-membership-status). Los saludos solo van a 'activo'.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership_status text NOT NULL DEFAULT 'activo'
  CHECK (membership_status IN ('activo', 'inactivo', 'suspendido', 'baja'));

-- profiles tiene UPDATE a nivel de tabla para authenticated/anon, y un REVOKE por columna
-- no tiene efecto sobre un GRANT de tabla. Se retira el UPDATE de tabla y se re-otorga por
-- columna sobre las columnas existentes, EXCLUYENDO membership_status. Asi solo el
-- service role (la edge function) puede cambiarlo; RLS sigue decidiendo las filas.
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (
  id, full_name, rut, email, phone_number, role, created_at, auth_id,
  must_change_password, birth_date, reputation_score, rank, comuna,
  accepted_forum_rules, login_streak, last_activity_date
) ON public.profiles TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.list_birthday_profiles(p_month_days text[])
RETURNS TABLE(profile_id uuid, auth_id uuid, full_name text, email text, birth_date date)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id, p.auth_id, p.full_name, p.email, p.birth_date
  FROM public.profiles p
  WHERE p.birth_date IS NOT NULL
    AND p.membership_status = 'activo'
    AND to_char(p.birth_date, 'MM-DD') = ANY(p_month_days);
$function$;

REVOKE ALL ON FUNCTION public.list_birthday_profiles(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_birthday_profiles(text[]) TO service_role;

-- ROLLBACK
-- CREATE OR REPLACE FUNCTION public.list_birthday_profiles(p_month_days text[])
-- RETURNS TABLE(profile_id uuid, auth_id uuid, full_name text, email text, birth_date date)
-- LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
-- AS $function$
--   SELECT p.id, p.auth_id, p.full_name, p.email, p.birth_date
--   FROM public.profiles p
--   WHERE p.birth_date IS NOT NULL
--     AND to_char(p.birth_date, 'MM-DD') = ANY(p_month_days);
-- $function$;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS membership_status;
-- GRANT UPDATE ON public.profiles TO authenticated, anon;
