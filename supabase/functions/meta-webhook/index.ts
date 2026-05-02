import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_APP_SECRET = Deno.env.get("META_APP_SECRET") || "";
const META_WEBHOOK_VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function verifySignature(payload: string, signature: string): boolean {
  if (!signature || !META_APP_SECRET) return false;
  
  const expectedSignature = createHmac("sha256", META_APP_SECRET)
    .update(payload)
    .digest("hex");
  
  return signature === `sha256=${expectedSignature}`;
}

async function handleMessaging(supabase: any, messagingItem: any, pageId: string, platform: string) {
  const senderId = messagingItem.sender.id;
  const recipientId = messagingItem.recipient.id;
  const message = messagingItem.message;
  
  if (!message || (!message.text && !message.attachments)) return;
  
  console.log(`Processing ${platform} message from ${senderId} to ${recipientId}`);

  const { data: integration } = await supabase
    .from("meta_integrations")
    .select("*")
    .eq("page_id", pageId)
    .eq("is_connected", true)
    .maybeSingle();
    
  if (!integration) {
    console.error("No connected integration found for page:", pageId);
    return;
  }
  
  let { data: conversation } = await supabase
    .from("meta_conversations")
    .select("*")
    .eq("external_id", senderId)
    .eq("page_id", pageId)
    .maybeSingle();
    
  if (!conversation) {
    console.log("Creating new conversation for sender:", senderId);
    
    let name = "Meta User";
    let profilePic = null;
    try {
      const profileUrl = `https://graph.facebook.com/v19.0/${senderId}?fields=name,first_name,last_name,profile_pic&access_token=${integration.access_token}`;
      const profileRes = await fetch(profileUrl);
      const profile = await profileRes.json();
      if (profile.name) name = profile.name;
      if (profile.profile_pic) profilePic = profile.profile_pic;
    } catch (e) {
      console.warn("Could not fetch profile info:", e);
    }

    const { data: newLead } = await supabase.from("leads").insert({
      organization_id: integration.organization_id,
      name: name,
      source: "meta",
      deal_status: "open"
    }).select().single();

    const { data: newConv } = await supabase.from("meta_conversations").insert({
      organization_id: integration.organization_id,
      lead_id: newLead?.id,
      external_id: senderId,
      page_id: pageId,
      platform: platform,
      contact_name: name,
      contact_picture: profilePic,
      unread_count: 0
    }).select().single();
    
    conversation = newConv;
  }
  
  const content = message.text || (message.attachments ? "[Mídia]" : "");
  const { data: insertedMsg, error: msgError } = await supabase.from("meta_messages").insert({
    conversation_id: conversation.id,
    external_id: message.mid,
    content: content,
    message_type: message.attachments ? "media" : "text",
    from_me: false,
    sent_at: new Date(messagingItem.timestamp).toISOString(),
    media_url: message.attachments?.[0]?.payload?.url || null,
    media_mime_type: message.attachments?.[0]?.type || null
  }).select().single();
  
  if (msgError) {
    console.error("Error inserting message:", msgError);
    return;
  }
  
  await supabase.from("meta_conversations").update({
    last_message: content,
    last_message_at: new Date(messagingItem.timestamp).toISOString(),
    unread_count: (conversation.unread_count || 0) + 1,
    updated_at: new Date().toISOString()
  }).eq("id", conversation.id);

  console.log("Message processed successfully");
}

async function handleComment(supabase: any, pageId: string, changeValue: any, platform: string) {
  console.log(`Processing ${platform} comment:`, changeValue);
  
  const senderId = changeValue.from?.id;
  const senderName = changeValue.from?.username || changeValue.from?.name;
  const messageText = changeValue.text || changeValue.message;
  
  if (!senderId || !messageText) return;

  const { data: integration } = await supabase
    .from("meta_integrations")
    .select("*")
    .eq("page_id", pageId)
    .eq("is_connected", true)
    .maybeSingle();
    
  if (!integration) return;

  let { data: conversation } = await supabase
    .from("meta_conversations")
    .select("*")
    .eq("external_id", senderId)
    .eq("page_id", pageId)
    .maybeSingle();

  if (!conversation) {
    const { data: newLead } = await supabase.from("leads").insert({
      organization_id: integration.organization_id,
      name: senderName || "Comentário Meta",
      source: "meta",
      deal_status: "open"
    }).select().single();

    const { data: newConv } = await supabase.from("meta_conversations").insert({
      organization_id: integration.organization_id,
      lead_id: newLead?.id,
      external_id: senderId,
      page_id: pageId,
      platform: platform,
      contact_name: senderName,
      unread_count: 0
    }).select().single();
    
    conversation = newConv;
  }

  await supabase.from("meta_messages").insert({
    conversation_id: conversation.id,
    external_id: changeValue.id || changeValue.comment_id,
    content: `[COMENTÁRIO] ${messageText}`,
    message_type: "comment",
    from_me: false,
    sent_at: new Date().toISOString()
  });

  await supabase.from("meta_conversations").update({
    last_message: `[COMENTÁRIO] ${messageText}`,
    last_message_at: new Date().toISOString(),
    unread_count: (conversation.unread_count || 0) + 1,
    updated_at: new Date().toISOString()
  }).eq("id", conversation.id);
}

