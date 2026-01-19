import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean | null;
  secret: string | null;
  organization_id: string;
  last_triggered_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useWebhooks() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["webhooks", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Webhook[];
    },
    enabled: !!organization?.id,
  });
}

export function useCreateWebhook() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      type: 'incoming' | 'outgoing';
      target_pipeline_id?: string;
      target_stage_id?: string;
      target_team_id?: string;
      target_tag_ids?: string[];
      target_property_id?: string;
    }) => {
      if (!organization?.id) throw new Error("Organization required");

      const { data: webhook, error } = await supabase
        .from("webhooks")
        .insert({
          organization_id: organization.id,
          name: data.name,
          events: [data.type],
          url: "",
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return webhook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook criado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar webhook");
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      target_pipeline_id?: string | null;
      target_stage_id?: string | null;
      target_team_id?: string | null;
      target_tag_ids?: string[];
      target_property_id?: string | null;
    }) => {
      const { id, ...updates } = data;

      const { error } = await supabase
        .from("webhooks")
        .update({ name: updates.name })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook atualizado");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar webhook");
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webhooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook excluído");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao excluir webhook");
    },
  });
}

export function useToggleWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("webhooks")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar status");
    },
  });
}

export function useRegenerateToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("webhooks")
        .update({ secret: crypto.randomUUID() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Token regenerado");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao regenerar token");
    },
  });
}
