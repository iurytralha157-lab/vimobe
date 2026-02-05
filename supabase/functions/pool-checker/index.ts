import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadToRedistribute {
  id: string;
  name: string;
  organization_id: string;
  assigned_user_id: string;
  assigned_at: string;
  redistribution_count: number;
  pipeline_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Starting pool checker...");

    // Get all pipelines with pool enabled
    const { data: pipelines, error: pipelineError } = await supabase
      .from("pipelines")
      .select("id, organization_id, pool_enabled, pool_timeout_minutes, pool_max_redistributions")
      .eq("pool_enabled", true);

    if (pipelineError) {
      console.error("Error fetching pipelines:", pipelineError);
      return new Response(
        JSON.stringify({ success: false, error: pipelineError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pipelines || pipelines.length === 0) {
      console.log("No pipelines with pool enabled");
      return new Response(
        JSON.stringify({ success: true, message: "No pipelines with pool enabled", redistributed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${pipelines.length} pipelines with pool enabled`);

    const results: Array<{ leadId: string; success: boolean; error?: string }> = [];

    for (const pipeline of pipelines) {
      const timeoutMinutes = pipeline.pool_timeout_minutes || 10;
      const maxRedistributions = pipeline.pool_max_redistributions || 3;
      const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();

      console.log(`Checking pipeline ${pipeline.id}: timeout=${timeoutMinutes}min, max=${maxRedistributions}`);

      // Find leads that need redistribution:
      // - Have an assigned user
      // - Were assigned before the cutoff time
      // - Have no first_response_at (no contact via WhatsApp, Phone, or Email)
      // - Haven't exceeded max redistributions
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("id, name, organization_id, assigned_user_id, assigned_at, redistribution_count, pipeline_id")
        .eq("pipeline_id", pipeline.id)
        .not("assigned_user_id", "is", null)
        .not("assigned_at", "is", null)
        .is("first_response_at", null)
        .lt("assigned_at", cutoffTime)
        .lt("redistribution_count", maxRedistributions);

      if (leadsError) {
        console.error(`Error fetching leads for pipeline ${pipeline.id}:`, leadsError);
        continue;
      }

      if (!leads || leads.length === 0) {
        console.log(`No leads to redistribute in pipeline ${pipeline.id}`);
        continue;
      }

      console.log(`Found ${leads.length} leads to redistribute in pipeline ${pipeline.id}`);

      for (const lead of leads as LeadToRedistribute[]) {
        try {
          console.log(`Redistributing lead ${lead.id} (${lead.name})`);

          // Call the redistribute function
          const { data, error } = await supabase.rpc("redistribute_lead_from_pool", {
            p_lead_id: lead.id,
            p_reason: "timeout"
          });

          if (error) {
            console.error(`Error redistributing lead ${lead.id}:`, error);
            results.push({ leadId: lead.id, success: false, error: error.message });
          } else {
            console.log(`Successfully redistributed lead ${lead.id}:`, data);
            results.push({ leadId: lead.id, success: true });
          }
        } catch (error) {
          console.error(`Exception redistributing lead ${lead.id}:`, error);
          results.push({ 
            leadId: lead.id, 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error" 
          });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Pool checker completed: ${successCount} redistributed, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        redistributed: successCount,
        failed: failCount,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Pool checker error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
