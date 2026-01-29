import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useAccessibleSessions } from "./use-accessible-sessions";

const POLL_INTERVAL = 30000; // 30 seconds
const ERROR_THRESHOLD = 2; // Notify after 2 consecutive failures

interface SessionHealthState {
  sessionId: string;
  instanceName: string;
  displayName: string;
  lastKnownStatus: string;
  consecutiveFailures: number;
  lastCheck: Date;
  notificationSent: boolean;
}

/**
 * Hook that monitors WhatsApp session health in the background.
 * - Polls connected sessions every 30 seconds
 * - Detects disconnections and notifies users
 * - Creates notifications in the database for admins and session owners
 */
export function useWhatsAppHealthMonitor() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: sessions } = useAccessibleSessions();
  
  const healthStatesRef = useRef<Map<string, SessionHealthState>>(new Map());
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  // Check a single session's connection status
  const checkSessionHealth = useCallback(async (
    sessionId: string, 
    instanceName: string, 
    displayName: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("evolution-proxy", {
        body: {
          action: "getConnectionStatus",
          instanceName,
        },
      });

      if (error) {
        console.error(`Health check error for ${displayName}:`, error);
        return false;
      }

      const isConnected = data?.success && (
        data.data?.connected === true || 
        data.data?.state === "open" ||
        data.data?.status === true
      );

      return isConnected;
    } catch (err) {
      console.error(`Health check exception for ${displayName}:`, err);
      return false;
    }
  }, []);

  // Create disconnection notification
  const createDisconnectionNotification = useCallback(async (
    sessionName: string,
    ownerId: string,
    organizationId: string
  ) => {
    try {
      // Create notification for the session owner
      await supabase.from("notifications").insert({
        user_id: ownerId,
        organization_id: organizationId,
        title: "⚠️ WhatsApp Desconectado!",
        content: `A sessão "${sessionName}" perdeu a conexão. Verifique e reconecte o WhatsApp.`,
        type: "warning",
        is_read: false,
      });

      // Also notify admins
      const { data: admins } = await supabase
        .from("users")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("role", "admin")
        .neq("id", ownerId); // Don't duplicate for owner if also admin

      if (admins && admins.length > 0) {
        const adminNotifications = admins.map(admin => ({
          user_id: admin.id,
          organization_id: organizationId,
          title: "⚠️ WhatsApp Desconectado!",
          content: `A sessão "${sessionName}" perdeu a conexão. O responsável foi notificado.`,
          type: "warning",
          is_read: false,
        }));

        await supabase.from("notifications").insert(adminNotifications);
      }

    } catch (err) {
      console.error("Failed to create disconnection notification:", err);
    }
  }, []);

  // Main polling function
  const pollSessions = useCallback(async () => {
    if (!profile?.id || !sessions || sessions.length === 0 || isPollingRef.current) {
      return;
    }

    isPollingRef.current = true;
    const connectedSessions = sessions.filter(s => s.status === "connected");

    for (const session of connectedSessions) {
      const state = healthStatesRef.current.get(session.id) || {
        sessionId: session.id,
        instanceName: session.instance_name,
        displayName: session.display_name || session.instance_name,
        lastKnownStatus: session.status,
        consecutiveFailures: 0,
        lastCheck: new Date(),
        notificationSent: false,
      };

      const isConnected = await checkSessionHealth(
        session.id,
        session.instance_name,
        state.displayName
      );

      if (isConnected) {
        // Reset failures on successful check
        state.consecutiveFailures = 0;
        state.notificationSent = false;
        state.lastKnownStatus = "connected";
      } else {
        // Increment failure count
        state.consecutiveFailures++;
        console.warn(
          `📡 Session "${state.displayName}" failed health check (${state.consecutiveFailures}/${ERROR_THRESHOLD})`
        );

        // Only notify after threshold and if not already notified
        if (state.consecutiveFailures >= ERROR_THRESHOLD && !state.notificationSent) {
          console.error(`🔴 Session "${state.displayName}" is disconnected!`);
          
          // Show toast immediately
          toast.error("WhatsApp Desconectado!", {
            description: `A sessão "${state.displayName}" perdeu a conexão. Reconecte agora.`,
            duration: 15000,
            action: {
              label: "Ver",
              onClick: () => window.location.href = "/configuracoes/whatsapp",
            },
          });

          // Create database notification
          await createDisconnectionNotification(
            state.displayName,
            session.owner_user_id,
            session.organization_id
          );

          // Update database status
          await supabase
            .from("whatsapp_sessions")
            .update({ status: "disconnected" })
            .eq("id", session.id);

          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
          queryClient.invalidateQueries({ queryKey: ["accessible-sessions"] });

          state.notificationSent = true;
          state.lastKnownStatus = "disconnected";
        }
      }

      state.lastCheck = new Date();
      healthStatesRef.current.set(session.id, state);
    }

    isPollingRef.current = false;
  }, [profile?.id, sessions, checkSessionHealth, createDisconnectionNotification, queryClient]);

  // Manual trigger for immediate check
  const checkNow = useCallback(async () => {
    if (!sessions || sessions.length === 0) {
      toast.info("Nenhuma sessão WhatsApp configurada");
      return;
    }

    toast.promise(
      (async () => {
        const connectedSessions = sessions.filter(s => s.status === "connected");
        if (connectedSessions.length === 0) {
          throw new Error("Nenhuma sessão conectada");
        }

        let allHealthy = true;
        for (const session of connectedSessions) {
          const displayName = session.display_name || session.instance_name;
          const isConnected = await checkSessionHealth(
            session.id,
            session.instance_name,
            displayName
          );

          if (!isConnected) {
            allHealthy = false;
            // Update state immediately
            const state = healthStatesRef.current.get(session.id);
            if (state) {
              state.consecutiveFailures++;
            }
          }
        }

        if (!allHealthy) {
          throw new Error("Algumas sessões estão desconectadas");
        }

        return "Todas as sessões estão conectadas";
      })(),
      {
        loading: "Verificando conexões...",
        success: (msg) => msg,
        error: (err) => err.message,
      }
    );
  }, [sessions, checkSessionHealth]);

  // Start polling on mount
  useEffect(() => {
    if (!profile?.id || !sessions) return;

    // Initial check after 5 seconds
    const initialTimeout = setTimeout(() => {
      pollSessions();
    }, 5000);

    // Start interval polling
    pollIntervalRef.current = setInterval(pollSessions, POLL_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [profile?.id, sessions, pollSessions]);

  // Subscribe to realtime session status changes
  useEffect(() => {
    if (!profile?.organization_id) return;

    const channel = supabase
      .channel("whatsapp-sessions-health")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whatsapp_sessions",
        },
        (payload) => {
          const updated = payload.new as any;
          const old = payload.old as any;

          // If status changed from connected to disconnected externally
          if (old.status === "connected" && updated.status === "disconnected") {
            const displayName = updated.display_name || updated.instance_name;
            
            // Update our local state
            const state = healthStatesRef.current.get(updated.id);
            if (state && !state.notificationSent) {
              toast.warning("WhatsApp Desconectado!", {
                description: `A sessão "${displayName}" foi desconectada.`,
                duration: 10000,
              });
              state.notificationSent = true;
              state.lastKnownStatus = "disconnected";
            }

            queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
            queryClient.invalidateQueries({ queryKey: ["accessible-sessions"] });
          }

          // If status changed from disconnected to connected
          if (old.status === "disconnected" && updated.status === "connected") {
            const displayName = updated.display_name || updated.instance_name;
            
            // Reset our local state
            const state = healthStatesRef.current.get(updated.id);
            if (state) {
              state.consecutiveFailures = 0;
              state.notificationSent = false;
              state.lastKnownStatus = "connected";
            }

            toast.success("WhatsApp Reconectado!", {
              description: `A sessão "${displayName}" está conectada novamente.`,
              duration: 5000,
            });

            queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
            queryClient.invalidateQueries({ queryKey: ["accessible-sessions"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.organization_id, queryClient]);

  return {
    checkNow,
    isPolling: isPollingRef.current,
  };
}
