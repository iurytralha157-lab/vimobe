import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { DashboardFilters } from "@/hooks/use-dashboard-filters";

export interface CampaignAggregated {
  campaign_id: string;
  campaign_name: string;
  spend: number | null;
  impressions: number | null;
  reach: number | null;
  leads_count: number;
  won_count: number;
  cpl: number | null;
  adsets: AdsetAggregated[];
}

export interface AdsetAggregated {
  adset_id: string;
  adset_name: string;
  spend: number | null;
  impressions: number | null;
  reach: number | null;
  leads_count: number;
  won_count: number;
  cpl: number | null;
  ads: AdAggregated[];
}

export interface AdAggregated {
  ad_id: string;
  ad_name: string;
  spend: number | null;
  impressions: number | null;
  reach: number | null;
  leads_count: number;
  won_count: number;
  cpl: number | null;
  creative_url: string | null;
  creative_video_url: string | null;
}

export interface TopCreative {
  ad_id: string;
  ad_name: string;
  campaign_name: string;
  leads_count: number;
  won_count: number;
  score: number;
  creative_url: string | null;
  creative_video_url: string | null;
  spend: number | null;
  cpl: number | null;
}

interface LeadMetaRow {
  campaign_id: string | null;
  campaign_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  creative_url: string | null;
  creative_video_url: string | null;
  lead_id: string;
}

interface InsightRow {
  campaign_id: string | null;
  adset_id: string | null;
  ad_id: string | null;
  level: string;
  spend: number;
  impressions: number;
  reach: number;
  leads_count: number;
  cpl: number;
  fetched_at: string;
}

