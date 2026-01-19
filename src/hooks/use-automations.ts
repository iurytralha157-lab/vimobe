import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export type TriggerType = 
  | "message_received"
  | "scheduled"
  | "lead_stage_changed"
  | "tag_added"
  | "lead_created"
  | "inactivity"
  | "manual";

export const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  message_received: "Mensagem Recebida",
  scheduled: "Agendado",
  lead_stage_changed: "Mudança de Etapa",
  tag_added: "Tag Adicionada",
  lead_created: "Lead Criado",
  inactivity: "Inatividade",
  manual: "Manual",
};

export const TRIGGER_TYPE_DESCRIPTIONS: Record<TriggerType, string> = {
  message_received: "Dispara quando uma mensagem é recebida",
  scheduled: "Dispara em um horário específico",
  lead_stage_changed: "Dispara quando o lead muda de etapa",
  tag_added: "Dispara quando uma tag é adicionada",
  lead_created: "Dispara quando um novo lead é criado",
  inactivity: "Dispara após período de inatividade",
  manual: "Dispara manualmente pelo usuário",
};

export type ActionType =
  | "send_whatsapp"
  | "send_email"
  | "move_lead"
  | "add_tag"
  | "remove_tag"
  | "create_task"
  | "assign_user"
  | "webhook";

export interface AutomationNode {
  id: string;
  automation_id: string | null;
  node_type: string;
  node_config: Json | null;
  position_x: number | null;
  position_y: number | null;
  created_at: string | null;
}

export interface AutomationEdge {
  id: string;
  automation_id: string | null;
  source_node_id: string | null;
  target_node_id: string | null;
  condition_config: Json | null;
  created_at: string | null;
}

export interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger_type: TriggerType;
  trigger_config: Json | null;
  is_active: boolean | null;
  organization_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  nodes?: AutomationNode[];
  edges?: AutomationEdge[];
}

export function useAutomations() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["automations", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("automations")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Automation[];
    },
    enabled: !!organization?.id,
  });
}

export function useAutomation(id: string | undefined) {
  return useQuery({
    queryKey: ["automation", id],
    queryFn: async () => {
      if (!id) return null;

      const { data: automation, error } = await supabase
        .from("automations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      const { data: nodes } = await supabase
        .from("automation_nodes")
        .select("*")
        .eq("automation_id", id);

      const { data: edges } = await supabase
        .from("automation_edges")
        .select("*")
        .eq("automation_id", id);

      return {
        ...automation,
        nodes: nodes || [],
        edges: edges || [],
      } as Automation;
    },
    enabled: !!id,
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      trigger_type: TriggerType;
      trigger_config?: Json;
    }) => {
      if (!organization?.id) throw new Error("Organização não encontrada");

      const { data: automation, error } = await supabase
        .from("automations")
        .insert({
          name: data.name,
          description: data.description || null,
          trigger_type: data.trigger_type,
          trigger_config: data.trigger_config || null,
          organization_id: organization.id,
          is_active: false,
        })
        .select()
        .single();

      if (error) throw error;
      return automation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automação criada com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar automação: " + error.message);
    },
  });
}

export function useUpdateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      description?: string;
      trigger_type?: TriggerType;
      trigger_config?: Json;
      is_active?: boolean;
    }) => {
      const { data: automation, error } = await supabase
        .from("automations")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return automation;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      queryClient.invalidateQueries({ queryKey: ["automation", id] });
      toast.success("Automação atualizada");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar automação: " + error.message);
    },
  });
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete edges first
      await supabase.from("automation_edges").delete().eq("automation_id", id);
      // Delete nodes
      await supabase.from("automation_nodes").delete().eq("automation_id", id);
      // Delete automation
      const { error } = await supabase.from("automations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automação excluída");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir automação: " + error.message);
    },
  });
}

export function useToggleAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("automations")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Status atualizado");
    },
    onError: (error: Error) => {
      toast.error("Erro: " + error.message);
    },
  });
}

export function useSaveAutomationFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      automationId,
      nodes,
      edges,
    }: {
      automationId: string;
      nodes: Array<{
        id: string;
        node_type: string;
        node_config: Json;
        position_x: number;
        position_y: number;
      }>;
      edges: Array<{
        id: string;
        source_node_id: string;
        target_node_id: string;
        condition_config?: Json;
      }>;
    }) => {
      // Delete existing nodes and edges
      await supabase.from("automation_edges").delete().eq("automation_id", automationId);
      await supabase.from("automation_nodes").delete().eq("automation_id", automationId);

      // Insert new nodes
      if (nodes.length > 0) {
        const { error: nodesError } = await supabase.from("automation_nodes").insert(
          nodes.map((n) => ({
            id: n.id,
            automation_id: automationId,
            node_type: n.node_type,
            node_config: n.node_config,
            position_x: n.position_x,
            position_y: n.position_y,
          }))
        );
        if (nodesError) throw nodesError;
      }

      // Insert new edges
      if (edges.length > 0) {
        const { error: edgesError } = await supabase.from("automation_edges").insert(
          edges.map((e) => ({
            id: e.id,
            automation_id: automationId,
            source_node_id: e.source_node_id,
            target_node_id: e.target_node_id,
            condition_config: e.condition_config || null,
          }))
        );
        if (edgesError) throw edgesError;
      }
    },
    onSuccess: (_, { automationId }) => {
      queryClient.invalidateQueries({ queryKey: ["automation", automationId] });
      toast.success("Fluxo salvo com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar fluxo: " + error.message);
    },
  });
}
