import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Unified WhatsApp Realtime Bus.
 *
 * Replaces multiple per-conversation / global channels with a SINGLE channel
 * per organization that fans-out incoming events to every relevant React Query
 * cache key:
 *   - ["whatsapp-conversations", ...]           (list page + floating chat)
 *   - ["whatsapp-messages-paginated", convId]   (active chat)
 *   - ["whatsapp-messages", convId]             (legacy hook, fallback invalidate)
 *   - ["lead-messages", leadId]                 (lead history tab)
 *
 * Mount once at AppLayout level (inside FloatingChatProvider).
 */
export function WhatsAppRealtimeBus() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!profile?.organization_id) return;

    const orgId = profile.organization_id;

    const debouncedInvalidateConversations = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
        debounceRef.current = null;
      }, 800);
    };

    // Sound is handled by use-notifications via the notifications table.
    // Bus must NOT play sound — it would duplicate / fire on every echoed
    // outgoing message coming back from the webhook.

    const updateLegacyCache = (
      conversationId: string,
      mutator: (msgs: any[]) => any[],
    ) => {
      queryClient.setQueriesData(
        {
          predicate: (q) =>
            Array.isArray(q.queryKey) &&
            q.queryKey[0] === "whatsapp-messages" &&
            q.queryKey[1] === conversationId,
        },
        (old: any) => (Array.isArray(old) ? mutator(old) : old),
      );
    };

    const upsertInPaginated = (conversationId: string, msg: any) => {
      const key = ["whatsapp-messages-paginated", conversationId];
      queryClient.setQueryData(key, (old: any) => {
        if (!old?.pages?.[0]) return old;
        const newCid = msg.client_message_id;
        const flat = old.pages.flatMap((p: any) => p.messages);
        const exists = flat.some(
          (m: any) =>
            m.id === msg.id ||
            (m.client_message_id && newCid && m.client_message_id === newCid),
        );
        if (exists) {
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              messages: page.messages.map((m: any) =>
                m.id === msg.id ||
                (m.client_message_id && newCid && m.client_message_id === newCid)
                  ? { ...m, ...msg }
                  : m,
              ),
            })),
          };
        }
        return {
          ...old,
          pages: [
            { ...old.pages[0], messages: [...old.pages[0].messages, msg] },
            ...old.pages.slice(1),
          ],
        };
      });
    };

    const updateInPaginated = (conversationId: string, msg: any) => {
      const key = ["whatsapp-messages-paginated", conversationId];
      queryClient.setQueryData(key, (old: any) => {
        if (!old?.pages) return old;
        const cid = msg.client_message_id;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: any) =>
              m.id === msg.id ||
              (m.client_message_id && cid && m.client_message_id === cid)
                ? { ...m, ...msg }
                : m,
            ),
          })),
        };
      });
    };

    const channel = supabase
      .channel(`whatsapp-bus-${orgId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_messages" },
        async (payload) => {
          const msg = payload.new as any;
          if (!msg?.conversation_id) return;

          // Fan-out: paginated cache for the active conversation
          upsertInPaginated(msg.conversation_id, msg);

          // Conversations list updates (last_message, unread_count via DB trigger)
          debouncedInvalidateConversations();

          // Lead messages cache — invalidate by conversation->lead lookup
          // (lookup is cheap because the conversation row is cached after first load)
          const conv = queryClient
            .getQueriesData({ queryKey: ["whatsapp-conversations"] })
            .flatMap(([, data]) => (Array.isArray(data) ? data : []))
            .find((c: any) => c?.id === msg.conversation_id);
          if (conv?.lead_id) {
            queryClient.invalidateQueries({
              queryKey: ["lead-messages", conv.lead_id],
            });
          }

          // Play notification sound only for incoming messages
          if (!msg.from_me) playSound();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "whatsapp_messages" },
        (payload) => {
          const msg = payload.new as any;
          if (!msg?.conversation_id) return;
          updateInPaginated(msg.conversation_id, msg);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_conversations" },
        () => {
          debouncedInvalidateConversations();
        },
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [profile?.organization_id, queryClient]);

  return null;
}
