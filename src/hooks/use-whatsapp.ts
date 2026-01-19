import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WhatsAppConversation {
  id: string;
  session_id: string;
  remote_jid: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_picture: string | null;
  contact_presence: string | null;
  presence_updated_at: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_group: boolean;
  lead_id: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  message_id: string;
  from_me: boolean | null;
  content: string | null;
  message_type: string | null;
  media_url: string | null;
  sent_at: string | null;
  status: string | null;
}

export function useWhatsAppConversations() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["whatsapp-conversations", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      const { data: sessions } = await supabase
        .from("whatsapp_sessions")
        .select("id")
        .eq("organization_id", profile.organization_id);

      if (!sessions?.length) return [];

      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select("*")
        .in("session_id", sessions.map((s) => s.id))
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      return data as WhatsAppConversation[];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useWhatsAppMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["whatsapp-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("sent_at", { ascending: true });

      if (error) throw error;
      return data as WhatsAppMessage[];
    },
    enabled: !!conversationId,
  });
}

export function useSendWhatsAppMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      // Get session_id from conversation
      const { data: conv } = await supabase
        .from("whatsapp_conversations")
        .select("session_id")
        .eq("id", conversationId)
        .single();

      if (!conv) throw new Error("Conversation not found");

      const { data, error } = await supabase
        .from("whatsapp_messages")
        .insert({
          conversation_id: conversationId,
          session_id: conv.session_id,
          message_id: `msg_${Date.now()}`,
          from_me: true,
          content,
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("whatsapp_conversations")
        .update({ last_message: content, last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
    },
  });
}
