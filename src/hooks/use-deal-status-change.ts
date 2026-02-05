import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCreateCommissionOnWon, useCreateReceivableOnWon } from './use-create-commission';

interface ChangeDealStatusParams {
  leadId: string;
  newStatus: 'open' | 'won' | 'lost';
  organizationId: string;
  userId: string | null;
  propertyId: string | null;
  valorInteresse: number | null;
  commissionPercentage: number | null;
  leadName: string;
}

/**
 * Hook centralizado para mudança de deal_status
 * Quando marcado como "won":
 * - Atualiza o lead
 * - Cria comissão automaticamente
 * - Cria conta a receber automaticamente
 */
export function useDealStatusChange() {
  const queryClient = useQueryClient();
  const createCommission = useCreateCommissionOnWon();
  const createReceivable = useCreateReceivableOnWon();

  return useMutation({
    mutationFn: async ({
      leadId,
      newStatus,
      organizationId,
      userId,
      propertyId,
      valorInteresse,
      commissionPercentage,
      leadName,
    }: ChangeDealStatusParams) => {
      // Update lead status
      const updateData: any = {
        deal_status: newStatus,
      };

      if (newStatus === 'won') {
        updateData.won_at = new Date().toISOString();
        updateData.lost_at = null;
        updateData.lost_reason = null;
      } else if (newStatus === 'lost') {
        updateData.lost_at = new Date().toISOString();
        updateData.won_at = null;
        updateData.lost_reason = '';
      } else {
        updateData.won_at = null;
        updateData.lost_at = null;
        updateData.lost_reason = null;
      }

      const { data: lead, error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('activities').insert({
        lead_id: leadId,
        user_id: user?.id || null,
        type: 'status_change',
        content: newStatus === 'won' 
          ? `Lead "${leadName}" marcado como GANHO` 
          : newStatus === 'lost'
          ? `Lead "${leadName}" marcado como PERDIDO`
          : `Lead "${leadName}" reaberto`,
        metadata: { 
          new_status: newStatus,
          valor_interesse: valorInteresse 
        }
      });

      return { lead, newStatus };
    },
    onSuccess: async ({ lead, newStatus }, variables) => {
      // Invalidate lead queries
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      queryClient.invalidateQueries({ queryKey: ['stages-with-leads'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-dashboard-stats'] });

      // Se ganhou, criar comissão e conta a receber
      if (newStatus === 'won') {
        // Create commission
        if (variables.valorInteresse && variables.valorInteresse > 0) {
          try {
            await createCommission.mutateAsync({
              leadId: variables.leadId,
              organizationId: variables.organizationId,
              userId: variables.userId,
              propertyId: variables.propertyId,
              valorInteresse: variables.valorInteresse,
              leadCommissionPercentage: variables.commissionPercentage,
            });
          } catch (err) {
            console.error('Failed to create commission:', err);
          }

          // Create receivable
          try {
            await createReceivable.mutateAsync({
              leadId: variables.leadId,
              organizationId: variables.organizationId,
              valorInteresse: variables.valorInteresse,
              description: `Venda - ${variables.leadName}`,
            });
          } catch (err) {
            console.error('Failed to create receivable:', err);
          }
        } else {
          // Warn user that no valor_interesse means no financial entries
          toast.warning('Lead marcado como ganho sem valor de interesse', {
            description: 'Preencha o valor para gerar comissão e conta a receber'
          });
        }

        toast.success('🎉 Negócio fechado!', {
          description: variables.valorInteresse 
            ? `R$ ${variables.valorInteresse.toLocaleString('pt-BR')}`
            : undefined
        });
      } else if (newStatus === 'lost') {
        toast.info('Lead marcado como perdido');
      } else {
        toast.info('Lead reaberto');
      }
    },
    onError: (error) => {
      console.error('Error changing deal status:', error);
      toast.error('Erro ao alterar status do negócio');
    }
  });
}