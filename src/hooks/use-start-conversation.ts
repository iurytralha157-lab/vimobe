import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { WhatsAppConversation } from "@/hooks/use-whatsapp-conversations";
import { formatPhoneForWhatsApp } from "@/lib/phone-utils";
import { useAuth } from "@/contexts/AuthContext";

interface StartConversationParams {
  phone: string;
  sessionId: string;
  leadId?: string;
  leadName?: string;
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async ({ phone, sessionId, leadId, leadName }: StartConversationParams): Promise<WhatsAppConversation> => {
      if (!organization?.id) {
        throw new Error("Organização não encontrada");
      }

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
        .is("deleted_at", null)
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
          organization_id: organization.id,
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
    mutationFn: async ({ phone, leadId }: { phone: string; leadId?: string }): Promise<WhatsAppConversation | null> => {
      // 1) Se temos leadId, priorizar conversa já vinculada ao lead
      if (leadId) {
        const { data: byLead, error: byLeadError } = await supabase
          .from("whatsapp_conversations")
          .select(`
            *,
            session:whatsapp_sessions!whatsapp_conversations_session_id_fkey(id, instance_name, phone_number),
            lead:leads!whatsapp_conversations_lead_id_fkey(id, name)
          `)
          .eq("lead_id", leadId)
          .is("deleted_at", null)
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .limit(1);

        if (byLeadError) throw byLeadError;
        if (byLead?.[0]) {
          return byLead[0] as WhatsAppConversation;
        }
      }

      // 2) Fallback por telefone - buscar com múltiplas variações de formato
      const cleanPhone = formatPhoneForWhatsApp(phone);
      
      // Gerar variações: com e sem código do país
      const digits = cleanPhone.replace(/\D/g, '');
      const withoutCountry = digits.startsWith('55') && digits.length >= 12 
        ? digits.substring(2) 
        : digits;
      const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
      
      // Buscar por qualquer variação
      const searchVariants = [...new Set([digits, withoutCountry, withCountry])];
      const orFilter = searchVariants
        .flatMap(v => [
          `remote_jid.ilike.%${v}%`,
          `contact_phone.ilike.%${v}%`
        ])
        .join(',');
      
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select(`
          *,
          session:whatsapp_sessions!whatsapp_conversations_session_id_fkey(id, instance_name, phone_number),
          lead:leads!whatsapp_conversations_lead_id_fkey(id, name)
        `)
        .or(orFilter)
        .is("deleted_at", null)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(1);

      if (error) throw error;
      return (data?.[0] as WhatsAppConversation) || null;
    },
  });
}
