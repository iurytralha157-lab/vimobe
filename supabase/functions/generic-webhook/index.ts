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

    // Apply field mapping - use default if field_mapping is null, undefined or empty object
    const defaultMapping = {
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
    
    const fieldMapping = (webhook.field_mapping && Object.keys(webhook.field_mapping).length > 0)
      ? webhook.field_mapping
      : defaultMapping;
    
    console.log('Using field mapping:', JSON.stringify(fieldMapping));

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

    // ===== DEDUPLICAÇÃO POR TELEFONE =====
    let existingLead = null;
    if (mappedData.phone) {
      // Normalizar telefone
      const normalizedPhone = mappedData.phone.replace(/\D/g, '');
      const phoneWithoutCountry = normalizedPhone.length >= 12 && normalizedPhone.startsWith('55') 
        ? normalizedPhone.substring(2) 
        : normalizedPhone;
      
      // Buscar leads existentes
      const { data: allLeads } = await supabase
        .from('leads')
        .select('id, phone, stage_id, pipeline_id, assigned_user_id, deal_status')
        .eq('organization_id', webhook.organization_id)
        .not('phone', 'is', null);
      
      // Verificar se algum lead tem telefone que combina
      existingLead = allLeads?.find((l: { id: string; phone: string | null }) => {
        if (!l.phone) return false;
        const leadPhone = l.phone.replace(/\D/g, '');
        const leadPhoneWithoutCountry = leadPhone.length >= 12 && leadPhone.startsWith('55')
          ? leadPhone.substring(2)
          : leadPhone;
        return leadPhoneWithoutCountry === phoneWithoutCountry || leadPhone === normalizedPhone;
      });
    }

    // Se encontrou lead existente, fazer REENTRADA COMPLETA
    if (existingLead) {
      console.log(`Found existing lead by phone: ${existingLead.id}`);
      
      // Guardar dados anteriores para o histórico
      const oldStageId = existingLead.stage_id;
      const oldPipelineId = existingLead.pipeline_id;
      const oldAssigneeId = existingLead.assigned_user_id;
      const oldDealStatus = existingLead.deal_status;
      
      // Determinar estágio de destino (mesmo lógica de lead novo)
      let targetStageId = webhook.target_stage_id;
      const targetPipelineId = webhook.target_pipeline_id;
      
      if (!targetStageId && targetPipelineId) {
        const { data: firstStage } = await supabase
          .from('stages')
          .select('id')
          .eq('pipeline_id', targetPipelineId)
          .order('position', { ascending: true })
          .limit(1)
          .single();
        
        if (firstStage) {
          targetStageId = firstStage.id;
        }
      }
      
      // Preparar dados de atualização COMPLETA (como se fosse lead novo)
      const updateData: Record<string, any> = {
        // Dados do formulário
        ...(mappedData.name && mappedData.name !== 'unknown' && { name: mappedData.name }),
        ...(mappedData.email && { email: mappedData.email }),
        ...(mappedData.message && { message: mappedData.message }),
        // Resetar para reprocessamento completo
        stage_id: targetStageId || existingLead.stage_id,
        pipeline_id: targetPipelineId || existingLead.pipeline_id,
        assigned_user_id: null, // Limpar para round-robin redistribuir
        deal_status: 'open', // Resetar status para aberto
        won_at: null,
        lost_at: null,
        lost_reason: null,
        stage_entered_at: new Date().toISOString(),
      };
      
      // Atualizar o lead
      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', existingLead.id);
      
      if (updateError) {
        console.error('Lead update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update lead', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Registrar atividade de reentrada com detalhes completos
      await supabase.from('activities').insert({
        lead_id: existingLead.id,
        type: 'lead_reentry',
        content: `Lead reentrou via webhook "${webhook.name}"`,
        user_id: null,
        metadata: {
          source: 'webhook',
          webhook_id: webhook.id,
          webhook_name: webhook.name,
          pipeline_name: webhook.pipeline?.name,
          stage_name: webhook.stage?.name,
          from_stage_id: oldStageId,
          to_stage_id: targetStageId,
          from_pipeline_id: oldPipelineId,
          to_pipeline_id: targetPipelineId,
          from_status: oldDealStatus,
          to_status: 'open',
          previous_assignee_id: oldAssigneeId,
          new_data: mappedData,
        }
      });
      
      // O trigger trigger_lead_intake vai chamar handle_lead_intake automaticamente
      // porque assigned_user_id foi setado para NULL
      
      // Aplicar tags configuradas
      const targetTagIds = webhook.target_tag_ids || [];
      if (targetTagIds.length > 0) {
        for (const tagId of targetTagIds) {
          await supabase
            .from('lead_tags')
            .upsert({ lead_id: existingLead.id, tag_id: tagId }, { onConflict: 'lead_id,tag_id' });
        }
      }
      
      // Atualizar estatísticas do webhook
      await supabase
        .from('webhooks_integrations')
        .update({
          leads_received: (webhook.leads_received || 0) + 1,
          last_lead_at: new Date().toISOString(),
        })
        .eq('id', webhook.id);
      
      console.log('Lead updated (full reentry):', existingLead.id);
      
      return new Response(
        JSON.stringify({
          success: true,
          lead_id: existingLead.id,
          reentry: true,
          message: 'Lead reentered - moved to configured stage and queued for redistribution',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== LEAD NOVO =====
    // Determine the stage_id: use configured one or get first stage of pipeline
    let stageId = webhook.target_stage_id;
    const pipelineId = webhook.target_pipeline_id;
    
    if (!stageId && pipelineId) {
      // Get first stage of the pipeline (lowest position)
      const { data: firstStage } = await supabase
        .from('stages')
        .select('id')
        .eq('pipeline_id', pipelineId)
        .order('position', { ascending: true })
        .limit(1)
        .single();
      
      if (firstStage) {
        stageId = firstStage.id;
        console.log('Auto-assigned to first stage:', stageId);
      }
    }

    // Create lead (novo - não duplicado)
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        organization_id: webhook.organization_id,
        name: mappedData.name,
        phone: mappedData.phone || null,
        email: mappedData.email || null,
        message: mappedData.message || null,
        pipeline_id: pipelineId || null,
        stage_id: stageId || null,
        assigned_user_id: null,
        property_id: webhook.target_property_id || null,
        source: 'webhook',
        stage_entered_at: stageId ? new Date().toISOString() : null,
      })
      .select('id, pipeline_id, stage_id, assigned_user_id')
      .single();

    if (leadError) {
      console.error('Lead creation error:', leadError);
      return new Response(
        JSON.stringify({ error: 'Failed to create lead', details: leadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registrar atividade de criação do lead
    await supabase.from('activities').insert({
      lead_id: lead.id,
      type: 'lead_created',
      content: `Lead criado via webhook "${webhook.name}"`,
      user_id: null,
      metadata: {
        source: 'webhook',
        webhook_id: webhook.id,
        webhook_name: webhook.name,
        pipeline_name: webhook.pipeline?.name,
        stage_name: webhook.stage?.name,
      }
    });

    // Apply tags if configured (após lead criado com sucesso)
    const targetTagIds = webhook.target_tag_ids || [];
    if (targetTagIds.length > 0) {
      const leadTags = targetTagIds.map((tagId: string) => ({
        lead_id: lead.id,
        tag_id: tagId,
      }));
      
      await supabase.from('lead_tags').insert(leadTags);
      console.log('Applied tags to lead:', targetTagIds);
    }

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
