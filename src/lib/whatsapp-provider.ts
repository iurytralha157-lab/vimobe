import type { WhatsAppSession } from "@/hooks/use-whatsapp-sessions";
import { supabase } from "@/integrations/supabase/client";
import { callEvolutionGo } from "@/hooks/use-evolution-go";

/**
 * Provider router: same operation, but routed to the correct backend
 * depending on session.provider.
 *
 * The goal is to keep all UI components provider-agnostic.
 */
export function getWhatsAppClient(session: Pick<WhatsAppSession, "provider" | "id" | "instance_name">) {
  const isGo = session.provider === "evolution_go";

  async function sendText(number: string, text: string) {
    if (isGo) {
      return callEvolutionGo("send.text", { session_id: session.id, body: { number, text } });
    }
    const { data, error } = await supabase.functions.invoke("evolution-proxy", {
      body: { action: "sendText", instanceName: session.instance_name, number, text },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: !!data?.success, data: data?.data, error: data?.error };
  }

  async function sendMedia(
    number: string,
    base64: string,
    mediatype: "image" | "video" | "document" | "audio",
    mimetype: string,
    fileName?: string,
    caption?: string,
  ) {
    if (isGo) {
      return callEvolutionGo("send.media", {
        session_id: session.id,
        body: { number, media: base64, mediatype, mimetype, fileName, caption },
      });
    }
    const { data, error } = await supabase.functions.invoke("evolution-proxy", {
      body: {
        action: "sendMedia",
        instanceName: session.instance_name,
        number,
        media: base64,
        mediatype,
        mimetype,
        fileName,
        caption,
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: !!data?.success, data: data?.data, error: data?.error };
  }

  async function sendAudio(number: string, base64: string, mimetype = "audio/ogg") {
    if (isGo) {
      return callEvolutionGo("send.audio", {
        session_id: session.id,
        body: { number, media: base64, mimetype },
      });
    }
    const { data, error } = await supabase.functions.invoke("evolution-proxy", {
      body: { action: "sendAudio", instanceName: session.instance_name, number, audio: base64, mimetype },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: !!data?.success, data: data?.data, error: data?.error };
  }

  return { sendText, sendMedia, sendAudio, isGo };
}
