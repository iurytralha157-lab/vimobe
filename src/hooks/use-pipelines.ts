import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Stage {
  id: string;
  name: string;
  stage_key: string;
  color: string | null;
  position: number;
  pipeline_id: string;
}

export interface Pipeline {
  id: string;
  name: string;
  organization_id: string;
  is_default: boolean | null;
  created_at: string;
  stages?: Stage[];
}

export function usePipelines() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["pipelines", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("pipelines")
        .select(`
          *,
          stages(*)
        `)
        .eq("organization_id", organization.id)
        .order("created_at");

      if (error) throw error;

      return (data || []).map((pipeline) => ({
        ...pipeline,
        stages: (pipeline.stages || []).sort((a: Stage, b: Stage) => a.position - b.position),
      })) as Pipeline[];
    },
    enabled: !!organization?.id,
  });
}

export function useDefaultPipeline() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["default-pipeline", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;

      const { data, error } = await supabase
        .from("pipelines")
        .select(`
          *,
          stages(*)
        `)
        .eq("organization_id", organization.id)
        .eq("is_default", true)
        .single();

      if (error) {
        // If no default, get the first one
        const { data: firstPipeline, error: firstError } = await supabase
          .from("pipelines")
          .select(`*, stages(*)`)
          .eq("organization_id", organization.id)
          .order("created_at")
          .limit(1)
          .single();

        if (firstError) return null;
        return {
          ...firstPipeline,
          stages: (firstPipeline.stages || []).sort((a: Stage, b: Stage) => a.position - b.position),
        } as Pipeline;
      }

      return {
        ...data,
        stages: (data.stages || []).sort((a: Stage, b: Stage) => a.position - b.position),
      } as Pipeline;
    },
    enabled: !!organization?.id,
  });
}

export function useStages(pipelineId?: string) {
  return useQuery({
    queryKey: ["stages", pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];

      const { data, error } = await supabase
        .from("stages")
        .select("*")
        .eq("pipeline_id", pipelineId)
        .order("position");

      if (error) throw error;
      return data as Stage[];
    },
    enabled: !!pipelineId,
  });
}

export function useCreatePipeline() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { name: string; stages?: { name: string; stage_key: string; color?: string }[] }) => {
      if (!organization?.id) throw new Error("No organization");

      // Create pipeline
      const { data: pipeline, error: pipelineError } = await supabase
        .from("pipelines")
        .insert({
          name: input.name,
          organization_id: organization.id,
          is_default: false,
        })
        .select()
        .single();

      if (pipelineError) throw pipelineError;

      // Create stages if provided
      if (input.stages?.length) {
        const { error: stagesError } = await supabase
          .from("stages")
          .insert(
            input.stages.map((stage, index) => ({
              ...stage,
              pipeline_id: pipeline.id,
              position: index,
            }))
          );

        if (stagesError) throw stagesError;
      }

      return pipeline;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      toast({ title: "Pipeline criado!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar pipeline",
        description: error.message,
      });
    },
  });
}
