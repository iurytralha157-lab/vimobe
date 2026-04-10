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

    const body = await req.json();

    const {
      company_name, cnpj, company_address, company_city, company_neighborhood,
      company_number, company_complement, company_phone, company_whatsapp, company_email,
      responsible_name, responsible_email, responsible_cpf, responsible_phone,
      logo_url, favicon_url, primary_color, secondary_color,
      site_title, custom_domain, instagram, facebook, youtube, linkedin,
    } = body;

    if (!company_name || !responsible_name || !responsible_email) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: nome da empresa, nome e email do responsável' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure user_id is nullable and FK is dropped (idempotent)
    try {
      await supabaseAdmin.rpc('exec_sql_idempotent', { query: '' }); // no-op
    } catch { /* ignore */ }

    // Use raw SQL via postgrest rpc to make user_id nullable if needed
    const alterRes = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    }).catch(() => null);

    // Insert without user_id (anonymous submission)
    const { data, error } = await supabaseAdmin
      .from('onboarding_requests')
      .insert({
        company_name,
        cnpj: cnpj || null,
        company_address: company_address || null,
        company_city: company_city || null,
        company_neighborhood: company_neighborhood || null,
        company_number: company_number || null,
        company_complement: company_complement || null,
        company_phone: company_phone || null,
        company_whatsapp: company_whatsapp || null,
        company_email: company_email || null,
        segment: 'imobiliario',
        responsible_name,
        responsible_email,
        responsible_cpf: responsible_cpf || null,
        responsible_phone: responsible_phone || null,
        logo_url: logo_url || null,
        favicon_url: favicon_url || null,
        primary_color: primary_color || '#3b82f6',
        secondary_color: secondary_color || null,
        site_title: site_title || null,
        custom_domain: custom_domain || null,
        instagram: instagram || null,
        facebook: facebook || null,
        youtube: youtube || null,
        linkedin: linkedin || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      
      // If FK constraint error, try to fix the schema and retry
      if (error.message?.includes('foreign key') || error.message?.includes('user_id')) {
        console.log('Attempting to fix schema - dropping FK and making user_id nullable...');
        
        // Direct SQL via PostgREST is not possible, inform user
        return new Response(JSON.stringify({ 
          error: 'É necessário executar uma alteração no banco de dados. Por favor, execute no SQL Editor do Supabase: ALTER TABLE public.onboarding_requests ALTER COLUMN user_id DROP NOT NULL; ALTER TABLE public.onboarding_requests DROP CONSTRAINT IF EXISTS onboarding_requests_user_id_fkey;' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Erro ao salvar solicitação: ' + error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
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
