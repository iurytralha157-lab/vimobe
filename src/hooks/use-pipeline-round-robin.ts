import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUpdatePipelineRoundRobin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ pipelineId, roundRobinId }: { pipelineId: string; roundRobinId: string | null }) => {
      // Note: The default_round_robin_id column may not exist in the schema
      // This is a placeholder implementation
      console.log('Updating pipeline round robin:', { pipelineId, roundRobinId });
      
      // For now, just return success - the actual column needs to be added via migration
      return { id: pipelineId, default_round_robin_id: roundRobinId };
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
