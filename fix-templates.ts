import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTemplates() {
  const updates = [
    {
      slug: 'appointment_reminder',
      data: {
        message: 'Lembrete de compromisso: {titulo} às {horario} com o lead {nome_lead}.',
        variables: ['titulo', 'horario', 'nome_lead']
      }
    },
    {
      slug: 'credentials_access',
      data: {
        message: 'Olá {user_name}, suas credenciais de acesso ao Vimob CRM: Login: {email} Senha: {password}. Link: https://vimob.vettercompany.com.br/auth',
        variables: ['user_name', 'email', 'password']
      }
    },
    {
      slug: 'welcome_user',
      data: {
        message: 'Olá {user_name}, bem-vindo ao Vimob CRM! Estamos felizes em ter você conosco. Seu login é {email}.',
        variables: ['user_name', 'email']
      }
    },
    {
      slug: 'ranking_update',
      data: {
        message: 'Parabéns {user_name}! Você está na posição {position} do ranking com {total_sales} vendas. Sua última venda foi o lead {last_lead}.',
        variables: ['user_name', 'position', 'total_sales', 'last_lead']
      }
    }
  ];

  for (const update of updates) {
    console.log(`Updating ${update.slug}...`);
    const { error } = await supabase
      .from('notification_templates')
      .update(update.data)
      .eq('slug', update.slug);

    if (error) {
      console.error(`Error updating ${update.slug}:`, error);
    } else {
      console.log(`Updated ${update.slug} successfully.`);
    }
  }
}

fixTemplates();
