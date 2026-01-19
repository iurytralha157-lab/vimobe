import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autorização ausente' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Find integration by token
    const { data: integration, error: integrationError } = await supabase
      .from('wordpress_integrations')
      .select('*')
      .eq('api_token', token)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      console.log('Integration not found or inactive:', integrationError);
      return new Response(JSON.stringify({ error: 'Token inválido ou integração inativa' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await req.json();
    console.log('Received lead data:', body);

    const { name, phone, email, message, property_code } = body;

    if (!name) {
      return new Response(JSON.stringify({ error: 'Nome é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create lead - trigger will handle pipeline/stage assignment, round-robin, and timeline events
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        name,
        phone: phone || null,
        email: email || null,
        message: message || null,
        property_code: property_code || null,
        source: 'wordpress',
        organization_id: integration.organization_id,
        // Pipeline and stage will be set by trigger if null
        pipeline_id: null,
        stage_id: null,
      })
      .select()
      .single();

    if (leadError) {
      console.error('Error creating lead:', leadError);
      return new Response(JSON.stringify({ error: 'Erro ao criar lead' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update integration stats
    await supabase
      .from('wordpress_integrations')
      .update({
        leads_received: (integration.leads_received || 0) + 1,
        last_lead_at: new Date().toISOString(),
      })
      .eq('id', integration.id);

    // Note: lead_created activity and timeline event are now handled by trigger

    console.log('Lead created successfully:', lead.id);

    return new Response(JSON.stringify({ success: true, lead_id: lead.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
