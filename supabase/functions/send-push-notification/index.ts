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
    const payload: PushPayload = await req.json();
    
    if (!payload.user_id || !payload.title) {
      return new Response(
        JSON.stringify({ error: "user_id and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending push to user: ${payload.user_id}, title: ${payload.title}`);

    // Get active push tokens for user
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("id, token, platform")
      .eq("user_id", payload.user_id)
      .eq("is_active", true);

    if (tokensError) {
      console.error("Error fetching tokens:", tokensError);
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      console.log("No active push tokens found for user");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No active tokens" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${tokens.length} active tokens`);

    // Get Firebase access token
    let accessToken: string;
    try {
      accessToken = await getFirebaseAccessToken();
    } catch (error) {
      console.error("Failed to get Firebase access token:", error);
      return new Response(
        JSON.stringify({ error: "Firebase authentication failed", details: String(error) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send to all tokens
    let sentCount = 0;
    let failedCount = 0;
    const invalidTokenIds: string[] = [];

    for (const tokenRecord of tokens) {
      const result = await sendFCMNotification(
        tokenRecord.token,
        accessToken,
        payload.title,
        payload.body || "",
        payload.data || {},
        payload.priority || "high"
      );

      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
        if (result.error === "invalid_token") {
          invalidTokenIds.push(tokenRecord.id);
        }
      }
    }

    // Deactivate invalid tokens
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
