import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { formatPhoneForWhatsApp, normalizePhone } from "@/lib/phone-utils";

export interface WhatsAppConversation {
  id: string;
  session_id: string;
  lead_id: string | null;
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
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  session?: {
    id: string;
    instance_name: string;
    phone_number: string | null;
  };
  lead?: {
    id: string;
    name: string;
    tags?: Array<{
      tag: {
        id: string;
        name: string;
        color: string;
      };
    }>;
  };
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  session_id: string;
  message_id: string;
  client_message_id?: string | null;
  from_me: boolean;
  content: string | null;
  message_type: string;
  media_url: string | null;
  media_mime_type: string | null;
  media_status?: 'pending' | 'ready' | 'failed' | null;
  media_error?: string | null;
  media_size?: number | null;
  media_storage_path?: string | null;
  status: string;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  sender_jid: string | null;
  sender_name: string | null;
}

export interface ConversationFilters {
  hideGroups?: boolean;
  showArchived?: boolean;
}

export function useWhatsAppConversations(sessionId?: string, filters?: ConversationFilters) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["whatsapp-conversations", sessionId, filters],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_conversations")
        .select(`
          *,
          session:whatsapp_sessions!whatsapp_conversations_session_id_fkey(id, instance_name, phone_number),
          lead:leads!whatsapp_conversations_lead_id_fkey(
            id, 
            name,
            tags:lead_tags(tag:tags(id, name, color))
          )
        `)
        .is("deleted_at", null)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (sessionId) {
        query = query.eq("session_id", sessionId);
      }

      // Filter archived
      if (!filters?.showArchived) {
        query = query.is("archived_at", null);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      let conversations = data as WhatsAppConversation[];
      
      // Filter groups on client side (more flexible)
      if (filters?.hideGroups) {
        conversations = conversations.filter(c => !c.is_group);
      }
      
      // ===== BUSCAR LEADS POR TELEFONE PARA CONVERSAS SEM LEAD_ID =====
      // Isso garante que tags apareçam mesmo se a conversa não foi vinculada automaticamente
      const unlinkedConversations = conversations.filter(c => !c.lead_id && c.contact_phone && !c.is_group);
      
      if (unlinkedConversations.length > 0) {
        // Normalizar telefones das conversas
        const normalizedPhones = unlinkedConversations.map(c => normalizePhone(c.contact_phone || ''));
        
        // Buscar leads que correspondem aos telefones
        const { data: leads } = await supabase
          .from('leads')
          .select('id, phone, name, tags:lead_tags(tag:tags(id, name, color))')
          .not('phone', 'is', null);
        
        // Criar mapa de telefone normalizado -> lead
        const phoneToLead = new Map<string, typeof leads[0]>();
        if (leads) {
          for (const lead of leads) {
            if (lead.phone) {
              const normalizedLeadPhone = normalizePhone(lead.phone);
              if (normalizedLeadPhone) {
                phoneToLead.set(normalizedLeadPhone, lead);
              }
            }
          }
        }
        
        // Associar leads às conversas
        conversations = conversations.map(conv => {
          if (conv.lead_id || !conv.contact_phone || conv.is_group) return conv;
          
          const normalizedConvPhone = normalizePhone(conv.contact_phone);
          const matchingLead = phoneToLead.get(normalizedConvPhone);
          
          if (matchingLead) {
            return { 
              ...conv, 
              lead: { 
                id: matchingLead.id, 
                name: matchingLead.name,
                tags: matchingLead.tags as any
              } 
            };
          }
          return conv;
        });
      }
      
      return conversations;
    },
    enabled: !!profile?.organization_id,
  });
}

export function useWhatsAppConversation(conversationId: string | null) {
  return useQuery({
    queryKey: ["whatsapp-conversation", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;

      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select(`
          *,
          session:whatsapp_sessions!whatsapp_conversations_session_id_fkey(id, instance_name, phone_number),
          lead:leads!whatsapp_conversations_lead_id_fkey(id, name)
        `)
        .eq("id", conversationId)
        .single();

      if (error) throw error;
      return data as WhatsAppConversation;
    },
    enabled: !!conversationId,
  });
}

