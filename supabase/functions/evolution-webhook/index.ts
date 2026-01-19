import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Helper to get error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("[Evolution Webhook] Received event:", JSON.stringify(payload, null, 2));

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { event, instance, data } = payload;

    // Handle different event types
    switch (event) {
      case "messages.upsert": {
        await handleMessageUpsert(supabase, instance, data);
        break;
      }
      case "connection.update": {
        await handleConnectionUpdate(supabase, instance, data);
        break;
      }
      case "messages.update": {
        await handleMessageUpdate(supabase, instance, data);
        break;
      }
      case "qrcode.updated": {
        console.log(`[Evolution Webhook] QR Code updated for ${instance}`);
        break;
      }
      default: {
        console.log(`[Evolution Webhook] Unhandled event: ${event}`);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Evolution Webhook] Error:", error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface SessionData {
  id: string;
  organization_id: string;
}

interface ConversationData {
  id: string;
}

async function handleMessageUpsert(
  supabase: SupabaseClient,
  instanceName: string,
  data: Record<string, unknown>
) {
  console.log(`[Evolution Webhook] Processing message for ${instanceName}`);

  const message = (data.message || data) as Record<string, unknown>;
  const key = message.key as Record<string, unknown> | undefined;
  
  // Skip status messages and own messages
  if (key?.fromMe || message.status) {
    console.log("[Evolution Webhook] Skipping own message or status update");
    return;
  }

  const remoteJid = (key?.remoteJid as string) || "";
  const phone = remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "");
  
  // Get the session from database
  const { data: session, error: sessionError } = await supabase
    .from("whatsapp_sessions")
    .select("id, organization_id")
    .eq("instance_name", instanceName)
    .single();

  if (sessionError || !session) {
    console.error(`[Evolution Webhook] Session not found for instance: ${instanceName}`);
    return;
  }

  const typedSession = session as SessionData;

  // Check if conversation exists
  const { data: existingConversation } = await supabase
    .from("whatsapp_conversations")
    .select("id")
    .eq("session_id", typedSession.id)
    .eq("phone", phone)
    .single();

  let conversation: ConversationData | null = existingConversation as ConversationData | null;

  // Create conversation if not exists
  if (!conversation) {
    const pushName = (message.pushName as string) || phone;
    const { data: newConversation, error: convError } = await supabase
      .from("whatsapp_conversations")
      .insert({
        session_id: typedSession.id,
        organization_id: typedSession.organization_id,
        phone,
        contact_name: pushName,
        is_group: remoteJid.includes("@g.us"),
      })
      .select("id")
      .single();

    if (convError) {
      console.error("[Evolution Webhook] Error creating conversation:", convError);
      return;
    }
    conversation = newConversation as ConversationData;
  }

  if (!conversation) {
    console.error("[Evolution Webhook] Could not get or create conversation");
    return;
  }

  // Extract message content
  const messageContent = extractMessageContent(message);

  // Insert message
  const { error: msgError } = await supabase.from("whatsapp_messages").insert({
    conversation_id: conversation.id,
    content: messageContent.text,
    media_url: messageContent.mediaUrl,
    media_type: messageContent.mediaType,
    is_from_me: false,
    status: "received",
    external_id: key?.id,
    sent_at: new Date().toISOString(),
  });

  if (msgError) {
    console.error("[Evolution Webhook] Error inserting message:", msgError);
    return;
  }

  // Update conversation last message
  await supabase
    .from("whatsapp_conversations")
    .update({
      last_message: messageContent.text || "[Mídia]",
      last_message_at: new Date().toISOString(),
    })
    .eq("id", conversation.id);

  // Try to link message to a lead
  await linkMessageToLead(supabase, typedSession.organization_id, phone, conversation.id);

  console.log(`[Evolution Webhook] Message saved for conversation ${conversation.id}`);
}

async function handleConnectionUpdate(
  supabase: SupabaseClient,
  instanceName: string,
  data: Record<string, unknown>
) {
  console.log(`[Evolution Webhook] Connection update for ${instanceName}:`, data);

  const status = data.state === "open" ? "connected" : "disconnected";

  await supabase
    .from("whatsapp_sessions")
    .update({
      status,
      phone_number: (data.phoneNumber as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("instance_name", instanceName);
}

async function handleMessageUpdate(
  supabase: SupabaseClient,
  instanceName: string,
  data: Record<string, unknown>
) {
  console.log(`[Evolution Webhook] Message update for ${instanceName}:`, data);

  const key = data.key as Record<string, unknown> | undefined;
  const update = data.update as Record<string, unknown> | undefined;
  
  if (!key?.id) return;

  // Map Evolution status to our status
  const statusMap: Record<number, string> = {
    0: "pending",
    1: "sent",
    2: "delivered",
    3: "read",
    4: "failed",
  };

  const statusValue = update?.status as number | undefined;
  const newStatus = statusValue !== undefined ? statusMap[statusValue] || "sent" : "sent";

  await supabase
    .from("whatsapp_messages")
    .update({ status: newStatus })
    .eq("external_id", key.id);
}

interface MessageContent {
  text: string;
  mediaUrl: string | null;
  mediaType: string | null;
}

function extractMessageContent(message: Record<string, unknown>): MessageContent {
  const result: MessageContent = {
    text: "",
    mediaUrl: null,
    mediaType: null,
  };

  const msgContent = message.message as Record<string, unknown> | undefined;
  
  if (!msgContent) return result;

  if (msgContent.conversation) {
    result.text = msgContent.conversation as string;
  } else if ((msgContent.extendedTextMessage as Record<string, unknown>)?.text) {
    result.text = (msgContent.extendedTextMessage as Record<string, unknown>).text as string;
  } else if (msgContent.imageMessage) {
    const imgMsg = msgContent.imageMessage as Record<string, unknown>;
    result.text = (imgMsg.caption as string) || "";
    result.mediaType = "image";
  } else if (msgContent.videoMessage) {
    const vidMsg = msgContent.videoMessage as Record<string, unknown>;
    result.text = (vidMsg.caption as string) || "";
    result.mediaType = "video";
  } else if (msgContent.audioMessage) {
    result.mediaType = "audio";
  } else if (msgContent.documentMessage) {
    const docMsg = msgContent.documentMessage as Record<string, unknown>;
    result.text = (docMsg.fileName as string) || "";
    result.mediaType = "document";
  }

  return result;
}

async function linkMessageToLead(
  supabase: SupabaseClient,
  organizationId: string,
  phone: string,
  conversationId: string
) {
  // Normalize phone for matching
  const normalizedPhone = phone.replace(/\D/g, "");
  
  // Try to find a lead with this phone
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("organization_id", organizationId)
    .or(`phone.ilike.%${normalizedPhone.slice(-9)}%`)
    .limit(1)
    .single();

  if (lead && (lead as { id: string }).id) {
    await supabase
      .from("whatsapp_conversations")
      .update({ lead_id: (lead as { id: string }).id })
      .eq("id", conversationId);
    
    console.log(`[Evolution Webhook] Linked conversation to lead ${(lead as { id: string }).id}`);
  }
}
