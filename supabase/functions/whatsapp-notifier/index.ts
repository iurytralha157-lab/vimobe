import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organization_id, user_id, message } = await req.json();

    if (!organization_id || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "organization_id and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("Evolution API not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Evolution API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Try to find the organization's notification session
    let instanceName: string | null = null;

    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("id, instance_name, status")
      .eq("organization_id", organization_id)
      .eq("is_notification_session", true)
      .single();

    if (session?.status === "connected" && session.instance_name) {
      instanceName = session.instance_name;
      console.log("Using org notification session:", instanceName);
    } else {
      // 2. Fallback: check global notification instance from system_settings
      const { data: systemSettings } = await supabase
        .from("system_settings")
        .select("value")
        .limit(1)
        .maybeSingle();

      if (systemSettings?.value) {
        const settingsValue = systemSettings.value as Record<string, unknown>;
        const globalInstance = settingsValue.notification_instance_name as string | undefined;
        if (globalInstance) {
          instanceName = globalInstance;
          console.log("Using global notification instance:", instanceName);
        }
      }
    }

    if (!instanceName) {
      console.log("No notification instance available for org:", organization_id);
      return new Response(
        JSON.stringify({ success: false, error: "No notification instance configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Get the target user's phone number
    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("whatsapp, name")
      .eq("id", user_id)
      .single();

    if (userError || !user?.whatsapp) {
      console.log("User not found or no WhatsApp:", user_id);
      return new Response(
        JSON.stringify({ success: false, error: "User has no WhatsApp number" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Send the message via Evolution API
    const formattedPhone = user.whatsapp.replace(/\D/g, "");
    
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
    });

    const data = await response.json();
    console.log("WhatsApp notification sent:", { user: user.name, phone: formattedPhone, instance: instanceName, status: response.status });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: data.message || "Failed to send notification" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("WhatsApp notifier error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
