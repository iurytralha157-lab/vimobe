import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WebhookIntegration {
  id: string;
  organization_id: string;
  name: string;
  type: 'incoming' | 'outgoing';
  api_token: string;
  webhook_url: string | null;
  target_pipeline_id: string | null;
  target_team_id: string | null;
  target_stage_id: string | null;
  target_tag_ids: string[];
  target_property_id: string | null;
  field_mapping: Record<string, string>;
  is_active: boolean;
  leads_received: number;
  last_lead_at: string | null;
  last_triggered_at: string | null;
  trigger_events: string[];
  created_at: string;
  updated_at: string;
  // Joined data
  pipeline?: { id: string; name: string };
  team?: { id: string; name: string };
  stage?: { id: string; name: string; color: string };
  property?: { id: string; code: string; title: string | null };
}

export function useWebhooks() {
  return useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhooks_integrations')
        .select(`
          *,
          pipeline:pipelines(id, name),
          team:teams(id, name),
          stage:stages(id, name, color),
          property:properties(id, code, title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WebhookIntegration[];
    },
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (webhook: {
      name: string;
      type: 'incoming' | 'outgoing';
      target_pipeline_id?: string;
      target_team_id?: string;
      target_stage_id?: string;
      target_tag_ids?: string[];
      target_property_id?: string;
      field_mapping?: Record<string, string>;
      webhook_url?: string;
      trigger_events?: string[];
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Não autenticado');

      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile?.organization_id) throw new Error('Organização não encontrada');

      const { data, error } = await supabase
        .from('webhooks_integrations')
        .insert({
          organization_id: profile.organization_id,
          ...webhook,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar webhook: ' + error.message);
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      is_active?: boolean;
      target_pipeline_id?: string | null;
      target_team_id?: string | null;
      target_stage_id?: string | null;
      target_tag_ids?: string[];
      target_property_id?: string | null;
      field_mapping?: Record<string, string>;
      webhook_url?: string;
      trigger_events?: string[];
    }) => {
      const { data, error } = await supabase
        .from('webhooks_integrations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar webhook: ' + error.message);
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('webhooks_integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook removido!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover webhook: ' + error.message);
    },
  });
}

export function useToggleWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('webhooks_integrations')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success(variables.is_active ? 'Webhook ativado!' : 'Webhook desativado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao alterar webhook: ' + error.message);
    },
  });
}

export function useRegenerateToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Generate new token (32 bytes hex)
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const newToken = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase
        .from('webhooks_integrations')
        .update({ api_token: newToken })
        .eq('id', id);

      if (error) throw error;
      return newToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Token regenerado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao regenerar token: ' + error.message);
    },
  });
}
