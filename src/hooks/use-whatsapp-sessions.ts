import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";

export interface WhatsAppSession {
  id: string;
  organization_id: string;
  owner_user_id: string;
  instance_name: string;
  display_name: string | null;
  instance_id: string | null;
  status: string;
  phone_number: string | null;
  profile_name: string | null;
  profile_picture: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface WhatsAppSessionAccess {
  id: string;
  session_id: string;
  user_id: string;
  can_view: boolean;
  can_send: boolean;
  granted_by: string | null;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export function useWhatsAppSessions() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["whatsapp-sessions", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .select(`
          *,
          owner:users!whatsapp_sessions_owner_user_id_fkey(id, name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WhatsAppSession[];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useWhatsAppSession(sessionId: string | null) {
  return useQuery({
    queryKey: ["whatsapp-session", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;

      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .select(`
          *,
          owner:users!whatsapp_sessions_owner_user_id_fkey(id, name, email)
        `)
        .eq("id", sessionId)
        .single();

      if (error) throw error;
      return data as WhatsAppSession;
    },
    enabled: !!sessionId,
  });
}

export function useSessionAccess(sessionId: string | null) {
  return useQuery({
    queryKey: ["whatsapp-session-access", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from("whatsapp_session_access")
        .select(`
          *,
          user:users!whatsapp_session_access_user_id_fkey(id, name, email)
        `)
        .eq("session_id", sessionId);

      if (error) throw error;
      return data as WhatsAppSessionAccess[];
    },
    enabled: !!sessionId,
  });
}

export function useCreateWhatsAppSession() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (displayName: string) => {
      if (!profile?.organization_id || !profile?.id) {
        throw new Error("User not authenticated");
      }

      // Generate unique instance name: {sanitized_name}_{org_prefix}_{random_suffix}
      const orgPrefix = profile.organization_id.substring(0, 5);
      const randomSuffix = Math.random().toString(36).substring(2, 5);
      const sanitizedName = displayName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 20);
      const uniqueInstanceName = `${sanitizedName}_${orgPrefix}_${randomSuffix}`;

      // Create session in database with unique instance_name and friendly display_name
      const { data: session, error: dbError } = await supabase
        .from("whatsapp_sessions")
        .insert({
          organization_id: profile.organization_id,
          owner_user_id: profile.id,
          instance_name: uniqueInstanceName,
          display_name: displayName,
          status: "disconnected",
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Create instance in Evolution API with unique instance name
      const { data: result, error: fnError } = await supabase.functions.invoke(
        "evolution-proxy",
        {
          body: {
            action: "createInstance",
            instanceName: uniqueInstanceName,
          },
        }
      );

      if (fnError) {
        // Rollback database insert
        await supabase.from("whatsapp_sessions").delete().eq("id", session.id);
        throw fnError;
      }

      if (!result.success) {
        // Rollback database insert
        await supabase.from("whatsapp_sessions").delete().eq("id", session.id);
        throw new Error(result.error || "Failed to create instance");
      }

      return { session, evolutionData: result.data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
      toast({
        title: "Sessão criada",
        description: "Escaneie o QR Code para conectar",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar sessão",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteWhatsAppSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: WhatsAppSession) => {
      // Delete from Evolution API first
      await supabase.functions.invoke("evolution-proxy", {
        body: {
          action: "deleteInstance",
          instanceName: session.instance_name,
        },
      });

      // Delete from database
      const { error } = await supabase
        .from("whatsapp_sessions")
        .delete()
        .eq("id", session.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
      toast({
        title: "Sessão excluída",
        description: "A conexão WhatsApp foi removida",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir sessão",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useGetQRCode() {
  return useMutation({
    mutationFn: async (instanceName: string) => {
      const { data, error } = await supabase.functions.invoke("evolution-proxy", {
        body: {
          action: "getQRCode",
          instanceName,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to get QR code");

      return data.data;
    },
  });
}

export function useGetConnectionStatus() {
  return useMutation({
    mutationFn: async (instanceName: string) => {
      const { data, error } = await supabase.functions.invoke("evolution-proxy", {
        body: {
          action: "getConnectionStatus",
          instanceName,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to get status");

      return data.data;
    },
  });
}

export function useSetWebhook() {
  return useMutation({
    mutationFn: async ({ instanceName, webhookUrl }: { instanceName: string; webhookUrl: string }) => {
      const { data, error } = await supabase.functions.invoke("evolution-proxy", {
        body: {
          action: "setWebhook",
          instanceName,
          webhookUrl,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to set webhook");

      return data.data;
    },
  });
}

export function useGrantSessionAccess() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      sessionId,
      userId,
      canView = true,
      canSend = true,
    }: {
      sessionId: string;
      userId: string;
      canView?: boolean;
      canSend?: boolean;
    }) => {
      const { error } = await supabase.from("whatsapp_session_access").upsert(
        {
          session_id: sessionId,
          user_id: userId,
          can_view: canView,
          can_send: canSend,
          granted_by: profile?.id,
        },
        { onConflict: "session_id,user_id" }
      );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-session-access", variables.sessionId] });
      toast({
        title: "Acesso concedido",
        description: "O usuário agora tem acesso à sessão",
      });
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-session-access", variables.sessionId] });
      toast({
        title: "Acesso revogado",
        description: "O usuário não tem mais acesso à sessão",
      });
    },
  });
}

export function useLogoutSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: WhatsAppSession) => {
      const { data, error } = await supabase.functions.invoke("evolution-proxy", {
        body: {
          action: "logoutInstance",
          instanceName: session.instance_name,
        },
      });

      if (error) throw error;

      // Update status in database
      await supabase
        .from("whatsapp_sessions")
        .update({ status: "disconnected" })
        .eq("id", session.id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
      toast({
        title: "Desconectado",
        description: "A sessão foi desconectada",
      });
    },
  });
}

// Hook for QR Code polling until connected
export function useQRCodePolling(session: WhatsAppSession | null) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected");
  const queryClient = useQueryClient();
  const getQRCode = useGetQRCode();
  const getStatus = useGetConnectionStatus();

  const startPolling = useCallback(async () => {
    if (!session || isPolling) return;
    
    setIsPolling(true);
    
    const pollQRCode = async () => {
      try {
        // Check connection status first
        const status = await getStatus.mutateAsync(session.instance_name);
        const isConnected = status?.connected === true || status?.state === "open";
        
        if (isConnected) {
          setConnectionStatus("connected");
          setQrCode(null);
          setIsPolling(false);
          
          // Update database status
          await supabase
            .from("whatsapp_sessions")
            .update({ status: "connected" })
            .eq("id", session.id);
          
          queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
          return true;
        }
        
        // Get QR Code
        const qrData = await getQRCode.mutateAsync(session.instance_name);
        
        if (qrData?.qrcode) {
          setQrCode(qrData.qrcode);
          setConnectionStatus("waiting_qr");
        } else if (qrData?.base64) {
          setQrCode(qrData.base64);
          setConnectionStatus("waiting_qr");
        }
        
        return false;
      } catch (error) {
        console.error("Polling error:", error);
        return false;
      }
    };

    // Initial poll
    const connected = await pollQRCode();
    
    if (!connected) {
      // Continue polling every 3 seconds
      const interval = setInterval(async () => {
        const isConnected = await pollQRCode();
        if (isConnected) {
          clearInterval(interval);
        }
      }, 3000);

      // Stop polling after 2 minutes
      setTimeout(() => {
        clearInterval(interval);
        setIsPolling(false);
      }, 120000);
    }
  }, [session, isPolling, getQRCode, getStatus, queryClient]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
    setQrCode(null);
  }, []);

  useEffect(() => {
    return () => {
      setIsPolling(false);
    };
  }, []);

  return {
    qrCode,
    isPolling,
    connectionStatus,
    startPolling,
    stopPolling,
  };
}
