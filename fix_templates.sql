-- Normalizar e expandir templates de notificação

-- 1. Novo Lead Recebido
UPDATE notification_templates 
SET 
  slug = 'new_lead_received', 
  event_key = 'new_lead_received',
  channels = '{"system", "whatsapp"}',
  message = 'Novo lead recebido: {lead_name} (Origem: {source})'
WHERE slug = 'new_lead_received' OR name = 'Novo Lead Recebido';

-- 2. Novo Lead Manual
UPDATE notification_templates 
SET 
  slug = 'manual_lead_registered', 
  event_key = 'manual_lead_registered',
  channels = '{"system", "whatsapp"}',
  message = 'Novo lead cadastrado manualmente: {lead_name} para {user_name}.'
WHERE slug = 'manual_lead_registered_whatsapp' OR name = 'Novo Lead Manual';

-- 3. Boas-vindas ao Sistema (User)
UPDATE notification_templates 
SET 
  slug = 'welcome_user', 
  event_key = 'welcome_user',
  channels = '{"system", "whatsapp"}',
  message = 'Olá {user_name}, bem-vindo ao Vimob CRM! Estamos felizes em ter você conosco. Seu login é {email}.'
WHERE slug = 'welcome_system' OR name = 'Boas-vindas ao Sistema';

-- 4. Credenciais de Acesso (User)
UPDATE notification_templates 
SET 
  slug = 'credentials_access', 
  event_key = 'credentials_access',
  channels = '{"whatsapp"}',
  message = 'Olá {user_name}, suas credenciais de acesso ao Vimob CRM: Login: {email} Senha: {password}. Link: https://vimob.vettercompany.com.br/auth'
WHERE slug = 'new_user_credentials_whatsapp' OR name = 'Credenciais de Acesso';

-- 5. Atualização de Ranking
UPDATE notification_templates 
SET 
  slug = 'ranking_update', 
  event_key = 'ranking_update',
  channels = '{"system", "whatsapp"}',
  message = 'Parabéns {user_name}! Você está na posição {position} do ranking com {total_sales} vendas. Sua última venda foi o lead {last_lead}.'
WHERE slug = 'ranking_update_whatsapp' OR name = 'Atualização de Ranking';

-- 6. Lembrete de Agendamento
UPDATE notification_templates 
SET 
  slug = 'appointment_reminder', 
  event_key = 'appointment_reminder',
  channels = '{"system", "whatsapp"}',
  message = 'Lembrete de compromisso: {titulo} às {horario} com o lead {nome_lead}.'
WHERE slug = 'appointment_reminder' OR name = 'Lembrete de Agendamento';

-- 7. Novo Agendamento
UPDATE notification_templates 
SET 
  slug = 'new_appointment', 
  event_key = 'new_appointment',
  channels = '{"system", "whatsapp"}',
  message = 'Você tem um novo agendamento: {title} em {date} às {time}.'
WHERE slug = 'new_appointment_whatsapp' OR name = 'Novo Agendamento';

-- 8. WhatsApp Desconectado
UPDATE notification_templates 
SET 
  slug = 'whatsapp_disconnected', 
  event_key = 'whatsapp_disconnected',
  channels = '{"system", "push"}',
  message = '⚠️ A sessão "{session_name}" do WhatsApp foi desconectada. Por favor, reconecte o QR Code.'
WHERE slug = 'whatsapp_disconnected_system' OR name = 'WhatsApp Desconectado';

-- 9. Criar Boas-vindas ao Lead (se não existir)
INSERT INTO notification_templates (name, slug, event_key, category, channel, channels, message, is_active)
SELECT 'Boas-vindas ao Lead', 'welcome_lead', 'welcome_lead', 'onboarding', 'whatsapp', '{"whatsapp"}', 'Olá {nome}, bem-vindo! Meu nome é {corretor} e serei seu consultor.', true
WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE slug = 'welcome_lead');

-- 10. Garantir que Lead Ganho tenha event_key correto
UPDATE notification_templates 
SET event_key = 'deal_won'
WHERE slug = 'deal_won_whatsapp';
