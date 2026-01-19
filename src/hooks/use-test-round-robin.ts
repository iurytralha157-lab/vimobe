import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TestRoundRobinInput {
  pipeline_id?: string | null;
  source?: string;
  campaign_name?: string | null;
  meta_form_id?: string | null;
  city?: string | null;
  tags?: string[] | null;
}

export interface TestRoundRobinResult {
  matched: boolean;
  rule_id?: string;
  rule_name?: string;
  round_robin_id?: string;
  round_robin_name?: string;
  strategy?: string;
  next_user_id?: string;
  next_user_name?: string;
  next_user_email?: string;
  via?: string;
  message?: string;
}

export function useTestRoundRobin() {
  return useMutation({
    mutationFn: async (input: TestRoundRobinInput): Promise<TestRoundRobinResult> => {
      // Get current user's organization
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
        .single();
      
      if (!userData?.organization_id) {
        throw new Error('Usuário não possui organização');
      }
      
      const { data, error } = await supabase.rpc('simulate_round_robin', {
        p_organization_id: userData.organization_id,
        p_pipeline_id: input.pipeline_id || null,
        p_source: input.source || 'manual',
        p_campaign_name: input.campaign_name || null,
        p_meta_form_id: input.meta_form_id || null,
        p_city: input.city || null,
        p_tags: input.tags || null,
      });
      
      if (error) throw error;
      
      return (data as unknown) as TestRoundRobinResult;
    },
  });
}
