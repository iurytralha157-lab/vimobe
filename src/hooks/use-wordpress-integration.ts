import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WordPressIntegration {
  id: string;
  organization_id: string;
  api_token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  leads_received: number;
  last_lead_at: string | null;
}

export function useWordPressIntegration() {
  return useQuery({
    queryKey: ['wordpress-integration'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wordpress_integrations')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data as WordPressIntegration | null;
    },
  });
}

export function useCreateWordPressIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');
      
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.user.id)
        .single();
      
      if (!userData?.organization_id) throw new Error('Organização não encontrada');
      
      const { data, error } = await supabase
        .from('wordpress_integrations')
        .insert({
          organization_id: userData.organization_id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-integration'] });
      toast.success('Integração WordPress criada!');
    },
    onError: (error) => {
      toast.error('Erro ao criar integração: ' + error.message);
    },
  });
}

export function useRegenerateWordPressToken() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Generate new token using SQL function
      const { data, error } = await supabase.rpc('regenerate_wordpress_token' as any, { integration_id: id });
      
      if (error) {
        // Fallback: update with new token via edge function would be needed
        // For now, just fetch the current one
        throw new Error('Token regeneration requires edge function');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-integration'] });
      toast.success('Token regenerado!');
    },
    onError: (error) => {
      toast.error('Erro ao regenerar token: ' + error.message);
    },
  });
}

export function useToggleWordPressIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('wordpress_integrations')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-integration'] });
      toast.success(variables.is_active ? 'Integração ativada!' : 'Integração desativada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar integração: ' + error.message);
    },
  });
}
