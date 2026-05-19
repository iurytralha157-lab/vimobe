// Evolution Go (whatsmeow) proxy
// Routes actions from frontend to the Evolution Go REST API
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const API_URL = (Deno.env.get("EVOLUTION_GO_API_URL") || "").replace(/\/+$/, "");
const API_KEY = Deno.env.get("EVOLUTION_GO_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Method = "GET" | "POST" | "PUT" | "DELETE";

interface ProxyCall {
  method: Method;
  path: string;          // e.g. "/send/text"
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  instanceId?: string;   // injected as header / query when applicable
}

// Map of high-level actions -> Evolution Go REST calls
function buildCall(action: string, payload: any): ProxyCall {
  const inst = payload?.instance_id || payload?.instanceId;
  switch (action) {
    // ---------- Instance ----------
    case "instance.create": {
      const b = payload?.body ?? {};
      const body: Record<string, unknown> = {
        name: b.name ?? b.instanceName,
        token: b.token || "default_token",
      };
      if (b.proxy) body.proxy = b.proxy;
      return { method: "POST", path: "/instance/create", body };
    }
    case "instance.connect": {
      const b = payload?.body ?? {};
      return {
        method: "POST",
        path: "/instance/connect",
        body: {
          webhookUrl: b.webhookUrl,
          subscribe: b.subscribe ?? ["ALL"],
          immediate: b.immediate ?? true,
        },
        instanceId: inst,
      };
    }
    case "instance.qr":
      return { method: "GET", path: "/instance/qr", instanceId: inst };
    case "instance.status":
      return { method: "GET", path: "/instance/status", instanceId: inst };
    case "instance.all":
      return { method: "GET", path: "/instance/all" };
    case "instance.disconnect":
      return { method: "POST", path: "/instance/disconnect", instanceId: inst };
    case "instance.logout":
      return { method: "DELETE", path: "/instance/logout", instanceId: inst };
    case "instance.delete":
      return { method: "DELETE", path: `/instance/delete/${inst}` };
    case "instance.pair":
      return { method: "POST", path: "/instance/pair", body: payload.body, instanceId: inst };

    // ---------- Send ----------
    case "send.text":
      return { method: "POST", path: "/send/text", body: payload.body, instanceId: inst };
    case "send.media":
      return { method: "POST", path: "/send/media", body: payload.body, instanceId: inst };
    case "send.audio":
      return { method: "POST", path: "/send/media",
               body: { ...payload.body, mediatype: "audio", ptt: true }, instanceId: inst };
    case "send.sticker":
      return { method: "POST", path: "/send/sticker", body: payload.body, instanceId: inst };
    case "send.location":
      return { method: "POST", path: "/send/location", body: payload.body, instanceId: inst };
    case "send.contact":
      return { method: "POST", path: "/send/contact", body: payload.body, instanceId: inst };
    case "send.link":
      return { method: "POST", path: "/send/link", body: payload.body, instanceId: inst };
    case "send.poll":
      return { method: "POST", path: "/send/poll", body: payload.body, instanceId: inst };

    // ---------- Message ----------
    case "message.delete":
      return { method: "POST", path: "/message/delete", body: payload.body, instanceId: inst };
    case "message.edit":
      return { method: "POST", path: "/message/edit", body: payload.body, instanceId: inst };
    case "message.react":
      return { method: "POST", path: "/message/react", body: payload.body, instanceId: inst };
    case "message.markread":
      return { method: "POST", path: "/message/markread", body: payload.body, instanceId: inst };
    case "message.presence":
      return { method: "POST", path: "/message/presence", body: payload.body, instanceId: inst };
    case "message.status":
      return { method: "POST", path: "/message/status", body: payload.body, instanceId: inst };
    case "message.downloadMedia":
      return { method: "POST", path: "/message/downloadimage", body: payload.body, instanceId: inst };

    // ---------- Chat ----------
    case "chat.archive":   return { method: "POST", path: "/chat/archive",   body: payload.body, instanceId: inst };
    case "chat.unarchive": return { method: "POST", path: "/chat/archive",   body: { ...(payload.body ?? {}), archive: false }, instanceId: inst };
    case "chat.mute":      return { method: "POST", path: "/chat/mute",      body: payload.body, instanceId: inst };
    case "chat.unmute":    return { method: "POST", path: "/chat/mute",      body: { ...(payload.body ?? {}), mute: false }, instanceId: inst };
    case "chat.pin":       return { method: "POST", path: "/chat/pin",       body: payload.body, instanceId: inst };
    case "chat.unpin":     return { method: "POST", path: "/chat/unpin",     body: payload.body, instanceId: inst };

    // ---------- Label ----------
    case "label.list":     return { method: "GET",  path: "/label", instanceId: inst };
    case "label.edit":     return { method: "POST", path: "/label/edit",     body: payload.body, instanceId: inst };
    case "label.addChat":  return { method: "POST", path: "/label/chat",     body: payload.body, instanceId: inst };
    case "label.addMsg":   return { method: "POST", path: "/label/message",  body: payload.body, instanceId: inst };
    case "label.removeChat": return { method: "POST", path: "/unlabel/chat", body: payload.body, instanceId: inst };
    case "label.removeMsg":  return { method: "POST", path: "/unlabel/message", body: payload.body, instanceId: inst };

    // ---------- Group ----------
    case "group.list":         return { method: "GET",  path: "/group/list",  instanceId: inst };
    case "group.myAll":        return { method: "GET",  path: "/group/myall", instanceId: inst };
    case "group.info":         return { method: "POST", path: "/group/info",         body: payload.body, instanceId: inst };
    case "group.create":       return { method: "POST", path: "/group/create",       body: payload.body, instanceId: inst };
    case "group.setName":      return { method: "POST", path: "/group/name",         body: payload.body, instanceId: inst };
    case "group.setPhoto":     return { method: "POST", path: "/group/photo",        body: payload.body, instanceId: inst };
    case "group.inviteLink":   return { method: "POST", path: "/group/invitelink",   body: payload.body, instanceId: inst };
    case "group.join":         return { method: "POST", path: "/group/join",         body: payload.body, instanceId: inst };
    case "group.leave":        return { method: "POST", path: "/group/leave",        body: payload.body, instanceId: inst };
    case "group.participant":  return { method: "POST", path: "/group/participant",  body: payload.body, instanceId: inst };

    // ---------- User ----------
    case "user.avatar":   return { method: "POST", path: "/user/avatar",   body: payload.body, instanceId: inst };
    case "user.info":     return { method: "POST", path: "/user/info",     body: payload.body, instanceId: inst };
    case "user.check":    return { method: "POST", path: "/user/check",    body: payload.body, instanceId: inst };
    case "user.contacts": return { method: "GET",  path: "/user/contacts", instanceId: inst };
    case "user.block":    return { method: "POST", path: "/user/block",    body: payload.body, instanceId: inst };
    case "user.unblock":  return { method: "POST", path: "/user/unblock",  body: payload.body, instanceId: inst };
    case "user.blocklist": return { method: "GET", path: "/user/blocklist", instanceId: inst };

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}


async function callEvolutionGo(c: ProxyCall) {
  const url = new URL(`${API_URL}${c.path}`);
  if (c.query) {
    for (const [k, v] of Object.entries(c.query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    "apikey": API_KEY,
    "Content-Type": "application/json",
  };
  if (c.instanceId) headers["instanceId"] = c.instanceId;

  const init: RequestInit = { method: c.method, headers };
  if (c.body !== undefined && c.method !== "GET") {
    init.body = JSON.stringify(c.body);
  }

  const res = await fetch(url.toString(), init);
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    console.error(`[evolution-go-proxy] ${c.method} ${c.path} -> ${res.status}`, JSON.stringify(data));
  }
  return { status: res.status, ok: res.ok, data };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!API_URL || !API_KEY) {
      throw new Error("EVOLUTION_GO_API_URL/EVOLUTION_GO_API_KEY not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: claims, error: authError } =
      await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (authError || !claims?.claims) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload = await req.json();
    const action: string = payload?.action;
    if (!action) throw new Error("Missing 'action'");

    // If session_id given, resolve instance_id from DB
    if (payload.session_id && !payload.instance_id) {
      const { data: sess } = await supabase
        .from("whatsapp_sessions")
        .select("instance_id, instance_name, provider, organization_id")
        .eq("id", payload.session_id)
        .maybeSingle();
      if (sess) {
        payload.instance_id = sess.instance_id || sess.instance_name;
      }
    }

    const call = buildCall(action, payload);
    const result = await callEvolutionGo(call);

    const errMsg = !result.ok
      ? (result.data?.error?.message || result.data?.message || result.data?.error || `HTTP ${result.status}`)
      : undefined;

    return new Response(
      JSON.stringify({ ok: result.ok, status: result.status, data: result.data, error: errMsg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err) {
    console.error("evolution-go-proxy error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
