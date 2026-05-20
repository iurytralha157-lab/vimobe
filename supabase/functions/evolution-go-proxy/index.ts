// Evolution Go (whatsmeow) proxy
// Routes actions from frontend to the Evolution Go REST API
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// 1. Internal Helpers
function getEvolutionConfig() {
  const url = (Deno.env.get("EVOLUTION_GO_API_URL") || "").replace(/\/+$/, "");
  const key = Deno.env.get("EVOLUTION_GO_API_KEY") || "";
  return { API_URL: url, API_KEY: key };
}

function maskApiKey(key: string | undefined): string {
  if (!key) return "not_set";
  if (key.length <= 6) return "***";
  return `${key.substring(0, 6)}***`;
}

async function normalizeEvolutionResponse(res: Response, rawText: string) {
  let data: any;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch (_err) {
    data = { raw: rawText };
  }
  
  return {
    status: res.status,
    ok: res.ok,
    data,
    rawText
  };
}

function normalizeQRCodeResponse(data: any) {
  if (!data) return { found: false };

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
    return {
      found: true,
      field: found.field,
      value: found.value
    };
  }
  
  return { found: false };
}

async function evolutionFetch(
  method: string, 
  path: string, 
  options: { 
    body?: any, 
    query?: Record<string, string | number | undefined>, 
    instanceId?: string,
    token?: string,
    action?: string
  } = {}
) {
  const { API_URL, API_KEY } = getEvolutionConfig();
  if (!API_URL || !API_KEY) {
    throw new Error("Evolution Go API configuration missing");
  }

  const url = new URL(`${API_URL}${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  // 2. Centralized Headers
  const headers: Record<string, string> = {
    "apikey": API_KEY,
    "Content-Type": "application/json",
  };
  
  // Use instance token if provided (instance-specific auth)
  if (options.token && options.token !== "default_token") {
    headers["apikey"] = options.token;
  }
  
  if (options.instanceId) {
    headers["instanceId"] = options.instanceId;
  }

  const isDebug = options.action?.startsWith("debug.") || options.action === "instance.qr";
  if (isDebug) {
    console.log(`[EvolutionProxy] ${method} ${path}`, {
      action: options.action,
      instanceId: options.instanceId,
      headers: { ...headers, apikey: maskApiKey(headers.apikey) }
    });
  }

  const init: RequestInit = { 
    method, 
    headers 
  };
  
  if (options.body !== undefined && method !== "GET" && method !== "HEAD") {
    init.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url.toString(), init);
    const rawText = await res.text();
    
    if (isDebug) {
      console.log(`[EvolutionProxy] Response ${res.status}`, {
        rawText: rawText.substring(0, 200) + (rawText.length > 200 ? "..." : "")
      });
    }

    return await normalizeEvolutionResponse(res, rawText);
  } catch (err: any) {
    console.error(`[EvolutionProxy] Fetch Error:`, err);
    throw err;
  }
}

// 3. Standardized Actions
function getActionConfig(action: string, payload: any) {
  const inst = payload?.instance_id || payload?.instanceId;
  const token = payload?.token;
  const b = payload?.body ?? {};

  switch (action) {
    // ---------- Instance ----------
    case "instance.create":
      return {
        method: "POST",
        path: "/instance/create",
        body: {
          name: b.name ?? b.instanceName,
          token: b.token || "default_token",
          ...(b.proxy ? { proxy: b.proxy } : {})
        }
      };
    
    case "instance.delete":
      return { method: "DELETE", path: `/instance/delete/${inst}` };

    case "instance.qr":
      return { 
        method: "GET", 
        path: "/instance/qr", 
        query: { instanceId: inst }, 
        instanceId: inst, 
        token 
      };

    case "instance.connect":
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

    case "instance.status":
      return { 
        method: "GET", 
        path: "/instance/status", 
        query: { instanceId: inst }, 
        instanceId: inst, 
        token 
      };

    case "instance.all":
      return { method: "GET", path: "/instance/all" };

    case "instance.disconnect":
      return { method: "POST", path: "/instance/disconnect", instanceId: inst, token };

    case "instance.logout":
      return { method: "DELETE", path: "/instance/logout", instanceId: inst, token };

    // ---------- Messages & Other ----------
    case "send.text":
      return { method: "POST", path: "/send/text", body: b, instanceId: inst, token };
    case "send.media":
      return { method: "POST", path: "/send/media", body: b, instanceId: inst, token };
    case "send.audio":
      return { 
        method: "POST", 
        path: "/send/media", 
        body: { ...b, mediatype: "audio", ptt: true }, 
        instanceId: inst, 
        token 
      };
    
    // Add other cases as needed by following the pattern
    default:
      // Fallback to direct mapping for common send/message actions if they match path
      if (action.includes(".")) {
        const [category, sub] = action.split(".");
        const path = `/${category}/${sub}`;
        return { method: "POST", path, body: b, instanceId: inst, token };
      }
      throw new Error(`Unknown action: ${action}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { API_URL, API_KEY } = getEvolutionConfig();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!API_URL || !API_KEY) {
      throw new Error("Evolution Go API configuration missing");
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

    // Resolve instance info if session_id is provided
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

    // --- Action Handlers ---

    // 5. debug.auth
    if (action === "debug.auth") {
      const endpoints = ["/instance", "/instance/all"];
      const results = [];

      for (const path of endpoints) {
        try {
          const res = await evolutionFetch("GET", path, { action });
          results.push({
            endpoint: path,
            status: res.status,
            rawText: res.rawText,
            apiKeyMasked: maskApiKey(API_KEY)
          });
        } catch (e: any) {
          results.push({ endpoint: path, error: e.message });
        }
      }

      return new Response(
        JSON.stringify({ ok: true, debugResults: results }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. debug.instances
    if (action === "debug.instances") {
      const instanceId = payload?.instance_id || payload?.instanceId;
      const results = [];

      const tests = [
        { name: "List All", method: "GET", path: "/instance/all" },
        { name: "Get Single", method: "GET", path: `/instance/get/${instanceId || "test"}` },
        { name: "QR Code", method: "GET", path: "/instance/qr", instanceId },
        { 
          name: "Connect", 
          method: "POST", 
          path: "/instance/connect", 
          instanceId,
          body: { webhookUrl: "https://example.com", subscribe: ["ALL"], immediate: true }
        }
      ];

      for (const test of tests) {
        try {
          const res = await evolutionFetch(test.method, test.path, { 
            action, 
            instanceId: test.instanceId,
            body: test.body 
          });
          results.push({
            test: test.name,
            status: res.status,
            rawText: res.rawText.substring(0, 500),
            ok: res.ok
          });
        } catch (e: any) {
          results.push({ test: test.name, error: e.message, status: 500 });
        }
      }

      return new Response(
        JSON.stringify({ ok: true, debugInstancesResults: results }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Standard Actions
    const config = getActionConfig(action, payload);
    const result = await evolutionFetch(config.method, config.path, {
      body: config.body,
      query: config.query,
      instanceId: config.instanceId,
      token: config.token,
      action
    });

    // 4. instance.qr Normalization
    if (action === "instance.qr" && result.ok) {
      const qrData = normalizeQRCodeResponse(result.data);
      if (qrData.found) {
        // Inject normalized field for frontend compatibility
        if (typeof result.data !== "object" || result.data === null) result.data = {};
        if (!result.data.data) result.data.data = {};
        result.data.data.qrcode = qrData.value;
        
        // Add metadata about normalization
        (result as any).normalizedQrFound = true;
        (result as any).qrFieldUsed = qrData.field;
      }
    }

    const responseBody: Record<string, any> = {
      ok: result.ok,
      status: result.status,
      data: result.data,
      error: !result.ok 
        ? (result.data?.error?.message || result.data?.message || result.data?.error || `HTTP ${result.status}`)
        : undefined,
      ...(result as any).normalizedQrFound ? { 
        normalizedQrFound: (result as any).normalizedQrFound,
        qrFieldUsed: (result as any).qrFieldUsed
      } : {}
    };

    return new Response(
      JSON.stringify(responseBody),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err: any) {
    console.error("evolution-go-proxy error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
