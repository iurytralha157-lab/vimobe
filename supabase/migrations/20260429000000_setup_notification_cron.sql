-- Ativar extensões necessárias
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Agendar o job para rodar a cada hora
select cron.schedule(
  'notification-dispatcher-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://' || current_setting('app.supabase_url') || '/functions/v1/notification-dispatcher',
    headers := json_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))::jsonb
  );
  $$
);
