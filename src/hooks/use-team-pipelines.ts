import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface TeamPipeline {
  id: string;
  team_id: string;
  pipeline_id: string;
  created_at: string;
  team?: {
    id: string;
    name: string;
  };
  pipeline?: {
    id: string;
    name: string;
  };
}

export function useAllTeamPipelines() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["team-pipelines", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("team_pipelines")
        .select(`
          *,
          team:teams!inner(id, name, organization_id),
          pipeline:pipelines!inner(id, name, organization_id)
        `)
        .eq("team.organization_id", organization.id);

      if (error) throw error;
      return data as TeamPipeline[];
    },
    enabled: !!organization?.id,
  });
}

export function useTeamPipelines(teamId: string | undefined) {
  return useQuery({
    queryKey: ["team-pipelines", teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const { data, error } = await supabase
        .from("team_pipelines")
        .select(`
          *,
          pipeline:pipelines(id, name)
        `)
        .eq("team_id", teamId);

      if (error) throw error;
      return data as TeamPipeline[];
    },
    enabled: !!teamId,
  });
}

export function useAssignPipelineToTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { teamId: string; pipelineId: string }) => {
      const { data, error } = await supabase
        .from("team_pipelines")
        .insert({
          team_id: input.teamId,
          pipeline_id: input.pipelineId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-pipelines"] });
      toast({ title: "Pipeline vinculado à equipe!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao vincular pipeline",
        description: error.message,
      });
    },
  });
}

export function useRemovePipelineFromTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { teamId: string; pipelineId: string }) => {
      const { error } = await supabase
        .from("team_pipelines")
        .delete()
        .eq("team_id", input.teamId)
        .eq("pipeline_id", input.pipelineId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-pipelines"] });
      toast({ title: "Pipeline desvinculado!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao desvincular pipeline",
        description: error.message,
      });
    },
  });
}

export function useSetTeamLeader() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { teamId: string; userId: string; isLeader: boolean }) => {
      const { error } = await supabase
        .from("team_members")
        .update({ is_leader: input.isLeader })
        .eq("team_id", input.teamId)
        .eq("user_id", input.userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Líder atualizado!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar líder",
        description: error.message,
      });
    },
  });
}
