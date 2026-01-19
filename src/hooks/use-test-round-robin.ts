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
      // Placeholder - this requires a custom RPC function to be created
      // For now, return a not-matched result
      console.log('Test round robin input:', input);
      return {
        matched: false,
        message: 'Simulação de round-robin não disponível. Configure a função RPC no banco.',
      };
    },
  });
}
