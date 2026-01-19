import { Hono } from "https://deno.land/x/hono@v3.11.7/mod.ts";

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get Evolution API configuration
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";

// Helper to make Evolution API requests
async function evolutionRequest(
  method: string,
  endpoint: string,
  body?: unknown
) {
  const url = `${EVOLUTION_API_URL}${endpoint}`;
  console.log(`[Evolution Proxy] ${method} ${url}`);

  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": EVOLUTION_API_KEY,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    console.error(`[Evolution Proxy] Error:`, data);
    throw new Error(data.message || "Evolution API error");
  }

  return data;
}

// Helper to get error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Handle CORS preflight
app.options("/*", (c) => {
  return c.json({}, 200, corsHeaders);
});

// Create instance
app.post("/instance/create", async (c) => {
  try {
    const body = await c.req.json();
    const { instanceName, token, qrcode = true, integration = "WHATSAPP-BAILEYS" } = body;

    console.log(`[Evolution Proxy] Creating instance: ${instanceName}`);

    const data = await evolutionRequest("POST", "/instance/create", {
      instanceName,
      token,
      qrcode,
      integration,
    });

    return c.json(data, 200, corsHeaders);
  } catch (error) {
    console.error("[Evolution Proxy] Create instance error:", error);
    return c.json({ error: getErrorMessage(error) }, 500, corsHeaders);
  }
});

// Get QR code
app.get("/instance/qrcode/:instanceName", async (c) => {
  try {
    const instanceName = c.req.param("instanceName");
    console.log(`[Evolution Proxy] Getting QR code for: ${instanceName}`);

    const data = await evolutionRequest("GET", `/instance/connect/${instanceName}`);

    return c.json(data, 200, corsHeaders);
  } catch (error) {
    console.error("[Evolution Proxy] QR code error:", error);
    return c.json({ error: getErrorMessage(error) }, 500, corsHeaders);
  }
});

// Get connection status
app.get("/instance/connectionState/:instanceName", async (c) => {
  try {
    const instanceName = c.req.param("instanceName");
    console.log(`[Evolution Proxy] Getting connection state for: ${instanceName}`);

    const data = await evolutionRequest("GET", `/instance/connectionState/${instanceName}`);

    return c.json(data, 200, corsHeaders);
  } catch (error) {
    console.error("[Evolution Proxy] Connection state error:", error);
    return c.json({ error: getErrorMessage(error) }, 500, corsHeaders);
  }
});

// Delete instance
app.delete("/instance/delete/:instanceName", async (c) => {
  try {
    const instanceName = c.req.param("instanceName");
    console.log(`[Evolution Proxy] Deleting instance: ${instanceName}`);

    const data = await evolutionRequest("DELETE", `/instance/delete/${instanceName}`);

    return c.json(data, 200, corsHeaders);
  } catch (error) {
    console.error("[Evolution Proxy] Delete instance error:", error);
    return c.json({ error: getErrorMessage(error) }, 500, corsHeaders);
  }
});

// Logout instance
app.delete("/instance/logout/:instanceName", async (c) => {
  try {
    const instanceName = c.req.param("instanceName");
    console.log(`[Evolution Proxy] Logging out instance: ${instanceName}`);

    const data = await evolutionRequest("DELETE", `/instance/logout/${instanceName}`);

    return c.json(data, 200, corsHeaders);
  } catch (error) {
    console.error("[Evolution Proxy] Logout error:", error);
    return c.json({ error: getErrorMessage(error) }, 500, corsHeaders);
  }
});

// Send text message
app.post("/message/sendText/:instanceName", async (c) => {
  try {
    const instanceName = c.req.param("instanceName");
    const body = await c.req.json();
    const { number, text, delay } = body;

    console.log(`[Evolution Proxy] Sending text message via ${instanceName} to ${number}`);

    const data = await evolutionRequest("POST", `/message/sendText/${instanceName}`, {
      number,
      text,
      delay: delay || 1200,
    });

    return c.json(data, 200, corsHeaders);
  } catch (error) {
    console.error("[Evolution Proxy] Send text error:", error);
    return c.json({ error: getErrorMessage(error) }, 500, corsHeaders);
  }
});

// Send media message
app.post("/message/sendMedia/:instanceName", async (c) => {
  try {
    const instanceName = c.req.param("instanceName");
    const body = await c.req.json();
    const { number, mediatype, caption, media } = body;

    console.log(`[Evolution Proxy] Sending media message via ${instanceName} to ${number}`);

    const data = await evolutionRequest("POST", `/message/sendMedia/${instanceName}`, {
      number,
      mediatype,
      caption,
      media,
    });

    return c.json(data, 200, corsHeaders);
  } catch (error) {
    console.error("[Evolution Proxy] Send media error:", error);
    return c.json({ error: getErrorMessage(error) }, 500, corsHeaders);
  }
});

// Fetch instances
app.get("/instance/fetchInstances", async (c) => {
  try {
    console.log("[Evolution Proxy] Fetching all instances");

    const data = await evolutionRequest("GET", "/instance/fetchInstances");

    return c.json(data, 200, corsHeaders);
  } catch (error) {
    console.error("[Evolution Proxy] Fetch instances error:", error);
    return c.json({ error: getErrorMessage(error) }, 500, corsHeaders);
  }
});

// Set webhook
app.post("/webhook/set/:instanceName", async (c) => {
  try {
    const instanceName = c.req.param("instanceName");
    const body = await c.req.json();

    console.log(`[Evolution Proxy] Setting webhook for: ${instanceName}`);

    const data = await evolutionRequest("POST", `/webhook/set/${instanceName}`, body);

    return c.json(data, 200, corsHeaders);
  } catch (error) {
    console.error("[Evolution Proxy] Set webhook error:", error);
    return c.json({ error: getErrorMessage(error) }, 500, corsHeaders);
  }
});

Deno.serve(app.fetch);