// Build hierarchy from lead_meta (primary), enrich with meta_campaign_insights (optional)
export function useCampaignInsights(filters: DashboardFilters) {
  const { profile } = useAuth();
  const dateFrom = filters.dateRange.from.toISOString();
  const dateTo = filters.dateRange.to.toISOString();

  return useQuery({
    queryKey: ["campaign-insights", profile?.organization_id, dateFrom, dateTo],
    queryFn: async () => {
      if (!profile?.organization_id) return null;

      // 1. Get all lead_meta with campaign_id, joined with leads for date filter
      const { data: leadMetaRaw } = await supabase
        .from("lead_meta")
        .select("campaign_id, campaign_name, adset_id, adset_name, ad_id, ad_name, creative_url, creative_video_url, lead_id")
        .not("campaign_id", "is", null);

      if (!leadMetaRaw || leadMetaRaw.length === 0) {
        return { campaigns: [], summary: { totalLeads: 0, totalCampaigns: 0, totalAdsets: 0, totalAds: 0, totalSpend: null, avgCpl: null, totalImpressions: null }, lastSync: null, hasSpendData: false };
      }

      // 2. Filter leads by date range
      const leadIds = leadMetaRaw.map(lm => lm.lead_id);
      const batchSize = 500;
      const validLeadIds = new Set<string>();

      for (let i = 0; i < leadIds.length; i += batchSize) {
        const batch = leadIds.slice(i, i + batchSize);
        const { data: leadsInRange } = await supabase
          .from("leads")
          .select("id, deal_status")
          .in("id", batch)
          .gte("created_at", dateFrom)
          .lte("created_at", dateTo);
        (leadsInRange || []).forEach(l => {
          validLeadIds.add(l.id);
          if (l.deal_status === 'won') wonLeadIds.add(l.id);
        });
      }

      const filtered = (leadMetaRaw as LeadMetaRow[]).filter(lm => validLeadIds.has(lm.lead_id));

      // 3. Build hierarchy from lead_meta
      const campaignMap = new Map<string, {
        name: string;
        leads: Set<string>;
        adsets: Map<string, {
          name: string;
          leads: Set<string>;
          ads: Map<string, {
            name: string;
            leads: Set<string>;
            creative_url: string | null;
            creative_video_url: string | null;
          }>;
        }>;
      }>();

      for (const lm of filtered) {
        const cId = lm.campaign_id || "unknown";
        if (!campaignMap.has(cId)) {
          campaignMap.set(cId, { name: lm.campaign_name || "Sem nome", leads: new Set(), adsets: new Map() });
        }
        const campaign = campaignMap.get(cId)!;
        campaign.leads.add(lm.lead_id);

        if (lm.adset_id) {
          if (!campaign.adsets.has(lm.adset_id)) {
            campaign.adsets.set(lm.adset_id, { name: lm.adset_name || "Sem nome", leads: new Set(), ads: new Map() });
          }
          const adset = campaign.adsets.get(lm.adset_id)!;
          adset.leads.add(lm.lead_id);

          if (lm.ad_id) {
            if (!adset.ads.has(lm.ad_id)) {
              adset.ads.set(lm.ad_id, { name: lm.ad_name || "Sem nome", leads: new Set(), creative_url: lm.creative_url, creative_video_url: lm.creative_video_url });
            }
            const ad = adset.ads.get(lm.ad_id)!;
            ad.leads.add(lm.lead_id);
            if (lm.creative_url) ad.creative_url = lm.creative_url;
            if (lm.creative_video_url) ad.creative_video_url = lm.creative_video_url;
          }
        }
      }

      // 4. Optionally fetch spend data from meta_campaign_insights
      const dateFromDate = filters.dateRange.from.toISOString().split("T")[0];
      const dateToDate = filters.dateRange.to.toISOString().split("T")[0];

      const { data: insightsRaw } = await (supabase as any)
        .from("meta_campaign_insights")
        .select("campaign_id, adset_id, ad_id, level, spend, impressions, reach, leads_count, cpl, fetched_at")
        .eq("organization_id", profile.organization_id)
        .gte("date_start", dateFromDate)
        .lte("date_stop", dateToDate);

      const insights = (insightsRaw || []) as InsightRow[];
      const hasSpendData = insights.length > 0;

      // Index insights by level+id
      const spendByCampaign = new Map<string, InsightRow>();
      const spendByAdset = new Map<string, InsightRow>();
      const spendByAd = new Map<string, InsightRow>();
      let lastSync: string | null = null;

      for (const ins of insights) {
        if (ins.fetched_at && (!lastSync || ins.fetched_at > lastSync)) lastSync = ins.fetched_at;
        if (ins.level === "campaign" && ins.campaign_id) spendByCampaign.set(ins.campaign_id, ins);
        if (ins.level === "adset" && ins.adset_id) spendByAdset.set(ins.adset_id, ins);
        if (ins.level === "ad" && ins.ad_id) spendByAd.set(ins.ad_id, ins);
      }

      // 5. Merge into final structure
      const campaigns: CampaignAggregated[] = [];
      let totalAdsetsCount = 0;
      let totalAdsCount = 0;

      for (const [cId, cData] of campaignMap) {
        const cInsight = spendByCampaign.get(cId);
        const adsets: AdsetAggregated[] = [];

        for (const [asId, asData] of cData.adsets) {
          const asInsight = spendByAdset.get(asId);
          const ads: AdAggregated[] = [];

          for (const [adId, adData] of asData.ads) {
            const adInsight = spendByAd.get(adId);
            ads.push({
              ad_id: adId,
              ad_name: adData.name,
              spend: adInsight?.spend ?? null,
              impressions: adInsight?.impressions ?? null,
              reach: adInsight?.reach ?? null,
              leads_count: adData.leads.size,
              cpl: adInsight?.cpl ?? null,
              creative_url: adData.creative_url,
              creative_video_url: adData.creative_video_url,
            });
            totalAdsCount++;
          }

          adsets.push({
            adset_id: asId,
            adset_name: asData.name,
            spend: asInsight?.spend ?? null,
            impressions: asInsight?.impressions ?? null,
            reach: asInsight?.reach ?? null,
            leads_count: asData.leads.size,
            cpl: asInsight?.cpl ?? null,
            ads: ads.sort((a, b) => b.leads_count - a.leads_count),
          });
          totalAdsetsCount++;
        }

        campaigns.push({
          campaign_id: cId,
          campaign_name: cData.name,
          spend: cInsight?.spend ?? null,
          impressions: cInsight?.impressions ?? null,
          reach: cInsight?.reach ?? null,
          leads_count: cData.leads.size,
          cpl: cInsight?.cpl ?? null,
          adsets: adsets.sort((a, b) => b.leads_count - a.leads_count),
        });
      }

      campaigns.sort((a, b) => b.leads_count - a.leads_count);

      const totalLeads = campaigns.reduce((s, c) => s + c.leads_count, 0);
      const totalSpend = hasSpendData ? campaigns.reduce((s, c) => s + (c.spend || 0), 0) : null;
      const totalImpressions = hasSpendData ? campaigns.reduce((s, c) => s + (c.impressions || 0), 0) : null;
      const avgCpl = hasSpendData && totalLeads > 0 && totalSpend ? Math.round((totalSpend / totalLeads) * 100) / 100 : null;

      return {
        campaigns,
        summary: {
          totalLeads,
          totalCampaigns: campaigns.length,
          totalAdsets: totalAdsetsCount,
          totalAds: totalAdsCount,
          totalSpend,
          avgCpl,
          totalImpressions,
        },
        lastSync,
        hasSpendData,
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
          body: JSON.stringify({ date_start: dateStart, date_stop: dateStop }),
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
