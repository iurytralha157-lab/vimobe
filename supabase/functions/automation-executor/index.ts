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

        case "delay": {
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

          // Find next node connection (check for source_handle to support branching)
          const delayConnection = automation.connections?.find(
            (c: { source_node_id: string; source_handle?: string }) => 
              c.source_node_id === currentNodeId && 
              (!c.source_handle || c.source_handle === "no_reply" || c.source_handle === "default")
          ) || automation.connections?.find(
            (c: { source_node_id: string }) => c.source_node_id === currentNodeId
          );

          if (totalDelayMs > 0 && delayConnection) {
            // SHORT DELAYS (≤ 2 minutes): wait inline for precision
            // Edge functions have a max timeout, so we cap inline waits at 120s
            const TWO_MINUTES_MS = 2 * 60 * 1000;
            
            if (totalDelayMs <= TWO_MINUTES_MS) {
              console.log(`⚡ Short delay (${totalDelayMs}ms) - waiting inline for precision`);
              
              // Mark as waiting so UI shows correct status
              await supabase
                .from("automation_executions")
                .update({
                  status: "waiting",
                  current_node_id: delayConnection.target_node_id,
                  next_execution_at: new Date(Date.now() + totalDelayMs).toISOString(),
                  execution_data: executionData,
                })
                .eq("id", execution_id);
              
              // Wait inline
              await new Promise(resolve => setTimeout(resolve, totalDelayMs));
              
              // Check if execution was cancelled during wait (e.g., lead replied)
              const { data: checkExec } = await supabase
                .from("automation_executions")
                .select("status")
                .eq("id", execution_id)
                .single();
              
              if (checkExec?.status === "cancelled" || checkExec?.status === "replied") {
                console.log(`Execution ${execution_id} was ${checkExec.status} during inline wait`);
                return new Response(
                  JSON.stringify({ success: true, message: `Execution ${checkExec.status} during wait` }),
                  { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
              
              // Update to running and continue
              await supabase
                .from("automation_executions")
                .update({ status: "running", next_execution_at: null })
                .eq("id", execution_id);
              
              // Continue to next node
              nextNodeId = delayConnection.target_node_id;
            } else {
              // LONG DELAYS (> 2 minutes): use cron-based approach
              const nextExecutionAt = new Date(Date.now() + totalDelayMs).toISOString();
              console.log(`🕐 Long delay - scheduling via cron at: ${nextExecutionAt}`);
              
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
                  message: "Waiting for delay (cron)",
                  delay_ms: totalDelayMs,
                  next_execution_at: nextExecutionAt 
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          } else if (totalDelayMs <= 0) {
            // No delay, continue immediately
            const delayConn = automation.connections?.find(
              (c: { source_node_id: string }) => c.source_node_id === currentNodeId
            );
            nextNodeId = delayConn?.target_node_id || null;
          }
          break;
        }

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

        // Send completion notification
        await sendAutomationNotification(
          supabase,
          execution,
          automation,
          "completed"
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Node processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (nodeError) {
      console.error(`Error processing node ${currentNodeId}:`, nodeError);
      const errorMsg = nodeError instanceof Error ? nodeError.message : "Unknown error";
      await markExecutionFailed(supabase, execution_id, errorMsg);
      
      // Send failure notification
      await sendAutomationNotification(
        supabase,
        execution,
        automation,
        "failed",
        errorMsg
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

// Helper function to translate common error messages to Portuguese
function translateError(error: string): string {
  if (error.includes("exists") && error.includes("false")) {
    return "Número WhatsApp inválido ou não cadastrado";
  }
  if (error.includes("Connection refused") || error.includes("ECONNREFUSED")) {
    return "Falha na conexão com WhatsApp";
  }
  if (error.includes("timeout") || error.includes("ETIMEDOUT")) {
    return "Tempo limite excedido";
  }
  if (error.includes("not connected")) {
    return "Sessão WhatsApp desconectada";
  }
  // Return first 200 chars for other errors
  return error.length > 200 ? error.substring(0, 200) + "..." : error;
}

// deno-lint-ignore no-explicit-any
async function sendAutomationNotification(
  supabase: any,
  execution: { lead_id?: string; organization_id: string },
  automation: { name: string; created_by?: string },
  status: "completed" | "failed",
  errorMessage?: string
) {
  try {
    // Get lead info
    let leadName = "Lead";
    let notifyUserId: string | null = automation.created_by || null;
    
    if (execution.lead_id) {
      const { data: lead } = await supabase
        .from("leads")
        .select("name, assigned_user_id")
        .eq("id", execution.lead_id)
        .single();
      
      if (lead) {
        leadName = lead.name || "Lead";
        notifyUserId = lead.assigned_user_id || automation.created_by || null;
      }
    }
    
    if (!notifyUserId) {
      console.log("No user to notify for automation completion/failure");
      return;
    }
    
    const isSuccess = status === "completed";
    const title = isSuccess ? "✅ Automação Concluída" : "❌ Automação Falhou";
    const translatedError = errorMessage ? translateError(errorMessage) : "";
    const content = isSuccess
      ? `"${automation.name}" finalizou para ${leadName}`
      : `"${automation.name}" falhou para ${leadName}: ${translatedError}`;
    
    await supabase.from("notifications").insert({
      user_id: notifyUserId,
      organization_id: execution.organization_id,
      title,
      content,
      type: "automation",
      lead_id: execution.lead_id || null,
    });
    
    console.log(`Notification sent: automation ${status} for ${leadName}`);
  } catch (notifError) {
    console.error("Error sending automation notification:", notifError);
  }
}

// Helper function to log automation activity
// deno-lint-ignore no-explicit-any
async function logAutomationActivity(
  supabase: any,
  leadId: string | undefined,
  type: string,
  content: string,
  metadata: Record<string, unknown> = {}
) {
  if (!leadId) return;
  
  try {
    await supabase.from("activities").insert({
      lead_id: leadId,
      type,
      content,
      metadata: { ...metadata, is_automation: true },
      user_id: null, // No user - it's automated
    });
    console.log(`Activity logged: ${type} for lead ${leadId}`);
  } catch (err) {
    console.error("Error logging activity:", err);
  }
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

            const sendResult = await response.json();
            const sentMessageId = sendResult?.key?.id || sendResult?.messageId || crypto.randomUUID();
            console.log("WhatsApp message sent successfully via configured session, messageId:", sentMessageId);
            
            // ===== SAVE MESSAGE TO DB =====
            // Find or create conversation for this lead+session
            const normalizedPhone = normalizePhoneNumber(lead.phone);
            const remoteJid = `${normalizedPhone}@s.whatsapp.net`;
            
            let { data: convForMsg } = await supabase
              .from("whatsapp_conversations")
              .select("id")
              .eq("session_id", configuredSessionId)
              .eq("contact_phone", normalizedPhone)
              .is("deleted_at", null)
              .maybeSingle();
            
            if (!convForMsg) {
              // Try searching by lead_id
              const { data: convByLead } = await supabase
                .from("whatsapp_conversations")
                .select("id")
                .eq("lead_id", execution.lead_id)
                .is("deleted_at", null)
                .order("last_message_at", { ascending: false, nullsFirst: false })
                .limit(1)
                .maybeSingle();
              
              convForMsg = convByLead;
            }
            
            if (!convForMsg) {
              // Create conversation
              const { data: newConv } = await supabase
                .from("whatsapp_conversations")
                .insert({
                  session_id: configuredSessionId,
                  remote_jid: remoteJid,
                  contact_phone: normalizedPhone,
                  contact_name: lead.name || normalizedPhone,
                  lead_id: execution.lead_id,
                  is_group: false,
                  last_message: messageContent,
                  last_message_at: new Date().toISOString(),
                  unread_count: 0,
                })
                .select("id")
                .single();
              convForMsg = newConv;
              console.log("Created new conversation for automation message:", convForMsg?.id);
            }
            
            if (convForMsg) {
              // Insert message record
              await supabase.from("whatsapp_messages").upsert({
                conversation_id: convForMsg.id,
                session_id: configuredSessionId,
                message_id: sentMessageId,
                from_me: true,
                content: messageContent,
                message_type: "text",
                status: "sent",
                sent_at: new Date().toISOString(),
                sender_name: "Automação",
              }, { onConflict: "session_id,message_id" });
              
              // Update conversation
              await supabase
                .from("whatsapp_conversations")
                .update({
                  last_message: messageContent,
                  last_message_at: new Date().toISOString(),
                  lead_id: execution.lead_id, // Ensure linked
                })
                .eq("id", convForMsg.id);
              
              console.log(`Automation message saved to whatsapp_messages in conversation ${convForMsg.id}`);
            }
            
            // Log activity for sent message
            await logAutomationActivity(
              supabase,
              execution.lead_id,
              "automation_message",
              messageContent.substring(0, 200) + (messageContent.length > 200 ? "..." : ""),
              { 
                channel: "whatsapp",
                automation_action: "send_whatsapp",
                session_id: configuredSessionId
              }
            );
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

        const convSendResult = await response.json();
        const convSentMsgId = convSendResult?.key?.id || convSendResult?.messageId || crypto.randomUUID();
        console.log("WhatsApp message sent successfully, messageId:", convSentMsgId);
        
        // ===== SAVE MESSAGE TO DB =====
        await supabase.from("whatsapp_messages").upsert({
          conversation_id: execution.conversation_id,
          session_id: conversation.session_id,
          message_id: convSentMsgId,
          from_me: true,
          content: messageContent,
          message_type: "text",
          status: "sent",
          sent_at: new Date().toISOString(),
          sender_name: "Automação",
        }, { onConflict: "session_id,message_id" });
        
        // Update conversation
        await supabase
          .from("whatsapp_conversations")
          .update({
            last_message: messageContent,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", execution.conversation_id);
        
        console.log(`Automation message saved to whatsapp_messages in conversation ${execution.conversation_id}`);
        
        // Log activity for sent message via conversation
        await logAutomationActivity(
          supabase,
          execution.lead_id,
          "automation_message",
          messageContent.substring(0, 200) + (messageContent.length > 200 ? "..." : ""),
          { 
            channel: "whatsapp",
            automation_action: "send_whatsapp",
            conversation_id: execution.conversation_id
          }
        );
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

    case "send_audio":
      await sendMediaMessage(supabase, execution, config, "audio", evolutionApiUrl, evolutionApiKey);
      break;

    case "send_image":
      await sendMediaMessage(supabase, execution, config, "image", evolutionApiUrl, evolutionApiKey);
      break;

    case "send_video":
      await sendMediaMessage(supabase, execution, config, "video", evolutionApiUrl, evolutionApiKey);
      break;

    default:
      console.log(`Unknown action type: ${actionType}`);
  }
}

// deno-lint-ignore no-explicit-any
async function sendMediaMessage(
  supabase: any,
  execution: { lead_id?: string; conversation_id?: string; organization_id: string },
  config: Record<string, unknown>,
  mediaType: "audio" | "image" | "video",
  evolutionApiUrl?: string,
  evolutionApiKey?: string,
) {
  if (!evolutionApiUrl || !evolutionApiKey) {
    console.log("Evolution API not configured for media send");
    return;
  }

  // Find session
  const sessionId = config.session_id as string;
  if (!sessionId) {
    console.log("No session_id for media send");
    return;
  }

  const { data: session } = await supabase
    .from("whatsapp_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!session) {
    console.log("Session not found:", sessionId);
    return;
  }

  if (!execution.lead_id) {
    console.log("No lead_id for media send");
    return;
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("phone, name")
    .eq("id", execution.lead_id)
    .single();

  if (!lead?.phone) {
    console.log("Lead has no phone");
    return;
  }

  const normalizedPhone = normalizePhoneNumber(lead.phone);
  const number = normalizedPhone;

  let endpoint = "";
  let body: Record<string, unknown> = { number };
  let messageContent = "";

  if (mediaType === "audio") {
    const audioUrl = config.audio_url as string;
    if (!audioUrl) { console.log("No audio_url"); return; }
    
    // Send as WhatsApp voice message (PTT) so it appears as recorded audio
    endpoint = `message/sendWhatsAppAudio/${session.instance_name}`;
    body = { number, audio: audioUrl };
    messageContent = "🎤 Áudio";
  } else if (mediaType === "image") {
    const imageUrl = config.image_url as string;
    const caption = config.caption as string || "";
    if (!imageUrl) { console.log("No image_url"); return; }

    endpoint = `message/sendMedia/${session.instance_name}`;
    body = { number, media: imageUrl, mediatype: "image", caption };
    messageContent = caption || "📷 Imagem";
  } else if (mediaType === "video") {
    const videoUrl = config.video_url as string;
    if (!videoUrl) { console.log("No video_url"); return; }

    endpoint = `message/sendMedia/${session.instance_name}`;
    body = { number, media: videoUrl, mediatype: "video", caption: "" };
    messageContent = "🎥 Vídeo";
  }

  console.log(`Sending ${mediaType} via ${endpoint}`);

  const response = await fetch(`${evolutionApiUrl}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: evolutionApiKey },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Error sending ${mediaType}:`, errorText);
    throw new Error(`Failed to send ${mediaType}: ${errorText}`);
  }

  const result = await response.json();
  const sentMsgId = result?.key?.id || result?.messageId || crypto.randomUUID();
  console.log(`${mediaType} sent, messageId:`, sentMsgId);

  // Save to DB
  const remoteJid = `${normalizedPhone}@s.whatsapp.net`;
  let { data: conv } = await supabase
    .from("whatsapp_conversations")
    .select("id")
    .eq("session_id", sessionId)
    .eq("contact_phone", normalizedPhone)
    .is("deleted_at", null)
    .maybeSingle();

  if (!conv && execution.lead_id) {
    const { data: convByLead } = await supabase
      .from("whatsapp_conversations")
      .select("id")
      .eq("lead_id", execution.lead_id)
      .is("deleted_at", null)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    conv = convByLead;
  }

  if (!conv) {
    const { data: newConv } = await supabase
      .from("whatsapp_conversations")
      .insert({
        session_id: sessionId,
        remote_jid: remoteJid,
        contact_phone: normalizedPhone,
        contact_name: lead.name || normalizedPhone,
        lead_id: execution.lead_id,
        is_group: false,
        last_message: messageContent,
        last_message_at: new Date().toISOString(),
        unread_count: 0,
      })
      .select("id")
      .single();
    conv = newConv;
  }

  if (conv) {
    await supabase.from("whatsapp_messages").upsert({
      conversation_id: conv.id,
      session_id: sessionId,
      message_id: sentMsgId,
      from_me: true,
      content: messageContent,
      message_type: mediaType,
      status: "sent",
      sent_at: new Date().toISOString(),
      sender_name: "Automação",
    }, { onConflict: "session_id,message_id" });

    await supabase
      .from("whatsapp_conversations")
      .update({ last_message: messageContent, last_message_at: new Date().toISOString(), lead_id: execution.lead_id })
      .eq("id", conv.id);
  }

  await logAutomationActivity(supabase, execution.lead_id, "automation_message", messageContent, {
    channel: "whatsapp", automation_action: `send_${mediaType}`, session_id: sessionId,
  });
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
