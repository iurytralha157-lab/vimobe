import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logAuditAction } from './use-audit-logs';

interface AutoCreateContractParams {
  leadId: string;
  value: number;
  downPayment?: number;
  installments?: number;
  commissionPercentage?: number;
  brokerIds?: string[];
  contractType?: string;
  paymentConditions?: string;
}

/**
 * Gera número sequencial de contrato CTR-YYYY-XXXXX
 */
async function generateContractNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();

  const { data: existing } = await (supabase as any)
    .from('contract_sequences')
    .select('last_number')
    .eq('organization_id', organizationId)
    .single();

  let nextNumber = 1;

  if (existing) {
    nextNumber = existing.last_number + 1;
    await (supabase as any)
      .from('contract_sequences')
      .update({ last_number: nextNumber })
      .eq('organization_id', organizationId);
  } else {
    await (supabase as any)
      .from('contract_sequences')
      .insert({ organization_id: organizationId, last_number: 1 });
  }

  return `CTR-${year}-${String(nextNumber).padStart(5, '0')}`;
}

/**
 * Hook que automatiza criação de contrato + parcelas + comissões quando lead é ganho
 */
export function useAutoCreateContract() {
  const queryClient = useQueryClient();
  const { profile, user, organization } = useAuth();

  return useMutation({
    mutationFn: async (params: AutoCreateContractParams) => {
      const orgId = organization?.id || profile?.organization_id;
      if (!orgId) throw new Error('Organização não encontrada');
      if (!user?.id) throw new Error('Usuário não autenticado');

      const {
        leadId,
        value,
        downPayment = 0,
        installments = 1,
        commissionPercentage = 5,
        brokerIds = [],
        contractType = 'sale',
        paymentConditions,
      } = params;

      // 1. Buscar dados do lead
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('name, assigned_user_id, property_id, organization_id')
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;

      // 2. Gerar número do contrato
      const contractNumber = await generateContractNumber(orgId);

      // 3. Criar contrato
      const { data: contract, error: contractError } = await (supabase as any)
        .from('contracts')
        .insert({
          organization_id: orgId,
          contract_number: contractNumber,
          contract_type: contractType,
          status: 'active',
          lead_id: leadId,
          property_id: lead.property_id,
          value,
          down_payment: downPayment,
          installments,
          commission_percentage: commissionPercentage,
          commission_value: value * (commissionPercentage / 100),
          client_name: lead.name,
          payment_conditions: paymentConditions,
          signing_date: new Date().toISOString().split('T')[0],
          created_by: user.id,
        })
        .select()
        .single();

      if (contractError) throw contractError;

      const contractId = contract.id;
      const financialEntries: any[] = [];

      // 4. Gerar entrada (se houver down payment)
      if (downPayment > 0) {
        financialEntries.push({
          organization_id: orgId,
          contract_id: contractId,
          lead_id: leadId,
          type: 'receivable',
          category: 'Entrada',
          description: `Entrada - ${contractNumber}`,
          amount: downPayment,
          due_date: new Date().toISOString().split('T')[0],
          status: 'pending',
          installment_number: 0,
          total_installments: installments,
          created_by: user.id,
        });
      }

      // 5. Gerar N parcelas
      const remainingValue = value - downPayment;
      const installmentValue = Math.round((remainingValue / installments) * 100) / 100;
      const lastInstallmentAdjust = remainingValue - installmentValue * (installments - 1);

      for (let i = 1; i <= installments; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);

        financialEntries.push({
          organization_id: orgId,
          contract_id: contractId,
          lead_id: leadId,
          type: 'receivable',
          category: 'Parcela',
          description: `Parcela ${i}/${installments} - ${contractNumber}`,
          amount: i === installments ? lastInstallmentAdjust : installmentValue,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'pending',
          installment_number: i,
          total_installments: installments,
          created_by: user.id,
        });
      }

      // 6. Inserir lançamentos financeiros
      if (financialEntries.length > 0) {
        const { error: entriesError } = await supabase
          .from('financial_entries')
          .insert(financialEntries as never[]);
        if (entriesError) throw entriesError;
      }

      // 7. Vincular corretores e criar comissões
      const effectiveBrokerIds = brokerIds.length > 0 ? brokerIds : (lead.assigned_user_id ? [lead.assigned_user_id] : []);

      if (effectiveBrokerIds.length > 0) {
        const perBrokerPercentage = commissionPercentage / effectiveBrokerIds.length;

        // Vincular corretores ao contrato
        const brokerEntries = effectiveBrokerIds.map(brokerId => ({
          contract_id: contractId,
          user_id: brokerId,
          commission_percentage: perBrokerPercentage,
        }));
        await (supabase as any).from('contract_brokers').insert(brokerEntries);

        // Criar comissões
        const commissions = effectiveBrokerIds.map(brokerId => ({
          organization_id: orgId,
          contract_id: contractId,
          lead_id: leadId,
          user_id: brokerId,
          property_id: lead.property_id,
          base_value: value,
          percentage: perBrokerPercentage,
          calculated_value: value * (perBrokerPercentage / 100),
          amount: value * (perBrokerPercentage / 100),
          status: 'forecast',
          forecast_date: new Date().toISOString().split('T')[0],
          notes: `Comissão automática - ${contractNumber}`,
        }));

        await (supabase as any).from('commissions').insert(commissions);

        // Criar conta a pagar (comissão total)
        const totalCommission = value * (commissionPercentage / 100);
        if (totalCommission > 0) {
          await supabase.from('financial_entries').insert({
            organization_id: orgId,
            contract_id: contractId,
            lead_id: leadId,
            type: 'payable',
            category: 'Comissão',
            description: `Comissões - ${contractNumber}`,
            amount: totalCommission,
            due_date: new Date().toISOString().split('T')[0],
            status: 'pending',
            created_by: user.id,
          } as never);
        }
      }

      // 8. Atualizar lead como won
      await supabase
        .from('leads')
        .update({
          deal_status: 'won',
          won_at: new Date().toISOString(),
        } as never)
        .eq('id', leadId);

      // 9. Registrar auditoria
      logAuditAction(
        'auto_create_contract',
        'contract',
        contractId,
        undefined,
        {
          contract_number: contractNumber,
          lead_id: leadId,
          lead_name: lead.name,
          value,
          down_payment: downPayment,
          installments,
          commission_percentage: commissionPercentage,
          brokers_count: effectiveBrokerIds.length,
        },
        orgId
      ).catch(console.error);

      return {
        contractId,
        contractNumber,
        installmentsCreated: installments,
        downPaymentCreated: downPayment > 0,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      queryClient.invalidateQueries({ queryKey: ['stages-with-leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-dashboard-stats'] });

      toast.success('🎉 Contrato criado automaticamente!', {
        description: `${data.contractNumber} - ${data.installmentsCreated} parcelas geradas`,
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao criar contrato automático:', error);
      toast.error('Erro ao criar contrato', { description: error.message });
    },
  });
}