async function handleLeadgen(supabase: any, pageId: string, changeValue: any) {
  const leadgenId = changeValue.leadgen_id;
  const formId = changeValue.form_id;
  
  console.log(`Processing leadgen: ${leadgenId} for page ${pageId}`);

  const { data: integrations, error: intError } = await supabase
    .from("meta_integrations")
    .select("*")
    .eq("page_id", pageId)
    .eq("is_connected", true);

  if (intError || !integrations?.length) return;

  for (const integration of integrations) {
    const { data: formConfig } = await supabase
      .from("meta_form_configs")
      .select("*")
      .eq("integration_id", integration.id)
      .eq("form_id", formId)
      .eq("is_active", true)
      .maybeSingle();

    const propertyId = formConfig?.property_id || null;
    const autoTags = formConfig?.auto_tags || [];
    const fieldMapping = formConfig?.field_mapping || {};

    const leadUrl = `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${integration.access_token}&fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,platform`;
    const leadResponse = await fetch(leadUrl);
    const leadData = await leadResponse.json();

    if (leadData.error) {
      console.error("Error fetching lead data:", leadData.error);
      continue;
    }

    const fields: Record<string, string> = {};
    let name = "Lead Facebook";
    let email = "";
    let phone = "";
    let message = "";

    for (const field of leadData.field_data || []) {
      const value = field.values?.[0] || "";
      fields[field.name] = value;
      const mappedTo = fieldMapping[field.name] || fieldMapping[field.name.toLowerCase()];
      
      if (mappedTo === "name") name = value || name;
      else if (mappedTo === "email") email = value;
      else if (mappedTo === "phone") phone = value;
      else if (mappedTo === "message") message = value;
    }

    const { data: newLead } = await supabase
      .from("leads")
      .insert({
        organization_id: integration.organization_id,
        name,
        email,
        phone,
        message: message || "Lead gerado via Facebook Lead Ads",
        source: "meta",
        interest_property_id: propertyId,
        meta_lead_id: leadgenId,
        meta_form_id: formId,
      })
      .select("id")
      .single();

    if (newLead && autoTags && autoTags.length > 0) {
      for (const tagId of autoTags) {
        await supabase.from("lead_tags").insert({ lead_id: newLead.id, tag_id: tagId });
      }
    }

    await supabase.from("meta_integrations").update({ 
      leads_received: (integration.leads_received || 0) + 1,
      last_lead_at: new Date().toISOString()
    }).eq("id", integration.id);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === META_WEBHOOK_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "POST") {
    try {
      const rawBody = await req.text();
      const signature = req.headers.get("X-Hub-Signature-256") || "";
      
      if (META_APP_SECRET && !verifySignature(rawBody, signature)) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 403, headers: corsHeaders });
      }

      const body = JSON.parse(rawBody);
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      if (body.object === "page" || body.object === "instagram") {
        for (const entry of body.entry || []) {
          const pageId = entry.id;

          if (entry.messaging) {
            for (const messagingItem of entry.messaging) {
              await handleMessaging(supabase, messagingItem, pageId, body.object === "instagram" ? "instagram" : "messenger");
            }
          }

          if (entry.changes) {
            for (const change of entry.changes) {
              if (change.field === "leadgen") {
                await handleLeadgen(supabase, pageId, change.value);
              } else if (change.field === "comments" || change.field === "feed") {
                await handleComment(supabase, pageId, change.value, body.object === "instagram" ? "instagram" : "messenger");
              }
            }
          }
        }
      }

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Webhook processing error:", error);
      return new Response("Internal error", { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
