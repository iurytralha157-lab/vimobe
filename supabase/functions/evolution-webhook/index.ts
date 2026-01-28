import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode } from "https://deno.land/std@0.177.0/encoding/base64.ts";

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to normalize remote_jid to standard format
function normalizeRemoteJid(jid: string): string {
  if (!jid) return jid;
  // Groups stay as @g.us
  if (jid.endsWith("@g.us")) return jid;
  // Convert @c.us to @s.whatsapp.net for consistency
  return jid.replace("@c.us", "@s.whatsapp.net");
}

// Helper to extract clean phone number
function extractPhoneNumber(jid: string): string {
  return jid.replace("@s.whatsapp.net", "").replace("@c.us", "").replace("@g.us", "");
}

// Helper to normalize phone number (remove country code 55 if present)
function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  // If starts with 55 and has 12+ digits, remove the 55
  if (cleaned.length >= 12 && cleaned.startsWith('55')) {
    return cleaned.substring(2);
  }
  return cleaned;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const EVOLUTION_WEBHOOK_SECRET = Deno.env.get("EVOLUTION_WEBHOOK_SECRET");

    // ===== SECURITY: Validate webhook secret =====
    // TEMPORARIAMENTE DESABILITADO para debug - reativar para produção
    /*
    if (EVOLUTION_WEBHOOK_SECRET) {
      const incomingSecret = req.headers.get("x-webhook-secret") || 
                             req.headers.get("apikey") ||
                             req.headers.get("authorization")?.replace("Bearer ", "");
      
      if (incomingSecret !== EVOLUTION_WEBHOOK_SECRET) {
        console.error("Webhook secret mismatch - rejecting request");
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    */
    console.log("⚠️ Webhook secret validation DISABLED - configure for production");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload = await req.json();
    console.log("Evolution webhook received:", JSON.stringify(payload, null, 2));

    // Evolution API v2 payload format
    const event = payload.event;
    const instanceName = payload.instance;
    const data = payload.data;

    // Find the session by instance name
    const { data: session, error: sessionError } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("instance_name", instanceName)
      .single();

    if (sessionError || !session) {
      console.log(`Session not found for instance: ${instanceName}`);
      return new Response(
        JSON.stringify({ success: true, message: "Session not found, ignoring" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== SECURITY: Validate session has organization_id =====
    if (!session.organization_id) {
      console.error(`Session ${session.id} has no organization_id - rejecting`);
      return new Response(
        JSON.stringify({ success: false, error: "Session not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (event) {
      case "connection.update":
      case "CONNECTION_UPDATE":
        await handleConnectionUpdate(supabase, session, data);
        break;

      case "messages.upsert":
      case "MESSAGES_UPSERT":
        await handleMessagesUpsert(supabase, session, data, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, payload);
        break;

      case "messages.update":
      case "MESSAGES_UPDATE":
        await handleMessagesUpdate(supabase, session, data);
        break;

      case "messages.delete":
      case "MESSAGES_DELETE":
        await handleMessagesDelete(supabase, session, data);
        break;

      case "presence.update":
      case "PRESENCE_UPDATE":
        await handlePresenceUpdate(supabase, session, data);
        break;

      case "send.message":
      case "SEND_MESSAGE":
        await handleSendMessage(supabase, session, data);
        break;

      case "groups.upsert":
      case "GROUPS_UPSERT":
        await handleGroupsUpsert(supabase, session, data);
        break;

      case "groups.update":
      case "GROUP_UPDATE":
        await handleGroupUpdate(supabase, session, data);
        break;

      case "qrcode.updated":
      case "QRCODE_UPDATED":
        console.log("QR Code updated for instance:", instanceName);
        break;

      default:
        console.log(`Unhandled event: ${event}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Evolution webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleConnectionUpdate(supabase: any, session: any, data: any) {
  // Evolution v2 sends state in data directly or in instance object
  const state = data?.state || data?.instance?.state || data?.status;
  console.log(`Connection update for session ${session.id}: ${state}`, data);

  const previousStatus = session.status;
  let status = "disconnected";
  if (state === "open" || state === "connected") {
    status = "connected";
  } else if (state === "connecting" || state === "qrcode") {
    status = "connecting";
  } else if (state === "close" || state === "disconnected") {
    status = "disconnected";
  }

  const updateData: any = { 
    status,
    updated_at: new Date().toISOString(),
    last_health_check: new Date().toISOString(),
    health_check_failures: status === "connected" ? 0 : (session.health_check_failures || 0)
  };

  // Extract phone number if available
  if (data?.instance?.wuid) {
    updateData.phone_number = data.instance.wuid.split("@")[0];
  }

  await supabase
    .from("whatsapp_sessions")
    .update(updateData)
    .eq("id", session.id);

  // ===== AUDIT LOG: Log status changes =====
  if (previousStatus !== status) {
    await supabase.from("audit_logs").insert({
      action: `whatsapp.session_${status}`,
      entity_type: "whatsapp_session",
      entity_id: session.id,
      organization_id: session.organization_id,
      new_data: { 
        instance_name: session.instance_name,
        previous_status: previousStatus,
        new_status: status,
        trigger: "webhook"
      }
    });
  }
}

async function handleMessagesUpsert(
  supabase: any, 
  session: any, 
  data: any,
  supabaseUrl: string,
  supabaseKey: string,
  payload?: any
) {
  // Evolution v2 can send single message or array
  const messages = Array.isArray(data) ? data : (data?.messages || [data]);

  for (const messageData of messages) {
    try {
      if (!messageData) continue;
      
      const key = messageData.key || {};
      let rawRemoteJid = key.remoteJid;
      
      if (!rawRemoteJid) {
        console.log("Invalid message data, skipping:", messageData);
        continue;
      }

      // Skip status messages
      if (rawRemoteJid === "status@broadcast") {
        continue;
      }

      const fromMe = key.fromMe || false;
      const messageId = key.id;
      
      // ===== FACEBOOK ADS DETECTION =====
      const message = messageData.message || {};
      const contextInfo = message.contextInfo || messageData.contextInfo || {};
      
      const isFromFacebookAds = 
        contextInfo.conversionSource === "FB_Ads" ||
        contextInfo.entryPointConversionSource === "ctwa_ad" ||
        !!contextInfo.externalAdReply;
      
      const adSource = isFromFacebookAds 
        ? (contextInfo.entryPointConversionApp || "facebook").toLowerCase()
        : null;
      
      // When from ads, real number might be in "sender" field (remoteJid may be @lid format)
      if (rawRemoteJid.endsWith("@lid") && payload?.sender) {
        console.log(`Facebook Ads detected: using sender ${payload.sender} instead of ${rawRemoteJid}`);
        rawRemoteJid = payload.sender;
      }

      // Normalize remote_jid for consistency
      const remoteJid = normalizeRemoteJid(rawRemoteJid);
      const isGroup = remoteJid.endsWith("@g.us");
      
      // Extract phone number
      const contactPhone = extractPhoneNumber(remoteJid);
      
      // Extract group subject/name if available
      let groupSubject = isGroup 
        ? (messageData.groupMetadata?.subject || messageData.source?.groupMetadata?.subject || null)
        : null;

      // If group has no subject, fetch it from Evolution API
      if (isGroup && (!groupSubject || groupSubject === contactPhone)) {
        const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
        const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
        
        if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
          try {
            console.log(`Group without name detected, fetching from API: ${remoteJid}`);
            const groupInfoResponse = await fetch(
              `${EVOLUTION_API_URL}/group/findGroupInfos/${session.instance_name}?groupJid=${remoteJid}`,
              {
                method: "GET",
                headers: {
                  "apikey": EVOLUTION_API_KEY,
                },
              }
            );
            
            if (groupInfoResponse.ok) {
              const groupInfo = await groupInfoResponse.json();
              if (groupInfo.subject) {
                groupSubject = groupInfo.subject;
                console.log(`Fetched group name: ${groupInfo.subject}`);
              }
            }
          } catch (error) {
            console.error("Failed to fetch group info:", error);
          }
        }
      }

      // ===== FIX: PROPER CONTACT NAME EXTRACTION =====
      // Only use pushName when message is NOT from us (fromMe = false)
      // When fromMe = true, pushName is OUR name, not the contact's name
      let contactName: string;
      if (isGroup) {
        contactName = groupSubject || contactPhone;
      } else if (fromMe) {
        // Our message: don't use pushName (it's our own name)
        // Use phone number as placeholder - real name will come when they reply
        contactName = contactPhone;
      } else {
        // Received message: use pushName from the contact
        contactName = messageData.pushName || messageData.verifiedBizName || contactPhone;
      }

      // Extract sender info for group messages
      const senderJid = key.participant || null;
      const senderName = isGroup && !fromMe ? messageData.pushName : null;

      // Extract message content - Evolution v2 format
      let content = "";
      let messageType = "text";
      let mediaUrl = "";
      let mediaMimeType = "";
      let base64FromWebhook: string | null = null;

      if (message.conversation) {
        content = message.conversation;
      } else if (message.extendedTextMessage?.text) {
        content = message.extendedTextMessage.text;
      } else if (message.imageMessage) {
        messageType = "image";
        content = message.imageMessage.caption || "[Imagem]";
        mediaUrl = message.imageMessage.url || "";
        // Fix: mimetype can come as "false" string from Evolution API
        const rawMime = message.imageMessage.mimetype;
        mediaMimeType = (rawMime && rawMime !== "false" && rawMime !== false) ? rawMime : "image/jpeg";
        // Try multiple locations for base64
        base64FromWebhook = message.imageMessage.base64 || messageData.base64 || payload?.base64 || null;
      } else if (message.videoMessage) {
        messageType = "video";
        content = message.videoMessage.caption || "[Vídeo]";
        mediaUrl = message.videoMessage.url || "";
        const rawMime = message.videoMessage.mimetype;
        mediaMimeType = (rawMime && rawMime !== "false" && rawMime !== false) ? rawMime : "video/mp4";
        base64FromWebhook = message.videoMessage.base64 || messageData.base64 || payload?.base64 || null;
      } else if (message.audioMessage) {
        messageType = "audio";
        content = message.audioMessage.ptt ? "[Áudio]" : "[Gravação]";
        mediaUrl = message.audioMessage.url || "";
        const rawMime = message.audioMessage.mimetype;
        mediaMimeType = (rawMime && rawMime !== "false" && rawMime !== false) ? rawMime : "audio/ogg";
        base64FromWebhook = message.audioMessage.base64 || messageData.base64 || payload?.base64 || null;
      } else if (message.documentMessage) {
        messageType = "document";
        content = message.documentMessage.fileName || "[Documento]";
        mediaUrl = message.documentMessage.url || "";
        const rawMime = message.documentMessage.mimetype;
        mediaMimeType = (rawMime && rawMime !== "false" && rawMime !== false) ? rawMime : "application/octet-stream";
        base64FromWebhook = message.documentMessage.base64 || messageData.base64 || payload?.base64 || null;
      } else if (message.stickerMessage) {
        messageType = "sticker";
        content = "[Sticker]";
      } else if (message.reactionMessage) {
        continue;
      } else if (message.protocolMessage) {
        continue;
      }

      // Get timestamp
      const timestamp = messageData.messageTimestamp || Math.floor(Date.now() / 1000);
      const messageDate = new Date(Number(timestamp) * 1000).toISOString();

      // Find or create conversation - search by contact_phone to avoid duplicates
      let { data: conversation, error: convError } = await supabase
        .from("whatsapp_conversations")
        .select("*")
        .eq("session_id", session.id)
        .eq("contact_phone", contactPhone)
        .is("deleted_at", null)
        .maybeSingle();

      if (convError) {
        console.error("Error finding conversation:", convError);
      }

      if (!conversation) {
        // For new conversations, only set name if it's a received message
        const initialContactName = fromMe ? contactPhone : contactName;
        
        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from("whatsapp_conversations")
          .insert({
            session_id: session.id,
            remote_jid: remoteJid,
            contact_name: initialContactName,
            contact_phone: contactPhone,
            is_group: isGroup,
            last_message: content,
            last_message_at: messageDate,
            unread_count: fromMe ? 0 : 1,
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating conversation:", createError);
          continue;
        }

        conversation = newConv;

        // Fetch and save profile picture for new conversations (non-group)
        if (!isGroup && !fromMe) {
          await fetchAndSaveProfilePicture(supabase, session, conversation.id, contactPhone);
        }

        // Auto-create lead ONLY for Facebook Ads leads (ctwa_ad)
        // Normal WhatsApp conversations stay as just conversations without creating leads
        if (!isGroup && !fromMe && isFromFacebookAds) {
          await createLeadFromConversation(
            supabase, session, conversation, contactName, contactPhone, content,
            isFromFacebookAds, adSource
          );
        } else if (!isGroup && !fromMe) {
          console.log(`Conversation without Facebook Ads - not creating lead for: ${contactPhone}`);
        }
      } else {
        // Update existing conversation
        const unreadIncrement = fromMe ? 0 : 1;
        
        // ===== FIX: Only update name if it's a received message with a real name =====
        // Don't overwrite with phone number or our own name
        let updatedContactName = conversation.contact_name;
        
        if (isGroup) {
          // Group: only update if we have actual subject
          if (groupSubject) {
            updatedContactName = groupSubject;
          }
        } else if (!fromMe && contactName && contactName !== contactPhone) {
          // Individual received message with real name: update
          updatedContactName = contactName;
        }
        // If fromMe or contactName is just the phone, keep existing name
        
        await supabase
          .from("whatsapp_conversations")
          .update({
            remote_jid: remoteJid,
            contact_name: updatedContactName,
            last_message: content,
            last_message_at: messageDate,
            unread_count: fromMe ? 0 : (conversation.unread_count || 0) + unreadIncrement,
          })
          .eq("id", conversation.id);
      }

      // Process media if exists - download and store permanently
      // IMPORTANT: Never save temporary mmg.whatsapp.net URLs - they expire quickly
      let permanentMediaUrl: string | null = null; // Start with null, only set if we get a valid storage URL
      let mediaStatusForInsert: 'pending' | 'ready' | 'failed' | null = null;
      let mediaStoragePath: string | null = null;
      const normalizedMimeType = normalizeMimeType(mediaMimeType);
      
      if (messageType !== "text" && messageType !== "sticker") {
        try {
          // Log media processing attempt
          console.log(`Processing ${messageType} media: base64=${!!base64FromWebhook}, url=${!!mediaUrl}, mime=${mediaMimeType}`);
          
          // If base64 came directly in webhook, use it directly (faster)
          if (base64FromWebhook) {
            console.log(`Using base64 from webhook directly for ${messageType}, length: ${base64FromWebhook.length}`);
            const result = await storeBase64MediaWithPath(
              supabase,
              session,
              conversation.id,
              messageId,
              messageType,
              normalizedMimeType,
              base64FromWebhook
            );
            permanentMediaUrl = result.url;
            mediaStoragePath = result.path;
            mediaStatusForInsert = permanentMediaUrl ? 'ready' : 'pending';
          } else if (mediaUrl) {
            // Always try to download from Evolution API to get permanent copy
            console.log(`Downloading media from Evolution API for ${messageType}`);
            const result = await downloadAndStoreMediaWithPath(
              supabase,
              supabaseUrl,
              session,
              conversation.id,
              messageId,
              messageType,
              normalizedMimeType,
              key,
              messageData,
              fromMe
            );
            permanentMediaUrl = result.url;
            mediaStoragePath = result.path;
            mediaStatusForInsert = permanentMediaUrl ? 'ready' : 'pending';
          } else {
            // No media source available
            mediaStatusForInsert = 'pending';
          }
          
          if (permanentMediaUrl) {
            console.log(`Media stored successfully: ${permanentMediaUrl}`);
          } else {
            console.log(`Failed to store media, marking as pending for retry`);
          }
        } catch (mediaError) {
          console.error("Error processing media:", mediaError);
          // Mark as pending for retry by media-worker
          mediaStatusForInsert = 'pending';
          permanentMediaUrl = null;
        }
      }

      // Insert message (upsert to handle duplicates)
      const { data: insertedMessage, error: msgError } = await supabase
        .from("whatsapp_messages")
        .upsert({
          conversation_id: conversation.id,
          session_id: session.id,
          message_id: messageId,
          from_me: fromMe,
          content,
          message_type: messageType,
          media_url: permanentMediaUrl || null,
          media_mime_type: normalizedMimeType || null,
          media_status: mediaStatusForInsert,
          media_storage_path: mediaStoragePath,
          status: fromMe ? "sent" : "received",
          sent_at: messageDate,
          sender_jid: senderJid,
          sender_name: senderName,
        }, {
          onConflict: "session_id,message_id",
        })
        .select("id")
        .single();

      if (msgError) {
        console.error("Error inserting message:", msgError);
      } else {
        console.log(`Message saved: ${messageId} in conversation ${conversation.id}`);
        
        // If media failed to download, create a job for the media-worker
        if (mediaStatusForInsert === 'pending' && insertedMessage?.id) {
          console.log(`Creating media job for message ${insertedMessage.id}`);
          const { error: jobError } = await supabase.from("media_jobs").insert({
            organization_id: session.organization_id,
            session_id: session.id,
            conversation_id: conversation.id,
            message_id: insertedMessage.id,
            remote_jid: remoteJid,
            message_key: key,
            media_type: messageType,
            media_mime_type: normalizeMimeType(mediaMimeType),
            status: 'pending',
            next_retry_at: new Date().toISOString(),
          });
          
          if (jobError) {
            console.error("Error creating media job:", jobError);
          } else {
            console.log(`Media job created for retry`);
            
            // Trigger media-worker immediately to process the job
            // Use EdgeRuntime.waitUntil to not block the response
            const triggerWorker = async () => {
              try {
                // Small delay to ensure job is committed to database
                await new Promise(resolve => setTimeout(resolve, 3000));
                console.log("Triggering media-worker for immediate processing...");
                const workerResponse = await fetch(`${supabaseUrl}/functions/v1/media-worker`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${supabaseKey}`,
                  },
                  body: JSON.stringify({}),
                });
                console.log(`media-worker triggered: ${workerResponse.status}`);
              } catch (workerError) {
                console.error("Failed to trigger media-worker:", workerError);
              }
            };
            
            // Fire and forget - don't await
            EdgeRuntime.waitUntil(triggerWorker());
          }
        }
        
        // Trigger automation for received messages (not from us)
        if (!fromMe && !isGroup) {
          try {
            const triggerResponse = await fetch(`${supabaseUrl}/functions/v1/automation-trigger`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                event_type: "message_received",
                organization_id: session.organization_id,
                data: {
                  session_id: session.id,
                  conversation_id: conversation.id,
                  lead_id: conversation.lead_id || null,
                  message: content,
                  contact_phone: contactPhone,
                  contact_name: contactName,
                },
              }),
            });
            
            if (!triggerResponse.ok) {
              console.error("Error triggering automation:", await triggerResponse.text());
            } else {
              console.log("Automation trigger called successfully");
            }
          } catch (triggerError) {
            console.error("Error calling automation trigger:", triggerError);
          }

          // ===== NOTIFY USERS ABOUT NEW WHATSAPP MESSAGE (ONLY FOR LEADS) =====
          // Only notify if conversation has a lead_id linked (cadastrado na pipeline)
          if (conversation.lead_id) {
            try {
              const { data: leadInfo } = await supabase
                .from("leads")
                .select("id, name, assigned_user_id, organization_id")
                .eq("id", conversation.lead_id)
                .single();

              if (leadInfo?.assigned_user_id) {
                // Notify assigned user
                const messagePreview = content.length > 50 ? content.substring(0, 50) + "..." : content;
                await supabase.from("notifications").insert({
                  user_id: leadInfo.assigned_user_id,
                  organization_id: session.organization_id,
                  title: "💬 Nova mensagem no WhatsApp",
                  content: `${contactName}: "${messagePreview}"`,
                  type: "message",
                  lead_id: leadInfo.id,
                  is_read: false,
                });
                console.log(`Notification sent to assigned user ${leadInfo.assigned_user_id} for WhatsApp message from lead`);
              }
            } catch (notifError) {
              console.error("Error sending WhatsApp message notification:", notifError);
            }
          }
        }

        // ===== FIRST RESPONSE TRACKING =====
        // Trigger first response calculation for sent messages (from_me = true)
        // This covers both manual sends and automation-sent messages
        if (fromMe && conversation.lead_id) {
          try {
            console.log(`Triggering first response for lead ${conversation.lead_id} (from webhook, automation=${false})`);
            await fetch(`${supabaseUrl}/functions/v1/calculate-first-response`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                lead_id: conversation.lead_id,
                channel: "whatsapp",
                actor_user_id: null, // Unknown at webhook level - could be automation
                is_automation: true, // Assume automation since it came via webhook
                organization_id: session.organization_id,
              }),
            });
          } catch (firstResponseError) {
            console.error("Error calling first response:", firstResponseError);
            // Don't fail the webhook if first response fails
          }
        }
      }

    } catch (error) {
      console.error("Error processing message:", error);
    }
  }
}