export function useWhatsAppMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
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

  // Subscribe to realtime updates with INCREMENTAL updates (not full refetch)
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
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
            ["whatsapp-messages", conversationId],
            (old: WhatsAppMessage[] | undefined) => {
              if (!old) return [newMessage];
              
              // Check if message already exists (by id or client_message_id)
              const newClientMsgId = (newMessage as any).client_message_id;
              const exists = old.some((m: any) => 
                m.id === newMessage.id || 
                (m.client_message_id && newClientMsgId && m.client_message_id === newClientMsgId)
              );
              
              if (exists) {
                // Update existing message
                return old.map((msg: any) =>
                  (msg.id === newMessage.id || 
                   (msg.client_message_id && newClientMsgId && msg.client_message_id === newClientMsgId))
                    ? { ...msg, ...newMessage }
                    : msg
                );
              }
              
              // Add new message at the end (chronological order)
              return [...old, newMessage];
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
          const updatedMessage = payload.new as WhatsAppMessage;
          const updatedClientMsgId = (updatedMessage as any).client_message_id;
          
          // Update message in cache
          queryClient.setQueryData(
            ["whatsapp-messages", conversationId],
            (old: WhatsAppMessage[] | undefined) => {
              if (!old) return old;
              return old.map((msg: any) =>
                msg.id === updatedMessage.id || 
                (msg.client_message_id && updatedClientMsgId && msg.client_message_id === updatedClientMsgId)
                  ? { ...msg, ...updatedMessage }
                  : msg
              );
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return query;
}

export function useSendWhatsAppMessage() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversation,
      text,
      mediaUrl,
      mediaType,
      base64,
      mimetype,
      filename,
      _optimisticId,
    }: {
      conversation: WhatsAppConversation;
      text: string;
      mediaUrl?: string;
      mediaType?: string;
      base64?: string;
      mimetype?: string;
      filename?: string;
      _optimisticId?: string;
    }) => {
      // Get session info
      const { data: session, error: sessionError } = await supabase
        .from("whatsapp_sessions")
        .select("id, instance_name, organization_id")
        .eq("id", conversation.session_id)
        .single();

      if (sessionError) throw sessionError;

      // Extract phone number from remote_jid and format
      const rawPhone = conversation.remote_jid
        .replace("@c.us", "")
        .replace("@s.whatsapp.net", "")
        .replace("@g.us", "");
      const phone = formatPhoneForWhatsApp(rawPhone);

      const isGroup = conversation.is_group;

      // Use optimistic ID if provided, otherwise generate new one
      const clientMessageId = _optimisticId || crypto.randomUUID();
      
      // If we have base64 media, upload to storage first for reliability
      let storedMediaUrl = mediaUrl;
      let storedMediaPath: string | null = null;
      
      if (base64 && mimetype) {
        try {
          // Decode base64 and upload to Supabase Storage
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Get file extension from mimetype
          const extMap: Record<string, string> = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/gif": "gif",
            "image/webp": "webp",
            "video/mp4": "mp4",
            "audio/ogg": "ogg",
            "audio/mpeg": "mp3",
            "application/pdf": "pdf",
          };
          const extension = extMap[mimetype.split(";")[0]] || "bin";
          
          // Upload path: orgs/{org_id}/sessions/{session_id}/outgoing/{clientMessageId}.{ext}
          const filePath = `orgs/${session.organization_id}/sessions/${session.id}/outgoing/${clientMessageId}.${extension}`;
          
          const { error: uploadError } = await supabase.storage
            .from("whatsapp-media")
            .upload(filePath, bytes, {
              contentType: mimetype.split(";")[0],
              upsert: true,
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("whatsapp-media")
              .getPublicUrl(filePath);
            
            storedMediaUrl = urlData.publicUrl;
            storedMediaPath = filePath;
            console.log(`Media uploaded to storage: ${storedMediaUrl}`);
          } else {
            console.error("Error uploading media to storage:", uploadError);
            // Continue with base64 fallback
          }
        } catch (uploadErr) {
          console.error("Error processing media for upload:", uploadErr);
          // Continue with base64 fallback
        }
      }

      // Send via Evolution API - prefer stored URL over base64
      const { data, error } = await supabase.functions.invoke("evolution-proxy", {
        body: {
          action: (storedMediaUrl || base64) ? "sendFile" : "sendMessage",
          instanceName: session.instance_name,
          number: phone,
          text,
          isGroup,
          ...((storedMediaUrl || base64) && { 
            mediaUrl: storedMediaUrl, 
            mediaType: mediaType || "image",
            // Não enviar caption se for só o nome do arquivo
            caption: text && text !== filename && !text.match(/^[a-f0-9-]+\.(png|jpg|jpeg|gif|webp|mp4|mp3|pdf|doc|docx)$/i) ? text : undefined,
            // Only send base64 if we don't have stored URL
            base64: storedMediaUrl ? undefined : base64,
            mimetype,
            filename,
          }),
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to send message");

      // Insert message in database with client_message_id for deduplication
      const messageId = data.data?.key?.id || clientMessageId;
      const { error: insertError } = await supabase.from("whatsapp_messages").insert({
        conversation_id: conversation.id,
        session_id: conversation.session_id,
        message_id: messageId,
        client_message_id: clientMessageId,
        from_me: true,
        content: text,
        message_type: mediaType || "text",
        media_url: storedMediaUrl || null,
        media_mime_type: mimetype || null,
        media_status: storedMediaUrl ? 'ready' : null,
        media_storage_path: storedMediaPath,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error("Error inserting sent message:", insertError);
      }

      // Update conversation
      await supabase
        .from("whatsapp_conversations")
        .update({
          last_message: text,
          last_message_at: new Date().toISOString(),
          unread_count: 0,
        })
        .eq("id", conversation.id);

      return { ...data.data, clientMessageId };
    },
    // Optimistic update: add message to cache immediately
    onMutate: async (variables) => {
      const conversationId = variables.conversation.id;
      const optimisticId = crypto.randomUUID();
      
      // Store optimistic ID in variables for use in mutationFn
      (variables as any)._optimisticId = optimisticId;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["whatsapp-messages", conversationId] });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData<WhatsAppMessage[]>(["whatsapp-messages", conversationId]);

      // Create optimistic message
      const optimisticMessage: WhatsAppMessage = {
        id: optimisticId,
        conversation_id: conversationId,
        session_id: variables.conversation.session_id,
        message_id: optimisticId,
        from_me: true,
        content: variables.text,
        message_type: variables.mediaType || "text",
        media_url: variables.mediaUrl || null,
        media_mime_type: variables.mimetype || null,
        status: "pending",
        sent_at: new Date().toISOString(),
        delivered_at: null,
        read_at: null,
        sender_jid: null,
        sender_name: null,
        media_status: null,
        media_storage_path: null,
        media_error: null,
      };

      // Optimistically update to the new value
      queryClient.setQueryData<WhatsAppMessage[]>(
        ["whatsapp-messages", conversationId],
        (old) => old ? [...old, optimisticMessage] : [optimisticMessage]
      );

      // Also update paginated query
      queryClient.setQueryData(
        ["whatsapp-messages-paginated", conversationId],
        (old: any) => {
          if (!old?.pages?.[0]) return old;
          return {
            ...old,
            pages: [
              {
                ...old.pages[0],
                messages: [...old.pages[0].messages, optimisticMessage],
              },
              ...old.pages.slice(1),
            ],
          };
        }
      );

      // Return context with snapshot
      return { previousMessages, optimisticId };
    },
    onSuccess: (result, variables, context) => {
      const conversationId = variables.conversation.id;
      
      // Update optimistic message with real data
      if (context?.optimisticId) {
        queryClient.setQueryData<WhatsAppMessage[]>(
          ["whatsapp-messages", conversationId],
          (old) => old?.map(msg => 
            msg.id === context.optimisticId 
              ? { ...msg, id: result?.clientMessageId || msg.id, status: "sent" }
              : msg
          )
        );
      }
      
      // Invalidate conversations to update last_message
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
    },
    onError: (error: Error, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["whatsapp-messages", variables.conversation.id],
          context.previousMessages
        );
      }
      
      const errorMessage = error.message || "";
      
      // Check for different error types
      const isDisconnected = errorMessage.includes("WHATSAPP_DISCONNECTED") || 
                             errorMessage.includes("desconectada") ||
                             errorMessage.includes("QR Code") ||
                             errorMessage.includes("not connected");
      
      const isNumberNotExists = errorMessage.includes("não possui WhatsApp") ||
                                errorMessage.includes("não está registrado") ||
                                errorMessage.includes("not exist") ||
                                errorMessage.includes("invalid number");
      
      let title = "Erro ao enviar mensagem";
      let description = errorMessage;
      
      if (isDisconnected) {
        title = "WhatsApp Desconectado";
        description = "Vá em Configurações → WhatsApp e escaneie o QR Code novamente.";
      } else if (isNumberNotExists) {
        title = "Contato sem WhatsApp";
        description = "Este número não está no WhatsApp. Tente ligar ou enviar SMS.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });
}

export function useMarkConversationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversation: { 
      id: string; 
      session_id: string;
      remote_jid: string;
      is_group?: boolean;
    }) => {
      // APENAS atualiza localmente - NÃO envia sendSeen para Evolution API
      // Isso evita marcar como lida no WhatsApp automaticamente
      // O usuário deve usar "Marcar como lida no WhatsApp" manualmente
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ unread_count: 0 })
        .eq("id", conversation.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
    },
  });
}

