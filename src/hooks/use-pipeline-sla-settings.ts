import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PipelineSlaSettings {
  id: string;
  organization_id: string;
  pipeline_id: string;
  first_response_target_seconds: number;
  warn_after_seconds: number;
  overdue_after_seconds: number;
  notify_assignee: boolean;
  notify_manager: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlaSettingsInput {
  pipeline_id: string;
  first_response_target_seconds?: number;
  warn_after_seconds?: number;
  overdue_after_seconds?: number;
  notify_assignee?: boolean;
  notify_manager?: boolean;
  is_active?: boolean;
}

export function usePipelineSlaSettings(pipelineId: string | null) {
  return useQuery({
    queryKey: ["pipeline-sla-settings", pipelineId],
    queryFn: async () => {
      if (!pipelineId) return null;

      const { data, error } = await supabase
        .from("pipeline_sla_settings")
        .select("*")
        .eq("pipeline_id", pipelineId)
        .maybeSingle();

      if (error) throw error;
      return data as PipelineSlaSettings | null;
    },
    enabled: !!pipelineId,
  });
}

export function useAllPipelineSlaSettings() {
  return useQuery({
    queryKey: ["all-pipeline-sla-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_sla_settings")
        .select("*");

      if (error) throw error;
      return data as PipelineSlaSettings[];
    },
  });
}

export function useUpsertPipelineSlaSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: SlaSettingsInput) => {
      // First check if settings exist
      const { data: existing } = await supabase
        .from("pipeline_sla_settings")
        .select("id")
        .eq("pipeline_id", input.pipeline_id)
        .maybeSingle();

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from("pipeline_sla_settings")
          .update({
            first_response_target_seconds: input.first_response_target_seconds,
            warn_after_seconds: input.warn_after_seconds,
            overdue_after_seconds: input.overdue_after_seconds,
            notify_assignee: input.notify_assignee,
            notify_manager: input.notify_manager,
            is_active: input.is_active,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert - get org_id from pipeline
        const { data: pipeline } = await supabase
          .from("pipelines")
          .select("organization_id")
          .eq("id", input.pipeline_id)
          .single();

        if (!pipeline) throw new Error("Pipeline not found");

        const { data, error } = await supabase
          .from("pipeline_sla_settings")
          .insert({
            organization_id: pipeline.organization_id,
            pipeline_id: input.pipeline_id,
            first_response_target_seconds: input.first_response_target_seconds ?? 300,
            warn_after_seconds: input.warn_after_seconds ?? 180,
            overdue_after_seconds: input.overdue_after_seconds ?? 300,
            notify_assignee: input.notify_assignee ?? true,
            notify_manager: input.notify_manager ?? true,
            is_active: input.is_active ?? true,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-sla-settings", variables.pipeline_id] });
      queryClient.invalidateQueries({ queryKey: ["all-pipeline-sla-settings"] });
      toast({
        title: "Configurações de SLA salvas",
        description: "As configurações foram atualizadas com sucesso.",
      });
    },
    onError: (error) => {
      console.error("Error saving SLA settings:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações de SLA.",
        variant: "destructive",
      });
    },
  });
}
