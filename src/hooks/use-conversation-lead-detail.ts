import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useConversationLeadDetail(leadId: string | null | undefined) {
  return useQuery({
    queryKey: ["conversation-lead-detail", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(`
          id, name, phone, email, cidade, uf, source, created_at, valor_interesse,
          stage_id, pipeline_id,
          stage:stages(id, name, color),
          pipeline:pipelines(id, name),
          tags:lead_tags(tag:tags(id, name, color))
        `)
        .eq("id", leadId!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
    staleTime: 30_000,
  });
}
