import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MetaIntegration {
  id: string;
  organization_id: string;
  page_id: string | null;
  page_name: string | null;
  is_connected: boolean | null;
  access_token: string | null;
  field_mapping: unknown;
  form_ids: unknown;
  campaign_property_mapping: unknown;
  last_error: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
}

// Fetch connected pages for organization
export function useMetaIntegrations() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["meta-integrations", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      const { data, error } = await (supabase as any)
        .from("meta_integrations")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as MetaIntegration[];
    },
    enabled: !!profile?.organization_id,
  });
}

// Get OAuth URL - now redirects to edge function callback
export function useMetaGetAuthUrl() {
  return useMutation({
    mutationFn: async (returnUrl: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/meta-oauth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            action: "get_auth_url",
            return_url: returnUrl,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get auth URL");
      }

      return response.json() as Promise<{ auth_url: string }>;
    },
  });
}

// Exchange OAuth code for token and get pages
export function useMetaExchangeToken() {
  return useMutation({
    mutationFn: async ({ code, redirectUri }: { code: string; redirectUri: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/meta-oauth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            action: "exchange_token",
            code,
            redirect_uri: redirectUri,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to exchange token");
      }

      return response.json() as Promise<{ pages: MetaPage[]; user_token: string }>;
    },
  });
}

// Connect a page
export function useMetaConnectPage() {
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
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/meta-oauth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            action: "connect_page",
            page_id: pageId,
            code: userToken,
            pipeline_id: pipelineId,
            stage_id: stageId,
            default_status: defaultStatus,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to connect page");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-integrations"] });
      toast.success("Página conectada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao conectar página: ${error.message}`);
    },
  });
}

// Update page configuration
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
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/meta-oauth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            action: "update_page",
            page_id: pageId,
            pipeline_id: pipelineId,
            stage_id: stageId,
            default_status: defaultStatus,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update page");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-integrations"] });
      toast.success("Configuração atualizada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });
}

// Disconnect a page
export function useMetaDisconnectPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pageId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/meta-oauth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            action: "disconnect_page",
            page_id: pageId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to disconnect page");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-integrations"] });
      toast.success("Página desconectada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desconectar: ${error.message}`);
    },
  });
}

// Toggle page active status
export function useMetaTogglePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pageId, isActive }: { pageId: string; isActive: boolean }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/meta-oauth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            action: "toggle_page",
            page_id: pageId,
            is_active: isActive,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to toggle page");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-integrations"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}
