import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface RuleMatch {
  pipeline_id?: string;
  source?: string[];
  campaign_name_contains?: string;
  meta_form_id?: string[];
  tag_in?: string[];
  city_in?: string[];
  schedule?: {
    days?: number[];
    start?: string;
    end?: string;
  };
}

export interface RoundRobinRule {
  id: string;
  round_robin_id: string;
  organization_id: string | null;
  name: string | null;
  priority: number;
  is_active: boolean;
  match: RuleMatch;
  match_type: string | null;
  match_value: string | null;
  created_at: string;
}

export function useRoundRobinRules(roundRobinId?: string) {
  return useQuery({
    queryKey: ['round-robin-rules', roundRobinId],
    queryFn: async () => {
      let query = supabase
        .from('round_robin_rules')
        .select('*')
        .order('priority', { ascending: true });
      
      if (roundRobinId) {
        query = query.eq('round_robin_id', roundRobinId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []).map(rule => ({
        ...rule,
        match: (rule.match as RuleMatch) || {},
      })) as RoundRobinRule[];
    },
    enabled: !!roundRobinId || roundRobinId === undefined,
  });
}

export function useAllRoundRobinRules() {
  return useQuery({
    queryKey: ['round-robin-rules-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('round_robin_rules')
        .select('*')
        .order('priority', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(rule => ({
        ...rule,
        match: (rule.match as RuleMatch) || {},
      })) as RoundRobinRule[];
    },
  });
}

interface CreateRuleInput {
  round_robin_id: string;
  name?: string;
  priority?: number;
  is_active?: boolean;
  match: RuleMatch;
}

export function useCreateRoundRobinRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateRuleInput) => {
      const { data, error } = await supabase
        .from('round_robin_rules')
        .insert({
          round_robin_id: input.round_robin_id,
          name: input.name || null,
          priority: input.priority || 100,
          is_active: input.is_active ?? true,
          match: input.match as unknown as Json,
          match_type: '',
          match_value: '',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['round-robin-rules', variables.round_robin_id] });
      queryClient.invalidateQueries({ queryKey: ['round-robin-rules-all'] });
      queryClient.invalidateQueries({ queryKey: ['round-robins'] });
      toast.success('Regra criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar regra: ' + error.message);
    },
  });
}

interface UpdateRuleInput {
  id: string;
  round_robin_id: string;
  name?: string;
  priority?: number;
  is_active?: boolean;
  match?: RuleMatch;
}

export function useUpdateRoundRobinRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: UpdateRuleInput) => {
      const updateData: Record<string, unknown> = {};
      
      if (input.name !== undefined) updateData.name = input.name;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.is_active !== undefined) updateData.is_active = input.is_active;
      if (input.match !== undefined) updateData.match = input.match as unknown as Json;
      
      const { data, error } = await supabase
        .from('round_robin_rules')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['round-robin-rules', variables.round_robin_id] });
      queryClient.invalidateQueries({ queryKey: ['round-robin-rules-all'] });
      queryClient.invalidateQueries({ queryKey: ['round-robins'] });
      toast.success('Regra atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar regra: ' + error.message);
    },
  });
}

export function useDeleteRoundRobinRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, roundRobinId }: { id: string; roundRobinId: string }) => {
      const { error } = await supabase
        .from('round_robin_rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return roundRobinId;
    },
    onSuccess: (roundRobinId) => {
      queryClient.invalidateQueries({ queryKey: ['round-robin-rules', roundRobinId] });
      queryClient.invalidateQueries({ queryKey: ['round-robin-rules-all'] });
      queryClient.invalidateQueries({ queryKey: ['round-robins'] });
      toast.success('Regra excluída!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir regra: ' + error.message);
    },
  });
}

export function useReorderRules() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rules: { id: string; priority: number }[]) => {
      for (const rule of rules) {
        const { error } = await supabase
          .from('round_robin_rules')
          .update({ priority: rule.priority })
          .eq('id', rule.id);
        
        if (error) throw error;
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['round-robin-rules'] });
      queryClient.invalidateQueries({ queryKey: ['round-robin-rules-all'] });
      queryClient.invalidateQueries({ queryKey: ['round-robins'] });
      toast.success('Prioridades atualizadas!');
    },
    onError: (error) => {
      toast.error('Erro ao reordenar regras: ' + error.message);
    },
  });
}
