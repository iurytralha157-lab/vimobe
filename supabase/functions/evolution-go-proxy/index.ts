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
  token?: string;        // instance-specific token for auth
}

// Map of high-level actions -> Evolution Go REST calls
function buildCall(action: string, payload: any): ProxyCall {
  const inst = payload?.instance_id || payload?.instanceId;
  const token = payload?.token;

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
        query: { instanceId: inst },
        body: {
          webhookUrl: b.webhookUrl,
          subscribe: b.subscribe ?? ["ALL"],
          immediate: b.immediate ?? true,
        },
        instanceId: inst,
        token,
      };
    }
    case "instance.qr":
      return { method: "GET", path: "/instance/qr", query: { instanceId: inst }, instanceId: inst, token };
    case "instance.status":
      return { method: "GET", path: "/instance/status", query: { instanceId: inst }, instanceId: inst, token };
    case "instance.all":
      return { method: "GET", path: "/instance/all" };
    case "instance.disconnect":
      return { method: "POST", path: "/instance/disconnect", instanceId: inst, token };
    case "instance.logout":
      return { method: "DELETE", path: "/instance/logout", instanceId: inst, token };
    case "instance.delete":
      return { method: "DELETE", path: `/instance/delete/${inst}` };
    case "instance.pair":
      return { method: "POST", path: "/instance/pair", body: payload.body, instanceId: inst, token };

    // ---------- Send ----------
    case "send.text":
      return { method: "POST", path: "/send/text", body: payload.body, instanceId: inst, token };
    case "send.media":
      return { method: "POST", path: "/send/media", body: payload.body, instanceId: inst, token };
    case "send.audio":
      return { method: "POST", path: "/send/media",
               body: { ...payload.body, mediatype: "audio", ptt: true }, instanceId: inst, token };
    case "send.sticker":
      return { method: "POST", path: "/send/sticker", body: payload.body, instanceId: inst, token };
    case "send.location":
      return { method: "POST", path: "/send/location", body: payload.body, instanceId: inst, token };
    case "send.contact":
      return { method: "POST", path: "/send/contact", body: payload.body, instanceId: inst, token };
    case "send.link":
      return { method: "POST", path: "/send/link", body: payload.body, instanceId: inst, token };
    case "send.poll":
      return { method: "POST", path: "/send/poll", body: payload.body, instanceId: inst, token };

    // ---------- Message ----------
    case "message.delete":
      return { method: "POST", path: "/message/delete", body: payload.body, instanceId: inst, token };
    case "message.edit":
      return { method: "POST", path: "/message/edit", body: payload.body, instanceId: inst, token };
    case "message.react":
      return { method: "POST", path: "/message/react", body: payload.body, instanceId: inst, token };
    case "message.markread":
      return { method: "POST", path: "/message/markread", body: payload.body, instanceId: inst, token };
    case "message.presence":
      return { method: "POST", path: "/message/presence", body: payload.body, instanceId: inst, token };
    case "message.status":
      return { method: "POST", path: "/message/status", body: payload.body, instanceId: inst, token };
    case "message.downloadMedia":
      return { method: "POST", path: "/message/downloadimage", body: payload.body, instanceId: inst, token };

    // ---------- Chat ----------
    case "chat.archive":   return { method: "POST", path: "/chat/archive",   body: payload.body, instanceId: inst, token };
    case "chat.unarchive": return { method: "POST", path: "/chat/archive",   body: { ...(payload.body ?? {}), archive: false }, instanceId: inst, token };
    case "chat.mute":      return { method: "POST", path: "/chat/mute",      body: payload.body, instanceId: inst, token };
    case "chat.unmute":    return { method: "POST", path: "/chat/mute",      body: { ...(payload.body ?? {}), mute: false }, instanceId: inst, token };
    case "chat.pin":       return { method: "POST", path: "/chat/pin",       body: payload.body, instanceId: inst, token };
    case "chat.unpin":     return { method: "POST", path: "/chat/unpin",     body: payload.body, instanceId: inst, token };

    // ---------- Label ----------
    case "label.list":     return { method: "GET",  path: "/label", instanceId: inst, token };
    case "label.edit":     return { method: "POST", path: "/label/edit",     body: payload.body, instanceId: inst, token };
    case "label.addChat":  return { method: "POST", path: "/label/chat",     body: payload.body, instanceId: inst, token };
    case "label.addMsg":   return { method: "POST", path: "/label/message",  body: payload.body, instanceId: inst, token };
    case "label.removeChat": return { method: "POST", path: "/unlabel/chat", body: payload.body, instanceId: inst, token };
    case "label.removeMsg":  return { method: "POST", path: "/unlabel/message", body: payload.body, instanceId: inst, token };

    // ---------- Group ----------
    case "group.list":         return { method: "GET",  path: "/group/list",  instanceId: inst, token };
    case "group.myAll":        return { method: "GET",  path: "/group/myall", instanceId: inst, token };
    case "group.info":         return { method: "POST", path: "/group/info",         body: payload.body, instanceId: inst, token };
    case "group.create":       return { method: "POST", path: "/group/create",       body: payload.body, instanceId: inst, token };
    case "group.setName":      return { method: "POST", path: "/group/name",         body: payload.body, instanceId: inst, token };
    case "group.setPhoto":     return { method: "POST", path: "/group/photo",        body: payload.body, instanceId: inst, token };
    case "group.inviteLink":   return { method: "POST", path: "/group/invitelink",   body: payload.body, instanceId: inst, token };
    case "group.join":         return { method: "POST", path: "/group/join",         body: payload.body, instanceId: inst, token };
    case "group.leave":        return { method: "POST", path: "/group/leave",        body: payload.body, instanceId: inst, token };
    case "group.participant":  return { method: "POST", path: "/group/participant",  body: payload.body, instanceId: inst, token };

    // ---------- User ----------
    case "user.avatar":   return { method: "POST", path: "/user/avatar",   body: payload.body, instanceId: inst, token };
    case "user.info":     return { method: "POST", path: "/user/info",     body: payload.body, instanceId: inst, token };
    case "user.check":    return { method: "POST", path: "/user/check",    body: payload.body, instanceId: inst, token };
    case "user.contacts": return { method: "GET",  path: "/user/contacts", instanceId: inst, token };
    case "user.block":    return { method: "POST", path: "/user/block",    body: payload.body, instanceId: inst, token };
    case "user.unblock":  return { method: "POST", path: "/user/unblock",  body: payload.body, instanceId: inst, token };
    case "user.blocklist": return { method: "GET", path: "/user/blocklist", instanceId: inst, token };

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}


