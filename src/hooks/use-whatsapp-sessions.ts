import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";

export type WhatsAppProvider = "evolution" | "evolution_go";

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
  is_notification_session?: boolean;
  provider?: WhatsAppProvider;
  advanced_settings?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  last_connected_at?: string | null;
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
  only_leads_access: boolean;
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
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profile?.organization_id) return;

    // Supabase Realtime subscription to reflect webhook updates immediately
    const channel = supabase
      .channel('whatsapp_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_sessions',
          filter: `organization_id=eq.${profile.organization_id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions", profile?.organization_id] });
          queryClient.invalidateQueries({ queryKey: ["whatsapp-session"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.organization_id, queryClient]);

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
      
      // Map data to include display_name with fallback
      return (data || []).map(session => ({
        ...session,
        display_name: (session as any).display_name || null,
        last_connected_at: (session as any).last_connected_at || null,
        is_notification_session: (session as any).is_notification_session || false,
      })) as WhatsAppSession[];
    },
    enabled: !!profile?.organization_id,
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
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
      return {
        ...data,
        display_name: (data as any).display_name || null,
        last_connected_at: (data as any).last_connected_at || null,
      } as WhatsAppSession;
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
    mutationFn: async (
      input: string | { displayName: string; provider?: WhatsAppProvider },
    ) => {
      if (!profile?.organization_id || !profile?.id) {
        throw new Error("User not authenticated");
      }
      const displayName = typeof input === "string" ? input : input.displayName;
      const provider: WhatsAppProvider =
        typeof input === "string" ? "evolution" : input.provider || "evolution";

      // Generate unique instance name: {sanitized_name}_{org_prefix}_{random_suffix}
      const orgPrefix = profile.organization_id.substring(0, 5);
      const randomSuffix = Math.random().toString(36).substring(2, 5);
      const sanitizedName = displayName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 20);
      const uniqueInstanceName = `${sanitizedName}_${orgPrefix}_${randomSuffix}`;

      // Generate a unique token for evolution_go to identify the instance
      const token = provider === "evolution_go" ? Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) : null;

      // Create session row first
      const { data: session, error: dbError } = await supabase
        .from("whatsapp_sessions")
        .insert({
          organization_id: profile.organization_id,
          owner_user_id: profile.id,
          instance_name: uniqueInstanceName,
          display_name: displayName,
          status: "disconnected",
          provider,
          advanced_settings: { token },
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Provision instance on the chosen provider
      const proxyFn = provider === "evolution_go" ? "evolution-go-proxy" : "evolution-proxy";
      const webhookUrl = provider === "evolution_go"
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-go-webhook`
        : undefined;

      const body = provider === "evolution_go"
        ? {
            action: "instance.create",
            body: { name: uniqueInstanceName, token },
          }
        : { action: "createInstance", instanceName: uniqueInstanceName };

      const { data: result, error: fnError } = await supabase.functions.invoke(proxyFn, { body });

      if (fnError) {
        await supabase.from("whatsapp_sessions").delete().eq("id", session.id);
        throw fnError;
      }

      const failed = provider === "evolution_go" ? !result?.ok : !result?.success;
      if (failed) {
        await supabase.from("whatsapp_sessions").delete().eq("id", session.id);
        const msg =
          result?.error ||
          result?.data?.error?.message ||
          result?.data?.message ||
          result?.data?.error ||
          "Failed to create instance";
        throw new Error(msg);
      }

      // Persist instance_id (UUID) if returned by either provider
      const evoId: string | undefined =
        result?.data?.data?.id || 
        result?.data?.instance?.id || 
        result?.data?.id ||
        (result?.data as any)?.instance?.uuid;

      if (evoId) {
        await supabase
          .from("whatsapp_sessions")
          .update({ 
            instance_id: evoId,
            advanced_settings: { token }
          })
          .eq("id", session.id);
        (session as any).instance_id = evoId;
        (session as any).advanced_settings = { token };
      }

      // For evolution_go: trigger connect with webhook
      if (provider === "evolution_go") {
        await supabase.functions.invoke("evolution-go-proxy", {
          body: {
            action: "instance.connect",
            session_id: session.id,
            instance_id: evoId,
            token,
            body: {
              webhookUrl: `${webhookUrl}?session_id=${session.id}`,
              subscribe: ["ALL"],
              immediate: true
            },

          },
        });
      }



      return {
        session: {
          ...session,
          display_name: (session as any).display_name || displayName,
        } as WhatsAppSession,
        evolutionData: result.data,
      };
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
      // Try to delete from Evolution API first
      try {
        const isGo = session.provider === "evolution_go";
        const proxyFn = isGo ? "evolution-go-proxy" : "evolution-proxy";
        const action = isGo ? "instance.delete" : "deleteInstance";
        
        await supabase.functions.invoke(proxyFn, {
          body: {
            action,
            instanceName: session.instance_name,
            instance_id: session.instance_id,
          },
        });
      } catch (e) {
        console.warn("Evolution API delete failed (proceeding with DB delete):", e);
      }

      // Always delete from database
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
    mutationFn: async (
      arg: string | { provider: WhatsAppProvider; instanceName: string; sessionId?: string; instanceId?: string | null; instance_name?: string },

    ) => {
      // Legacy: string => evolution-proxy
      if (typeof arg === "string") {
        const { data, error } = await supabase.functions.invoke("evolution-proxy", {
          body: { action: "getQRCode", instanceName: arg },
        });
        if (error) throw error;
        if (!data.success) throw new Error(data.error || "Failed to get QR code");
        const qr = data.data?.qrcode || data.data?.base64 || data.data?.code;
        return { base64: qr, qrcode: qr };
      }

      if (arg.provider === "evolution_go") {
        const { data, error } = await supabase.functions.invoke("evolution-go-proxy", {
          body: { 
            action: "instance.qr", 
            session_id: arg.sessionId, 
            instance_id: arg.instanceId ?? undefined,
            instance_name: arg.instanceName || arg.instance_name
          },
        });
        
        if (data?.diagnosticResults) {
          console.log("QR Debug Evolution Go", data.diagnosticResults);
        }

        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || "Failed to get QR code");
        const qr = data?.data?.data?.qrcode ?? data?.data?.qrcode ?? data?.data?.Qrcode ?? null;
        return { base64: qr, qrcode: qr };
      }

      const { data, error } = await supabase.functions.invoke("evolution-proxy", {
        body: { action: "getQRCode", instanceName: arg.instanceName },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to get QR code");
      const qr = data.data?.qrcode || data.data?.base64 || data.data?.code;
      return { base64: qr, qrcode: qr };
    },
  });
}

