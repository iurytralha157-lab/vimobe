import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Stage {
  id: string;
  name: string;
  stage_key: string;
  color: string | null;
  position: number;
  pipeline_id: string;
  leads?: any[];
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
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data || []).map((pipeline) => ({
        ...pipeline,
        stages: (pipeline.stages || []).sort(
          (a: Stage, b: Stage) => a.position - b.position
        ),
      })) as Pipeline[];
    },
    enabled: !!organization?.id,
  });
}

export function useStages(pipelineId: string | undefined) {
  return useQuery({
    queryKey: ["stages", pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];

      const { data, error } = await supabase
        .from("stages")
        .select("*")
        .eq("pipeline_id", pipelineId)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as Stage[];
    },
    enabled: !!pipelineId,
  });
}

export function useStagesWithLeads(pipelineId: string | undefined) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["stages-with-leads", pipelineId, organization?.id],
    queryFn: async () => {
      if (!pipelineId || !organization?.id) return [];

      // Fetch stages
      const { data: stages, error: stagesError } = await supabase
        .from("stages")
        .select("*")
        .eq("pipeline_id", pipelineId)
        .order("position", { ascending: true });

      if (stagesError) throw stagesError;

      // Fetch leads with related data
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select(`
          *,
          assigned_user:users!leads_assigned_user_id_fkey(id, name, avatar_url),
          property:properties(id, code, title),
          lead_tags(tag_id, tags:tags(id, name, color))
        `)
        .eq("pipeline_id", pipelineId)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (leadsError) throw leadsError;

      // Group leads by stage
      const stagesWithLeads = (stages || []).map((stage) => ({
        ...stage,
        leads: (leads || [])
          .filter((lead) => lead.stage_id === stage.id)
          .map((lead) => ({
            ...lead,
            lead_tags: lead.lead_tags?.map((lt: any) => ({
              tag_id: lt.tag_id,
              ...lt.tags,
            })),
          })),
      }));

      return stagesWithLeads as Stage[];
    },
    enabled: !!pipelineId && !!organization?.id,
  });
}

export function useCreatePipeline() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

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

      // Create default stages if none provided
      const defaultStages = input.stages || [
        { name: "Novo", stage_key: "new", color: "#3b82f6" },
        { name: "Em Contato", stage_key: "contacted", color: "#22c55e" },
        { name: "Negociação", stage_key: "negotiation", color: "#f59e0b" },
        { name: "Fechado", stage_key: "closed", color: "#8b5cf6" },
      ];

      const { error: stagesError } = await supabase.from("stages").insert(
        defaultStages.map((stage, index) => ({
          pipeline_id: pipeline.id,
          name: stage.name,
          stage_key: stage.stage_key,
          color: stage.color || "#6b7280",
          position: index,
        }))
      );

      if (stagesError) throw stagesError;

      return pipeline;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      toast.success("Pipeline criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar pipeline: " + error.message);
    },
  });
}

export function useDeletePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pipelineId: string) => {
      // First delete stages
      await supabase.from("stages").delete().eq("pipeline_id", pipelineId);

      // Then delete pipeline
      const { error } = await supabase
        .from("pipelines")
        .delete()
        .eq("id", pipelineId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      toast.success("Pipeline excluída!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir pipeline: " + error.message);
    },
  });
}

export function useCreateStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { pipelineId: string; name: string; color?: string }) => {
      // Get max position
      const { data: stages } = await supabase
        .from("stages")
        .select("position")
        .eq("pipeline_id", input.pipelineId)
        .order("position", { ascending: false })
        .limit(1);

      const nextPosition = stages && stages.length > 0 ? stages[0].position + 1 : 0;

      const { data, error } = await supabase
        .from("stages")
        .insert({
          pipeline_id: input.pipelineId,
          name: input.name,
          stage_key: input.name.toLowerCase().replace(/\s+/g, "_"),
          color: input.color || "#6b7280",
          position: nextPosition,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stages-with-leads"] });
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
    onError: (error) => {
      toast.error("Erro ao criar coluna: " + error.message);
    },
  });
}

export function useUpdateStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; color?: string; position?: number }) => {
      const { data, error } = await supabase
        .from("stages")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stages-with-leads"] });
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
  });
}

export function useDeleteStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stageId: string) => {
      const { error } = await supabase.from("stages").delete().eq("id", stageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stages-with-leads"] });
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      toast.success("Coluna excluída!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir coluna: " + error.message);
    },
  });
}