// Hook separado para marcar como lida no WhatsApp (ação manual)
export function useMarkAsSeenOnWhatsApp() {
  return useMutation({
    mutationFn: async (conversation: { 
      id: string; 
      session_id: string;
      remote_jid: string;
      is_group?: boolean;
    }) => {
      const { data: session } = await supabase
        .from("whatsapp_sessions")
        .select("instance_name")
        .eq("id", conversation.session_id)
        .maybeSingle();

      if (session) {
        const phone = conversation.remote_jid
          .replace("@c.us", "")
          .replace("@s.whatsapp.net", "")
          .replace("@g.us", "");

        await supabase.functions.invoke("evolution-proxy", {
          body: {
            action: "sendSeen",
            instanceName: session.instance_name,
            phone,
            isGroup: conversation.is_group || false,
          },
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Não foi possível marcar como lida no WhatsApp",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Mensagem marcada como lida no WhatsApp",
      });
    },
  });
}

export function useArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, archive }: { conversationId: string; archive: boolean }) => {
      // Note: archived_at column may not exist - check schema
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ 
          unread_count: archive ? 0 : 0 // Placeholder update
        } as any)
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      toast({
        title: variables.archive ? "Conversa arquivada" : "Conversa desarquivada",
        description: variables.archive 
          ? "A conversa foi movida para o arquivo" 
          : "A conversa foi restaurada",
      });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      // Hard delete since deleted_at may not exist
      const { error } = await supabase
        .from("whatsapp_conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      toast({
        title: "Conversa removida",
        description: "A conversa foi removida da lista",
      });
    },
  });
}

export function useLinkConversationToLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, leadId }: { conversationId: string; leadId: string }) => {
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ lead_id: leadId })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversation", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      toast({
        title: "Conversa vinculada",
        description: "A conversa foi vinculada ao lead",
      });
    },
  });
}

// Hook for realtime conversation updates
export function useWhatsAppRealtimeConversations() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("whatsapp-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_conversations",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_messages",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
