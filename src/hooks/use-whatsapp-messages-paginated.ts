import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useCallback } from "react";
import type { WhatsAppMessage } from "./use-whatsapp-conversations";

interface PaginatedMessagesResult {
  messages: WhatsAppMessage[];
  nextCursor: string | null;
}

export function useWhatsAppMessagesPaginated(
  conversationId: string | null,
  options?: { pageSize?: number }
) {
  const queryClient = useQueryClient();
  const pageSize = options?.pageSize || 30;

  const query = useInfiniteQuery({
    queryKey: ["whatsapp-messages-paginated", conversationId],
    queryFn: async ({ pageParam }): Promise<PaginatedMessagesResult> => {
      if (!conversationId) {
        return { messages: [], nextCursor: null };
      }

      let queryBuilder = supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("sent_at", { ascending: false })
        .limit(pageSize);

      // If we have a cursor, fetch messages older than that timestamp
      if (pageParam) {
        queryBuilder = queryBuilder.lt("sent_at", pageParam);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      const messages = data || [];
      
      // Reverse to get chronological order for display
      const chronologicalMessages = [...messages].reverse();
      
      // Next cursor is the oldest message's sent_at if we got a full page
      const nextCursor = messages.length === pageSize ? messages[messages.length - 1]?.sent_at : null;

      return {
        messages: chronologicalMessages as WhatsAppMessage[],
        nextCursor,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
    enabled: !!conversationId,
  });

  // Subscribe to realtime updates with INCREMENTAL inserts
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-paginated-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as WhatsAppMessage;
          
          // Incremental insert - add to cache without full refetch
          queryClient.setQueryData(
            ["whatsapp-messages-paginated", conversationId],
            (old: any) => {
              if (!old?.pages?.[0]) return old;
              
              // Check if message already exists (by id or client_message_id)
              const allMessages = old.pages.flatMap((p: any) => p.messages);
              const newClientMsgId = (newMessage as any).client_message_id;
              const exists = allMessages.some((m: any) => 
                m.id === newMessage.id || 
                (m.client_message_id && newClientMsgId && m.client_message_id === newClientMsgId)
              );
              
              if (exists) {
                // Update existing message instead of adding
                return {
                  ...old,
                  pages: old.pages.map((page: any) => ({
                    ...page,
                    messages: page.messages.map((msg: any) =>
                      (msg.id === newMessage.id || 
                       (msg.client_message_id && newClientMsgId && msg.client_message_id === newClientMsgId))
                        ? { ...msg, ...newMessage }
                        : msg
                    ),
                  })),
                };
              }
              
              // Add new message to the first page (most recent)
              return {
                ...old,
                pages: [
                  {
                    ...old.pages[0],
                    messages: [...old.pages[0].messages, newMessage],
                  },
                  ...old.pages.slice(1),
                ],
              };
            }
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whatsapp_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as any;
          const updatedClientMsgId = updatedMessage.client_message_id;
          
          // Update message in cache (status, media_status, etc.)
          queryClient.setQueryData(
            ["whatsapp-messages-paginated", conversationId],
            (old: any) => {
              if (!old?.pages) return old;
              return {
                ...old,
                pages: old.pages.map((page: any) => ({
                  ...page,
                  messages: page.messages.map((msg: any) =>
                    msg.id === updatedMessage.id || 
                    (msg.client_message_id && updatedClientMsgId && msg.client_message_id === updatedClientMsgId)
                      ? { ...msg, ...updatedMessage }
                      : msg
                  ),
                })),
              };
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // Flatten all pages into a single messages array
  const allMessages = query.data?.pages.flatMap(page => page.messages) || [];

  // Retry media download for a specific message
  const retryMediaDownload = useCallback(async (messageId: string) => {
    try {
      // Create a media job for retry
      const message = allMessages.find(m => m.id === messageId);
      if (!message) return;

      // Call edge function to retry media download
      await supabase.functions.invoke("media-worker", {
        body: { message_id: messageId, force: true }
      });

      // Refetch to get updated status
      queryClient.invalidateQueries({ 
        queryKey: ["whatsapp-messages-paginated", conversationId] 
      });
    } catch (error) {
      console.error("Error retrying media download:", error);
    }
  }, [allMessages, conversationId, queryClient]);

  return {
    ...query,
    messages: allMessages,
    hasOlderMessages: query.hasNextPage,
    loadOlderMessages: query.fetchNextPage,
    isLoadingOlder: query.isFetchingNextPage,
    retryMediaDownload,
  };
}
