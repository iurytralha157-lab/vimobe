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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.log("Evolution API credentials not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Evolution API not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch sessions that need health check
    // - status = 'connected' (we want to verify they're still connected)
    // - health_check_failures < 5 (backoff after too many failures)
    // - last_health_check is old or null
    // - Limit to 20 per execution to avoid timeout
    const { data: sessions, error: sessionsError } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("status", "connected")
      .lt("health_check_failures", 5)
      .order("last_health_check", { ascending: true, nullsFirst: true })
      .limit(20);

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
      return new Response(
        JSON.stringify({ success: false, error: sessionsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${sessions?.length || 0} sessions for health check`);

    const results = [];

    for (const session of sessions || []) {
      try {
        // Check connection status with Evolution API
        const response = await fetch(
          `${EVOLUTION_API_URL}/instance/connectionState/${session.instance_name}`,
          {
            method: "GET",
            headers: {
              "apikey": EVOLUTION_API_KEY,
            },
          }
        );

        const data = await response.json();
        console.log(`Health check for ${session.instance_name}:`, data);

        // Determine real status
        const instanceState = data?.instance?.state || data?.state;
        const isConnected = instanceState === "open" || instanceState === "connected";
        const realStatus = isConnected ? "connected" : "disconnected";

        // Update session
        const updateData: any = {
          last_health_check: new Date().toISOString(),
        };

        if (realStatus === "connected") {
          // Reset failures on successful connection
          updateData.health_check_failures = 0;
        } else {
          // Increment failures
          const newFailures = (session.health_check_failures || 0) + 1;
          updateData.health_check_failures = newFailures;
          updateData.status = "disconnected";

          // Create notification if this is the 2nd consecutive failure (threshold)
          if (newFailures === 2) {
            const displayName = session.display_name || session.instance_name;
            
            // Notify session owner
            await supabase.from("notifications").insert({
              user_id: session.owner_user_id,
              organization_id: session.organization_id,
              title: "⚠️ WhatsApp Desconectado!",
              content: `A sessão "${displayName}" perdeu a conexão. Verifique e reconecte o WhatsApp.`,
              type: "warning",
              is_read: false,
            });

            // Notify admins of the organization
            const { data: admins } = await supabase
              .from("users")
              .select("id")
              .eq("organization_id", session.organization_id)
              .eq("role", "admin")
              .neq("id", session.owner_user_id);

            if (admins && admins.length > 0) {
              const adminNotifications = admins.map((admin: any) => ({
                user_id: admin.id,
                organization_id: session.organization_id,
                title: "⚠️ WhatsApp Desconectado!",
                content: `A sessão "${displayName}" perdeu a conexão. O responsável foi notificado.`,
                type: "warning",
                is_read: false,
              }));

              await supabase.from("notifications").insert(adminNotifications);
            }

            console.log(`Disconnection notifications sent for session ${displayName}`);
          }
        }

        await supabase
          .from("whatsapp_sessions")
          .update(updateData)
          .eq("id", session.id);

        // Log status change
        if (realStatus !== session.status) {
          await supabase.from("audit_logs").insert({
            action: `whatsapp.session_${realStatus}`,
            entity_type: "whatsapp_session",
            entity_id: session.id,
            organization_id: session.organization_id,
            new_data: { 
              instance_name: session.instance_name,
              previous_status: session.status,
              new_status: realStatus,
              evolution_response: data
            }
          });
          
          console.log(`Session ${session.instance_name} status changed: ${session.status} -> ${realStatus}`);
        }

        results.push({
          session_id: session.id,
          instance_name: session.instance_name,
          previous_status: session.status,
          new_status: realStatus,
          success: true
        });

      } catch (error) {
        console.error(`Error checking session ${session.instance_name}:`, error);
        
        // Increment failures on error
        await supabase
          .from("whatsapp_sessions")
          .update({
            last_health_check: new Date().toISOString(),
            health_check_failures: (session.health_check_failures || 0) + 1
          })
          .eq("id", session.id);

        results.push({
          session_id: session.id,
          instance_name: session.instance_name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Session health check error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
