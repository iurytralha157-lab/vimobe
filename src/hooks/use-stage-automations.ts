import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

export type StageAutomation = Tables<'stage_automations'>;

export type AutomationType = 'move_after_inactivity' | 'send_whatsapp_on_enter' | 'alert_on_inactivity';

export interface CreateAutomationData {
  stage_id: string;
  automation_type: AutomationType;
  trigger_days?: number;
  target_stage_id?: string;
  whatsapp_template?: string;
  alert_message?: string;
  is_active?: boolean;
}

export function useStageAutomations(stageId?: string) {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;

  return useQuery({
    queryKey: ['stage-automations', stageId, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('stage_automations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (stageId) {
        query = query.eq('stage_id', stageId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as StageAutomation[];
    },
    enabled: !!organizationId
  });
}

export function useCreateStageAutomation() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateAutomationData) => {
      if (!profile?.organization_id) throw new Error('Organização não encontrada');

      const { data: result, error } = await supabase
        .from('stage_automations')
        .insert([{
          ...data,
          organization_id: profile.organization_id
        }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stage-automations'] });
      toast.success('Automação criada com sucesso');
    },
    onError: (error) => {
      console.error('Error creating automation:', error);
      toast.error('Erro ao criar automação');
    }
  });
}

export function useUpdateStageAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<StageAutomation> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('stage_automations')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-automations'] });
      toast.success('Automação atualizada com sucesso');
    },
    onError: (error) => {
      console.error('Error updating automation:', error);
      toast.error('Erro ao atualizar automação');
    }
  });
}

export function useDeleteStageAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stage_automations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-automations'] });
      toast.success('Automação excluída com sucesso');
    },
    onError: (error) => {
      console.error('Error deleting automation:', error);
      toast.error('Erro ao excluir automação');
    }
  });
}

export function useToggleStageAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data: result, error } = await supabase
        .from('stage_automations')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stage-automations'] });
      toast.success(variables.is_active ? 'Automação ativada' : 'Automação desativada');
    },
    onError: (error) => {
      console.error('Error toggling automation:', error);
      toast.error('Erro ao alterar status da automação');
    }
  });
}

export const AUTOMATION_TYPE_LABELS: Record<AutomationType, string> = {
  'move_after_inactivity': 'Mover após inatividade',
  'send_whatsapp_on_enter': 'Enviar WhatsApp ao entrar',
  'alert_on_inactivity': 'Alertar sobre inatividade'
};

export const AUTOMATION_TYPE_DESCRIPTIONS: Record<AutomationType, string> = {
  'move_after_inactivity': 'Move o lead automaticamente para outro estágio após X dias sem atividade',
  'send_whatsapp_on_enter': 'Envia uma mensagem automática via WhatsApp quando o lead entra neste estágio',
  'alert_on_inactivity': 'Cria uma notificação para o corretor quando o lead ficar X dias sem atividade'
};