async function callEvolutionGo(c: ProxyCall, action?: string) {
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
  
  if (c.token && c.token !== "default_token" && c.path.includes("/send")) {
    headers["apikey"] = c.token;
  }
  
  if (c.instanceId) headers["instanceId"] = c.instanceId;

  if (action === "instance.qr") {
    console.log(`[DEBUG] instance.qr Pre-fetch:`, {
      action,
      instanceId: c.instanceId,
      url: url.toString(),
      method: c.method,
      headers: { ...headers, apikey: headers.apikey ? `${headers.apikey.substring(0, 5)}***` : undefined }
    });
  }

  const init: RequestInit = { method: c.method, headers };
  if (c.body !== undefined && c.method !== "GET") {
    init.body = JSON.stringify(c.body);
  }

  const res = await fetch(url.toString(), init);
  const rawText = await res.text();
  
  if (action === "instance.qr") {
    console.log(`[DEBUG] instance.qr Post-fetch:`, {
      status: res.status,
      contentType: res.headers.get("content-type"),
      rawText: rawText
    });
  }

  let data: any;
  try { 
    data = rawText ? JSON.parse(rawText) : null; 
  } catch (err) { 
    if (action === "instance.qr") {
      console.log(`[DEBUG] instance.qr JSON parse error:`, err.message);
    }
    data = { raw: rawText }; 
  }
  
  if (!res.ok) {
    console.error(`[evolution-go-proxy] ${c.method} ${c.path} -> ${res.status}`, JSON.stringify(data));
  }
  
  return { status: res.status, ok: res.ok, data, rawText };
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

    // If session_id given, resolve instance_id and token from DB
    if (payload.session_id && (!payload.instance_id || !payload.token)) {
      const { data: sess } = await supabase
        .from("whatsapp_sessions")
        .select("instance_id, instance_name, advanced_settings")
        .eq("id", payload.session_id)
        .maybeSingle();
      if (sess) {
        if (!payload.instance_id) payload.instance_id = sess.instance_id || sess.instance_name;
        if (!payload.token) {
          payload.token = (sess.advanced_settings as any)?.token || "default_token";
        }
      }
    }

    if (action === "debug.auth") {
      const endpoints = ["/instance", "/instance/all", "/instance/list"];
      const results = [];

      for (const path of endpoints) {
        const url = `${API_URL}${path}`;
        const headers = { "apikey": API_KEY };
        try {
          const res = await fetch(url, { method: "GET", headers });
          const rawText = await res.text();
          results.push({
            endpoint: url,
            status: res.status,
            rawText,
            baseUrl: API_URL,
            apiKeyLength: API_KEY.length,
            apiKeyPrefix: API_KEY.substring(0, 6)
          });
        } catch (e: any) {
          results.push({
            endpoint: url,
            error: e.message,
            baseUrl: API_URL,
            apiKeyLength: API_KEY.length,
            apiKeyPrefix: API_KEY.substring(0, 6)
          });
        }
      }

      return new Response(
        JSON.stringify({ ok: true, debugResults: results }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const call = buildCall(action, payload);
    const result = await callEvolutionGo(call, action);

    let normalizedQrFound = false;
    let qrFieldUsed = "";

    // Normalize QR code for Go provider with extensive field checking
    if (action === "instance.qr" && result.ok) {
      const data = result.data;
      
      const possibleFields = [
        { field: "qrcode", value: data?.qrcode },
        { field: "Qrcode", value: data?.Qrcode },
        { field: "qrCode", value: data?.qrCode },
        { field: "base64", value: data?.base64 },
        { field: "code", value: data?.code },
        { field: "data.qrcode", value: data?.data?.qrcode },
        { field: "data.Qrcode", value: data?.data?.Qrcode },
        { field: "data.base64", value: data?.data?.base64 },
        { field: "data.code", value: data?.data?.code },
      ];

      const found = possibleFields.find(f => f.value && typeof f.value === "string");
      
      if (found) {
        normalizedQrFound = true;
        qrFieldUsed = found.field;
        
        if (typeof result.data !== "object" || result.data === null) result.data = {};
        if (!result.data.data) result.data.data = {};
        result.data.data.qrcode = found.value;
      }
    }

    const errMsg = !result.ok
      ? (result.data?.error?.message || result.data?.message || result.data?.error || `HTTP ${result.status}`)
      : undefined;

    const responseBody: Record<string, any> = {
      ok: result.ok,
      status: result.status,
      data: result.data,
      error: errMsg,
    };

    if (action === "instance.qr") {
      responseBody.success = result.ok;
      responseBody.raw = result.rawText;
      responseBody.normalizedQrFound = normalizedQrFound;
      responseBody.qrFieldUsed = qrFieldUsed;
    }

    return new Response(
      JSON.stringify(responseBody),
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
