import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PipelineSlaSettings {
  id: string;
  pipeline_id: string;
  is_active: boolean;
  first_response_target_seconds: number;
  warn_after_seconds: number;
  overdue_after_seconds: number;
  notify_assignee: boolean;
  notify_manager: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export function usePipelineSlaSettings(pipelineId: string) {
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

      // Return default values if no settings exist
      if (!data) {
        return {
          id: "",
          pipeline_id: pipelineId,
          is_active: false,
          first_response_target_seconds: 300, // 5 minutes
          warn_after_seconds: 180, // 3 minutes
          overdue_after_seconds: 300, // 5 minutes
          notify_assignee: true,
          notify_manager: true,
          created_at: null,
          updated_at: null,
        } as PipelineSlaSettings;
      }

      // Map the database fields to our interface
      return {
        id: data.id,
        pipeline_id: data.pipeline_id,
        is_active: true,
        first_response_target_seconds: (data.warning_hours || 0) * 3600,
        warn_after_seconds: (data.warning_hours || 0) * 3600,
        overdue_after_seconds: (data.critical_hours || 0) * 3600,
        notify_assignee: true,
        notify_manager: true,
        created_at: data.created_at,
        updated_at: data.updated_at,
      } as PipelineSlaSettings;
    },
    enabled: !!pipelineId,
  });
}

export function useUpsertPipelineSlaSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: Omit<PipelineSlaSettings, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("pipeline_sla_settings")
        .upsert(
          {
            pipeline_id: settings.pipeline_id,
            warning_hours: settings.warn_after_seconds / 3600,
            critical_hours: settings.overdue_after_seconds / 3600,
          },
          { onConflict: "pipeline_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-sla-settings", variables.pipeline_id] });
      toast({ title: "Configurações de SLA salvas!" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao salvar configurações",
        description: error.message,
      });
    },
  });
}
