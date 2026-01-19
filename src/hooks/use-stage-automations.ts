import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface StageAutomation {
  id: string;
  stage_id: string;
  organization_id: string;
  trigger_type: string;
  action_type: string;
  action_config: Record<string, any> | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export function useStageAutomations(stageId: string) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["stage-automations", stageId],
    queryFn: async () => {
      if (!stageId || !organization?.id) return [];

      const { data, error } = await supabase
        .from("stage_automations")
        .select("*")
        .eq("stage_id", stageId)
        .eq("organization_id", organization.id);

      if (error) throw error;
      return (data || []) as StageAutomation[];
    },
    enabled: !!stageId && !!organization?.id,
  });
}

export function useCreateStageAutomation() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      stage_id: string;
      trigger_type: string;
      action_type: string;
      action_config?: Record<string, any>;
    }) => {
      if (!organization?.id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("stage_automations")
        .insert({
          ...input,
          organization_id: organization.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stage-automations", variables.stage_id] });
      toast({ title: "Automação criada!" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar automação",
        description: error.message,
      });
    },
  });
}

export function useUpdateStageAutomation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      stage_id: string;
      trigger_type?: string;
      action_type?: string;
      action_config?: Record<string, any>;
      is_active?: boolean;
    }) => {
      const { id, stage_id, ...updates } = input;
      
      const { data, error } = await supabase
        .from("stage_automations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["stage-automations", data.stage_id] });
      toast({ title: "Automação atualizada!" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar automação",
        description: error.message,
      });
    },
  });
}

export function useDeleteStageAutomation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, stageId }: { id: string; stageId: string }) => {
      const { error } = await supabase
        .from("stage_automations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return stageId;
    },
    onSuccess: (stageId) => {
      queryClient.invalidateQueries({ queryKey: ["stage-automations", stageId] });
      toast({ title: "Automação removida!" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao remover automação",
        description: error.message,
      });
    },
  });
}
