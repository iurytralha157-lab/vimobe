import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  id: string;
  title: string;
  content: string | null;
  type: string;
  is_read: boolean | null;
  created_at: string;
  lead_id: string | null;
  user_id: string;
  organization_id: string;
}

export function useNotifications() {
  const { profile, organization } = useAuth();

  return useQuery({
    queryKey: ["notifications", profile?.id],
    queryFn: async () => {
      if (!profile?.id || !organization?.id) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!profile?.id && !!organization?.id,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("No user");

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", profile.id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
