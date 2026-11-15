-- Pendiente: aplicar manualmente en SQL Editor
-- Programa el envio diario de saludos de cumpleanos: cada hora en punto se llama a la edge
-- function send-birthday-greetings (ella decide si ya son las 9:00 en America/Santiago).
-- Requisito previo (una sola vez, el valor NO va en el repo; debe ser igual al secret
-- BIRTHDAY_CRON_SECRET de las Edge Functions):
--   select vault.create_secret('<valor de BIRTHDAY_CRON_SECRET>', 'birthday_cron_secret');
-- Seguro de re-ejecutar: desprograma el job previo si existe.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'birthday-greetings-hourly') then
    perform cron.unschedule('birthday-greetings-hourly');
  end if;
end
$$;

select cron.schedule(
  'birthday-greetings-hourly',
  '0 * * * *',
  $job$
  select net.http_post(
    url := 'https://kjcwozzfzbizxurppxlf.supabase.co/functions/v1/send-birthday-greetings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'birthday_cron_secret')
    ),
    body := '{}'::jsonb
  )
  $job$
);

-- ROLLBACK
-- select cron.unschedule('birthday-greetings-hourly');
-- (opcional) drop extension pg_net; drop extension pg_cron;  -- solo si nada mas las usa
-- (opcional) delete from vault.secrets where name = 'birthday_cron_secret';
