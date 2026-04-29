-- Função para enviar notificação WhatsApp quando uma notificação é criada no sistema
CREATE OR REPLACE FUNCTION public.send_whatsapp_on_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllbWFsemxmbmJvdW9ieWp3bHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MjQ1ODYsImV4cCI6MjA4MzUwMDU4Nn0.81N4uCUaIFOm7DHMaHa9Rhh-OoY06j6Ig4AFibzXuQU';
BEGIN
  -- Chamada assíncrona para a Edge Function via pg_net
  PERFORM net.http_post(
    url := 'https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/whatsapp-notifier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_anon_key
    ),
    body := jsonb_build_object(
      'organization_id', NEW.organization_id,
      'user_id', NEW.user_id,
      'message', '*' || NEW.title || '*\n' || NEW.content
    )
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Falha ao enviar notificação WhatsApp: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para disparar o envio após a inserção na tabela de notificações
DROP TRIGGER IF EXISTS trig_send_whatsapp_on_notification ON public.notifications;
CREATE TRIGGER trig_send_whatsapp_on_notification
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.send_whatsapp_on_notification();

-- Garantir que a coluna is_notification_session existe na tabela whatsapp_sessions
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_sessions' AND column_name = 'is_notification_session') THEN
    ALTER TABLE public.whatsapp_sessions ADD COLUMN is_notification_session boolean DEFAULT false;
  END IF;
END $$;

-- Função para garantir apenas uma sessão de notificação por organização
CREATE OR REPLACE FUNCTION public.ensure_single_notification_session()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_notification_session = true THEN
    UPDATE whatsapp_sessions 
    SET is_notification_session = false 
    WHERE organization_id = NEW.organization_id 
      AND id != NEW.id 
      AND is_notification_session = true;
  END IF;
  RETURN NEW;
END;
$function$;

-- Trigger para a regra de sessão única
DROP TRIGGER IF EXISTS trg_ensure_single_notification_session ON public.whatsapp_sessions;
CREATE TRIGGER trg_ensure_single_notification_session
BEFORE INSERT OR UPDATE OF is_notification_session ON public.whatsapp_sessions
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_notification_session();
