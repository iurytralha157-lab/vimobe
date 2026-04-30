import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function checkInstanceConnection(
  evolutionApiUrl: string,
  evolutionApiKey: string,
  instanceName: string
): Promise<{ isConnected: boolean; data: any }> {
  const response = await fetch(
    `${evolutionApiUrl}/instance/connectionState/${instanceName}`,
    {
      method: "GET",
      headers: { "apikey": evolutionApiKey },
    }
  );
  const data = await response.json();
  const instanceState = (data?.instance?.state || data?.state || "").toLowerCase();
  const isConnected = instanceState === "open" || instanceState === "connected" || instanceState === "connecting";
  return { isConnected, data };
}

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

    const { data: sessions, error: sessionsError } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .in("status", ["connected", "connecting"])
      .order("updated_at", { ascending: true, nullsFirst: true })
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
        // First check
        const firstCheck = await checkInstanceConnection(EVOLUTION_API_URL, EVOLUTION_API_KEY, session.instance_name);
        console.log(`Health check #1 for ${session.instance_name}:`, firstCheck.data);

        const updateData: any = {
          updated_at: new Date().toISOString(),
        };

        if (firstCheck.isConnected) {
          // Connected - just update timestamp and fix status if needed
          if (session.status !== "connected") {
            updateData.status = "connected";
            updateData.last_connected_at = new Date().toISOString();
          }

          await supabase
            .from("whatsapp_sessions")
            .update(updateData)
            .eq("id", session.id);

          results.push({
            session_id: session.id,
            instance_name: session.instance_name,
            previous_status: session.status,
            new_status: "connected",
            success: true
          });
        } else {
          // First check says NOT connected - wait 3 seconds and retry before concluding
          console.log(`Session ${session.instance_name} failed first check, retrying in 3s...`);
          await new Promise(resolve => setTimeout(resolve, 3000));

          const secondCheck = await checkInstanceConnection(EVOLUTION_API_URL, EVOLUTION_API_KEY, session.instance_name);
          console.log(`Health check #2 for ${session.instance_name}:`, secondCheck.data);

          if (secondCheck.isConnected) {
            // Second check passed - it was just a transient blip, keep connected
            console.log(`Session ${session.instance_name} recovered on retry - keeping connected`);
            
            await supabase
              .from("whatsapp_sessions")
              .update(updateData)
              .eq("id", session.id);

            results.push({
              session_id: session.id,
              instance_name: session.instance_name,
              previous_status: session.status,
              new_status: "connected",
              retried: true,
              success: true
            });
          } else {
            // Both checks failed - NOW mark as disconnected
            console.log(`Session ${session.instance_name} confirmed disconnected after retry`);
            updateData.status = "disconnected";

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

            // Notify admins
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

            await supabase
              .from("whatsapp_sessions")
              .update(updateData)
              .eq("id", session.id);

            // Audit log
            await supabase.from("audit_logs").insert({
              action: "whatsapp.session_disconnected",
              entity_type: "whatsapp_session",
              entity_id: session.id,
              organization_id: session.organization_id,
              new_data: {
                instance_name: session.instance_name,
                previous_status: session.status,
                new_status: "disconnected",
                first_check: firstCheck.data,
                second_check: secondCheck.data,
              }
            });

            console.log(`Session ${session.instance_name} status changed: ${session.status} -> disconnected`);

            results.push({
              session_id: session.id,
              instance_name: session.instance_name,
              previous_status: session.status,
              new_status: "disconnected",
              retried: true,
              success: true
            });
          }
        }

      } catch (error) {
        console.error(`Error checking session ${session.instance_name}:`, error);
        // On error, do NOT change status - just log and move on
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
