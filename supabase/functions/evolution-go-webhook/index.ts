// Evolution Go webhook receiver
// Handles: qrcode.updated, connection.update, messages.upsert, messages.update,
//          chats.upsert, labels.upsert, groups.upsert, contacts.upsert
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const API_KEY = Deno.env.get("EVOLUTION_GO_API_KEY") || "";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

/** Normalize Brazilian phone — strips non-digits, makes "55" optional matching */
function normalizePhone(jidOrNumber: string): string {
  return (jidOrNumber || "").replace(/@.*/, "").replace(/\D/g, "");
}

function phoneVariants(p: string): string[] {
  const digits = normalizePhone(p);
  const variants = new Set<string>([digits]);
  if (digits.startsWith("55") && digits.length >= 12) variants.add(digits.slice(2));
  else if (digits.length >= 10) variants.add("55" + digits);
  return Array.from(variants);
}

async function findOrCreateConversation(
  sessionId: string,
  organizationId: string,
  remoteJid: string,
  contactName?: string,
) {
  const phone = normalizePhone(remoteJid);
  const isGroup = remoteJid.endsWith("@g.us");

  // 1) by remote_jid + session
  let { data: conv } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .eq("session_id", sessionId)
    .eq("remote_jid", remoteJid)
    .maybeSingle();

  if (conv) return conv;

  // 2) try to find lead by phone variants (org-scoped) — only for direct chats
  let leadId: string | null = null;
  if (!isGroup) {
    const variants = phoneVariants(phone);
    const { data: leads } = await supabase
      .from("leads")
      .select("id, phone")
      .eq("organization_id", organizationId)
      .or(variants.map((v) => `phone.ilike.%${v}%`).join(","))
      .limit(1);
    if (leads && leads.length) leadId = leads[0].id;
  }

  const { data: created, error } = await supabase
    .from("whatsapp_conversations")
    .insert({
      session_id: sessionId,
      organization_id: organizationId,
      remote_jid: remoteJid,
      contact_name: contactName || null,
      contact_phone: isGroup ? null : phone,
      is_group: isGroup,
      lead_id: leadId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return created;
}

async function handleMessageUpsert(session: any, event: any) {
  const m = event.data || event.message || event;
  const remoteJid = m.key?.remoteJid || m.remoteJid || m.chatId;
  if (!remoteJid) return;

  const fromMe = !!(m.key?.fromMe ?? m.fromMe);
  const messageId = m.key?.id || m.id || m.messageId;
  const timestamp = m.messageTimestamp || m.timestamp || Date.now();
  const sentAt = new Date(typeof timestamp === "number" && timestamp < 1e12 ? timestamp * 1000 : timestamp).toISOString();
  const senderName = m.pushName || m.senderName || null;

  // Extract content + type
  let content: string | null = null;
  let messageType = "text";
  let mediaMimeType: string | null = null;
  let mediaBase64: string | null = null;

  const msg = m.message || m;
  if (msg.conversation) {
    content = msg.conversation;
    messageType = "text";
  } else if (msg.extendedTextMessage?.text) {
    content = msg.extendedTextMessage.text;
    messageType = "text";
  } else if (msg.imageMessage) {
    messageType = "image";
    content = msg.imageMessage.caption || null;
    mediaMimeType = msg.imageMessage.mimetype || "image/jpeg";
    mediaBase64 = msg.imageMessage.base64 || null;
  } else if (msg.videoMessage) {
    messageType = "video";
    content = msg.videoMessage.caption || null;
    mediaMimeType = msg.videoMessage.mimetype || "video/mp4";
    mediaBase64 = msg.videoMessage.base64 || null;
  } else if (msg.audioMessage) {
    messageType = "audio";
    mediaMimeType = msg.audioMessage.mimetype || "audio/ogg";
    mediaBase64 = msg.audioMessage.base64 || null;
  } else if (msg.documentMessage) {
    messageType = "document";
    content = msg.documentMessage.fileName || null;
    mediaMimeType = msg.documentMessage.mimetype || "application/octet-stream";
    mediaBase64 = msg.documentMessage.base64 || null;
  } else if (msg.stickerMessage) {
    messageType = "sticker";
    mediaMimeType = msg.stickerMessage.mimetype || "image/webp";
    mediaBase64 = msg.stickerMessage.base64 || null;
  }

  const conv = await findOrCreateConversation(
    session.id,
    session.organization_id,
    remoteJid,
    senderName || undefined,
  );

  // Dedupe by message_id
  if (messageId) {
    const { data: existing } = await supabase
      .from("whatsapp_messages")
      .select("id")
      .eq("conversation_id", conv.id)
      .eq("message_id", messageId)
      .maybeSingle();
    if (existing) return;
  }

  const { data: inserted, error } = await supabase
    .from("whatsapp_messages")
    .insert({
      conversation_id: conv.id,
      session_id: session.id,
      message_id: messageId,
      content,
      message_type: messageType,
      media_mime_type: mediaMimeType,
      media_status: mediaBase64 ? "pending" : null,
      from_me: fromMe,
      status: fromMe ? "sent" : "delivered",
      sent_at: sentAt,
      sender_jid: m.key?.participant || m.participant || null,
      sender_name: senderName,
    })
    .select("id")
    .single();

  if (error) {
    console.error("insert message error:", error);
    return;
  }

  // If we got base64 media, hand off to media-worker via storage
  if (mediaBase64 && inserted) {
    try {
      const bytes = Uint8Array.from(atob(mediaBase64), (c) => c.charCodeAt(0));
      const ext = (mediaMimeType?.split("/")?.[1] || "bin").split(";")[0];
      const path = `${session.organization_id}/${conv.id}/${inserted.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("whatsapp-media")
        .upload(path, bytes, { contentType: mediaMimeType || "application/octet-stream", upsert: true });
      if (!upErr) {
        const { data: pub } = supabase.storage.from("whatsapp-media").getPublicUrl(path);
        await supabase.from("whatsapp_messages").update({
          media_url: pub.publicUrl,
          media_storage_path: path,
          media_status: "ready",
          media_size: bytes.length,
        }).eq("id", inserted.id);
      }
    } catch (e) {
      console.error("media upload error:", e);
    }
  }

  // Update conversation last_message
  await supabase.from("whatsapp_conversations").update({
    last_message: content || `[${messageType}]`,
    last_message_at: sentAt,
    unread_count: fromMe ? conv.unread_count : (conv.unread_count || 0) + 1,
    updated_at: new Date().toISOString(),
  }).eq("id", conv.id);
}

async function handleConnectionUpdate(session: any, event: any) {
  const data = event.data || event;
  const state = (data.state || data.connectionStatus || data.status || "").toLowerCase();
  const eventName = (event.event || event.type || event.action || "").toLowerCase();
  
  console.log(`[Diagnostic] Normalizing status for event ${eventName} (state: ${state})`);

  // Normalized logic requested by user
  const isConnected = 
    ["pairsuccess", "connected", "connection", "open"].includes(eventName) ||
    ["open", "connected"].includes(state) ||
    data.connected === true ||
    data.loggedIn === true;

  const isDisconnected = 
    ["loggedout", "disconnected", "qrtimeout", "close", "closed", "offline"].includes(eventName) ||
    ["close", "closed", "disconnected", "disconnect", "offline"].includes(state);

  let status = session.status;
  if (isConnected) {
    status = "connected";
  } else if (isDisconnected) {
    status = "disconnected";
  } else if (state === "connecting") {
    status = "connecting";
  } else if (state === "qr" || ["qrcode", "qr_ready"].includes(eventName)) {
    status = "qr_ready";
  }

  const update: any = { 
    status, 
    updated_at: new Date().toISOString() 
  };

  if (status === "connected") {
    update.last_connected_at = new Date().toISOString();
    const phone = data.jid?.split("@")[0] || data.phone || data.number;
    if (phone) update.phone_number = phone;
    
    if (session.advanced_settings?.qr_code) {
      update.advanced_settings = { 
        ...session.advanced_settings, 
        qr_code: null, 
        qr_updated_at: null 
      };
    }
  }

  console.log(`[Diagnostic] Attempting update on 'whatsapp_sessions' for id ${session.id} with status: ${status}`);

  const { data: updatedRows, error, count } = await supabase
    .from("whatsapp_sessions")
    .update(update)
    .eq("id", session.id)
    .select();
  
  if (error) {
    console.error(`[Diagnostic] Error updating session ${session.id}:`, error);
  } else {
    console.log(`[Diagnostic] Success: Session ${session.id} updated. Rows affected: ${updatedRows?.length || 0}`);
  }
  
  return status;
}

async function handleQrUpdate(session: any, event: any) {
  const qr = event.data?.qrcode || event.qrcode || event.qr;
  await supabase.from("whatsapp_sessions").update({
    status: "qr_ready",
    advanced_settings: { ...(session.advanced_settings || {}), qr_code: qr, qr_updated_at: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  }).eq("id", session.id);
}

async function handleLabelsUpsert(session: any, event: any) {
  const labels = Array.isArray(event.data) ? event.data : [event.data || event];
  for (const l of labels) {
    if (!l?.id) continue;
    await supabase.from("whatsapp_labels").upsert({
      session_id: session.id,
      organization_id: session.organization_id,
      remote_label_id: String(l.id),
      name: l.name || `Label ${l.id}`,
      color: l.color ?? null,
      predefined: !!l.predefined,
    }, { onConflict: "session_id,remote_label_id" });
  }
}

async function handleGroupsUpsert(session: any, event: any) {
  const groups = Array.isArray(event.data) ? event.data : [event.data || event];
  for (const g of groups) {
    const jid = g.id || g.jid || g.groupJid;
    if (!jid) continue;
    await supabase.from("whatsapp_groups").upsert({
      session_id: session.id,
      organization_id: session.organization_id,
      group_jid: jid,
      subject: g.subject || g.name || null,
      description: g.desc || g.description || null,
      picture_url: g.pictureUrl || null,
      participants: g.participants || [],
      owner_jid: g.owner || null,
      is_announce: !!g.announce,
      updated_at: new Date().toISOString(),
    }, { onConflict: "session_id,group_jid" });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Security: validate Evolution Go apikey header
    const incomingKey = req.headers.get("apikey") || req.headers.get("x-api-key");
    if (API_KEY && incomingKey && incomingKey !== API_KEY) {
      return new Response("forbidden", { status: 403, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const instanceId = url.searchParams.get("instance_id")
      || url.searchParams.get("instanceId")
      || req.headers.get("instanceid")
      || req.headers.get("instance-id");

    const body = await req.json().catch(() => ({}));
    const event = body?.event || body?.type || body?.action || "";

    // Find the session
    let session: any = null;
    const sid = body?.session_id || body?.sessionId;
    if (sid) {
      const { data } = await supabase.from("whatsapp_sessions").select("*").eq("id", sid).maybeSingle();
      session = data;
    }
    if (!session && instanceId) {
      const { data } = await supabase.from("whatsapp_sessions").select("*")
        .or(`instance_id.eq.${instanceId},instance_name.eq.${instanceId}`)
        .eq("provider", "evolution_go")
        .maybeSingle();
      session = data;
    }
    if (!session && body?.instance) {
      const { data } = await supabase.from("whatsapp_sessions").select("*")
        .or(`instance_id.eq.${body.instance},instance_name.eq.${body.instance}`)
        .eq("provider", "evolution_go")
        .maybeSingle();
      session = data;
    }

    if (!session) {
      console.warn("evolution-go-webhook: session not found", { event, instanceId });
      return new Response(JSON.stringify({ ok: true, ignored: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Run handler (fire-and-forget via waitUntil if possible)
    const work = (async () => {
      try {
        const normalizedEvent = event.toLowerCase().replace(/_/g, ".");
        
        console.log(`[Webhook] Normalized event: ${normalizedEvent} for session: ${session.id}`);

        switch (normalizedEvent) {
          case "qrcode.updated":
          case "qr.updated":
          case "qr":
          case "qrcode":
            await handleQrUpdate(session, body); break;
          case "connection.update":
          case "connection.status":
          case "connection":
            await handleConnectionUpdate(session, body); break;
          case "pair.success":
            // On pair success, we can treat it as connected
            await handleConnectionUpdate(session, { ...body, state: "open" }); break;
          case "messages.upsert":
          case "message.upsert":
          case "messages.received":
          case "message":
            await handleMessageUpsert(session, body); break;
          case "labels.upsert":
          case "labels.set":
            await handleLabelsUpsert(session, body); break;
          case "groups.upsert":
          case "groups.update":
            await handleGroupsUpsert(session, body); break;
          case "history.sync":
          case "history_sync":
            console.log(`[Webhook] History sync event received for session ${session.id}`);
            // History sync doesn't necessarily change connection status but we log it
            break;
          default:
            console.log("[Webhook] Unhandled event:", event);
        }
      } catch (e) {
        console.error("handler error:", e);
      }
    })();

    // @ts-ignore EdgeRuntime is provided by Supabase
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(work);
    else await work;

    return new Response(JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("evolution-go-webhook fatal:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
