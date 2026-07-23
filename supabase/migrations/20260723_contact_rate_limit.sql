-- ============================================================================
-- S-04 — Rate-limit del formulario de contacto
-- Fecha: 2026-07-23. Estado: APLICADA a producción (pnl-BD).
--
-- QUÉ HACE: crea una tabla que registra (IP, fecha) de cada envío del formulario
-- de contacto, para que la Edge Function `contact-email` pueda limitar cuántos
-- envíos hace una misma IP por hora (evita spam / email-bombing).
--
-- Es ADITIVA: no toca ninguna tabla existente ni datos actuales.
-- Solo el service_role (que usa la Edge Function) accede a esta tabla.
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS public.contact_rate_limit;
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contact_rate_limit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_rate_limit_ip_time
  ON public.contact_rate_limit (ip, created_at);

ALTER TABLE public.contact_rate_limit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contact_rate_limit FROM anon, authenticated;
