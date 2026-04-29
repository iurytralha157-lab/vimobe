import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  type: string;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
  lead_id?: string;
}

export function useNotifications() {
  const { user, organization } = useAuth();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id, organization?.id],
    queryFn: async () => {
      if (!user?.id || !organization?.id) return [];
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id && !!organization?.id,
  });

  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.is_read).length);
  }, [notifications]);

  const playNotificationSound = useCallback(() => {
    const audio = new Audio("/sounds/notification.mp3");
    audio.play().catch((err) => console.log("Sound play error:", err));
  }, []);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user?.id || !organization?.id) return;

    const channel = supabase
      .channel("public:notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          if (newNotification.organization_id === organization.id) {
            queryClient.setQueryData(
              ["notifications", user.id, organization.id],
              (old: Notification[] = []) => [newNotification, ...old]
            );
            playNotificationSound();
            
            toast({
              title: newNotification.title,
              description: newNotification.content,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, organization?.id, queryClient, playNotificationSound]);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id || !organization?.id) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("organization_id", organization.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
