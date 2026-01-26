import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EvolutionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("Evolution API not configured - EVOLUTION_API_URL:", !!EVOLUTION_API_URL, "EVOLUTION_API_KEY:", !!EVOLUTION_API_KEY);
      return new Response(
        JSON.stringify({ success: false, error: "Evolution API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, ...params } = await req.json();
    console.log(`Evolution proxy action: ${action}`, params);

    let result: EvolutionResponse;

    switch (action) {
      case "createInstance":
        result = await createInstance(EVOLUTION_API_URL, EVOLUTION_API_KEY, SUPABASE_URL, params);
        break;

      case "getQRCode":
        result = await getQRCode(EVOLUTION_API_URL, EVOLUTION_API_KEY, params.instanceName);
        break;

      case "getConnectionStatus":
      case "checkConnection":
        result = await getConnectionStatus(EVOLUTION_API_URL, EVOLUTION_API_KEY, params.instanceName);
        break;

      case "sendMessage":
        result = await sendMessage(EVOLUTION_API_URL, EVOLUTION_API_KEY, params);
        break;

      case "sendFile":
        result = await sendMedia(EVOLUTION_API_URL, EVOLUTION_API_KEY, params);
        break;

      case "fetchChats":
        result = await fetchChats(EVOLUTION_API_URL, EVOLUTION_API_KEY, params.instanceName);
        break;

      case "fetchMessages":
        result = await fetchMessages(EVOLUTION_API_URL, EVOLUTION_API_KEY, params);
        break;

      case "deleteInstance":
      case "deleteSession":
        result = await deleteInstance(EVOLUTION_API_URL, EVOLUTION_API_KEY, params.instanceName || params.sessionName);
        break;

      case "logoutInstance":
      case "logout":
        result = await logoutInstance(EVOLUTION_API_URL, EVOLUTION_API_KEY, params.instanceName || params.sessionName);
        break;

      case "setWebhook":
        result = await setWebhook(EVOLUTION_API_URL, EVOLUTION_API_KEY, params);
        break;

      case "sendSeen":
        result = await sendSeen(EVOLUTION_API_URL, EVOLUTION_API_KEY, params);
        break;

      case "fetchProfilePicture":
        result = await fetchProfilePicture(EVOLUTION_API_URL, EVOLUTION_API_KEY, params);
        break;

      case "updateSettings":
        result = await updateInstanceSettings(EVOLUTION_API_URL, EVOLUTION_API_KEY, params);
        break;

      case "fetchGroupInfo":
        result = await fetchGroupInfo(EVOLUTION_API_URL, EVOLUTION_API_KEY, params.instanceName, params.groupJid);
        break;

      case "fetchAllGroups":
        result = await fetchAllGroups(EVOLUTION_API_URL, EVOLUTION_API_KEY, params.instanceName);
        break;

      default:
        result = { success: false, error: `Unknown action: ${action}` };
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: unknown) {
    console.error("Evolution proxy error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function createInstance(apiUrl: string, apiKey: string, supabaseUrl: string, params: any): Promise<EvolutionResponse> {
  try {
    const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook`;
    
    const response = await fetch(`${apiUrl}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
      body: JSON.stringify({
        instanceName: params.instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        reject_call: false,
        groupsIgnore: false,
        alwaysOnline: true,
        readMessages: false,
        readStatus: true,
        syncFullHistory: false,
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: true,
          headers: {},
          events: [
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "MESSAGES_DELETE",
            "CONNECTION_UPDATE",
            "QRCODE_UPDATED",
            "PRESENCE_UPDATE",
            "SEND_MESSAGE"
          ]
        }
      }),
    });

    const data = await response.json();
    console.log("Create instance response:", data);

    if (!response.ok) {
      return { success: false, error: data.message || data.error || "Failed to create instance" };
    }

    return { success: true, data };
  } catch (error: unknown) {
    console.error("Create instance error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function getQRCode(apiUrl: string, apiKey: string, instanceName: string): Promise<EvolutionResponse> {
  try {
    const response = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: {
        "apikey": apiKey,
      },
    });

    const data = await response.json();
    console.log("QR Code response:", data);

    if (!response.ok) {
      return { success: false, error: data.message || "Failed to get QR code" };
    }

    // Evolution API v2 returns base64 directly or in a code/base64 field
    const qrcode = data.base64 || data.code || data.qrcode?.base64 || data.qrcode;
    
    return { success: true, data: { qrcode, base64: qrcode, ...data } };
  } catch (error: unknown) {
    console.error("Get QR code error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function getConnectionStatus(apiUrl: string, apiKey: string, instanceName: string): Promise<EvolutionResponse> {
  try {
    const response = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: {
        "apikey": apiKey,
      },
    });

    const data = await response.json();
    console.log("Connection status response:", { status: response.status, error: response.ok ? null : response.statusText, response: data });

    // Handle 404 - instance doesn't exist
    if (response.status === 404) {
      return { 
        success: true, 
        data: { 
          state: "close",
          status: false,
          connected: false,
          instanceNotFound: true,
          message: "A instância não existe. Por favor, reconecte sua sessão WhatsApp."
        } 
      };
    }

    if (!response.ok) {
      // Return disconnected state instead of error for better UX
      return { 
        success: true, 
        data: { 
          state: "close",
          status: false,
          connected: false,
          error: data.message || "Falha ao verificar conexão"
        } 
      };
    }

    // Map Evolution v2 status to our format
    const state = data.instance?.state || data.state || "close";
    const isConnected = state === "open" || state === "connected";
    
    return { 
      success: true, 
      data: { 
        ...data, 
        state: isConnected ? "open" : state,
        status: isConnected,
        connected: isConnected
      } 
    };
  } catch (error: unknown) {
    console.error("Get connection status error:", error);
    // Return disconnected state instead of error
    return { 
      success: true, 
      data: { 
        state: "close",
        status: false,
        connected: false,
        error: error instanceof Error ? error.message : "Erro desconhecido"
      } 
    };
  }
}

async function sendMessage(apiUrl: string, apiKey: string, params: any): Promise<EvolutionResponse> {
  try {
    const { instanceName, number, text, phone, message, sessionName } = params;
    const instance = instanceName || sessionName;
    const phoneNumber = number || phone;
    const messageText = text || message;

    // Format phone number for Evolution (just digits with country code)
    const formattedPhone = phoneNumber.replace(/\D/g, "");

    const response = await fetch(`${apiUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: messageText,
      }),
    });

    const data = await response.json();
    console.info("Send message response:", data);

    if (!response.ok) {
      // Check if the error is about number not existing on WhatsApp
      if (data.response?.message && Array.isArray(data.response.message)) {
        const notFoundNumbers = data.response.message.filter((m: any) => m.exists === false);
        if (notFoundNumbers.length > 0) {
          return { 
            success: false, 
            error: `Número ${notFoundNumbers[0].number} não está registrado no WhatsApp` 
          };
        }
      }
      return { success: false, error: data.message || data.error || "Failed to send message" };
    }

    return { success: true, data };
  } catch (error: unknown) {
    console.error("Send message error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function sendMedia(apiUrl: string, apiKey: string, params: any): Promise<EvolutionResponse> {
  try {
    const { 
      instanceName, number, phone, path, filename, caption, sessionName, 
      mediaUrl, mediaType, text, base64, mimetype 
    } = params;
    const instance = instanceName || sessionName;
    const phoneNumber = number || phone;
    
    // Não usar como caption se for apenas o nome do arquivo
    const rawCaption = caption || text || "";
    const isJustFilename = rawCaption && (
      rawCaption === filename || 
      /^[a-f0-9-]+\.(png|jpg|jpeg|gif|webp|mp4|mp3|pdf|doc|docx|ogg|wav|m4a)$/i.test(rawCaption)
    );
    const mediaCaption = isJustFilename ? "" : rawCaption;

    const formattedPhone = phoneNumber.replace(/\D/g, "");

    // Prefer base64 if available (more reliable), fallback to URL
    const mediaContent = base64 || mediaUrl || path;
    const isBase64 = !!base64;
    
    console.log(`Sending media: type=${mediaType}, isBase64=${isBase64}, mime=${mimetype}, hasContent=${!!mediaContent}, caption=${mediaCaption}`);

    // Determine the correct endpoint and body based on media type
    let endpoint = "sendMedia";
    let body: any;

    if (mediaType === "image") {
      endpoint = "sendMedia";
      body = {
        number: formattedPhone,
        mediatype: "image",
        mimetype: mimetype || "image/jpeg",
        caption: mediaCaption,
        fileName: filename || "image.jpg",
        media: mediaContent,
      };
    } else if (mediaType === "video") {
      endpoint = "sendMedia";
      body = {
        number: formattedPhone,
        mediatype: "video",
        mimetype: mimetype || "video/mp4",
        caption: mediaCaption,
        fileName: filename || "video.mp4",
        media: mediaContent,
      };
    } else if (mediaType === "audio") {
      endpoint = "sendWhatsAppAudio";
      body = {
        number: formattedPhone,
        audio: mediaContent,
      };
    } else if (mediaType === "document") {
      endpoint = "sendMedia";
      body = {
        number: formattedPhone,
        mediatype: "document",
        mimetype: mimetype || "application/octet-stream",
        caption: mediaCaption,
        fileName: filename || "document",
        media: mediaContent,
      };
    } else {
      // Generic fallback
      endpoint = "sendMedia";
      body = {
        number: formattedPhone,
        mediatype: mediaType || "image",
        mimetype: mimetype || "application/octet-stream",
        caption: mediaCaption,
        fileName: filename || "file",
        media: mediaContent,
      };
    }

    console.log(`Sending media via ${endpoint}:`, { ...body, media: body.media?.substring?.(0, 50) + "..." || body.media });

    let response = await fetch(`${apiUrl}/message/${endpoint}/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
      body: JSON.stringify(body),
    });

    let data = await response.json();
    console.log(`Send ${endpoint} response:`, data);

    // If failed, try alternative endpoints
    if (!response.ok) {
      console.log("First endpoint failed, trying specific endpoints...");
      
      // Try specific endpoints for each type
      let altEndpoint = "";
      let altBody: any = null;

      if (mediaType === "image") {
        altEndpoint = "sendImage";
        altBody = {
          number: formattedPhone,
          image: mediaContent,
          caption: mediaCaption,
        };
      } else if (mediaType === "video") {
        altEndpoint = "sendVideo";
        altBody = {
          number: formattedPhone,
          video: mediaContent,
          caption: mediaCaption,
        };
      } else if (mediaType === "document") {
        altEndpoint = "sendDocument";
        altBody = {
          number: formattedPhone,
          document: mediaContent,
          fileName: filename || "document",
          caption: mediaCaption,
        };
      }

      if (altEndpoint && altBody) {
        console.log(`Trying alternative endpoint: ${altEndpoint}`);
        response = await fetch(`${apiUrl}/message/${altEndpoint}/${instance}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": apiKey,
          },
          body: JSON.stringify(altBody),
        });
        data = await response.json();
        console.log(`Alternative ${altEndpoint} response:`, data);
      }
    }

    if (!response.ok) {
      // Extract error message from various response formats
      const errorMsg = data.response?.message?.[0] || data.message || data.error || "Failed to send media";
      return { success: false, error: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg) };
    }

    return { success: true, data };
  } catch (error: unknown) {
    console.error("Send media error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function fetchChats(apiUrl: string, apiKey: string, instanceName: string): Promise<EvolutionResponse> {
  try {
    const response = await fetch(`${apiUrl}/chat/findChats/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    console.log("Fetch chats response:", data);

    if (!response.ok) {
      return { success: false, error: data.message || "Failed to fetch chats" };
    }

    return { success: true, data };
  } catch (error: unknown) {
    console.error("Fetch chats error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function fetchMessages(apiUrl: string, apiKey: string, params: any): Promise<EvolutionResponse> {
  try {
    const { instanceName, remoteJid, count = 50 } = params;

    const response = await fetch(`${apiUrl}/chat/findMessages/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
      body: JSON.stringify({
        where: {
          key: {
            remoteJid,
          },
        },
        limit: count,
      }),
    });

    const data = await response.json();
    console.log("Fetch messages response:", data);

    if (!response.ok) {
      return { success: false, error: data.message || "Failed to fetch messages" };
    }

    return { success: true, data };
  } catch (error: unknown) {
    console.error("Fetch messages error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function deleteInstance(apiUrl: string, apiKey: string, instanceName: string): Promise<EvolutionResponse> {
  try {
    const response = await fetch(`${apiUrl}/instance/delete/${instanceName}`, {
      method: "DELETE",
      headers: {
        "apikey": apiKey,
      },
    });

    // Evolution might return empty response on successful delete
    let data = {};
    try {
      data = await response.json();
    } catch {
      // Empty response is OK for delete
    }
    console.log("Delete instance response:", data);

    if (!response.ok && response.status !== 404) {
      return { success: false, error: (data as any).message || "Failed to delete instance" };
    }

    return { success: true, data };
  } catch (error: unknown) {
    console.error("Delete instance error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function logoutInstance(apiUrl: string, apiKey: string, instanceName: string): Promise<EvolutionResponse> {
  try {
    const response = await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
      method: "DELETE",
      headers: {
        "apikey": apiKey,
      },
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      // Empty response is OK
    }
    console.log("Logout instance response:", data);

    if (!response.ok) {
      return { success: false, error: (data as any).message || "Failed to logout instance" };
    }

    return { success: true, data };
  } catch (error: unknown) {
    console.error("Logout instance error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function setWebhook(apiUrl: string, apiKey: string, params: any): Promise<EvolutionResponse> {
  try {
    const { instanceName, webhookUrl } = params;

    const response = await fetch(`${apiUrl}/webhook/set/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          webhookBase64: true,
          events: [
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "MESSAGES_DELETE",
            "CONNECTION_UPDATE",
            "QRCODE_UPDATED",
            "PRESENCE_UPDATE",
            "SEND_MESSAGE",
          ],
        },
      }),
    });

    const data = await response.json();
    console.log("Set webhook response:", data);

    if (!response.ok) {
      return { success: false, error: data.message || "Failed to set webhook" };
    }

    return { success: true, data };
  } catch (error: unknown) {
    console.error("Set webhook error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function sendSeen(apiUrl: string, apiKey: string, params: any): Promise<EvolutionResponse> {
  try {
    const { instanceName, sessionName, phone, number, isGroup } = params;
    const instance = instanceName || sessionName;
    const phoneNumber = phone || number;
    
    const formattedPhone = phoneNumber.replace(/\D/g, "");
    const remoteJid = isGroup ? `${formattedPhone}@g.us` : `${formattedPhone}@s.whatsapp.net`;

    const response = await fetch(`${apiUrl}/chat/markMessageAsRead/${instance}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
      body: JSON.stringify({
        readMessages: [{ remoteJid }],
      }),
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      // Empty response is OK
    }
    console.log("Send seen response:", data);

    // Don't fail if this doesn't work - it's not critical
    return { success: true, data };
  } catch (error: unknown) {
    console.error("Send seen error:", error);
    // Return success anyway - marking as read is not critical
    return { success: true, data: {} };
  }
}

async function fetchProfilePicture(apiUrl: string, apiKey: string, params: any): Promise<EvolutionResponse> {
  try {
    const { instanceName, number } = params;
    if (!instanceName || !number) {
      return { success: false, error: "instanceName and number are required" };
    }

    const formattedPhone = number.replace(/\D/g, "");
    console.log(`Fetching profile picture for ${formattedPhone} on instance ${instanceName}`);

    const response = await fetch(`${apiUrl}/chat/fetchProfilePictureUrl/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
      body: JSON.stringify({ number: formattedPhone }),
    });

    const data = await response.json();
    console.log("Fetch profile picture response:", data);

    if (!response.ok) {
      return { success: false, error: data.message || "Failed to fetch profile picture" };
    }

    return { 
      success: true, 
      data: { 
        profilePictureUrl: data.profilePictureUrl || data.wpiUrl || null 
      } 
    };
  } catch (error: unknown) {
    console.error("Fetch profile picture error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

async function updateInstanceSettings(apiUrl: string, apiKey: string, params: any): Promise<EvolutionResponse> {
  try {
    const { instanceName, settings } = params;
    
    if (!instanceName) {
      return { success: false, error: "instanceName is required" };
    }

    const response = await fetch(`${apiUrl}/settings/set/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
      body: JSON.stringify({
        rejectCall: false,
        readMessages: false,
        readStatus: true,
        ...settings
      }),
    });

    const data = await response.json();
    console.log("Update settings response:", data);

    if (!response.ok) {
      return { success: false, error: data.message || "Failed to update settings" };
    }

    return { success: true, data };
  } catch (error: unknown) {
    console.error("Update settings error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

async function fetchGroupInfo(apiUrl: string, apiKey: string, instanceName: string, groupJid: string): Promise<EvolutionResponse> {
  try {
    const response = await fetch(`${apiUrl}/group/findGroupInfos/${instanceName}?groupJid=${groupJid}`, {
      method: "GET",
      headers: {
        "apikey": apiKey,
      },
    });

    const data = await response.json();
    console.log("Fetch group info response:", data);

    if (!response.ok) {
      return { success: false, error: data.message || "Failed to fetch group info" };
    }

    return { success: true, data };
  } catch (error: unknown) {
    console.error("Fetch group info error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function fetchAllGroups(apiUrl: string, apiKey: string, instanceName: string): Promise<EvolutionResponse> {
  try {
    const response = await fetch(`${apiUrl}/group/fetchAllGroups/${instanceName}`, {
      method: "GET",
      headers: {
        "apikey": apiKey,
      },
    });

    const data = await response.json();
    console.log("Fetch all groups response:", data);

    if (!response.ok) {
      return { success: false, error: data.message || "Failed to fetch groups" };
    }

    return { success: true, data };
  } catch (error: unknown) {
    console.error("Fetch all groups error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
