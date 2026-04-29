import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push";

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
    const payload: PushPayload = {
      user_id: bodyJson.user_id,
      title: bodyJson.title,
      body: bodyJson.body || bodyJson.message || "",
      data: bodyJson.data || {},
      priority: bodyJson.priority || "high",
    };
    
    if (!payload.user_id || !payload.title) {
      return new Response(
        JSON.stringify({ error: "user_id and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Push] Processing request for user: ${payload.user_id}`);

    // Get VAPID keys from env
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const mailto = Deno.env.get("VAPID_MAILTO") || "mailto:suporte@vimob.com.br";

    if (!publicKey || !privateKey) {
      console.error("[Push] VAPID keys not configured in environment variables");
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Configure web-push
    webpush.setVapidDetails(mailto, publicKey, privateKey);

    // 1. Get tokens from push_tokens (FCM/Legacy for native apps)
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("id, token, platform")
      .eq("user_id", payload.user_id)
      .eq("is_active", true);

    // 2. Get subscriptions from push_subscriptions (Web Push)
    const { data: webSubscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("id, subscription")
      .eq("user_id", payload.user_id);

    if (tokensError) console.error("[Push] Error fetching tokens:", tokensError);
    if (subError) console.error("[Push] Error fetching web subscriptions:", subError);

    const hasTokens = tokens && tokens.length > 0;
    const hasWebSubs = webSubscriptions && webSubscriptions.length > 0;

    if (!hasTokens && !hasWebSubs) {
      console.log("[Push] No active push tokens or subscriptions found for user");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No active tokens" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Push] Found ${tokens?.length || 0} tokens and ${webSubscriptions?.length || 0} web subscriptions`);

    let sentCount = 0;
    let failedCount = 0;

    // Send Web Push notifications
    if (hasWebSubs) {
      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        data: {
          ...payload.data,
          url: payload.data?.url || "/"
        }
      });

      const webPromises = webSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, pushPayload);
          sentCount++;
        } catch (error: any) {
          console.error(`[WebPush] Error sending to subscription ${sub.id}:`, error);
          failedCount++;
          
          // Cleanup invalid subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`[WebPush] Subscription ${sub.id} is invalid, removing...`);
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      });
      
      await Promise.all(webPromises);
    }

    // Note: FCM sending for native tokens could be added here if needed, 
    // but the library web-push is specifically for Web Push.
    // If native FCM is required, it should be handled by a different logic or library.

    console.log(`[Push] Finished: ${sentCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[Push] Global error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});