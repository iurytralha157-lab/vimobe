import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TriggerPayload {
  event_type: string;
  // organization_id NÃO deve vir do payload - buscar do servidor
  data: {
    lead_id?: string;
    conversation_id?: string;
    session_id?: string;
    message?: string;
    old_stage_id?: string;
    new_stage_id?: string;
    tag_id?: string;
    [key: string]: unknown;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload: TriggerPayload = await req.json();
    console.log("Automation trigger received:", JSON.stringify(payload, null, 2));

    const { event_type, data } = payload;

    if (!event_type) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing event_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========= SEGURANÇA: Buscar organization_id do servidor =========
    let organizationId: string | null = null;
    
    // Se tiver lead_id, buscar org do lead
    if (data.lead_id) {
      const { data: lead, error: leadError } = await supabaseAdmin
        .from("leads")
        .select("organization_id")
        .eq("id", data.lead_id)
        .single();
      
      if (!leadError && lead) {
        organizationId = lead.organization_id;
      }
    }
    
    // Se tiver conversation_id, buscar org da conversa
    if (!organizationId && data.conversation_id) {
      const { data: conversation, error: convError } = await supabaseAdmin
        .from("whatsapp_conversations")
        .select("organization_id")
        .eq("id", data.conversation_id)
        .single();
      
      if (!convError && conversation) {
        organizationId = conversation.organization_id;
      }
    }
    
    // Se tiver session_id, buscar org da sessão
    if (!organizationId && data.session_id) {
      const { data: session, error: sessError } = await supabaseAdmin
        .from("whatsapp_sessions")
        .select("organization_id")
        .eq("id", data.session_id)
        .single();
      
      if (!sessError && session) {
        organizationId = session.organization_id;
      }
    }

    if (!organizationId) {
      console.error("Could not determine organization_id from data");
      return new Response(
        JSON.stringify({ success: false, error: "Could not determine organization from data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Resolved organization_id: ${organizationId}`);

    // Map event types to trigger types
    const triggerTypeMap: Record<string, string> = {
      message_received: "message_received",
      lead_stage_changed: "stage_change",
      lead_created: "lead_created",
      tag_added: "tag_added",
      tag_removed: "tag_removed",
    };

    const triggerType = triggerTypeMap[event_type];
    if (!triggerType) {
      console.log(`Unknown event type: ${event_type}`);
      return new Response(
        JSON.stringify({ success: true, message: "Unknown event type, skipping" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find active automations matching this trigger
    const { data: automations, error: automationsError } = await supabaseAdmin
      .from("automations")
      .select(`
        *,
        nodes:automation_nodes(*),
        connections:automation_connections(*)
      `)
      .eq("organization_id", organizationId)
      .eq("trigger_type", triggerType)
      .eq("is_active", true);

    if (automationsError) {
      console.error("Error fetching automations:", automationsError);
      throw automationsError;
    }

    if (!automations || automations.length === 0) {
      console.log(`No active automations found for trigger: ${triggerType}`);
      return new Response(
        JSON.stringify({ success: true, message: "No matching automations" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${automations.length} automation(s) for trigger: ${triggerType}`);

    // Process each matching automation
    for (const automation of automations) {
      try {
        // Check trigger conditions
        const triggerConfig = automation.trigger_config || {};
        
        // Validate conditions based on trigger type
        if (!validateTriggerConditions(triggerType, triggerConfig, data)) {
          console.log(`Automation ${automation.id} conditions not met, skipping`);
          continue;
        }

        // Find the trigger node (starting point)
        const triggerNode = automation.nodes?.find((n: { node_type: string }) => n.node_type === "trigger");
        if (!triggerNode) {
          console.log(`Automation ${automation.id} has no trigger node, skipping`);
          continue;
        }

        // Find the next node after trigger
        const nextConnection = automation.connections?.find(
          (c: { source_node_id: string }) => c.source_node_id === triggerNode.id
        );
        
        if (!nextConnection) {
          console.log(`Automation ${automation.id} has no connections from trigger, skipping`);
          continue;
        }

        // Create execution record
        const { data: execution, error: execError } = await supabaseAdmin
          .from("automation_executions")
          .insert({
            automation_id: automation.id,
            organization_id: organizationId,
            lead_id: data.lead_id || null,
            conversation_id: data.conversation_id || null,
            current_node_id: nextConnection.target_node_id,
            status: "running",
            started_at: new Date().toISOString(),
            execution_data: {
              trigger_data: data,
              variables: {},
            },
          })
          .select()
          .single();

        if (execError) {
          console.error(`Error creating execution for automation ${automation.id}:`, execError);
          continue;
        }

        console.log(`Created execution ${execution.id} for automation ${automation.id}`);

        // Call executor to process the first node
        const executorResponse = await fetch(`${SUPABASE_URL}/functions/v1/automation-executor`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            execution_id: execution.id,
          }),
        });

        if (!executorResponse.ok) {
          const errorText = await executorResponse.text();
          console.error(`Executor failed for execution ${execution.id}:`, errorText);
        }

      } catch (automationError) {
        console.error(`Error processing automation ${automation.id}:`, automationError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Processed ${automations.length} automation(s)` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Automation trigger error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function validateTriggerConditions(
  triggerType: string,
  config: Record<string, unknown>,
  data: Record<string, unknown>
): boolean {
  switch (triggerType) {
    case "message_received":
      // Check session filter if configured
      if (config.session_id && config.session_id !== data.session_id) {
        return false;
      }
      // Check keyword filter if configured
      if (config.keyword) {
        const message = (data.message as string || "").toLowerCase();
        const keyword = (config.keyword as string).toLowerCase();
        if (!message.includes(keyword)) {
          return false;
        }
      }
      return true;

    case "stage_change":
      // Check specific stage transition
      if (config.from_stage_id && config.from_stage_id !== data.old_stage_id) {
        return false;
      }
      if (config.to_stage_id && config.to_stage_id !== data.new_stage_id) {
        return false;
      }
      return true;

    case "lead_created":
      // No specific conditions for lead creation
      return true;

    case "tag_added":
    case "tag_removed":
      // Check specific tag if configured
      if (config.tag_id && config.tag_id !== data.tag_id) {
        return false;
      }
      return true;

    default:
      return true;
  }
}
