import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeadMessage {
  id: string;
  content: string | null;
  from_me: boolean;
  message_type: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  media_status: string | null;
  sent_at: string;
  status: string | null;
  sender_name: string | null;
  sender_jid: string | null;
  conversation_id: string;
  session_id: string;
  // Joined data
  session_owner_name?: string | null;
  session_instance_name?: string | null;
}

export function useLeadMessages(leadId: string | null | undefined) {
  return useQuery({
    queryKey: ['lead-messages', leadId],
    queryFn: async (): Promise<LeadMessage[]> => {
      if (!leadId) return [];

      // 1. Get all conversations linked to this lead
      const { data: conversations, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select('id, session_id')
        .eq('lead_id', leadId)
        .is('deleted_at', null);

      if (convError) throw convError;
      if (!conversations || conversations.length === 0) return [];

      const conversationIds = conversations.map(c => c.id);
      const sessionIds = [...new Set(conversations.map(c => c.session_id))];

      // 2. Get all messages from these conversations + session owners in parallel
      const [messagesResult, sessionsResult] = await Promise.all([
        supabase
          .from('whatsapp_messages')
          .select('id, content, from_me, message_type, media_url, media_mime_type, media_status, sent_at, status, sender_name, sender_jid, conversation_id, session_id')
          .in('conversation_id', conversationIds)
          .order('sent_at', { ascending: true })
          .limit(500),
        supabase
          .from('whatsapp_sessions')
          .select('id, instance_name, owner_user_id')
          .in('id', sessionIds),
      ]);

      if (messagesResult.error) throw messagesResult.error;

      // 3. Get owner names
      const ownerIds = [...new Set(
        (sessionsResult.data || [])
          .map(s => s.owner_user_id)
          .filter(Boolean)
      )];

      let ownerMap: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from('users')
          .select('id, name')
          .in('id', ownerIds);
        
        if (owners) {
          ownerMap = Object.fromEntries(owners.map(o => [o.id, o.name]));
        }
      }

      // 4. Build session lookup
      const sessionMap = Object.fromEntries(
        (sessionsResult.data || []).map(s => [s.id, s])
      );

      // 5. Enrich messages with owner info
      return (messagesResult.data || []).map(msg => {
        const session = sessionMap[msg.session_id];
        return {
          ...msg,
          session_owner_name: session?.owner_user_id ? (ownerMap[session.owner_user_id] || null) : null,
          session_instance_name: session?.instance_name || null,
        };
      });
    },
    enabled: !!leadId,
    staleTime: 30_000,
  });
}
