import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'high' | 'normal';
}

interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ==================== VAPID/Web Push Functions ====================

// Importa a chave privada VAPID
function getVapidKeys() {
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  // Ensure we use the same public key used in the frontend registration
  const publicKey = "BJBVpyQSbQSpeAQQs-lEf2BKa6L6vlUcXxD3F2KNML9iJW4h2Al2hhgB9KbDW9C73PCnow8ZpXIJxrUNMWxU6vA";
  
  if (!privateKey) {
    throw new Error("VAPID_PRIVATE_KEY not configured");
  }

  return { privateKey, publicKey };
}

// Base64URL encode/decode helpers
function base64UrlEncode(data: Uint8Array | ArrayBuffer): string {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Parse PEM private key
function parsePrivateKey(pem: string): Uint8Array {
  // Remove PEM headers if present
  let keyData = pem
    .replace(/-----BEGIN (EC )?PRIVATE KEY-----/g, '')
    .replace(/-----END (EC )?PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  
  return base64UrlDecode(keyData);
}

// Create VAPID JWT for authorization
async function createVapidJwt(audience: string, subject: string, privateKeyPem: string, publicKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 12 * 60 * 60; // 12 hours

  const header = { alg: "ES256", typ: "JWT" };
  const payload = {
    aud: audience,
    exp: exp,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the ECDSA private key
  const keyData = parsePrivateKey(privateKeyPem);
  
  // Deno/V8 subtle crypto expects the 32-byte raw key for P-256
  // even when using 'pkcs8' format, or a proper pkcs8 wrapper.
  // The error "InvalidEncoding" usually means the wrapper or the key size is wrong.
  
  let cryptoKey: CryptoKey;
  try {
    // Attempt raw import first (Deno specific behavior sometimes favors this)
    if (keyData.length === 32) {
      cryptoKey = await crypto.subtle.importKey(
        "jwk",
        {
          kty: "EC",
          crv: "P-256",
          x: "", // Not needed for private key in JWK usually
          y: "",
          d: base64UrlEncode(keyData),
          ext: true,
        },
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"]
      );
    } else {
      throw new Error("Not raw 32 bytes");
    }
  } catch (e) {
    // Fallback to the pkcs8 wrapper approach
    const pkcs8 = new Uint8Array(67);
    pkcs8.set([
      0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 
      0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20
    ]);
    pkcs8.set(keyData.length === 32 ? keyData : keyData.slice(-32), 35);
    
    cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      pkcs8.buffer as ArrayBuffer,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );
  }

  console.log("[WebPush] Private key imported successfully");

  // Sign the token using ECDSA with SHA-256
  const dataToSign = new TextEncoder().encode(unsignedToken);
  // ES256 signature must be R + S (64 bytes)
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    dataToSign
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${unsignedToken}.${signatureB64}`;
}

// Helper to extract raw P-256 key from SPKI/DER (91 bytes)
function getRawPublicKey(publicKeyB64: string): string {
  const bytes = base64UrlDecode(publicKeyB64);
  if (bytes.length === 91) {
    // Offset 26 is where the 65-byte raw uncompressed point starts
    return base64UrlEncode(bytes.slice(26));
  }
  return publicKeyB64;
}

// Send Web Push notification
async function sendWebPushNotification(
  subscriptionJson: string,
  title: string,
  body: string,
  data: Record<string, any> = {},
  priority: 'high' | 'normal' = 'high'
): Promise<{ success: boolean; error?: string }> {
  try {
    const subscription: WebPushSubscription = JSON.parse(subscriptionJson);
    const { privateKey, publicKey } = getVapidKeys();
    
    // Ensure we use the raw uncompressed public key (65 bytes) for the header
    const rawPublicKey = getRawPublicKey(publicKey);

    // VAPID JWT header for Web Push 
    const endpointUrl = new URL(subscription.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

    // Use subject from env or default
    const subject = Deno.env.get("VAPID_MAILTO") || "mailto:suporte@vimob.com.br";

    // Create VAPID JWT
    const jwt = await createVapidJwt(audience, subject, privateKey, rawPublicKey);

    // Prepare payload
    const payload = JSON.stringify({
      title,
      body,
      data,
      priority,
      tag: `notification-${Date.now()}`,
    });

    console.log(`[WebPush] Sending to endpoint: ${subscription.endpoint.substring(0, 50)}...`);

    // Send the push message
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `WebPush ${jwt}`,
        "Content-Type": "application/octet-stream",
        "TTL": priority === 'high' ? "86400" : "3600",
        "Urgency": priority === 'high' ? "high" : "normal",
      },
      body: new TextEncoder().encode(payload),
    });

    if (response.status === 201 || response.status === 200) {
      console.log("[WebPush] Sent successfully");
      return { success: true };
    }

    // Handle specific error codes
    if (response.status === 404 || response.status === 410) {
      console.log("[WebPush] Subscription expired/invalid");
      return { success: false, error: "invalid_token" };
    }

    const errorText = await response.text();
    console.error(`[WebPush] Error ${response.status}:`, errorText);
    return { success: false, error: `HTTP ${response.status}: ${errorText}` };

  } catch (error) {
    console.error("[WebPush] Error:", error);
    return { success: false, error: String(error) };
  }
}

// ==================== FCM Functions (existing) ====================

// Get Firebase access token using Service Account
async function getFirebaseAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT not configured");
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  
  // Create JWT for Firebase auth
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  // Base64URL encode
  const base64url = (str: string) => {
    return btoa(str)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signatureInput = `${headerB64}.${payloadB64}`;

  // Import private key and sign
  const pemContents = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const signatureB64 = base64url(
    String.fromCharCode(...new Uint8Array(signature))
  );

  const jwt = `${signatureInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  
  if (!tokenResponse.ok) {
    console.error("Firebase token error:", tokenData);
    throw new Error(`Failed to get Firebase token: ${tokenData.error_description || tokenData.error}`);
  }

  return tokenData.access_token;
}

// Send push notification via FCM HTTP v1 API
async function sendFCMNotification(
  token: string,
  accessToken: string,
  title: string,
  body: string,
  data: Record<string, any> = {},
  priority: 'high' | 'normal' = 'high'
): Promise<{ success: boolean; error?: string }> {
  const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  const serviceAccount = JSON.parse(serviceAccountJson!);
  const projectId = serviceAccount.project_id;

  // Convert all data values to strings (FCM requirement)
  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );

  // FCM HTTP v1 message structure optimized for iOS lock screen visibility
  const message = {
    message: {
      token: token,
      // notification field is REQUIRED for automatic display on iOS/Android
      notification: {
        title: title,
        body: body,
      },
      // data payload for custom handling when app is open
      data: stringData,
      // Android-specific configuration
      android: {
        priority: priority,
        notification: {
          sound: "default",
          click_action: "FCM_PLUGIN_ACTIVITY",
          channel_id: "crm_notifications",
          default_sound: true,
          default_vibrate_timings: true,
          visibility: "PUBLIC",
        },
      },
      // iOS-specific configuration (CRITICAL for lock screen notifications)
      apns: {
        headers: {
          "apns-priority": priority === 'high' ? "10" : "5",
          "apns-push-type": "alert",
        },
        payload: {
          aps: {
            alert: {
              title: title,
              body: body,
            },
            sound: "default",
            badge: 1,
            "mutable-content": 1,
            "content-available": 1,
          },
        },
      },
    },
  };

  console.log(`[FCM] Sending to token: ${token.substring(0, 20)}...`);
  console.log(`[FCM] Project ID: ${projectId}`);
  console.log(`[FCM] Title: ${title}, Body: ${body?.substring(0, 50) || '(empty)'}...`);

  try {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("[FCM] Error response:", JSON.stringify(result));
      
      // Check for invalid token errors
      const errorCode = result.error?.details?.find((d: any) => 
        d.errorCode === "UNREGISTERED" || 
        d.errorCode === "INVALID_ARGUMENT" ||
        d["@type"]?.includes("BadRequest")
      );
      
      if (errorCode || result.error?.code === 404 || result.error?.code === 400) {
        console.log("[FCM] Token is invalid or unregistered");
        return { success: false, error: "invalid_token" };
      }
      
      return { success: false, error: result.error?.message || "FCM send failed" };
    }

    console.log("[FCM] Sent successfully, message ID:", result.name);
    return { success: true };
  } catch (error) {
    console.error("[FCM] Request error:", error);
    return { success: false, error: String(error) };
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const bodyJson = await req.json();
    const payload = {
      user_id: bodyJson.user_id,
      title: bodyJson.title,
      body: bodyJson.body || bodyJson.message || "",
      data: bodyJson.data || {},
      priority: bodyJson.priority || "high",
      url: bodyJson.url || bodyJson.data?.url || "/"
    };
    
    if (!payload.user_id || !payload.title) {
      return new Response(
        JSON.stringify({ error: "user_id and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Standard Push Notification Logic
    console.log(`Sending push to user: ${payload.user_id}, title: ${payload.title}`);

    // 1. Get tokens from push_tokens (FCM/Legacy)
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("id, token, platform")
      .eq("user_id", payload.user_id)
      .eq("is_active", true);

    // 2. Get subscriptions from push_subscriptions (Native Web Push)
    const { data: webSubscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("id, subscription")
      .eq("user_id", payload.user_id);

    if (tokensError) console.error("Error fetching tokens:", tokensError);
    if (subError) console.error("Error fetching subscriptions:", subError);

    const hasTokens = tokens && tokens.length > 0;
    const hasWebSubs = webSubscriptions && webSubscriptions.length > 0;

    if (!hasTokens && !hasWebSubs) {
      console.log("No active push tokens or subscriptions found for user");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No active tokens" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${tokens?.length || 0} tokens and ${webSubscriptions?.length || 0} web subscriptions`);

    // Get Firebase access token only if we have non-web tokens
    const hasNativeTokens = tokens.some(t => t.platform !== 'web');
    let accessToken: string | null = null;
    
    if (hasNativeTokens) {
      try {
        accessToken = await getFirebaseAccessToken();
      } catch (error) {
        console.error("Failed to get Firebase access token:", error);
        // Continue - we might still send to web tokens
      }
    }

    // Send to all tokens
    let sentCount = 0;
    let failedCount = 0;
    const invalidTokenIds: string[] = [];

    // Send to all native tokens and legacy web tokens in push_tokens
    for (const tokenRecord of tokens || []) {
      let result: { success: boolean; error?: string };
      
      if (tokenRecord.platform === 'web') {
        // Fallback: try to send as Web Push if the token is a JSON subscription
        try {
          console.log(`[Push] Attempting Web Push for legacy token ID: ${tokenRecord.id}`);
          result = await sendWebPushNotification(
            tokenRecord.token, // If this is a stringified JSON
            payload.title,
            payload.body,
            { ...payload.data, url: payload.url },
            payload.priority as any || "high"
          );
        } catch (e) {
          console.error(`[Push] Legacy web token is not a valid subscription: ${tokenRecord.id}`);
          result = { success: false, error: "invalid_token" };
        }
      } else {
        // Send via FCM for native apps
        if (!accessToken) {
          console.error("[Push] No FCM access token available for native token");
          result = { success: false, error: "No FCM access token" };
        } else {
          result = await sendFCMNotification(
            tokenRecord.token,
            accessToken,
            payload.title,
            payload.body,
            { ...payload.data, url: payload.url },
            payload.priority as any || "high"
          );
        }
      }

      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
        if (result.error === "invalid_token") {
          invalidTokenIds.push(tokenRecord.id);
        }
      }
    }

    // Send to all Web Push subscriptions
    for (const subRecord of webSubscriptions || []) {
      console.log(`[Push] Sending Web Push to subscription ID: ${subRecord.id}`);
      const result = await sendWebPushNotification(
        JSON.stringify(subRecord.subscription),
        payload.title,
        payload.body,
        { ...payload.data, url: payload.url },
        payload.priority as any || "high"
      );

      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
        // We don't have a mechanism to deactivate web subscriptions here easily 
        // without more logic, but we could add it if needed.
      }
    }

    // Deactivate invalid native tokens
    if (invalidTokenIds.length > 0) {
      console.log(`Deactivating ${invalidTokenIds.length} invalid tokens`);
      await supabase
        .from("push_tokens")
        .update({ is_active: false })
        .in("id", invalidTokenIds);
    }

    console.log(`Push sent: ${sentCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        failed: failedCount,
        deactivated: invalidTokenIds.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
