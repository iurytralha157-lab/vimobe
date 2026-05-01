import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LeadAttachment {
  id: string;
  lead_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  created_by: string | null;
  message_id: string | null;
}

export function useLeadAttachments(leadId: string | null) {
  return useQuery({
    queryKey: ['lead-attachments', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await (supabase as any)
        .from('lead_attachments')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LeadAttachment[];
    },
    enabled: !!leadId,
  });
}

export function useCreateLeadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attachment: {
      lead_id: string;
      file_name: string;
      file_url: string;
      file_type?: string;
      file_size?: number;
      message_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await (supabase as any)
        .from('lead_attachments')
        .insert({
          ...attachment,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-attachments', variables.lead_id] });
      toast.success('Documento anexado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating attachment:', error);
      toast.error('Erro ao anexar documento');
    }
  });
}
