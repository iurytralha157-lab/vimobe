import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface WhatsAppSession {
  id: string;
  instance_name: string;
  instance_id: string | null;
  status: "connecting" | "connected" | "disconnected";
  phone_number: string | null;
  profile_name: string | null;
  profile_picture: string | null;
  display_name?: string;
  organization_id: string;
  owner_user_id: string;
  owner?: { name: string };
  is_active: boolean;
  created_at: string;
}

export function useWhatsAppSessions() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["whatsapp-sessions", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .select(`
          *,
          owner:users!whatsapp_sessions_owner_user_id_fkey(name)
        `)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WhatsAppSession[];
    },
    enabled: !!organization?.id,
  });
}

export function useCreateWhatsAppSession() {
  const { organization, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instanceName: string) => {
      if (!organization?.id || !profile?.id) throw new Error("Organization required");

      // Create session in database
      const { data: session, error } = await supabase
        .from("whatsapp_sessions")
        .insert({
          organization_id: organization.id,
          owner_user_id: profile.id,
          instance_name: instanceName,
          status: "connecting",
        })
        .select()
        .single();

      if (error) throw error;

      // Call Evolution API to create instance
      const { error: apiError } = await supabase.functions.invoke("evolution-proxy", {
        body: { action: "createInstance", instanceName },
      });

      if (apiError) {
        // Rollback: delete the session if API fails
        await supabase.from("whatsapp_sessions").delete().eq("id", session.id);
        throw apiError;
      }

      return { session };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
      toast({ title: "Instância criada", description: "Escaneie o QR Code para conectar" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteWhatsAppSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: WhatsAppSession) => {
      // Delete from Evolution API
      await supabase.functions.invoke("evolution-proxy", {
        body: { action: "deleteInstance", instanceName: session.instance_name },
      });

      // Delete from database
      const { error } = await supabase.from("whatsapp_sessions").delete().eq("id", session.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
      toast({ title: "Conexão excluída" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useGetQRCode() {
  return useMutation({
    mutationFn: async (instanceName: string) => {
      const { data, error } = await supabase.functions.invoke("evolution-proxy", {
        body: { action: "getQRCode", instanceName },
      });

      if (error) throw error;
      return data?.data || data;
    },
  });
}

export function useGetConnectionStatus() {
  return useMutation({
    mutationFn: async (instanceName: string) => {
      const { data, error } = await supabase.functions.invoke("evolution-proxy", {
        body: { action: "getConnectionStatus", instanceName },
      });

      if (error) throw error;
      return data?.data || data;
    },
  });
}

export function useLogoutSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: WhatsAppSession) => {
      await supabase.functions.invoke("evolution-proxy", {
        body: { action: "logout", instanceName: session.instance_name },
      });

      await supabase
        .from("whatsapp_sessions")
        .update({ status: "disconnected" })
        .eq("id", session.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
      toast({ title: "Desconectado" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useSessionAccess(sessionId: string | null) {
  return useQuery({
    queryKey: ["whatsapp-session-access", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from("whatsapp_session_access")
        .select("*")
        .eq("session_id", sessionId);

      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useGrantSessionAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, userId }: { sessionId: string; userId: string }) => {
      const { error } = await supabase
        .from("whatsapp_session_access")
        .insert({ session_id: sessionId, user_id: userId });

      if (error) throw error;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-session-access", sessionId] });
    },
  });
}

export function useRevokeSessionAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, userId }: { sessionId: string; userId: string }) => {
      const { error } = await supabase
        .from("whatsapp_session_access")
        .delete()
        .eq("session_id", sessionId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-session-access", sessionId] });
    },
  });
}
