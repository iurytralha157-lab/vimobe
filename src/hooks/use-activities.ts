import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables, Json } from '@/integrations/supabase/types';

export type Activity = Tables<'activities'> & {
  user?: { id: string; name: string } | null;
  lead?: { id: string; name: string } | null;
};

export function useActivities(leadId?: string) {
  return useQuery({
    queryKey: ['activities', leadId],
    queryFn: async () => {
      let query = supabase
        .from('activities')
        .select(`
          *,
          user:users!activities_user_id_fkey(id, name),
          lead:leads(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (leadId) {
        query = query.eq('lead_id', leadId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Activity[];
    },
    enabled: leadId ? true : false,
  });
}

export function useRecentActivities() {
  return useQuery({
    queryKey: ['recent-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          user:users!activities_user_id_fkey(id, name),
          lead:leads(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as Activity[];
    },
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (activity: {
      lead_id: string;
      type: string;
      content?: string;
      metadata?: Json;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('activities')
        .insert({
          ...activity,
          user_id: user.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
    },
    onError: (error) => {
      toast.error('Erro ao criar atividade: ' + error.message);
    },
  });
}
