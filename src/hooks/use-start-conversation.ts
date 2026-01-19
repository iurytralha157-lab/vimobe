import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { WhatsAppConversation } from "@/hooks/use-whatsapp-conversations";
import { formatPhoneForWhatsApp } from "@/lib/phone-utils";

interface StartConversationParams {
  phone: string;
  sessionId: string;
  leadId?: string;
  leadName?: string;
}

export function useStartConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ phone, sessionId, leadId, leadName }: StartConversationParams): Promise<WhatsAppConversation> => {
      // Formatar o telefone com código do Brasil (+55)
      const cleanPhone = formatPhoneForWhatsApp(phone);
      const remoteJid = cleanPhone.includes("@") ? cleanPhone : `${cleanPhone}@c.us`;

      // Verificar se já existe conversa com esse telefone
      const { data: existingConversation, error: searchError } = await supabase
        .from("whatsapp_conversations")
        .select(`
          *,
          session:whatsapp_sessions!whatsapp_conversations_session_id_fkey(id, instance_name, phone_number),
          lead:leads!whatsapp_conversations_lead_id_fkey(id, name)
        `)
        .eq("session_id", sessionId)
        .eq("remote_jid", remoteJid)
        .maybeSingle();

      if (searchError) throw searchError;

      if (existingConversation) {
        // Se existe e tem lead_id diferente, atualizar
        if (leadId && existingConversation.lead_id !== leadId) {
          await supabase
            .from("whatsapp_conversations")
            .update({ lead_id: leadId })
            .eq("id", existingConversation.id);
        }
        return existingConversation as WhatsAppConversation;
      }

      // Criar nova conversa
      const { data: newConversation, error: insertError } = await supabase
        .from("whatsapp_conversations")
        .insert({
          session_id: sessionId,
          remote_jid: remoteJid,
          contact_phone: cleanPhone,
          contact_name: leadName || cleanPhone,
          lead_id: leadId || null,
          unread_count: 0,
          is_group: false,
        })
        .select(`
          *,
          session:whatsapp_sessions!whatsapp_conversations_session_id_fkey(id, instance_name, phone_number),
          lead:leads!whatsapp_conversations_lead_id_fkey(id, name)
        `)
        .single();

      if (insertError) throw insertError;

      return newConversation as WhatsAppConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao iniciar conversa",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useFindConversationByPhone() {
  return useMutation({
    mutationFn: async (phone: string): Promise<WhatsAppConversation | null> => {
      // Format with Brazil country code
      const cleanPhone = formatPhoneForWhatsApp(phone);
      
      // Buscar por telefone no remote_jid ou contact_phone
      // Using array result with limit(1) instead of maybeSingle to avoid "Cannot coerce" error
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select(`
          *,
          session:whatsapp_sessions!whatsapp_conversations_session_id_fkey(id, instance_name, phone_number),
          lead:leads!whatsapp_conversations_lead_id_fkey(id, name)
        `)
        .or(`remote_jid.ilike.%${cleanPhone}%,contact_phone.ilike.%${cleanPhone}%`)
        .order("last_message_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      
      // Return first result or null
      return (data?.[0] as WhatsAppConversation) || null;
    },
  });
}
