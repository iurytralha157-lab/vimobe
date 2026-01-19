import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeadMeta {
  id: string;
  lead_id: string;
  page_id: string | null;
  form_id: string | null;
  ad_id: string | null;
  adset_id: string | null;
  campaign_id: string | null;
  ad_name: string | null;
  adset_name: string | null;
  campaign_name: string | null;
  platform: string | null;
  raw_payload: any;
  created_at: string;
}

export function useLeadMeta(leadId: string | null) {
  return useQuery({
    queryKey: ['lead-meta', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_meta')
        .select('*')
        .eq('lead_id', leadId!)
        .maybeSingle();

      if (error) {
        console.error('Error fetching lead meta:', error);
        return null;
      }

      return data as LeadMeta | null;
    }
  });
}
