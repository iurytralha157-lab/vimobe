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
      // webhooks_integrations table doesn't exist yet
      console.warn('webhooks_integrations table not available');
      return [] as WebhookIntegration[];
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
      throw new Error('Tabela webhooks_integrations não existe');
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
      throw new Error('Tabela webhooks_integrations não existe');
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
      throw new Error('Tabela webhooks_integrations não existe');
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
      throw new Error('Tabela webhooks_integrations não existe');
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
      throw new Error('Tabela webhooks_integrations não existe');
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