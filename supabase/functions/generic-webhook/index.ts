import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find webhook by token
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks_integrations')
      .select('*, pipeline:pipelines(id, name), team:teams(id, name), stage:stages(id, name)')
      .eq('api_token', token)
      .eq('is_active', true)
      .eq('type', 'incoming')
      .single();

    if (webhookError || !webhook) {
      console.error('Webhook lookup error:', webhookError);
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive webhook token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    console.log('Received webhook data:', JSON.stringify(body));

    // Apply field mapping
    const fieldMapping = webhook.field_mapping || {
      name: 'name',
      phone: 'phone',
      email: 'email',
      message: 'message',
      renda_familiar: 'renda_familiar',
      trabalha: 'trabalha',
      profissao: 'profissao',
      faixa_valor_imovel: 'faixa_valor_imovel',
      finalidade_compra: 'finalidade_compra',
      procura_financiamento: 'procura_financiamento',
    };

    const mappedData: Record<string, any> = {};
    for (const [targetField, sourceField] of Object.entries(fieldMapping)) {
      const srcField = sourceField as string;
      if (body[srcField] !== undefined) {
        mappedData[targetField] = body[srcField];
      }
    }

    // Validate required fields
    if (!mappedData.name) {
      return new Response(
        JSON.stringify({ error: 'Field "name" is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create lead - trigger will handle pipeline/stage assignment, round-robin, and timeline events
    // Only pass pipeline/stage if explicitly configured on webhook
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        organization_id: webhook.organization_id,
        name: mappedData.name,
        phone: mappedData.phone || null,
        email: mappedData.email || null,
        message: mappedData.message || null,
        pipeline_id: webhook.target_pipeline_id || null,
        stage_id: webhook.target_stage_id || null,
        // Note: assigned_user_id is left null - trigger will use round-robin if configured
        assigned_user_id: null,
        property_id: webhook.target_property_id || null,
        source: 'webhook',
        source_detail: webhook.name,
        // Novos campos de qualificação
        renda_familiar: mappedData.renda_familiar || null,
        trabalha: mappedData.trabalha === true || mappedData.trabalha === 'true' || mappedData.trabalha === 'sim' ? true : (mappedData.trabalha === false || mappedData.trabalha === 'false' || mappedData.trabalha === 'nao' ? false : null),
        profissao: mappedData.profissao || null,
        faixa_valor_imovel: mappedData.faixa_valor_imovel || null,
        finalidade_compra: mappedData.finalidade_compra || null,
        procura_financiamento: mappedData.procura_financiamento === true || mappedData.procura_financiamento === 'true' || mappedData.procura_financiamento === 'sim' ? true : (mappedData.procura_financiamento === false || mappedData.procura_financiamento === 'false' || mappedData.procura_financiamento === 'nao' ? false : null),
      })
      .select()
      .single();

    if (leadError) {
      console.error('Lead creation error:', leadError);
      return new Response(
        JSON.stringify({ error: 'Failed to create lead', details: leadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply tags if configured
    const targetTagIds = webhook.target_tag_ids || [];
    if (targetTagIds.length > 0) {
      const leadTags = targetTagIds.map((tagId: string) => ({
        lead_id: lead.id,
        tag_id: tagId,
      }));
      
      await supabase.from('lead_tags').insert(leadTags);
      console.log('Applied tags to lead:', targetTagIds);
    }

    // Note: lead_created activity, timeline events, and round-robin assignment are handled by trigger

    // Update webhook stats
    await supabase
      .from('webhooks_integrations')
      .update({
        leads_received: (webhook.leads_received || 0) + 1,
        last_lead_at: new Date().toISOString(),
      })
      .eq('id', webhook.id);

    console.log('Lead created successfully:', lead.id);

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: lead.id,
        pipeline_id: lead.pipeline_id,
        stage_id: lead.stage_id,
        assigned_user_id: lead.assigned_user_id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
