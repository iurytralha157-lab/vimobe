import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const META_GRAPH_VERSION = "v19.0";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's org
    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: "No organization" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = profile.organization_id;

    // Get Meta integrations with access tokens
    const { data: integrations } = await supabaseAdmin
      .from("meta_integrations")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_connected", true);

    if (!integrations || integrations.length === 0) {
      return new Response(JSON.stringify({ error: "No Meta integration connected", campaigns: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { date_start, date_stop } = body;

    // Use date range or default to last 30 days
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const defaultStop = now.toISOString().split("T")[0];
    const dateStart = date_start || defaultStart;
    const dateStop = date_stop || defaultStop;

    const allInsights: any[] = [];

    for (const integration of integrations) {
      const accessToken = integration.access_token;
      if (!accessToken) continue;

      let adAccountId = integration.ad_account_id;

      // Step 1: Get Ad Account ID if not cached
      if (!adAccountId) {
        try {
          const adAccountsRes = await fetch(
            `https://graph.facebook.com/${META_GRAPH_VERSION}/me/adaccounts?fields=id,name,account_id&access_token=${accessToken}`
          );
          const adAccountsData = await adAccountsRes.json();
          
          if (adAccountsData.data && adAccountsData.data.length > 0) {
            adAccountId = adAccountsData.data[0].id; // format: "act_XXXXX"
            
            // Save ad_account_id
            await supabaseAdmin
              .from("meta_integrations")
              .update({ ad_account_id: adAccountId })
              .eq("id", integration.id);
            
            console.log(`Saved ad_account_id: ${adAccountId} for integration ${integration.id}`);
          } else {
            console.warn("No ad accounts found for integration:", integration.id, adAccountsData);
            continue;
          }
        } catch (err) {
          console.error("Error fetching ad accounts:", err);
          continue;
        }
      }

      // Step 2: Fetch campaign insights
      try {
        const campaignsUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${adAccountId}/insights?fields=campaign_id,campaign_name,spend,impressions,reach,actions,cost_per_action_type&level=campaign&time_range={"since":"${dateStart}","until":"${dateStop}"}&limit=500&access_token=${accessToken}`;
        
        console.log("Fetching campaign insights for:", adAccountId);
        const campaignsRes = await fetch(campaignsUrl);
        const campaignsData = await campaignsRes.json();

        if (campaignsData.error) {
          console.error("Meta API error (campaigns):", campaignsData.error);
          // If token issue, update integration
          if (campaignsData.error.code === 190) {
            await supabaseAdmin
              .from("meta_integrations")
              .update({ last_error: `Token error: ${campaignsData.error.message}` })
              .eq("id", integration.id);
          }
          continue;
        }

        const campaignInsights = campaignsData.data || [];
        
        for (const insight of campaignInsights) {
          const leadsAction = (insight.actions || []).find((a: any) => a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped");
          const leadsCostAction = (insight.cost_per_action_type || []).find((a: any) => a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped");
          
          const leadsCount = leadsAction ? parseInt(leadsAction.value) : 0;
          const spend = parseFloat(insight.spend || "0");
          const cpl = leadsCostAction ? parseFloat(leadsCostAction.value) : (leadsCount > 0 ? spend / leadsCount : 0);

          allInsights.push({
            organization_id: orgId,
            campaign_id: insight.campaign_id,
            campaign_name: insight.campaign_name,
            adset_id: null,
            adset_name: null,
            ad_id: null,
            ad_name: null,
            spend,
            impressions: parseInt(insight.impressions || "0"),
            reach: parseInt(insight.reach || "0"),
            leads_count: leadsCount,
            cpl: Math.round(cpl * 100) / 100,
            date_start: dateStart,
            date_stop: dateStop,
            level: "campaign",
            fetched_at: new Date().toISOString(),
          });
        }

        // Step 3: Fetch adset-level insights
        const adsetsUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${adAccountId}/insights?fields=campaign_id,campaign_name,adset_id,adset_name,spend,impressions,reach,actions,cost_per_action_type&level=adset&time_range={"since":"${dateStart}","until":"${dateStop}"}&limit=500&access_token=${accessToken}`;
        
        const adsetsRes = await fetch(adsetsUrl);
        const adsetsData = await adsetsRes.json();

        for (const insight of (adsetsData.data || [])) {
          const leadsAction = (insight.actions || []).find((a: any) => a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped");
          const leadsCostAction = (insight.cost_per_action_type || []).find((a: any) => a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped");
          
          const leadsCount = leadsAction ? parseInt(leadsAction.value) : 0;
          const spend = parseFloat(insight.spend || "0");
          const cpl = leadsCostAction ? parseFloat(leadsCostAction.value) : (leadsCount > 0 ? spend / leadsCount : 0);

          allInsights.push({
            organization_id: orgId,
            campaign_id: insight.campaign_id,
            campaign_name: insight.campaign_name,
            adset_id: insight.adset_id,
            adset_name: insight.adset_name,
            ad_id: null,
            ad_name: null,
            spend,
            impressions: parseInt(insight.impressions || "0"),
            reach: parseInt(insight.reach || "0"),
            leads_count: leadsCount,
            cpl: Math.round(cpl * 100) / 100,
            date_start: dateStart,
            date_stop: dateStop,
            level: "adset",
            fetched_at: new Date().toISOString(),
          });
        }

        // Step 4: Fetch ad-level insights with creative
        const adsUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${adAccountId}/insights?fields=campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,actions,cost_per_action_type&level=ad&time_range={"since":"${dateStart}","until":"${dateStop}"}&limit=500&access_token=${accessToken}`;
        
        const adsRes = await fetch(adsUrl);
        const adsData = await adsRes.json();

        for (const insight of (adsData.data || [])) {
          const leadsAction = (insight.actions || []).find((a: any) => a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped");
          const leadsCostAction = (insight.cost_per_action_type || []).find((a: any) => a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped");
          
          const leadsCount = leadsAction ? parseInt(leadsAction.value) : 0;
          const spend = parseFloat(insight.spend || "0");
          const cpl = leadsCostAction ? parseFloat(leadsCostAction.value) : (leadsCount > 0 ? spend / leadsCount : 0);

          // Try to get creative URL for this ad
          let creativeUrl = null;
          let creativeVideoUrl = null;
          try {
            const adCreativeRes = await fetch(
              `https://graph.facebook.com/${META_GRAPH_VERSION}/${insight.ad_id}?fields=creative{effective_image_url,thumbnail_url,video_id}&access_token=${accessToken}`
            );
            const adCreativeData = await adCreativeRes.json();
            
            if (adCreativeData.creative) {
              creativeUrl = adCreativeData.creative.effective_image_url || adCreativeData.creative.thumbnail_url;
              
              if (adCreativeData.creative.video_id) {
                const videoRes = await fetch(
                  `https://graph.facebook.com/${META_GRAPH_VERSION}/${adCreativeData.creative.video_id}?fields=source&access_token=${accessToken}`
                );
                const videoData = await videoRes.json();
                creativeVideoUrl = videoData.source || null;
              }
            }
          } catch (err) {
            console.warn("Error fetching creative for ad:", insight.ad_id, err);
          }

          allInsights.push({
            organization_id: orgId,
            campaign_id: insight.campaign_id,
            campaign_name: insight.campaign_name,
            adset_id: insight.adset_id,
            adset_name: insight.adset_name,
            ad_id: insight.ad_id,
            ad_name: insight.ad_name,
            creative_url: creativeUrl,
            creative_video_url: creativeVideoUrl,
            spend,
            impressions: parseInt(insight.impressions || "0"),
            reach: parseInt(insight.reach || "0"),
            leads_count: leadsCount,
            cpl: Math.round(cpl * 100) / 100,
            date_start: dateStart,
            date_stop: dateStop,
            level: "ad",
            fetched_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Error fetching insights:", err);
      }
    }

    // Step 5: Upsert all insights into cache
    if (allInsights.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from("meta_campaign_insights")
        .upsert(allInsights, {
          onConflict: "organization_id,campaign_id,adset_id,ad_id,date_start,date_stop",
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
      }
    }

    console.log(`Synced ${allInsights.length} insight rows for org ${orgId}`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: allInsights.length,
        date_range: { from: dateStart, to: dateStop },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
