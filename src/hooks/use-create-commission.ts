import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateCommissionParams {
  leadId: string;
  organizationId: string;
  userId: string | null;
  propertyId: string | null;
  valorInteresse: number | null;
  leadCommissionPercentage?: number | null;
}

interface CreateReceivableParams {
  leadId: string;
  organizationId: string;
  valorInteresse: number;
  description?: string;
  dueDays?: number;
}

// ETAPA 1: Criar comissão com fallbacks robustos
export function useCreateCommissionOnWon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, organizationId, userId, propertyId, valorInteresse, leadCommissionPercentage }: CreateCommissionParams) => {
      // Skip if no value
      if (!valorInteresse || valorInteresse <= 0) {
        console.log('Skipping commission creation - no valor_interesse:', { valorInteresse });
        return null;
      }

      // If no user assigned, log but continue (commission can be created without user for now)
      if (!userId) {
        console.log('No user assigned to lead, skipping commission for now:', leadId);
        return null;
      }

      // Check if commission already exists for this lead
      const { data: existingCommission } = await supabase
        .from('commissions')
        .select('id')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (existingCommission) {
        console.log('Commission already exists for lead:', leadId);
        return null;
      }

      // FALLBACK CHAIN: lead -> property -> organization -> default 5%
      let commissionPercentage = leadCommissionPercentage || 0;
      let sourceLabel = 'Lead';

      // Try property if no lead commission
      if (commissionPercentage <= 0 && propertyId) {
        const { data: property } = await supabase
          .from('properties')
          .select('commission_percentage, title')
          .eq('id', propertyId)
          .single();

        if (property?.commission_percentage && property.commission_percentage > 0) {
          commissionPercentage = property.commission_percentage;
          sourceLabel = property.title || 'Imóvel';
        }
      }

      // Try organization default if still no commission
      if (commissionPercentage <= 0) {
        const { data: org } = await supabase
          .from('organizations')
          .select('default_commission_percentage, name')
          .eq('id', organizationId)
          .single();

        if (org?.default_commission_percentage && org.default_commission_percentage > 0) {
          commissionPercentage = org.default_commission_percentage;
          sourceLabel = 'Padrão da empresa';
        }
      }

      // Final fallback: 5%
      if (commissionPercentage <= 0) {
        commissionPercentage = 5;
        sourceLabel = 'Padrão do sistema (5%)';
        console.log('Using default 5% commission for lead:', leadId);
      }

      // Calculate commission amount
      const commissionAmount = valorInteresse * (commissionPercentage / 100);

      // Create commission record
      const { data: commission, error } = await supabase
        .from('commissions')
        .insert({
          organization_id: organizationId,
          lead_id: leadId,
          user_id: userId,
          property_id: propertyId,
          base_value: valorInteresse,
          amount: commissionAmount,
          percentage: commissionPercentage,
          status: 'forecast',
          notes: `Comissão automática - ${sourceLabel}`
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating commission:', error);
        throw error;
      }

      console.log('✅ Commission created:', { leadId, amount: commissionAmount, percentage: commissionPercentage });
      return { commission, percentage: commissionPercentage };
    },
    onSuccess: (data) => {
      if (data?.commission) {
        queryClient.invalidateQueries({ queryKey: ['commissions'] });
        queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['enhanced-dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['top-brokers'] });
        queryClient.invalidateQueries({ queryKey: ['broker-performance'] });
        
        const commissionAmount = data.commission.amount;
        const percentage = data.percentage;
        
        toast.success(
          `Comissão de R$ ${commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} gerada!`,
          { 
            description: `${percentage}% sobre o valor do negócio`
          }
        );
      }
    },
    onError: (error) => {
      console.error('Error creating commission:', error);
    }
  });
}

// ETAPA 2: Criar conta a receber automaticamente
export function useCreateReceivableOnWon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, organizationId, valorInteresse, description, dueDays = 30 }: CreateReceivableParams) => {
      if (!valorInteresse || valorInteresse <= 0) {
        console.log('Skipping receivable creation - no valor_interesse');
        return null;
      }

      // Check if receivable already exists for this lead
      const { data: existingEntry } = await supabase
        .from('financial_entries')
        .select('id')
        .eq('lead_id', leadId)
        .eq('type', 'receivable')
        .maybeSingle();

      if (existingEntry) {
        console.log('Receivable already exists for lead:', leadId);
        return null;
      }

      // Calculate due date (default 30 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueDays);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create financial entry
      const { data: entry, error } = await supabase
        .from('financial_entries')
        .insert({
          organization_id: organizationId,
          lead_id: leadId,
          type: 'receivable',
          amount: valorInteresse,
          status: 'pending',
          due_date: dueDate.toISOString().split('T')[0],
          description: description || 'Venda - Negócio fechado',
          notes: 'Gerado automaticamente ao marcar lead como ganho',
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating receivable:', error);
        throw error;
      }

      console.log('✅ Receivable created:', { leadId, amount: valorInteresse });
      return entry;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
        queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
        
        toast.success(
          `Conta a receber de R$ ${data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} criada!`,
          { description: `Vencimento: ${new Date(data.due_date).toLocaleDateString('pt-BR')}` }
        );
      }
    },
    onError: (error) => {
      console.error('Error creating receivable:', error);
    }
  });
}
