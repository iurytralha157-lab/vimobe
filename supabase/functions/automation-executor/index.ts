import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExecutionPayload {
  execution_id: string;
}

// Normalize phone number to international format (Brazil default)
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");
  
  console.log(`Normalizing phone: "${phone}" -> digits: "${digits}" (length: ${digits.length})`);
  
  // If already starts with country code (55 for Brazil) and has 12+ digits, return as-is
  if (digits.startsWith("55") && digits.length >= 12) {
    console.log(`Phone already has country code: ${digits}`);
    return digits;
  }
  
  // If it's a Brazilian number (10-11 digits without country code), add 55
  if (digits.length >= 10 && digits.length <= 11) {
    const normalized = `55${digits}`;
    console.log(`Added country code: ${normalized}`);
    return normalized;
  }
  
  console.log(`Phone format unknown, returning as-is: ${digits}`);
  // Return as-is for other formats
  return digits;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload: ExecutionPayload = await req.json();
    console.log("Automation executor received:", JSON.stringify(payload, null, 2));

    const { execution_id } = payload;

    if (!execution_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing execution_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch execution with automation details
    const { data: execution, error: execError } = await supabase
      .from("automation_executions")
      .select(`
        *,
        automation:automations(
          *,
          nodes:automation_nodes(*),
          connections:automation_connections(*)
        )
      `)
      .eq("id", execution_id)
      .single();

    if (execError || !execution) {
      console.error("Execution not found:", execError);
      return new Response(
        JSON.stringify({ success: false, error: "Execution not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (execution.status === "completed" || execution.status === "failed") {
      console.log(`Execution ${execution_id} already ${execution.status}`);
      return new Response(
        JSON.stringify({ success: true, message: "Execution already finished" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const automation = execution.automation;
    const currentNodeId = execution.current_node_id;
    const executionData = execution.execution_data || {};

    // Find current node
    const currentNode = automation.nodes?.find((n: { id: string }) => n.id === currentNodeId);
    if (!currentNode) {
      console.error(`Node ${currentNodeId} not found in automation`);
      await markExecutionFailed(supabase, execution_id, "Node not found");
      return new Response(
        JSON.stringify({ success: false, error: "Node not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing node: ${currentNode.node_type} (${currentNode.action_type || ""})`);

    let nextNodeId: string | null = null;
    const nodeConfig = currentNode.node_config || currentNode.config || {};

    try {
      // Process node based on type
      switch (currentNode.node_type) {
        case "action":
          await processActionNode(
            supabase,
            currentNode,
            execution,
            executionData,
            SUPABASE_URL,
            EVOLUTION_API_URL,
            EVOLUTION_API_KEY
          );
          // Find next node after action
          const actionConnection = automation.connections?.find(
            (c: { source_node_id: string }) => c.source_node_id === currentNodeId
          );
          nextNodeId = actionConnection?.target_node_id || null;
          break;

        case "condition":
          // Evaluate condition
          const conditionResult = evaluateCondition(nodeConfig, execution, executionData);
          console.log(`Condition evaluated to: ${conditionResult}`);
          
          // Find connection for this branch
          const branchConnection = automation.connections?.find(
            (c: { source_node_id: string; condition_branch?: string }) => 
              c.source_node_id === currentNodeId && 
              c.condition_branch === (conditionResult ? "true" : "false")
          );
          nextNodeId = branchConnection?.target_node_id || null;
          break;

        case "delay":
          // Calculate delay - support both old format (delay_minutes/hours/days) and new format (delay_type + delay_value)
          let totalDelayMs = 0;
          
          // New format: delay_type + delay_value (from NodeConfigPanel)
          const delayType = nodeConfig.delay_type as string;
          const delayValue = Number(nodeConfig.delay_value) || 0;
          
          if (delayType && delayValue > 0) {
            switch (delayType) {
              case "minutes":
                totalDelayMs = delayValue * 60 * 1000;
                break;
              case "hours":
                totalDelayMs = delayValue * 60 * 60 * 1000;
                break;
              case "days":
                totalDelayMs = delayValue * 24 * 60 * 60 * 1000;
                break;
              default:
                totalDelayMs = delayValue * 60 * 1000; // Default to minutes
            }
          } else {
            // Old format: delay_minutes, delay_hours, delay_days
            const delayMinutes = Number(nodeConfig.delay_minutes || nodeConfig.minutes) || 0;
            const delayHours = Number(nodeConfig.delay_hours || nodeConfig.hours) || 0;
            const delayDays = Number(nodeConfig.delay_days || nodeConfig.days) || 0;
            
            totalDelayMs = 
              (delayMinutes * 60 * 1000) + 
              (delayHours * 60 * 60 * 1000) + 
              (delayDays * 24 * 60 * 60 * 1000);
          }

          console.log(`Delay calculated: ${totalDelayMs}ms (type: ${delayType}, value: ${delayValue})`);

          if (totalDelayMs > 0) {
            const nextExecutionAt = new Date(Date.now() + totalDelayMs).toISOString();
            console.log(`Scheduling next execution at: ${nextExecutionAt}`);
            
            // Find next node
            const delayConnection = automation.connections?.find(
              (c: { source_node_id: string }) => c.source_node_id === currentNodeId
            );
            
            if (delayConnection) {
              // Update execution to wait
              await supabase
                .from("automation_executions")
                .update({
                  status: "waiting",
                  current_node_id: delayConnection.target_node_id,
                  next_execution_at: nextExecutionAt,
                  execution_data: executionData,
                })
                .eq("id", execution_id);

              return new Response(
                JSON.stringify({ 
                  success: true, 
                  message: "Waiting for delay",
                  delay_ms: totalDelayMs,
                  next_execution_at: nextExecutionAt 
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          } else {
            // No delay, continue immediately
            const delayConn = automation.connections?.find(
              (c: { source_node_id: string }) => c.source_node_id === currentNodeId
            );
            nextNodeId = delayConn?.target_node_id || null;
          }
          break;

        default:
          console.log(`Unknown node type: ${currentNode.node_type}`);
      }

      // If there's a next node, continue processing
      if (nextNodeId) {
        // Update execution to next node
        await supabase
          .from("automation_executions")
          .update({
            current_node_id: nextNodeId,
            execution_data: executionData,
          })
          .eq("id", execution_id);

        // Continue processing (recursive call)
        const continueResponse = await fetch(`${SUPABASE_URL}/functions/v1/automation-executor`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ execution_id }),
        });

        if (!continueResponse.ok) {
          console.error("Error continuing execution:", await continueResponse.text());
        }
      } else {
        // No more nodes, mark as completed
        await supabase
          .from("automation_executions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", execution_id);

        console.log(`Execution ${execution_id} completed`);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Node processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (nodeError) {
      console.error(`Error processing node ${currentNodeId}:`, nodeError);
      await markExecutionFailed(supabase, execution_id, 
        nodeError instanceof Error ? nodeError.message : "Unknown error"
      );
      throw nodeError;
    }

  } catch (error: unknown) {
    console.error("Automation executor error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// deno-lint-ignore no-explicit-any
async function markExecutionFailed(supabase: any, executionId: string, error: string) {
  await supabase
    .from("automation_executions")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: error,
    })
    .eq("id", executionId);
}

// deno-lint-ignore no-explicit-any
async function processActionNode(
  supabase: any,
  node: { action_type: string; node_config?: Record<string, unknown>; config?: Record<string, unknown> },
  execution: { lead_id?: string; conversation_id?: string; organization_id: string },
  _executionData: Record<string, unknown>,
  supabaseUrl: string,
  evolutionApiUrl?: string,
  evolutionApiKey?: string
) {
  // Suportar ambos os formatos de config
  const config = node.node_config || node.config || {};
  const actionType = node.action_type;

  console.log(`Executing action: ${actionType}`, config);

  switch (actionType) {
    case "send_whatsapp":
      // Se tem session_id específica configurada, usar ela
      const configuredSessionId = config.session_id as string;
      
      if (configuredSessionId) {
        // Enviar usando sessão específica configurada
        const { data: session } = await supabase
          .from("whatsapp_sessions")
          .select("*")
          .eq("id", configuredSessionId)
          .single();
        
        if (!session) {
          console.log("Configured session not found:", configuredSessionId);
          return;
        }
        
        // Precisamos do telefone do lead
        if (execution.lead_id) {
          const { data: lead } = await supabase
            .from("leads")
            .select("phone, name")
            .eq("id", execution.lead_id)
            .single();
          
          if (!lead || !lead.phone) {
            console.log("Lead has no phone number");
            return;
          }
          
          if (evolutionApiUrl && evolutionApiKey) {
            const messageContent = await replaceVariables(
              supabase,
              config.message as string || config.template_content as string || "",
              execution,
              { contact_name: lead.name, contact_phone: lead.phone }
            );

            const response = await fetch(
              `${evolutionApiUrl}/message/sendText/${session.instance_name}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: evolutionApiKey,
                },
                body: JSON.stringify({
                  number: normalizePhoneNumber(lead.phone),
                  text: messageContent,
                }),
              }
            );

            if (!response.ok) {
              const errorText = await response.text();
              console.error("Error sending WhatsApp message:", errorText);
              throw new Error(`Failed to send WhatsApp: ${errorText}`);
            }

            console.log("WhatsApp message sent successfully via configured session");
          }
        }
        return;
      }
      
      // Fallback para conversation_id (comportamento original)
      if (!execution.conversation_id) {
        console.log("No conversation_id or session_id configured, skipping WhatsApp send");
        return;
      }

      // Get conversation and session details
      const { data: conversation } = await supabase
        .from("whatsapp_conversations")
        .select("*, session:whatsapp_sessions(*)")
        .eq("id", execution.conversation_id)
        .single();

      if (!conversation || !conversation.session) {
        console.log("Conversation or session not found");
        return;
      }

      // Send message via Evolution API
      if (evolutionApiUrl && evolutionApiKey) {
        const messageContent = await replaceVariables(
          supabase,
          config.message as string || config.template_content as string || "",
          execution,
          conversation
        );

        const response = await fetch(
          `${evolutionApiUrl}/message/sendText/${conversation.session.instance_name}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: evolutionApiKey,
            },
            body: JSON.stringify({
              number: normalizePhoneNumber(conversation.contact_phone),
              text: messageContent,
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error sending WhatsApp message:", errorText);
          throw new Error(`Failed to send WhatsApp: ${errorText}`);
        }

        console.log("WhatsApp message sent successfully");
      }
      break;

    case "move_stage":
      if (!execution.lead_id) {
        console.log("No lead_id, skipping stage move");
        return;
      }

      const targetStageId = config.stage_id || config.target_stage_id;
      if (!targetStageId) {
        console.log("No target stage configured");
        return;
      }

      await supabase
        .from("leads")
        .update({
          stage_id: targetStageId,
          stage_entered_at: new Date().toISOString(),
        })
        .eq("id", execution.lead_id);

      console.log(`Lead ${execution.lead_id} moved to stage ${targetStageId}`);
      break;

    case "add_tag":
      if (!execution.lead_id) {
        console.log("No lead_id, skipping tag add");
        return;
      }

      const tagId = config.tag_id;
      if (!tagId) {
        console.log("No tag_id configured");
        return;
      }

      // Check if tag already exists
      const { data: existingTag } = await supabase
        .from("lead_tags")
        .select("id")
        .eq("lead_id", execution.lead_id)
        .eq("tag_id", tagId)
        .maybeSingle();

      if (!existingTag) {
        await supabase
          .from("lead_tags")
          .insert({
            lead_id: execution.lead_id,
            tag_id: tagId,
          });
        console.log(`Tag ${tagId} added to lead ${execution.lead_id}`);
      }
      break;

    case "remove_tag":
      if (!execution.lead_id) {
        console.log("No lead_id, skipping tag remove");
        return;
      }

      const removeTagId = config.tag_id;
      if (!removeTagId) {
        console.log("No tag_id configured");
        return;
      }

      await supabase
        .from("lead_tags")
        .delete()
        .eq("lead_id", execution.lead_id)
        .eq("tag_id", removeTagId);

      console.log(`Tag ${removeTagId} removed from lead ${execution.lead_id}`);
      break;

    case "assign_user":
      if (!execution.lead_id) {
        console.log("No lead_id, skipping user assignment");
        return;
      }

      const assignUserId = config.user_id || config.assigned_user_id;
      if (!assignUserId) {
        console.log("No user_id configured");
        return;
      }

      await supabase
        .from("leads")
        .update({ assigned_user_id: assignUserId })
        .eq("id", execution.lead_id);

      console.log(`Lead ${execution.lead_id} assigned to user ${assignUserId}`);
      break;

    case "create_task":
      if (!execution.lead_id) {
        console.log("No lead_id, skipping task creation");
        return;
      }

      await supabase
        .from("lead_tasks")
        .insert({
          lead_id: execution.lead_id,
          title: config.task_title as string || "Tarefa automática",
          description: config.task_description as string || null,
          type: config.task_type as string || "task",
          due_date: config.due_days 
            ? new Date(Date.now() + (config.due_days as number) * 24 * 60 * 60 * 1000).toISOString()
            : null,
        });

      console.log(`Task created for lead ${execution.lead_id}`);
      break;

    case "send_notification":
      const notifyUserId = config.notify_user_id || config.user_id;
      if (!notifyUserId) {
        console.log("No user_id for notification");
        return;
      }

      await supabase.from("notifications").insert({
        user_id: notifyUserId,
        organization_id: execution.organization_id,
        title: config.notification_title as string || "Notificação de automação",
        content: config.notification_content as string || null,
        type: "automation",
        lead_id: execution.lead_id || null,
      });

      console.log(`Notification sent to user ${notifyUserId}`);
      break;

    default:
      console.log(`Unknown action type: ${actionType}`);
  }
}

function evaluateCondition(
  config: Record<string, unknown>,
  execution: { lead_id?: string; conversation_id?: string },
  _executionData: Record<string, unknown>
): boolean {
  const conditionType = config.condition_type || config.type;
  const conditionValue = config.condition_value || config.value;

  // For now, simple conditions - can be expanded
  switch (conditionType) {
    case "has_lead":
      return !!execution.lead_id;
    case "has_conversation":
      return !!execution.conversation_id;
    case "always_true":
      return true;
    case "always_false":
      return false;
    default:
      // Default to true for unknown conditions
      return true;
  }
}

// deno-lint-ignore no-explicit-any
async function replaceVariables(
  supabase: any,
  template: string,
  execution: { lead_id?: string; conversation_id?: string; organization_id: string },
  conversation?: { contact_name?: string; contact_phone?: string }
): Promise<string> {
  let result = template;

  // Replace date/time first (always available)
  result = result.replace(/\{\{date\}\}/g, new Date().toLocaleDateString("pt-BR"));
  result = result.replace(/\{\{time\}\}/g, new Date().toLocaleTimeString("pt-BR"));

  // Replace contact info from conversation
  if (conversation) {
    result = result.replace(/\{\{contact_name\}\}/g, conversation.contact_name || "");
    result = result.replace(/\{\{contact_phone\}\}/g, conversation.contact_phone || "");
  }

  // Fetch lead data if lead_id exists
  if (execution.lead_id) {
    const { data: lead } = await supabase
      .from("leads")
      .select("*, organization:organizations(name)")
      .eq("id", execution.lead_id)
      .single();
    
    if (lead) {
      result = result.replace(/\{\{lead\.name\}\}/g, lead.name || "");
      result = result.replace(/\{\{lead\.phone\}\}/g, lead.phone || "");
      result = result.replace(/\{\{lead\.email\}\}/g, lead.email || "");
      result = result.replace(/\{\{lead\.source\}\}/g, lead.source || "");
      result = result.replace(/\{\{lead\.message\}\}/g, lead.message || "");
      result = result.replace(/\{\{lead\.valor_interesse\}\}/g, 
        lead.valor_interesse ? `R$ ${Number(lead.valor_interesse).toLocaleString("pt-BR")}` : ""
      );
      result = result.replace(/\{\{organization\.name\}\}/g, lead.organization?.name || "");
    }
    
    // Fetch telecom customer data if exists
    const { data: customer } = await supabase
      .from("telecom_customers")
      .select("*")
      .eq("lead_id", execution.lead_id)
      .maybeSingle();
    
    if (customer) {
      result = result.replace(/\{\{customer\.address\}\}/g, customer.address || "");
      result = result.replace(/\{\{customer\.city\}\}/g, customer.city || "");
      result = result.replace(/\{\{customer\.neighborhood\}\}/g, customer.neighborhood || "");
      result = result.replace(/\{\{customer\.cep\}\}/g, customer.cep || "");
      result = result.replace(/\{\{customer\.cpf_cnpj\}\}/g, customer.cpf_cnpj || "");
      result = result.replace(/\{\{customer\.contracted_plan\}\}/g, customer.contracted_plan || "");
      result = result.replace(/\{\{customer\.plan_value\}\}/g, 
        customer.plan_value ? `R$ ${Number(customer.plan_value).toLocaleString("pt-BR")}` : ""
      );
      result = result.replace(/\{\{customer\.reference_point\}\}/g, customer.reference_point || "");
    }
  }

  return result;
}
