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
    
    // Extract interest IDs from field_mapping (these are stored directly, not as field mappings)
    const interestPropertyId = webhook.field_mapping?.interest_property_id || null;
    const interestPlanId = webhook.field_mapping?.interest_plan_id || null;
    
    // Get actual field mapping (filter out interest configs)
    const fieldMapping = Object.fromEntries(
      Object.entries(webhook.field_mapping || {}).filter(
        ([key]) => !key.startsWith('interest_')
      )
    );
    
    const effectiveMapping = Object.keys(fieldMapping).length > 0 ? fieldMapping : defaultMapping;
    
    console.log('Using field mapping:', JSON.stringify(effectiveMapping));
    console.log('Interest property ID:', interestPropertyId);
    console.log('Interest plan ID:', interestPlanId);

    const mappedData: Record<string, any> = {};
    for (const [targetField, sourceField] of Object.entries(effectiveMapping)) {
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
      
      // Verificar configuração de reentrada na fila de distribuição
      // Primeiro, buscar a fila que seria usada para este lead
      const { data: matchingQueue } = await supabase
        .rpc('pick_round_robin_for_lead', { p_lead_id: existingLead.id });
      
      let queueReentryBehavior = 'redistribute'; // default
      if (matchingQueue) {
        const { data: queueData } = await supabase
          .from('round_robins')
          .select('reentry_behavior')
          .eq('id', matchingQueue)
          .single();
        
        if (queueData?.reentry_behavior) {
          queueReentryBehavior = queueData.reentry_behavior;
        }
      }
      
      console.log(`Queue reentry behavior: ${queueReentryBehavior}`);
      
      // Se a fila está configurada para manter responsável E o lead tinha um responsável
      const shouldKeepAssignee = queueReentryBehavior === 'keep_assignee' && oldAssigneeId;
      
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
      
      // Preparar dados de atualização
      const updateData: Record<string, any> = {
        // Dados do formulário
        ...(mappedData.name && mappedData.name !== 'unknown' && { name: mappedData.name }),
        ...(mappedData.email && { email: mappedData.email }),
        ...(mappedData.message && { message: mappedData.message }),
        // Resetar para reprocessamento completo
        stage_id: targetStageId || existingLead.stage_id,
        pipeline_id: targetPipelineId || existingLead.pipeline_id,
        // Manter ou limpar responsável baseado na configuração
        assigned_user_id: shouldKeepAssignee ? oldAssigneeId : null,
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
          keep_assignee: shouldKeepAssignee,
          new_data: mappedData,
        }
      });
      
      let finalAssigneeId = oldAssigneeId;
      
      if (shouldKeepAssignee) {
        // Lead continua com o responsável anterior
        console.log('Keeping original assignee per queue config:', oldAssigneeId);
        
        // Registrar que o lead continua com o mesmo responsável
        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('id', oldAssigneeId)
          .single();
        
        await supabase.from('activities').insert({
          lead_id: existingLead.id,
          type: 'assignee_changed',
          content: `Lead continua com ${userData?.name || 'responsável anterior'} (configuração da fila)`,
          user_id: oldAssigneeId,
          metadata: {
            to_user_id: oldAssigneeId,
            to_user_name: userData?.name,
            reason: 'keep_assignee_config',
          }
        });
      } else {
        // Chamar redistribuição via RPC
        console.log('Calling handle_lead_intake for redistribution...');
        const { data: redistributionResult, error: redistributionError } = await supabase
          .rpc('handle_lead_intake', { p_lead_id: existingLead.id });
        
        if (redistributionError) {
          console.error('Redistribution error:', redistributionError);
        }
        
        if (redistributionResult?.assigned_user_id) {
          console.log(`Lead redistributed to: ${redistributionResult.assigned_user_id}`);
          finalAssigneeId = redistributionResult.assigned_user_id;
        } else {
          // Se não conseguiu redistribuir, manter o responsável anterior
          if (oldAssigneeId) {
            console.log('No redistribution available, keeping original assignee:', oldAssigneeId);
            await supabase
              .from('leads')
              .update({ assigned_user_id: oldAssigneeId, assigned_at: new Date().toISOString() })
              .eq('id', existingLead.id);
            
            // Registrar que o lead continua com o mesmo responsável
            const { data: userData } = await supabase
              .from('users')
              .select('name')
              .eq('id', oldAssigneeId)
              .single();
            
            await supabase.from('activities').insert({
              lead_id: existingLead.id,
              type: 'assignee_changed',
              content: `Lead continua com ${userData?.name || 'responsável anterior'}`,
              user_id: oldAssigneeId,
              metadata: {
                to_user_id: oldAssigneeId,
                to_user_name: userData?.name,
                reason: 'no_redistribution_available',
              }
            });
          } else {
            console.log('No previous assignee and no redistribution available');
            finalAssigneeId = null;
          }
        }
      }
      
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
          assigned_user_id: finalAssigneeId,
          message: shouldKeepAssignee ? 'Lead reentered - kept original assignee' : 'Lead reentered and redistributed',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== LEAD NOVO =====
    // Note: pipeline_id and stage_id are left null - distribution queues will set them via handle_lead_intake

    // ===== RESOLVE DYNAMIC PROPERTY/PLAN FROM PAYLOAD =====
    let resolvedPropertyId = interestPropertyId;
    let resolvedPlanId = interestPlanId;
    
    // Check for property_id in payload (can be UUID or code like "AP0004")
    const payloadPropertyId = body.property_id || mappedData.property_id;
    if (payloadPropertyId) {
      console.log('Looking up property by:', payloadPropertyId);
      
      // Try UUID first
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payloadPropertyId);
      
      if (isUuid) {
        const { data: prop } = await supabase
          .from('properties')
          .select('id')
          .eq('id', payloadPropertyId)
          .eq('organization_id', webhook.organization_id)
          .maybeSingle();
        
        if (prop) {
          resolvedPropertyId = prop.id;
          console.log('Found property by UUID:', resolvedPropertyId);
        }
      } else {
        // Try by code
        const { data: prop } = await supabase
          .from('properties')
          .select('id')
          .eq('code', payloadPropertyId)
          .eq('organization_id', webhook.organization_id)
          .maybeSingle();
        
        if (prop) {
          resolvedPropertyId = prop.id;
          console.log('Found property by code:', resolvedPropertyId);
        }
      }
    }
    
    // Check for plan_id in payload (can be UUID or code)
    const payloadPlanId = body.plan_id || mappedData.plan_id;
    if (payloadPlanId) {
      console.log('Looking up plan by:', payloadPlanId);
      
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payloadPlanId);
      
      if (isUuid) {
        const { data: plan } = await supabase
          .from('service_plans')
          .select('id')
          .eq('id', payloadPlanId)
          .eq('organization_id', webhook.organization_id)
          .maybeSingle();
        
        if (plan) {
          resolvedPlanId = plan.id;
          console.log('Found plan by UUID:', resolvedPlanId);
        }
      } else {
        // Try by code
        const { data: plan } = await supabase
          .from('service_plans')
          .select('id')
          .eq('code', payloadPlanId)
          .eq('organization_id', webhook.organization_id)
          .maybeSingle();
        
        if (plan) {
          resolvedPlanId = plan.id;
          console.log('Found plan by code:', resolvedPlanId);
        }
      }
    }

    // Create lead (novo - não duplicado)
    // Note: pipeline_id and stage_id are left null - distribution queues will set them
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        organization_id: webhook.organization_id,
        name: mappedData.name,
        phone: mappedData.phone || null,
        email: mappedData.email || null,
        message: mappedData.message || null,
        pipeline_id: null, // Distribution queue will set this
        stage_id: null, // Distribution queue will set this
        assigned_user_id: null,
        interest_property_id: resolvedPropertyId,
        interest_plan_id: resolvedPlanId,
        source: 'webhook',
        source_webhook_id: webhook.id, // Track which webhook created this lead
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

    // ===== SAVE TRACKING DATA TO lead_meta =====
    const trackingData = {
      // Campaign data
      campaign_id: body.campaign_id || null,
      campaign_name: body.campaign_name || null,
      adset_id: body.adset_id || null,
      adset_name: body.adset_name || null,
      ad_id: body.ad_id || null,
      ad_name: body.ad_name || null,
      form_name: body.form_name || null,
      platform: body.platform || null,
      // UTM parameters
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      utm_content: body.utm_content || null,
      utm_term: body.utm_term || null,
      // Additional
      contact_notes: body.contact_notes || null,
      source_type: 'webhook',
      raw_payload: body,
    };

    // Only insert if there's any tracking data
    const hasTrackingData = Object.entries(trackingData)
      .filter(([key]) => !['source_type', 'raw_payload'].includes(key))
      .some(([_, value]) => value !== null);

    if (hasTrackingData) {
      const { error: metaError } = await supabase.from('lead_meta').insert({
        lead_id: lead.id,
        ...trackingData,
      });
      
      if (metaError) {
        console.error('Error inserting lead_meta:', metaError);
        // Don't fail the request, just log the error
      } else {
        console.log('Tracking data saved to lead_meta');
      }
    }

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
