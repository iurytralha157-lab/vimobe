import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface CadenceTask {
  id: string;
  cadence_template_id: string;
  day_offset: number;
  type: "call" | "message" | "email" | "note";
  title: string;
  description: string | null;
  position: number | null;
}

export interface CadenceTemplate {
  id: string;
  name: string;
  stage_key: string;
  organization_id: string;
  created_at: string;
  tasks: CadenceTask[];
}

export function useCadenceTemplates() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["cadence-templates", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("cadence_templates")
        .select(`
          *,
          cadence_tasks_template(*)
        `)
        .eq("organization_id", organization.id);

      if (error) throw error;

      return (data || []).map((template) => ({
        ...template,
        tasks: (template.cadence_tasks_template || [])
          .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
          .map((task: any) => ({
            ...task,
            type: task.title?.toLowerCase().includes("ligação") || task.title?.toLowerCase().includes("call")
              ? "call"
              : task.title?.toLowerCase().includes("mensagem") || task.title?.toLowerCase().includes("message")
              ? "message"
              : task.title?.toLowerCase().includes("email")
              ? "email"
              : "note",
          })),
      })) as CadenceTemplate[];
    },
    enabled: !!organization?.id,
  });
}

export function useCreateCadenceTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      cadence_template_id: string;
      day_offset: number;
      type: string;
      title: string;
    }) => {
      const { data, error } = await supabase
        .from("cadence_tasks_template")
        .insert({
          cadence_template_id: input.cadence_template_id,
          day_offset: input.day_offset,
          title: input.title,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadence-templates"] });
      toast({ title: "Tarefa criada!" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar tarefa",
        description: error.message,
      });
    },
  });
}

export function useDeleteCadenceTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("cadence_tasks_template")
        .delete()
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadence-templates"] });
      toast({ title: "Tarefa removida!" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao remover tarefa",
        description: error.message,
      });
    },
  });
}