export function useGetConnectionStatus() {
  return useMutation({
    mutationFn: async (
      arg: string | { provider: WhatsAppProvider; instanceName: string; sessionId?: string; instanceId?: string | null },
    ) => {
      if (typeof arg === "string") {
        const { data, error } = await supabase.functions.invoke("evolution-proxy", {
          body: { action: "getConnectionStatus", instanceName: arg },
        });
        if (error) throw error;
        if (!data.success) throw new Error(data.error || "Failed to get status");
        return data.data;
      }

      if (arg.provider === "evolution_go") {
        const { data, error } = await supabase.functions.invoke("evolution-go-proxy", {
          body: { action: "instance.status", session_id: arg.sessionId, instance_id: arg.instanceId ?? undefined },
        });

        // Never throw — front-end must not surface API errors as toast
        if (error) {
          console.log("[Status] invoke error (ignored):", error);
          return { connected: false, status: "unknown", state: "unknown", apiError: true };
        }
        if (!data?.ok) {
          console.log("[Status] API not OK (ignored):", data?.httpStatus, data?.error);
          return { connected: false, status: "unknown", state: "unknown", apiError: true };
        }

        const normalizedStatus = data?.normalizedStatus || "disconnected";
        const isConnected = data?.isConnected === true || normalizedStatus === "connected";
        const rawData = data?.data?.data ?? data?.data ?? {};

        return {
          connected: isConnected,
          status: normalizedStatus,
          state: isConnected ? "open" : (normalizedStatus === "qr_ready" ? "qr" : "close"),
          instance: { wuid: rawData.jid || rawData.Name || null },
        };
      }


      const { data, error } = await supabase.functions.invoke("evolution-proxy", {
        body: { action: "getConnectionStatus", instanceName: arg.instanceName },
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

export type WhatsAppAccessMode =
  | "assigned_leads_only"
  | "team_leads"
  | "all_leads"
  | "full_inbox";

export function useGrantSessionAccess() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      sessionId,
      userId,
      canView = true,
      canSend = true,
      accessMode = "assigned_leads_only",
    }: {
      sessionId: string;
      userId: string;
      canView?: boolean;
      canSend?: boolean;
      accessMode?: WhatsAppAccessMode;
    }) => {
      const { error } = await supabase.from("whatsapp_session_access").upsert(
        {
          session_id: sessionId,
          user_id: userId,
          can_view: canView,
          can_send: canSend,
          access_mode: accessMode,
          granted_by: profile?.id,
        } as any,
        { onConflict: "session_id,user_id" }
      );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-session-access", variables.sessionId] });
      toast({
        title: "Acesso atualizado",
        description: "Permissões salvas com sucesso",
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

export function useRecreateWhatsAppInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: WhatsAppSession) => {
      // Recreate instance in Evolution API with the same instance name
      const { data: result, error: fnError } = await supabase.functions.invoke(
        "evolution-proxy",
        {
          body: {
            action: "createInstance",
            instanceName: session.instance_name,
          },
        }
      );

      if (fnError) throw fnError;

      if (!result.success) {
        throw new Error(result.error || "Failed to recreate instance");
      }

      // Update database status to disconnected (ready to scan QR)
      await supabase
        .from("whatsapp_sessions")
        .update({ status: "disconnected" })
        .eq("id", session.id);

      return { session, evolutionData: result.data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
      toast({
        title: "Instância recriada",
        description: "Escaneie o QR Code para conectar",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao recriar instância",
        description: error.message,
        variant: "destructive",
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

      // Send system notification for disconnection
      try {
        const { notificationService } = await import('@/services/NotificationService');
        await notificationService.send({
          templateSlug: 'whatsapp_disconnected_system',
          organizationId: session.organization_id,
          userId: session.owner_user_id,
          variables: {
            display_name: session.display_name || session.instance_name
          }
        });
      } catch (err) {
        console.error('Disconnection notification failed:', err);
      }

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
  const [needsRecreate, setNeedsRecreate] = useState(false);
  const queryClient = useQueryClient();
  const getQRCode = useGetQRCode();
  const getStatus = useGetConnectionStatus();

  const startPolling = useCallback(async () => {
    if (!session || isPolling) return;
    
    setIsPolling(true);
    setNeedsRecreate(false);
    
    const pollQRCode = async () => {
      try {
        const provider = (session.provider || "evolution") as WhatsAppProvider;
        const arg = {
          provider,
          instanceName: session.instance_name,
          sessionId: session.id,
          instanceId: session.instance_id,
        };

        // Check connection status first
        const status = await getStatus.mutateAsync(arg);

        // Check if instance doesn't exist in Evolution API
        if (status?.instanceNotFound) {
          console.log("Instance not found in Evolution API, needs recreation");
          setConnectionStatus("instance_not_found");
          setNeedsRecreate(true);
          setIsPolling(false);
          return true; // Stop polling
        }

        const isConnected = status?.connected === true || status?.state === "open";

        if (isConnected) {
          setConnectionStatus("connected");
          setQrCode(null);
          setIsPolling(false);

          // Update database status
          await supabase
            .from("whatsapp_sessions")
            .update({
              status: "connected",
              phone_number: status?.instance?.wuid?.split("@")[0] || null,
              last_connected_at: new Date().toISOString()
            })
            .eq("id", session.id);

          queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
          return true;
        }

        // Get QR Code
        const qrData = await getQRCode.mutateAsync(arg);

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
    
    if (!connected && !needsRecreate) {
      // Continue polling every 3 seconds
      const interval = setInterval(async () => {
        const isConnected = await pollQRCode();
        if (isConnected || needsRecreate) {
          clearInterval(interval);
        }
      }, 3000);

      // Stop polling after 2 minutes
      setTimeout(() => {
        clearInterval(interval);
        setIsPolling(false);
      }, 120000);
    }
  }, [session, isPolling, getQRCode, getStatus, queryClient, needsRecreate]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
    setQrCode(null);
    setNeedsRecreate(false);
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
    needsRecreate,
  };
}

export function useToggleNotificationSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, enabled }: { sessionId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_sessions")
        .update({ is_notification_session: enabled } as any)
        .eq("id", sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
      toast({
        title: "Configuração atualizada",
        description: "Sessão de notificação alterada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
