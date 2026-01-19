import { useMutation } from '@tanstack/react-query';

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
      // simulate_round_robin RPC doesn't exist yet
      console.warn('simulate_round_robin RPC not implemented');
      return {
        matched: false,
        message: 'Função de teste não disponível - RPC simulate_round_robin não existe',
      };
    },
  });
}