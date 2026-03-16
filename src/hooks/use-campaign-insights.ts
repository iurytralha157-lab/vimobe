import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { DashboardFilters } from "@/hooks/use-dashboard-filters";

export interface CampaignInsight {
  id: string;
  organization_id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  creative_url: string | null;
  creative_video_url: string | null;
  spend: number;
  impressions: number;
  reach: number;
  leads_count: number;
  cpl: number;
  date_start: string | null;
  date_stop: string | null;
  level: string;
  fetched_at: string;
}

export interface CampaignAggregated {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  reach: number;
  leads_count_api: number;
  leads_count_crm: number;
  cpl: number;
  adsets: AdsetAggregated[];
}

export interface AdsetAggregated {
  adset_id: string;
  adset_name: string;
  spend: number;
  impressions: number;
  reach: number;
  leads_count_api: number;
  leads_count_crm: number;
  cpl: number;
  ads: AdAggregated[];
}

export interface AdAggregated {
  ad_id: string;
  ad_name: string;
  spend: number;
  impressions: number;
  reach: number;
  leads_count_api: number;
  leads_count_crm: number;
  cpl: number;
  creative_url: string | null;
  creative_video_url: string | null;
}

// Fetch cached insights from DB
export function useCampaignInsights(filters: DashboardFilters) {
  const { profile } = useAuth();
  const dateFrom = filters.dateRange.from.toISOString().split("T")[0];
  const dateTo = filters.dateRange.to.toISOString().split("T")[0];

  return useQuery({
    queryKey: ["campaign-insights", profile?.organization_id, dateFrom, dateTo],
    queryFn: async () => {
      if (!profile?.organization_id) return null;

      // 1. Get cached insights (campaign level)
      const { data: campaignInsights, error: insightsError } = await (supabase as any)
        .from("meta_campaign_insights")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .eq("level", "campaign")
        .gte("date_start", dateFrom)
        .lte("date_stop", dateTo)
        .order("spend", { ascending: false });

      if (insightsError) {
        console.error("Error fetching insights:", insightsError);
      }

      // 2. Get adset insights
      const { data: adsetInsights } = await (supabase as any)
        .from("meta_campaign_insights")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .eq("level", "adset")
        .gte("date_start", dateFrom)
        .lte("date_stop", dateTo);

      // 3. Get ad insights
      const { data: adInsights } = await (supabase as any)
        .from("meta_campaign_insights")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .eq("level", "ad")
        .gte("date_start", dateFrom)
        .lte("date_stop", dateTo);

      // 4. Get CRM lead counts from lead_meta
      const { data: leadMetaCounts } = await supabase
        .from("lead_meta")
        .select("campaign_id, adset_id, ad_id, lead_id")
        .not("campaign_id", "is", null);

      // Also filter leads by date range
      const leadIds = (leadMetaCounts || []).map(l => l.lead_id);
      let crmLeadsByDate: string[] = [];
      
      if (leadIds.length > 0) {
        // Batch check leads within date range
        const { data: leadsInRange } = await supabase
          .from("leads")
          .select("id")
          .in("id", leadIds.slice(0, 500))
          .gte("created_at", filters.dateRange.from.toISOString())
          .lte("created_at", filters.dateRange.to.toISOString());
        
        crmLeadsByDate = (leadsInRange || []).map(l => l.id);
      }

      const filteredLeadMeta = (leadMetaCounts || []).filter(lm => crmLeadsByDate.includes(lm.lead_id));

      // Count CRM leads per campaign/adset/ad
      const crmByCampaign: Record<string, number> = {};
      const crmByAdset: Record<string, number> = {};
      const crmByAd: Record<string, number> = {};
      
      for (const lm of filteredLeadMeta) {
        if (lm.campaign_id) crmByCampaign[lm.campaign_id] = (crmByCampaign[lm.campaign_id] || 0) + 1;
        if (lm.adset_id) crmByAdset[lm.adset_id] = (crmByAdset[lm.adset_id] || 0) + 1;
        if (lm.ad_id) crmByAd[lm.ad_id] = (crmByAd[lm.ad_id] || 0) + 1;
      }

      // 5. Aggregate into hierarchical structure
      const campaigns: CampaignAggregated[] = (campaignInsights || []).map((ci: CampaignInsight) => {
        const campaignAdsets = (adsetInsights || []).filter((ai: CampaignInsight) => ai.campaign_id === ci.campaign_id);
        
        return {
          campaign_id: ci.campaign_id || "",
          campaign_name: ci.campaign_name || "Sem nome",
          spend: ci.spend,
          impressions: ci.impressions,
          reach: ci.reach,
          leads_count_api: ci.leads_count,
          leads_count_crm: crmByCampaign[ci.campaign_id || ""] || 0,
          cpl: ci.cpl,
          adsets: campaignAdsets.map((ai: CampaignInsight) => {
            const adsetAds = (adInsights || []).filter((ad: CampaignInsight) => ad.adset_id === ai.adset_id);
            
            return {
              adset_id: ai.adset_id || "",
              adset_name: ai.adset_name || "Sem nome",
              spend: ai.spend,
              impressions: ai.impressions,
              reach: ai.reach,
              leads_count_api: ai.leads_count,
              leads_count_crm: crmByAdset[ai.adset_id || ""] || 0,
              cpl: ai.cpl,
              ads: adsetAds.map((ad: CampaignInsight) => ({
                ad_id: ad.ad_id || "",
                ad_name: ad.ad_name || "Sem nome",
                spend: ad.spend,
                impressions: ad.impressions,
                reach: ad.reach,
                leads_count_api: ad.leads_count,
                leads_count_crm: crmByAd[ad.ad_id || ""] || 0,
                cpl: ad.cpl,
                creative_url: ad.creative_url,
                creative_video_url: ad.creative_video_url,
              })),
            };
          }),
        };
      });

      // Summary KPIs
      const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
      const totalLeadsCrm = campaigns.reduce((s, c) => s + c.leads_count_crm, 0);
      const totalLeadsApi = campaigns.reduce((s, c) => s + c.leads_count_api, 0);
      const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
      const avgCpl = totalLeadsApi > 0 ? totalSpend / totalLeadsApi : 0;

      return {
        campaigns,
        summary: {
          totalSpend,
          totalLeadsCrm,
          totalLeadsApi,
          totalImpressions,
          avgCpl: Math.round(avgCpl * 100) / 100,
        },
        lastSync: (campaignInsights || [])[0]?.fetched_at || null,
      };
    },
    enabled: !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  });
}

// Sync insights from Meta API
export function useSyncCampaignInsights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dateStart, dateStop }: { dateStart: string; dateStop: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();

      const response = await fetch(
        `https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/meta-campaign-insights`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            date_start: dateStart,
            date_stop: dateStop,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao sincronizar dados");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaign-insights"] });
      toast.success(`${data.synced} registros sincronizados do Meta Ads`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });
}
