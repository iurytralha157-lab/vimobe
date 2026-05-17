import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const queries = [
      "UPDATE notification_templates SET slug = 'new_lead_received', event_key = 'new_lead_received', channels = '{\"system\", \"whatsapp\"}', message = 'Novo lead recebido: {lead_name} (Origem: {source})' WHERE slug = 'new_lead_received' OR name = 'Novo Lead Recebido'",
      "UPDATE notification_templates SET slug = 'manual_lead_registered', event_key = 'manual_lead_registered', channels = '{\"system\", \"whatsapp\"}', message = 'Novo lead cadastrado manualmente: {lead_name} para {user_name}.' WHERE slug = 'manual_lead_registered_whatsapp' OR name = 'Novo Lead Manual'",
      "UPDATE notification_templates SET slug = 'welcome_user', event_key = 'welcome_user', channels = '{\"system\", \"whatsapp\"}', message = 'Olá {user_name}, bem-vindo ao Vimob CRM! Estamos felizes em ter você conosco. Seu login é {email}.' WHERE slug = 'welcome_system' OR name = 'Boas-vindas ao Sistema'",
      "UPDATE notification_templates SET slug = 'credentials_access', event_key = 'credentials_access', channels = '{\"whatsapp\"}', message = 'Olá {user_name}, suas credenciais de acesso ao Vimob CRM: Login: {email} Senha: {password}. Link: https://vimob.vettercompany.com.br/auth' WHERE slug = 'new_user_credentials_whatsapp' OR name = 'Credenciais de Acesso'",
      "UPDATE notification_templates SET slug = 'ranking_update', event_key = 'ranking_update', channels = '{\"system\", \"whatsapp\"}', message = 'Parabéns {user_name}! Você está na posição {position} do ranking com {total_sales} vendas. Sua última venda foi o lead {last_lead}.' WHERE slug = 'ranking_update_whatsapp' OR name = 'Atualização de Ranking'",
      "UPDATE notification_templates SET slug = 'appointment_reminder', event_key = 'appointment_reminder', channels = '{\"system\", \"whatsapp\"}', message = 'Lembrete de compromisso: {titulo} às {horario} com o lead {nome_lead}.' WHERE slug = 'appointment_reminder' OR name = 'Lembrete de Agendamento'",
      "UPDATE notification_templates SET slug = 'new_appointment', event_key = 'new_appointment', channels = '{\"system\", \"whatsapp\"}', message = 'Você tem um novo agendamento: {title} em {date} às {time}.' WHERE slug = 'new_appointment_whatsapp' OR name = 'Novo Agendamento'",
      "UPDATE notification_templates SET slug = 'whatsapp_disconnected', event_key = 'whatsapp_disconnected', channels = '{\"system\", \"push\"}', message = '⚠️ A sessão \"{session_name}\" do WhatsApp foi desconectada. Por favor, reconecte o QR Code.' WHERE slug = 'whatsapp_disconnected_system' OR name = 'WhatsApp Desconectado'",
      "UPDATE notification_templates SET event_key = 'deal_won' WHERE slug = 'deal_won_whatsapp'"
    ];

    const results = [];
    for (const query of queries) {
      // We use rpc to run arbitrary SQL if available, or just use the table client
      // Since we don't have a generic exec_sql rpc, we'll try to use the client for these specific updates
      // This is safer and likely to work.
    }

    // Actually, I'll just use the client directly for each update to be safe
    await supabase.from('notification_templates').update({
      slug: 'new_lead_received',
      event_key: 'new_lead_received',
      channels: ['system', 'whatsapp'],
      message: 'Novo lead recebido: {lead_name} (Origem: {source})'
    }).or('slug.eq.new_lead_received,name.eq.Novo Lead Recebido');

    await supabase.from('notification_templates').update({
      slug: 'manual_lead_registered',
      event_key: 'manual_lead_registered',
      channels: ['system', 'whatsapp'],
      message: 'Novo lead cadastrado manualmente: {lead_name} para {user_name}.'
    }).or('slug.eq.manual_lead_registered_whatsapp,name.eq.Novo Lead Manual');

    await supabase.from('notification_templates').update({
      slug: 'welcome_user',
      event_key: 'welcome_user',
      channels: ['system', 'whatsapp'],
      message: 'Olá {user_name}, bem-vindo ao Vimob CRM! Estamos felizes em ter você conosco. Seu login é {email}.'
    }).or('slug.eq.welcome_system,name.eq.Boas-vindas ao Sistema');

    await supabase.from('notification_templates').update({
      slug: 'credentials_access',
      event_key: 'credentials_access',
      channels: ['whatsapp'],
      message: 'Olá {user_name}, suas credenciais de acesso ao Vimob CRM: Login: {email} Senha: {password}. Link: https://vimob.vettercompany.com.br/auth'
    }).or('slug.eq.new_user_credentials_whatsapp,name.eq.Credenciais de Acesso');

    await supabase.from('notification_templates').update({
      slug: 'ranking_update',
      event_key: 'ranking_update',
      channels: ['system', 'whatsapp'],
      message: 'Parabéns {user_name}! Você está na posição {position} do ranking com {total_sales} vendas. Sua última venda foi o lead {last_lead}.'
    }).or('slug.eq.ranking_update_whatsapp,name.eq.Atualização de Ranking');

    await supabase.from('notification_templates').update({
      slug: 'appointment_reminder',
      event_key: 'appointment_reminder',
      channels: ['system', 'whatsapp'],
      message: 'Lembrete de compromisso: {titulo} às {horario} com o lead {nome_lead}.'
    }).or('slug.eq.appointment_reminder,name.eq.Lembrete de Agendamento');

    await supabase.from('notification_templates').update({
      slug: 'new_appointment',
      event_key: 'new_appointment',
      channels: ['system', 'whatsapp'],
      message: 'Você tem um novo agendamento: {title} em {date} às {time}.'
    }).or('slug.eq.new_appointment_whatsapp,name.eq.Novo Agendamento');

    await supabase.from('notification_templates').update({
      slug: 'whatsapp_disconnected',
      event_key: 'whatsapp_disconnected',
      channels: ['system', 'push'],
      message: '⚠️ A sessão "{session_name}" do WhatsApp foi desconectada. Por favor, reconecte o QR Code.'
    }).or('slug.eq.whatsapp_disconnected_system,name.eq.WhatsApp Desconectado');

    await supabase.from('notification_templates').update({
      event_key: 'deal_won'
    }).eq('slug', 'deal_won_whatsapp');

    // Ensure welcome_lead exists
    const { data: welcomeLead } = await supabase.from('notification_templates').select('id').eq('slug', 'welcome_lead').maybeSingle();
    if (!welcomeLead) {
      await supabase.from('notification_templates').insert({
        name: 'Boas-vindas ao Lead',
        slug: 'welcome_lead',
        event_key: 'welcome_lead',
        category: 'onboarding',
        channel: 'whatsapp',
        channels: ['whatsapp'],
        message: 'Olá {nome}, bem-vindo! Meu nome é {corretor} e serei seu consultor.',
        is_active: true
      });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});