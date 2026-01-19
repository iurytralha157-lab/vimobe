import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUpdatePipelineRoundRobin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ pipelineId, roundRobinId }: { pipelineId: string; roundRobinId: string | null }) => {
      const { data, error } = await supabase
        .from('pipelines')
        .update({ default_round_robin_id: roundRobinId })
        .eq('id', pipelineId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      toast.success('Round-robin padrão atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}
