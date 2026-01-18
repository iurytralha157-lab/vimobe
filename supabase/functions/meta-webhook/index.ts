import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MetaLeadData {
  entry?: Array<{
    id: string;
    time: number;
    changes?: Array<{
      field: string;
      value: {
        form_id: string;
        leadgen_id: string;
        page_id: string;
        created_time: number;
        ad_id?: string;
        adset_id?: string;
        campaign_id?: string;
      };
    }>;
  }>;
}

interface LeadFieldData {
  name: string;
  values: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Meta webhook verification (GET request)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("[Meta Webhook] Verification request:", { mode, token });

    // You should set VERIFY_TOKEN as a secret
    const verifyToken = Deno.env.get("META_VERIFY_TOKEN") || "vimob_meta_verify_2024";

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[Meta Webhook] Verification successful");
      return new Response(challenge, { status: 200, headers: corsHeaders });
    } else {
      console.log("[Meta Webhook] Verification failed");
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }
  }

  // Handle incoming lead data (POST request)
  if (req.method === "POST") {
    try {
      const body: MetaLeadData = await req.json();
      console.log("[Meta Webhook] Received data:", JSON.stringify(body));

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      if (!body.entry || body.entry.length === 0) {
        console.log("[Meta Webhook] No entries in payload");
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (const entry of body.entry) {
        const pageId = entry.id;

        if (!entry.changes) continue;

        for (const change of entry.changes) {
          if (change.field !== "leadgen") continue;

          const leadData = change.value;
          console.log("[Meta Webhook] Processing lead:", leadData.leadgen_id);

          // Find organization by page_id
          const { data: integration, error: integrationError } = await supabase
            .from("meta_integrations")
            .select("organization_id, field_mapping")
            .eq("page_id", pageId)
            .eq("is_connected", true)
            .maybeSingle();

          if (integrationError || !integration) {
            console.error("[Meta Webhook] No integration found for page:", pageId);
            continue;
          }

          // Get lead details from Meta API (would require access token)
          // For now, we'll create a placeholder lead and store the raw data
          const leadPayload = {
            name: `Meta Lead #${leadData.leadgen_id.slice(-6)}`,
            organization_id: integration.organization_id,
            message: `Lead captado via Meta Ads`,
          };

          // Create lead
          const { data: newLead, error: leadError } = await supabase
            .from("leads")
            .insert(leadPayload)
            .select("id")
            .single();

          if (leadError) {
            console.error("[Meta Webhook] Error creating lead:", leadError);
            continue;
          }

          console.log("[Meta Webhook] Lead created:", newLead.id);

          // Store meta information
          const { error: metaError } = await supabase.from("lead_meta").insert({
            lead_id: newLead.id,
            form_id: leadData.form_id,
            page_id: leadData.page_id,
            ad_id: leadData.ad_id || null,
            adset_id: leadData.adset_id || null,
            campaign_id: leadData.campaign_id || null,
            raw_payload: leadData,
          });

          if (metaError) {
            console.error("[Meta Webhook] Error storing meta data:", metaError);
          }

          // Update last sync
          await supabase
            .from("meta_integrations")
            .update({ last_sync_at: new Date().toISOString() })
            .eq("organization_id", integration.organization_id);

          // Create notification for admins
          const { data: admins } = await supabase
            .from("users")
            .select("id")
            .eq("organization_id", integration.organization_id)
            .in("role", ["admin", "super_admin"]);

          if (admins) {
            for (const admin of admins) {
              await supabase.from("notifications").insert({
                user_id: admin.id,
                organization_id: integration.organization_id,
                title: "Novo lead do Meta Ads",
                content: `Um novo lead foi captado: ${leadPayload.name}`,
                type: "lead",
                lead_id: newLead.id,
              });
            }
          }
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[Meta Webhook] Error:", error);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
