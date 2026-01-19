import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-wp-token",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Helper to get error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

interface WordPressIntegration {
  id: string;
  organization_id: string;
  pipeline_id: string | null;
  stage_id: string | null;
  default_source: string | null;
}

interface Pipeline {
  id: string;
}

interface Stage {
  id: string;
}

interface Property {
  id: string;
}

interface Lead {
  id: string;
  name: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get token from header
    const wpToken = req.headers.get("x-wp-token");
    
    if (!wpToken) {
      console.error("[WordPress Webhook] Missing token");
      return new Response(
        JSON.stringify({ error: "Missing authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate token against wordpress_integrations table
    const { data: integrationData, error: integrationError } = await supabase
      .from("wordpress_integrations")
      .select("id, organization_id, pipeline_id, stage_id, default_source")
      .eq("api_token", wpToken)
      .eq("is_active", true)
      .single();

    if (integrationError || !integrationData) {
      console.error("[WordPress Webhook] Invalid token:", integrationError);
      return new Response(
        JSON.stringify({ error: "Invalid or inactive token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const integration = integrationData as WordPressIntegration;
    console.log(`[WordPress Webhook] Valid token for org: ${integration.organization_id}`);

    // Parse request body
    const body = await req.json();
    console.log("[WordPress Webhook] Received data:", JSON.stringify(body, null, 2));

    const { name, email, phone, message, property_code, source, form_id, page_url } = body;

    // Validate required fields
    if (!name) {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get default pipeline and stage if not configured
    let pipelineId = integration.pipeline_id;
    let stageId = integration.stage_id;

    if (!pipelineId) {
      const { data: defaultPipelineData } = await supabase
        .from("pipelines")
        .select("id")
        .eq("organization_id", integration.organization_id)
        .eq("is_default", true)
        .single();

      if (defaultPipelineData) {
        const defaultPipeline = defaultPipelineData as Pipeline;
        pipelineId = defaultPipeline.id;

        // Get first stage of pipeline
        const { data: firstStageData } = await supabase
          .from("stages")
          .select("id")
          .eq("pipeline_id", pipelineId)
          .order("position", { ascending: true })
          .limit(1)
          .single();

        stageId = firstStageData ? (firstStageData as Stage).id : null;
      }
    }

    // Find property by code if provided
    let propertyId: string | null = null;
    if (property_code) {
      const { data: propertyData } = await supabase
        .from("properties")
        .select("id")
        .eq("organization_id", integration.organization_id)
        .eq("code", property_code)
        .single();

      propertyId = propertyData ? (propertyData as Property).id : null;
    }

    // Create the lead
    const { data: leadData, error: leadError } = await supabase
      .from("leads")
      .insert({
        organization_id: integration.organization_id,
        name,
        email: email || null,
        phone: phone || null,
        message: message || null,
        pipeline_id: pipelineId,
        stage_id: stageId,
        property_id: propertyId,
        property_code: property_code || null,
        stage_entered_at: new Date().toISOString(),
      })
      .select("id, name")
      .single();

    if (leadError) {
      console.error("[WordPress Webhook] Error creating lead:", leadError);
      return new Response(
        JSON.stringify({ error: "Failed to create lead", details: leadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lead = leadData as Lead;
    console.log(`[WordPress Webhook] Lead created: ${lead.id}`);

    // Create timeline event
    await supabase.from("lead_timeline_events").insert({
      lead_id: lead.id,
      organization_id: integration.organization_id,
      event_type: "lead_created",
      title: "Lead criado via WordPress",
      description: `Lead "${name}" recebido do site WordPress`,
      metadata: {
        source: source || integration.default_source || "wordpress",
        form_id,
        page_url,
      },
    });

    // Update integration stats
    await supabase
      .from("wordpress_integrations")
      .update({
        last_lead_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: lead.id,
        message: `Lead "${lead.name}" created successfully`,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[WordPress Webhook] Error:", error);
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
