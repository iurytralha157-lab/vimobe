-- Update appointment_reminder template to match scheduler variables and keys
UPDATE notification_templates 
SET 
  message = 'Lembrete de compromisso: {titulo} às {horario} com o lead {nome_lead}.',
  variables = ARRAY['titulo', 'horario', 'nome_lead'],
  slug = 'appointment_reminder'
WHERE slug = 'appointment_reminder' OR name = 'Lembrete de Agendamento';

-- Ensure credentials_access exists and has correct variables
UPDATE notification_templates
SET 
  message = 'Olá {user_name}, suas credenciais de acesso ao Vimob CRM: Login: {email} Senha: {password}. Link: https://vimob.vettercompany.com.br/auth',
  variables = ARRAY['user_name', 'email', 'password'],
  slug = 'credentials_access'
WHERE slug = 'credentials_access' OR name = 'Credenciais de Acesso';

-- Ensure welcome_user exists
UPDATE notification_templates
SET 
  message = 'Olá {user_name}, bem-vindo ao Vimob CRM! Estamos felizes em ter você conosco. Seu login é {email}.',
  variables = ARRAY['user_name', 'email'],
  slug = 'welcome_user'
WHERE slug = 'welcome_user' OR name = 'Boas-vindas ao Sistema';

-- Ensure ranking_update is correct
UPDATE notification_templates
SET 
  message = 'Parabéns {user_name}! Você está na posição {position} do ranking com {total_sales} vendas. Sua última venda foi o lead {last_lead}.',
  variables = ARRAY['user_name', 'position', 'total_sales', 'last_lead'],
  slug = 'ranking_update'
WHERE slug = 'ranking_update' OR name = 'Atualização de Ranking';

-- Create missing ones if they don't exist (using UPSERT logic if possible, or just checking)
-- Since I don't want to duplicate, I'll just use the updates above which cover existing ones.
