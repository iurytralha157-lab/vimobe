import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { name, email, password, organizationName, segment = 'imobiliario', teamSize } = await req.json();

    if (!name || !email || !password || !organizationName) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: nome, email, senha e nome da empresa' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Senha deve ter pelo menos 8 caracteres' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email === email);
    if (emailExists) {
      return new Response(JSON.stringify({ error: 'Este e-mail já está cadastrado. Faça login.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Create organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({ name: organizationName, segment })
      .select()
      .single();

    if (orgError) {
      console.error('Org error:', orgError);
      return new Response(JSON.stringify({ error: 'Erro ao criar organização: ' + orgError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Create auth user with email confirmed
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (authError) {
      await supabaseAdmin.from('organizations').delete().eq('id', org.id);
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Erro ao criar usuário: ' + authError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = authData.user.id;

    // 3. Update user profile
    const { error: userError } = await supabaseAdmin
      .from('users')
      .update({
        name,
        role: 'admin',
        organization_id: org.id,
        is_active: true,
      })
      .eq('id', userId);

    if (userError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.from('organizations').delete().eq('id', org.id);
      console.error('User error:', userError);
      return new Response(JSON.stringify({ error: 'Erro ao configurar perfil: ' + userError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Add admin role
    await supabaseAdmin.from('user_roles').upsert(
      { user_id: userId, role: 'admin' },
      { onConflict: 'user_id,role' }
    );

    // 5. Create modules based on segment
    // Self-signup accounts: NO financial, NO whatsapp (chat), NO meta integration
    // Only CRM core + webhooks
    let enabledModules: string[] = [];
    let disabledModules: string[] = [];

    if (segment === 'telecom') {
      enabledModules = ['crm', 'agenda', 'plans', 'coverage', 'telecom', 'tags', 'round_robin', 'reports', 'webhooks'];
      disabledModules = ['financial', 'whatsapp', 'properties', 'cadences', 'automations', 'performance', 'site', 'ai_agent'];
    } else if (segment === 'imobiliario') {
      enabledModules = ['crm', 'properties', 'agenda', 'cadences', 'tags', 'round_robin', 'reports', 'webhooks'];
      disabledModules = ['financial', 'whatsapp', 'plans', 'coverage', 'telecom', 'automations', 'performance', 'site', 'ai_agent'];
    } else {
      enabledModules = ['crm', 'agenda', 'tags', 'round_robin', 'reports', 'webhooks'];
      disabledModules = ['financial', 'whatsapp', 'properties', 'plans', 'coverage', 'telecom', 'cadences', 'automations', 'performance', 'site', 'ai_agent'];
    }

    await supabaseAdmin.from('organization_modules').insert([
      ...enabledModules.map(m => ({ organization_id: org.id, module_name: m, is_enabled: true })),
      ...disabledModules.map(m => ({ organization_id: org.id, module_name: m, is_enabled: false })),
    ]);

    // 6. Create default pipeline
    const pipelineName = segment === 'telecom' ? 'Pipeline Telecom' : 'Pipeline Principal';
    const { data: pipeline } = await supabaseAdmin
      .from('pipelines')
      .insert({ organization_id: org.id, name: pipelineName, is_default: true })
      .select()
      .single();

    if (pipeline) {
      const stages = segment === 'telecom'
        ? [
            { name: 'Novo', stage_key: 'novo', color: '#3B82F6', position: 0 },
            { name: 'Análise Viabilidade', stage_key: 'viabilidade', color: '#F59E0B', position: 1 },
            { name: 'Agendado', stage_key: 'agendado', color: '#8B5CF6', position: 2 },
            { name: 'Instalação', stage_key: 'instalacao', color: '#EC4899', position: 3 },
            { name: 'Ativado', stage_key: 'ativado', color: '#10B981', position: 4 },
          ]
        : [
            { name: 'Novo Lead', stage_key: 'new', color: '#3b82f6', position: 0 },
            { name: 'Contactados', stage_key: 'contacted', color: '#0891b2', position: 1 },
            { name: 'Conversa Ativa', stage_key: 'active', color: '#22c55e', position: 2 },
            { name: 'Reunião Marcada', stage_key: 'meeting', color: '#8b5cf6', position: 3 },
            { name: 'No-show', stage_key: 'noshow', color: '#f59e0b', position: 4 },
            { name: 'Proposta em Negociação', stage_key: 'negotiation', color: '#ec4899', position: 5 },
            { name: 'Fechado', stage_key: 'closed', color: '#22c55e', position: 6 },
            { name: 'Perdido', stage_key: 'lost', color: '#ef4444', position: 7 },
          ];

      await supabaseAdmin.from('stages').insert(
        stages.map(s => ({ ...s, pipeline_id: pipeline.id }))
      );
    }

    // Meta integration NOT created for self-signup accounts

    return new Response(JSON.stringify({
      success: true,
      organization: org,
      user: { id: userId, email, name },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