// Helper to normalize MIME type (remove codec info like ; codecs=opus)
function normalizeMimeType(mime: string | null): string {
  if (!mime) return 'application/octet-stream';
  // Remove codec info: "audio/ogg; codecs=opus" -> "audio/ogg"
  return mime.split(';')[0].trim();
}

// Helper to get file extension from MIME type
function getExtensionFromMime(mediaMimeType: string): string {
  const mimeExtMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/3gpp": "3gp",
    "audio/ogg": "ogg",
    "audio/ogg; codecs=opus": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  };
  return mimeExtMap[mediaMimeType] || mediaMimeType.split("/")[1]?.split(";")[0] || "bin";
}

// Store base64 media directly (when webhook sends base64) - returns both URL and path
async function storeBase64MediaWithPath(
  supabase: any,
  session: any,
  conversationId: string,
  messageId: string,
  messageType: string,
  mediaMimeType: string,
  base64Content: string
): Promise<{ url: string; path: string | null }> {
  try {
    const extension = getExtensionFromMime(mediaMimeType);
    // Standardized path: orgs/{org_id}/sessions/{session_id}/media/{messageId}.{ext}
    const filePath = `orgs/${session.organization_id}/sessions/${session.id}/media/${messageId}.${extension}`;
    
    // Decode base64 to Uint8Array
    const fileContent = decode(base64Content);
    
    console.log(`Storing base64 media: ${filePath}, size: ${fileContent.length} bytes`);

    const { error: uploadError } = await supabase.storage
      .from("whatsapp-media")
      .upload(filePath, fileContent, {
        contentType: mediaMimeType?.split(";")[0] || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading base64 media to storage:", uploadError);
      return { url: "", path: null };
    }

    const { data: urlData } = supabase.storage
      .from("whatsapp-media")
      .getPublicUrl(filePath);

    console.log(`Base64 media stored successfully: ${urlData.publicUrl}`);
    return { url: urlData.publicUrl, path: filePath };
  } catch (error) {
    console.error("Error in storeBase64MediaWithPath:", error);
    return { url: "", path: null };
  }
}

async function downloadAndStoreMediaWithPath(
  supabase: any,
  supabaseUrl: string,
  session: any,
  conversationId: string,
  messageId: string,
  messageType: string,
  mediaMimeType: string,
  key: any,
  messageData: any,
  fromMe: boolean = true
): Promise<{ url: string; path: string | null }> {
  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.log("Evolution API credentials not configured for media download");
    return { url: "", path: null };
  }

  console.log(`Attempting to download media: type=${messageType}, mimeType=${mediaMimeType}, instance=${session.instance_name}, fromMe=${fromMe}`);
  console.log("Media key:", JSON.stringify(key));
  
  // Extract thumbnail if available (for images) - use as fallback
  const message = messageData.message || {};
  const mediaMessage = message.imageMessage || message.videoMessage || 
                       message.audioMessage || message.documentMessage;
  const jpegThumbnail = message.imageMessage?.jpegThumbnail;
  const directPath = mediaMessage?.directPath;
  
  // Log detailed info about thumbnail and directPath
  if (jpegThumbnail) {
    const thumbnailType = typeof jpegThumbnail;
    const thumbnailInfo = thumbnailType === 'object' && jpegThumbnail !== null 
      ? `object with ${Object.keys(jpegThumbnail).length} keys` 
      : `${thumbnailType}`;
    console.log(`Thumbnail available for ${messageType}: ${thumbnailInfo}`);
  }
  if (directPath) {
    console.log(`DirectPath available: ${directPath.substring(0, 80)}...`);
  }
  console.log(`fromMe=${fromMe} - ${fromMe ? 'our message' : 'received message, adding extra delay'}`);


  // Helper function for delay
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Get file extension from mime type
  const getExtension = (mime: string): string => {
    const mimeExtMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "video/mp4": "mp4",
      "video/3gpp": "3gp",
      "audio/ogg": "ogg",
      "audio/ogg; codecs=opus": "ogg",
      "audio/mpeg": "mp3",
      "audio/mp4": "m4a",
      "application/pdf": "pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    };
    return mimeExtMap[mime] || mime.split("/")[1]?.split(";")[0] || "bin";
  };

  // Upload content to Supabase Storage - returns both URL and path
  let storedPath: string | null = null;
  
  const uploadToStorage = async (content: Uint8Array): Promise<string> => {
    const extension = getExtension(mediaMimeType);
    // Standardized path: orgs/{org_id}/sessions/{session_id}/media/{messageId}.{ext}
    const filePath = `orgs/${session.organization_id}/sessions/${session.id}/media/${messageId}.${extension}`;

    console.log(`Uploading to storage: ${filePath}, size: ${content.length} bytes`);

    const { error: uploadError } = await supabase.storage
      .from("whatsapp-media")
      .upload(filePath, content, {
        contentType: mediaMimeType?.split(";")[0] || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading to storage:", uploadError);
      return "";
    }

    const { data: urlData } = supabase.storage
      .from("whatsapp-media")
      .getPublicUrl(filePath);

    storedPath = filePath;
    console.log(`Media stored successfully: ${filePath} -> ${urlData.publicUrl}`);
    return urlData.publicUrl;
  };

  // === STRATEGY 1: getBase64FromMediaMessage with more retries ===
  const tryGetBase64FromEvolution = async (): Promise<string | null> => {
    console.log("Strategy 1: Trying getBase64FromMediaMessage endpoint...");
    
    // For received messages (not fromMe), add initial delay to allow Evolution to process
    if (!fromMe) {
      console.log("Received message detected, adding 3s initial delay...");
      await delay(3000);
    }
    
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        // Increased initial delay to give Evolution time to process
        if (attempt === 1) {
          await delay(1000);
        } else {
          console.log(`Retry attempt ${attempt}/5 after delay...`);
          await delay(3000 * attempt); // Exponential backoff - increased
        }

        const mediaResponse = await fetch(
          `${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${session.instance_name}`,
          {
            method: "POST",
            headers: {
              "apikey": EVOLUTION_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: { key },
              convertToMp4: messageType === "audio",
            }),
          }
        );

        const responseText = await mediaResponse.text();
        console.log(`Strategy 1 attempt ${attempt}: status=${mediaResponse.status}`);

        if (mediaResponse.ok) {
          try {
            const mediaData = JSON.parse(responseText);
            if (mediaData.base64) {
              console.log(`Strategy 1 success on attempt ${attempt}, base64 length: ${mediaData.base64.length}`);
              return mediaData.base64;
            }
          } catch (e) {
            console.error("Failed to parse response:", responseText.substring(0, 100));
          }
        } else {
          console.log(`Strategy 1 attempt ${attempt} failed:`, responseText.substring(0, 150));
          
          // If not "Message not found", don't retry with same strategy
          if (!responseText.includes("Message not found") && !responseText.includes("not found")) {
            break;
          }
        }
      } catch (error) {
        console.error(`Strategy 1 attempt ${attempt} error:`, error);
      }
    }
    return null;
  };

  // === STRATEGY 2: Download media by message ID ===
  const tryDownloadMediaById = async (): Promise<Uint8Array | null> => {
    console.log("Strategy 2: Trying downloadMedia by message ID...");
    
    try {
      // Try different endpoints that Evolution API might support
      const endpoints = [
        `${EVOLUTION_API_URL}/chat/downloadMedia/${session.instance_name}`,
        `${EVOLUTION_API_URL}/message/downloadMedia/${session.instance_name}`,
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "apikey": EVOLUTION_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: { key },
            }),
          });

          if (response.ok) {
            const contentType = response.headers.get("content-type") || "";
            
            // If response is binary/media
            if (!contentType.includes("application/json")) {
              const buffer = await response.arrayBuffer();
              if (buffer.byteLength > 0) {
                console.log(`Strategy 2 success: got ${buffer.byteLength} bytes`);
                return new Uint8Array(buffer);
              }
            } else {
              // Try to extract base64 from JSON response
              const data = await response.json();
              if (data.base64) {
                console.log(`Strategy 2 success via base64, length: ${data.base64.length}`);
                return decode(data.base64);
              }
            }
          }
        } catch (e) {
          console.log(`Endpoint ${endpoint} failed:`, e);
        }
      }
    } catch (error) {
      console.error("Strategy 2 error:", error);
    }
    return null;
  };

  // === STRATEGY 3: Direct download from WhatsApp URL (before it expires) ===
  const tryDirectDownload = async (): Promise<Uint8Array | null> => {
    // Extract the media URL from message data
    const message = messageData.message || {};
    const mediaMessage = message.imageMessage || message.videoMessage || 
                         message.audioMessage || message.documentMessage;
    
    const mediaUrl = mediaMessage?.url;
    
    if (!mediaUrl) {
      console.log("Strategy 3: No media URL available");
      return null;
    }

    console.log("Strategy 3: Trying direct download from WhatsApp URL...");
    console.log(`URL: ${mediaUrl.substring(0, 100)}...`);

    try {
      // WhatsApp URLs expire quickly, so try immediately
      const response = await fetch(mediaUrl, {
        headers: {
          "User-Agent": "WhatsApp/2.23.20.0",
        },
      });

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > 100) { // Minimum size to be valid media
          console.log(`Strategy 3 success: downloaded ${buffer.byteLength} bytes directly`);
          
          // Note: This content might be encrypted. WhatsApp uses AES-256-CBC
          // The mediaKey in the message is needed to decrypt, but it requires
          // specific crypto handling. For now, return the raw bytes and hope
          // Evolution API can handle decrypted URLs.
          return new Uint8Array(buffer);
        }
      } else {
        console.log(`Strategy 3 failed: HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("Strategy 3 error:", error);
    }
    return null;
  };

  // === STRATEGY 4: Fetch media via Evolution proxy endpoint ===
  const tryEvolutionMediaProxy = async (): Promise<Uint8Array | null> => {
    console.log("Strategy 4: Trying Evolution media proxy...");
    
    try {
      // Some Evolution API versions have a different media endpoint
      const response = await fetch(
        `${EVOLUTION_API_URL}/chat/fetchMediaUrl/${session.instance_name}`,
        {
          method: "POST",
          headers: {
            "apikey": EVOLUTION_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messageId: key.id,
            remoteJid: key.remoteJid,
            fromMe: key.fromMe,
          }),
        }
      );

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        
        if (!contentType.includes("application/json")) {
          const buffer = await response.arrayBuffer();
          if (buffer.byteLength > 0) {
            console.log(`Strategy 4 success: ${buffer.byteLength} bytes`);
            return new Uint8Array(buffer);
          }
        } else {
          const data = await response.json();
          if (data.base64) {
            console.log(`Strategy 4 success via base64`);
            return decode(data.base64);
          }
          if (data.url) {
            // Got a direct URL, try to download it
            console.log("Strategy 4: Got URL, attempting download...");
            const urlResponse = await fetch(data.url);
            if (urlResponse.ok) {
              const buffer = await urlResponse.arrayBuffer();
              if (buffer.byteLength > 0) {
                return new Uint8Array(buffer);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Strategy 4 error:", error);
    }
    return null;
  };

  // === STRATEGY 5: Try using directPath to construct download URL ===
  const tryDirectPathDownload = async (): Promise<Uint8Array | null> => {
    if (!directPath) {
      console.log("Strategy 5: No directPath available");
      return null;
    }

    console.log("Strategy 5: Trying download via directPath...");
    
    try {
      // WhatsApp CDN URLs can be constructed from directPath
      const cdnUrls = [
        `https://mmg.whatsapp.net${directPath}`,
        `https://media.whatsapp.net${directPath}`,
      ];

      for (const url of cdnUrls) {
        try {
          console.log(`Trying CDN URL: ${url.substring(0, 80)}...`);
          const response = await fetch(url, {
            headers: {
              "User-Agent": "WhatsApp/2.24.1.0",
              "Accept": "*/*",
            },
          });

          if (response.ok) {
            const buffer = await response.arrayBuffer();
            if (buffer.byteLength > 100) {
              console.log(`Strategy 5 success: downloaded ${buffer.byteLength} bytes from CDN`);
              return new Uint8Array(buffer);
            }
          } else {
            console.log(`CDN URL returned: ${response.status}`);
          }
        } catch (e) {
          console.log(`CDN URL failed:`, e);
        }
      }
    } catch (error) {
      console.error("Strategy 5 error:", error);
    }
    return null;
  };

  // === FALLBACK: Save thumbnail if available (for images only) ===
  const saveThumbnail = async (): Promise<string> => {
    if (messageType !== "image" || !jpegThumbnail) {
      console.log("Fallback: No thumbnail available");
      return "";
    }

    console.log("Fallback: Saving jpegThumbnail as last resort...");
    
    try {
      // jpegThumbnail can come in different formats from Evolution API:
      // 1. Base64 string
      // 2. Uint8Array
      // 3. Regular array
      // 4. Object with numeric keys {"0": 255, "1": 216, ...}
      let thumbnailBytes: Uint8Array;
      
      if (typeof jpegThumbnail === 'string') {
        // If it's a base64 string, decode it
        thumbnailBytes = decode(jpegThumbnail);
      } else if (jpegThumbnail instanceof Uint8Array) {
        thumbnailBytes = jpegThumbnail;
      } else if (Array.isArray(jpegThumbnail)) {
        thumbnailBytes = new Uint8Array(jpegThumbnail);
      } else if (typeof jpegThumbnail === 'object' && jpegThumbnail !== null) {
        // Object with numeric keys like {"0": 255, "1": 216, "2": 255, ...}
        const keys = Object.keys(jpegThumbnail).filter(k => !isNaN(Number(k))).sort((a, b) => Number(a) - Number(b));
        const values = keys.map(k => jpegThumbnail[k]);
        thumbnailBytes = new Uint8Array(values);
        console.log(`Converted object thumbnail to ${thumbnailBytes.length} bytes`);
      } else {
        console.log("Unknown thumbnail format:", typeof jpegThumbnail);
        return "";
      }
      
      // Validate JPEG magic bytes (0xFF 0xD8)
      if (thumbnailBytes.length < 2 || thumbnailBytes[0] !== 0xFF || thumbnailBytes[1] !== 0xD8) {
        console.log("Invalid JPEG thumbnail - wrong magic bytes");
        return "";
      }

      const filePath = `${session.organization_id}/${conversationId}/${messageId}_thumb.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from("whatsapp-media")
        .upload(filePath, thumbnailBytes, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error("Error uploading thumbnail:", uploadError);
        return "";
      }

      const { data: urlData } = supabase.storage
        .from("whatsapp-media")
        .getPublicUrl(filePath);

      console.log(`Thumbnail saved successfully: ${urlData.publicUrl}`);
      return urlData.publicUrl;
    } catch (error) {
      console.error("Error saving thumbnail:", error);
      return "";
    }
  };

  try {
    // Try Strategy 1: getBase64FromMediaMessage (most reliable when it works)
    const base64Content = await tryGetBase64FromEvolution();
    if (base64Content) {
      const fileContent = decode(base64Content);
      const url = await uploadToStorage(fileContent);
      if (url) return { url, path: storedPath };
    }

    // Try Strategy 2: Download media by ID
    const mediaById = await tryDownloadMediaById();
    if (mediaById) {
      const url = await uploadToStorage(mediaById);
      if (url) return { url, path: storedPath };
    }

    // Try Strategy 3: Direct download from WhatsApp (URL expires quickly)
    const directDownload = await tryDirectDownload();
    if (directDownload && directDownload.length > 100) {
      const url = await uploadToStorage(directDownload);
      if (url) {
        console.log("Strategy 3: Direct download successful");
        return { url, path: storedPath };
      }
    }

    // Try Strategy 4: Evolution media proxy
    const proxyContent = await tryEvolutionMediaProxy();
    if (proxyContent) {
      const url = await uploadToStorage(proxyContent);
      if (url) return { url, path: storedPath };
    }

    // Try Strategy 5: DirectPath CDN download
    const directPathContent = await tryDirectPathDownload();
    if (directPathContent && directPathContent.length > 100) {
      const url = await uploadToStorage(directPathContent);
      if (url) {
        return { url, path: storedPath };
      }
    }

    // FALLBACK: For images, try to save the thumbnail
    if (messageType === "image" && jpegThumbnail) {
      const thumbnailUrl = await saveThumbnail();
      if (thumbnailUrl) {
        console.log("Using thumbnail as fallback for image");
        return { url: thumbnailUrl, path: storedPath };
      }
    }

    console.log("All download strategies failed");
    return { url: "", path: null };

  } catch (error) {
    console.error("Error in downloadAndStoreMediaWithPath:", error);
    return { url: "", path: null };
  }
}

async function handleMessagesUpdate(supabase: any, session: any, data: any) {
  const updates = Array.isArray(data) ? data : [data];

  for (const update of updates) {
    try {
      const key = update.key || {};
      const messageId = key.id;
      
      if (!messageId) continue;

      // Evolution v2 status format
      const status = update.update?.status || update.status;

      let updateData: any = {};
      
      // Status codes: 0 = error, 1 = pending, 2 = server, 3 = delivery, 4 = read, 5 = played
      if (status === 2 || status === "SERVER_ACK") {
        updateData.status = "sent";
      } else if (status === 3 || status === "DELIVERY_ACK") {
        updateData.status = "delivered";
        updateData.delivered_at = new Date().toISOString();
      } else if (status === 4 || status === "READ") {
        updateData.status = "read";
        updateData.read_at = new Date().toISOString();
      } else if (status === 5 || status === "PLAYED") {
        updateData.status = "played";
        updateData.read_at = new Date().toISOString();
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from("whatsapp_messages")
          .update(updateData)
          .eq("session_id", session.id)
          .eq("message_id", messageId);
        
        console.log(`Message ${messageId} status updated to: ${updateData.status}`);
      }

    } catch (error) {
      console.error("Error updating message status:", error);
    }
  }
}

// Handle MESSAGES_DELETE event - when messages are deleted
async function handleMessagesDelete(supabase: any, session: any, data: any) {
  try {
    const messageId = data?.key?.id || data?.id;
    
    if (!messageId) {
      console.log("Delete event missing message id:", data);
      return;
    }
    
    console.log(`Deleting message ${messageId} from session ${session.id}`);
    
    // Soft delete by updating content or completely remove
    const { error } = await supabase
      .from("whatsapp_messages")
      .update({ 
        content: "[Mensagem apagada]",
        message_type: "deleted"
      })
      .eq("session_id", session.id)
      .eq("message_id", messageId);
      
    if (error) {
      console.error("Error deleting message:", error);
    } else {
      console.log(`Message ${messageId} marked as deleted`);
    }
  } catch (error) {
    console.error("Error in handleMessagesDelete:", error);
  }
}

// Handle PRESENCE_UPDATE event - when contact is typing/recording
async function handlePresenceUpdate(supabase: any, session: any, data: any) {
  try {
    // data format: { id: "5511999999999@s.whatsapp.net", presences: { "5511999999999@s.whatsapp.net": { lastKnownPresence: "composing" } } }
    const contactJid = data?.id;
    const presenceInfo = data?.presences?.[contactJid];
    
    if (!contactJid || !presenceInfo) {
      console.log("Presence update missing data:", data);
      return;
    }
    
    // Possible values: 'composing', 'recording', 'paused', 'available', 'unavailable'
    const presence = presenceInfo.lastKnownPresence;
    const contactPhone = contactJid.replace("@s.whatsapp.net", "").replace("@c.us", "").replace("@g.us", "");
    
    console.log(`Presence update for ${contactPhone}: ${presence}`);
    
    // Only update for active presence states
    if (presence === 'composing' || presence === 'recording') {
      await supabase
        .from("whatsapp_conversations")
        .update({ 
          contact_presence: presence,
          presence_updated_at: new Date().toISOString()
        })
        .eq("session_id", session.id)
        .eq("contact_phone", contactPhone);
    } else {
      // Clear presence after paused/available/unavailable
      await supabase
        .from("whatsapp_conversations")
        .update({ 
          contact_presence: null,
          presence_updated_at: new Date().toISOString()
        })
        .eq("session_id", session.id)
        .eq("contact_phone", contactPhone);
    }
  } catch (error) {
    console.error("Error in handlePresenceUpdate:", error);
  }
}

// Handle SEND_MESSAGE event - confirmation of sent messages
async function handleSendMessage(supabase: any, session: any, data: any) {
  try {
    const key = data?.key || {};
    const messageId = key.id;
    
    if (!messageId) {
      console.log("Send message event missing id:", data);
      return;
    }
    
    console.log(`Send message confirmed: ${messageId}`);
    
    // Update message status to sent
    await supabase
      .from("whatsapp_messages")
      .update({ 
        status: "sent",
        sent_at: new Date().toISOString()
      })
      .eq("session_id", session.id)
      .eq("message_id", messageId);
      
  } catch (error) {
    console.error("Error in handleSendMessage:", error);
  }
}

// Handle GROUPS_UPSERT event - when groups are created or updated
async function handleGroupsUpsert(supabase: any, session: any, data: any) {
  const groups = Array.isArray(data) ? data : [data];
  console.log(`Processing ${groups.length} groups upsert for session ${session.id}`);
  
  for (const group of groups) {
    try {
      const groupId = group.id; // xxxxx@g.us
      const groupSubject = group.subject; // Nome do grupo
      
      if (!groupId || !groupSubject) {
        console.log("Group missing id or subject, skipping:", group);
        continue;
      }
      
      console.log(`Updating group: ${groupId} -> ${groupSubject}`);
      
      // Update existing conversation with real group name
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ contact_name: groupSubject })
        .eq("session_id", session.id)
        .eq("remote_jid", groupId);
        
      if (error) {
        console.error(`Error updating group ${groupId}:`, error);
      } else {
        console.log(`Group name updated: ${groupId} -> ${groupSubject}`);
      }
    } catch (error) {
      console.error("Error processing group upsert:", error);
    }
  }
}

// Handle GROUP_UPDATE event - when group name/description/photo changes
async function handleGroupUpdate(supabase: any, session: any, data: any) {
  const updates = Array.isArray(data) ? data : [data];
  console.log(`Processing ${updates.length} group updates for session ${session.id}`);
  
  for (const update of updates) {
    try {
      const groupId = update.id;
      const newSubject = update.subject; // Novo nome
      
      if (!groupId) {
        console.log("Group update missing id, skipping:", update);
        continue;
      }
      
      if (newSubject) {
        console.log(`Updating group name: ${groupId} -> ${newSubject}`);
        
        const { error } = await supabase
          .from("whatsapp_conversations")
          .update({ contact_name: newSubject })
          .eq("session_id", session.id)
          .eq("remote_jid", groupId);
          
        if (error) {
          console.error(`Error updating group ${groupId}:`, error);
        } else {
          console.log(`Group name updated: ${groupId} -> ${newSubject}`);
        }
      }
    } catch (error) {
      console.error("Error processing group update:", error);
    }
  }
}

async function createLeadFromConversation(
  supabase: any, 
  session: any, 
  conversation: any,
  contactName: string,
  contactPhone: string,
  firstMessage: string,
  isFromAds: boolean = false,
  adSource: string | null = null
) {
  try {
    console.log(`Attempting to create lead: phone=${contactPhone}, session_owner=${session.owner_user_id}, org=${session.organization_id}, isFromAds=${isFromAds}, adSource=${adSource}`);
    
    // ===== BUSCAR LEAD EXISTENTE COM TELEFONE NORMALIZADO =====
    const normalizedPhone = normalizePhoneNumber(contactPhone);
    console.log(`Normalized phone: ${normalizedPhone} (original: ${contactPhone})`);
    
    // Buscar todos os leads da organização com telefone
    const { data: allLeads, error: searchError } = await supabase
      .from("leads")
      .select("id, phone")
      .eq("organization_id", session.organization_id)
      .not("phone", "is", null);

    if (searchError) {
      console.error("Error searching for existing leads:", searchError);
    }

    // Verificar se algum lead tem telefone que combina (normalizado)
    const existingLead = allLeads?.find((l: { id: string; phone: string | null }) => {
      if (!l.phone) return false;
      const leadNormalizedPhone = normalizePhoneNumber(l.phone);
      return leadNormalizedPhone === normalizedPhone;
    });

    if (existingLead) {
      // Link conversation to existing lead
      await supabase
        .from("whatsapp_conversations")
        .update({ lead_id: existingLead.id })
        .eq("id", conversation.id);
      
      console.log(`Linked conversation to existing lead: ${existingLead.id} (matched by normalized phone)`);
      
      // Registrar atividade de reentrada no histórico
      await supabase.from("activities").insert({
        lead_id: existingLead.id,
        type: "lead_reentry",
        content: `Lead entrou novamente via WhatsApp`,
        user_id: null,
        metadata: {
          source: "whatsapp",
          from_ads: isFromAds,
          ad_source: adSource || null,
          phone: contactPhone,
        }
      });
      
      // If from ads, still apply tag to existing lead
      if (isFromAds) {
        await applyFacebookAdsTag(supabase, session.organization_id, existingLead.id, adSource);
      }
      return;
    }

    // Determinar usuário responsável
    let assignedUserId = session.owner_user_id;
    
    // Se não houver owner_user_id, buscar primeiro usuário admin da organização
    if (!assignedUserId) {
      console.log("No owner_user_id, searching for org admin...");
      const { data: orgUser } = await supabase
        .from("users")
        .select("id")
        .eq("organization_id", session.organization_id)
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();
      
      if (orgUser) {
        assignedUserId = orgUser.id;
        console.log(`Found org admin: ${assignedUserId}`);
      } else {
        // Buscar qualquer usuário da organização
        const { data: anyUser } = await supabase
          .from("users")
          .select("id")
          .eq("organization_id", session.organization_id)
          .limit(1)
          .maybeSingle();
        
        if (anyUser) {
          assignedUserId = anyUser.id;
          console.log(`Found org user: ${assignedUserId}`);
        }
      }
    }

    if (!assignedUserId) {
      console.log("No user found to assign lead, skipping lead creation");
      return;
    }

    // Get default pipeline and first stage
    let pipelineId: string | null = null;
    
    const { data: defaultPipeline, error: pipelineError } = await supabase
      .from("pipelines")
      .select("id")
      .eq("organization_id", session.organization_id)
      .eq("is_default", true)
      .maybeSingle();

    if (pipelineError) {
      console.error("Error finding pipeline:", pipelineError);
    }

    if (defaultPipeline) {
      pipelineId = defaultPipeline.id;
    } else {
      // Tentar buscar qualquer pipeline da organização
      const { data: anyPipeline } = await supabase
        .from("pipelines")
        .select("id")
        .eq("organization_id", session.organization_id)
        .limit(1)
        .maybeSingle();
      
      if (!anyPipeline) {
        console.log("No pipeline found, skipping lead creation");
        return;
      }
      
      console.log(`Using first available pipeline: ${anyPipeline.id}`);
      pipelineId = anyPipeline.id;
    }

    const { data: stage, error: stageError } = await supabase
      .from("stages")
      .select("id")
      .eq("pipeline_id", pipelineId)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (stageError) {
      console.error("Error finding stage:", stageError);
    }

    if (!stage) {
      console.log("No stage found, skipping lead creation");
      return;
    }

    // Determine source based on Facebook Ads detection
    let leadSource = "whatsapp";
    if (isFromAds) {
      if (adSource?.includes("instagram")) {
        leadSource = "instagram";
      } else {
        leadSource = "facebook";
      }
    }

    // Create new lead
    console.log(`Creating lead: name=${contactName}, phone=${contactPhone}, pipeline=${pipelineId}, stage=${stage.id}, user=${assignedUserId}, source=${leadSource}`);
    
    const { data: newLead, error: leadError } = await supabase
      .from("leads")
      .insert({
        organization_id: session.organization_id,
        name: contactName,
        phone: contactPhone,
        message: firstMessage,
        source: leadSource,
        pipeline_id: pipelineId,
        stage_id: stage.id,
        assigned_user_id: assignedUserId,
        source_session_id: session.id, // Track which WhatsApp session created this lead
      })
      .select()
      .single();

    if (leadError) {
      console.error("Error creating lead:", leadError);
      return;
    }

    // Link conversation to new lead
    const { error: linkError } = await supabase
      .from("whatsapp_conversations")
      .update({ lead_id: newLead.id })
      .eq("id", conversation.id);
    
    if (linkError) {
      console.error("Error linking conversation to lead:", linkError);
    }

    // Apply Facebook Ads tag if from ads
    if (isFromAds) {
      await applyFacebookAdsTag(supabase, session.organization_id, newLead.id, adSource);
    }

    // Create activity
    const activityContent = isFromAds 
      ? `Lead criado automaticamente via WhatsApp (Facebook Ads - ${adSource || 'unknown'})`
      : `Lead criado automaticamente via WhatsApp`;
    
    const { error: activityError } = await supabase
      .from("activities")
      .insert({
        lead_id: newLead.id,
        type: "whatsapp",
        content: activityContent,
        user_id: assignedUserId,
      });
    
    if (activityError) {
      console.error("Error creating activity:", activityError);
    }

    console.log(`Created new lead from WhatsApp: ${newLead.id}, isFromAds: ${isFromAds}`);

  } catch (error) {
    console.error("Error creating lead from conversation:", error);
  }
}

// Apply "Facebook Ads" tag to a lead
async function applyFacebookAdsTag(
  supabase: any,
  organizationId: string,
  leadId: string,
  adSource: string | null
) {
  try {
    // Tag única "Tráfego" para todos os leads de ads (padrão para todas as organizações)
    const tagName = "Tráfego";
    const tagColor = "#F97316"; // Laranja
    
    // Find or create tag
    let tagId: string | null = null;
    
    const { data: existingTag } = await supabase
      .from("tags")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("name", tagName)
      .maybeSingle();
    
    if (existingTag) {
      tagId = existingTag.id;
    } else {
      // Create tag if not exists
      const { data: newTag, error: tagError } = await supabase
        .from("tags")
        .insert({
          organization_id: organizationId,
          name: tagName,
          color: tagColor,
          description: "Lead originado de tráfego pago (Facebook/Instagram Ads)"
        })
        .select()
        .single();
      
      if (tagError) {
        console.error("Error creating Facebook Ads tag:", tagError);
        return;
      }
      
      if (newTag) {
        tagId = newTag.id;
        console.log(`Created ${tagName} tag: ${tagId}`);
      }
    }
    
    // Check if tag is already applied
    if (tagId) {
      const { data: existingLink } = await supabase
        .from("lead_tags")
        .select("id")
        .eq("lead_id", leadId)
        .eq("tag_id", tagId)
        .maybeSingle();
      
      if (!existingLink) {
        // Link tag to lead
        const { error: linkError } = await supabase
          .from("lead_tags")
          .insert({ lead_id: leadId, tag_id: tagId });
        
        if (linkError) {
          console.error("Error linking Facebook Ads tag to lead:", linkError);
        } else {
          console.log(`Applied ${tagName} tag to lead ${leadId}`);
        }
      }
    }
  } catch (error) {
    console.error("Error applying Facebook Ads tag:", error);
  }
}

// Fetch and save contact profile picture from Evolution API
async function fetchAndSaveProfilePicture(
  supabase: any,
  session: any,
  conversationId: string,
  phone: string
) {
  try {
    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!evolutionUrl || !evolutionKey) {
      console.log("Evolution API not configured for profile picture fetch");
      return;
    }

    const formattedPhone = phone.replace(/\D/g, "");
    console.log(`Fetching profile picture for ${formattedPhone} on instance ${session.instance_name}`);

    const response = await fetch(`${evolutionUrl}/chat/fetchProfilePictureUrl/${session.instance_name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionKey,
      },
      body: JSON.stringify({ number: formattedPhone }),
    });

    if (!response.ok) {
      console.log(`Could not fetch profile picture for ${formattedPhone}: ${response.status}`);
      return;
    }

    const data = await response.json();
    const pictureUrl = data.profilePictureUrl || data.wpiUrl || null;

    if (pictureUrl) {
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ contact_picture: pictureUrl })
        .eq("id", conversationId);

      if (error) {
        console.error("Error saving profile picture:", error);
      } else {
        console.log(`Saved profile picture for conversation ${conversationId}`);
      }
    } else {
      console.log(`No profile picture available for ${formattedPhone}`);
    }
  } catch (error) {
    console.log("Could not fetch profile picture:", error);
  }
}
