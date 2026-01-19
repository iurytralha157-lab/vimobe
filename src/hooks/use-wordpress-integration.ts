import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WordPressIntegration {
  id: string;
  organization_id: string;
  api_token: string;
  is_active: boolean;
  leads_received: number;
  created_at: string;
  updated_at: string;
}

export function useWordPressIntegration() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["wordpress-integration", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;

      const { data, error } = await supabase
        .from("wordpress_integrations")
        .select("*")
        .eq("organization_id", organization.id)
        .maybeSingle();

      if (error) throw error;
      return data as WordPressIntegration | null;
    },
    enabled: !!organization?.id,
  });
}

export function useCreateWordPressIntegration() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error("No organization");

      // Generate a random API token
      const apiToken = crypto.randomUUID().replace(/-/g, "");

      const { data, error } = await supabase
        .from("wordpress_integrations")
        .insert({
          organization_id: organization.id,
          api_token: apiToken,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wordpress-integration"] });
      toast.success("Integração WordPress criada!");
    },
    onError: (error) => {
      toast.error("Erro ao criar integração: " + error.message);
    },
  });
}

export function useToggleWordPressIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("wordpress_integrations")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wordpress-integration"] });
      toast.success(data.is_active ? "Integração ativada!" : "Integração desativada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });
}

export function useRegenerateWordPressToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const apiToken = crypto.randomUUID().replace(/-/g, "");

      const { data, error } = await supabase
        .from("wordpress_integrations")
        .update({ api_token: apiToken })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wordpress-integration"] });
      toast.success("Token regenerado!");
    },
    onError: (error) => {
      toast.error("Erro ao regenerar token: " + error.message);
    },
  });
}
