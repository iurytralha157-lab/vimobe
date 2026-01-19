import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MetaPage {
  id: string;
  name: string;
  access_token?: string;
}

export interface MetaIntegration {
  id: string;
  organization_id: string;
  page_id: string | null;
  page_name: string | null;
  is_connected: boolean | null;
  access_token: string | null;
  field_mapping: Record<string, string> | null;
  form_ids: string[] | null;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  // Extended fields from form configs
  pipeline_id?: string;
  stage_id?: string;
  default_status?: string;
  leads_received?: number;
  last_lead_at?: string;
}

export function useMetaIntegrations() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["meta-integrations", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("meta_integrations")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MetaIntegration[];
    },
    enabled: !!organization?.id,
  });
}

export function useMetaGetAuthUrl() {
  return useMutation({
    mutationFn: async (redirectUri: string) => {
      const { data, error } = await supabase.functions.invoke("meta-auth", {
        body: { action: "get_auth_url", redirect_uri: redirectUri },
      });

      if (error) throw error;
      return data as { auth_url: string };
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao iniciar autenticação");
    },
  });
}

export function useMetaExchangeToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code, redirectUri }: { code: string; redirectUri: string }) => {
      const { data, error } = await supabase.functions.invoke("meta-auth", {
        body: { action: "exchange_token", code, redirect_uri: redirectUri },
      });

      if (error) throw error;
      return data as { user_token: string; pages: MetaPage[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-integrations"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao trocar token");
    },
  });
}

export function useMetaConnectPage() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pageId,
      userToken,
      pipelineId,
      stageId,
      defaultStatus,
    }: {
      pageId: string;
      userToken: string;
      pipelineId: string;
      stageId: string;
      defaultStatus: string;
    }) => {
      if (!organization?.id) throw new Error("Organization required");

      const { data, error } = await supabase.functions.invoke("meta-auth", {
        body: {
          action: "connect_page",
          page_id: pageId,
          user_token: userToken,
          organization_id: organization.id,
          pipeline_id: pipelineId,
          stage_id: stageId,
          default_status: defaultStatus,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-integrations"] });
      toast.success("Página conectada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao conectar página");
    },
  });
}

export function useMetaUpdatePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pageId,
      pipelineId,
      stageId,
      defaultStatus,
    }: {
      pageId: string;
      pipelineId: string;
      stageId: string;
      defaultStatus: string;
    }) => {
      const { error } = await supabase
        .from("meta_integrations")
        .update({
          field_mapping: {
            pipeline_id: pipelineId,
            stage_id: stageId,
            default_status: defaultStatus,
          },
        })
        .eq("page_id", pageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-integrations"] });
      toast.success("Configurações atualizadas!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar configurações");
    },
  });
}

export function useMetaDisconnectPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase
        .from("meta_integrations")
        .delete()
        .eq("page_id", pageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-integrations"] });
      toast.success("Página desconectada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao desconectar página");
    },
  });
}

export function useMetaTogglePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pageId, isActive }: { pageId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("meta_integrations")
        .update({ is_connected: isActive })
        .eq("page_id", pageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-integrations"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar status");
    },
  });
}
