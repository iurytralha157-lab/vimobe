import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ContractBroker {
  id: string;
  contract_id: string;
  user_id: string;
  commission_percentage: number;
  commission_value?: number;
  role: string;
  created_at: string;
  user?: { id: string; name: string; email: string };
}

export interface Contract {
  id: string;
  organization_id: string;
  contract_number: string;
  type: 'sale' | 'rental' | 'service';
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  property_id?: string;
  lead_id?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_document?: string;
  total_value: number;
  down_payment: number;
  installments: number;
  payment_conditions?: string;
  start_date?: string;
  end_date?: string;
  signing_date?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  property?: { id: string; code: string; title: string };
  lead?: { id: string; name: string };
  brokers?: ContractBroker[];
}

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

export function useContracts(filters?: { status?: string; type?: string }) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['contracts', profile?.organization_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('contracts')
        .select(`
          *,
          property:properties(id, code, title),
          lead:leads(id, name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Contract[];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      if (!id) return null;

      const { data: contract, error } = await supabase
        .from('contracts')
        .select(`
          *,
          property:properties(id, code, title),
          lead:leads(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch brokers separately with user info
      const { data: brokers } = await (supabase as any)
        .from('contract_brokers')
        .select('*')
        .eq('contract_id', id);

      // Fetch user details for each broker
      const brokersTyped = (brokers || []) as ContractBroker[];
      const brokersWithUsers = await Promise.all(
        brokersTyped.map(async (broker) => {
          const { data: user } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', broker.user_id)
            .single();
          return { ...broker, user };
        })
      );

      return { ...contract, brokers: brokersWithUsers } as Contract;
    },
    enabled: !!id,
  });
}

type CreateContractInput = Omit<Partial<Contract>, 'brokers'> & { 
  brokers?: { user_id: string; commission_percentage: number }[] 
};

type UpdateContractInput = Omit<Partial<Contract>, 'brokers'> & { 
  id: string;
  brokers?: { user_id: string; commission_percentage: number }[] 
};

export function useCreateContract() {
  const queryClient = useQueryClient();
  const { profile, user, organization } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateContractInput) => {
      const { brokers, ...contractData } = data;
      const orgId = organization?.id || profile?.organization_id;
      if (!orgId) throw new Error('Organização não encontrada');
      
      const contractNumber = await generateContractNumber(orgId);

      const { data: contract, error } = await supabase
        .from('contracts')
        .insert({
          ...contractData,
          contract_number: contractNumber,
          organization_id: orgId,
          created_by: user?.id,
        } as never)
        .select()
        .single();

      if (error) throw error;

      const contractTyped = contract as unknown as Contract;

      // Insert brokers if provided
      if (brokers && brokers.length > 0) {
        const brokerEntries = brokers.map(b => ({
          contract_id: contractTyped.id,
          user_id: b.user_id,
          commission_percentage: b.commission_percentage,
          commission_value: (contractData.total_value || 0) * (b.commission_percentage / 100),
        }));

        await (supabase as any).from('contract_brokers').insert(brokerEntries);
      }

      return contractTyped;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({ title: "Contrato criado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar contrato", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, brokers, ...data }: UpdateContractInput) => {
      const { data: contract, error } = await supabase
        .from('contracts')
        .update(data as never)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update brokers if provided
      if (brokers) {
        await (supabase as any).from('contract_brokers').delete().eq('contract_id', id);
        
        if (brokers.length > 0) {
          const brokerEntries = brokers.map(b => ({
            contract_id: id,
            user_id: b.user_id,
            commission_percentage: b.commission_percentage,
            commission_value: (data.total_value || 0) * (b.commission_percentage / 100),
          }));

          await (supabase as any).from('contract_brokers').insert(brokerEntries);
        }
      }

      return contract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract'] });
      toast({ title: "Contrato atualizado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar contrato", description: error.message, variant: "destructive" });
    },
  });
}

export function useActivateContract() {
  const queryClient = useQueryClient();
  const { profile, user, organization } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (contractId: string) => {
      // Get contract details
      const { data: contractRaw, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (contractError) throw contractError;

      const contract = contractRaw as unknown as Contract;

      // Get brokers
      const { data: brokersRaw } = await (supabase as any)
        .from('contract_brokers')
        .select('*')
        .eq('contract_id', contractId);

      const brokers = (brokersRaw || []) as ContractBroker[];

      // Update contract status
      await supabase
        .from('contracts')
        .update({ status: 'active', signing_date: new Date().toISOString().split('T')[0] } as never)
        .eq('id', contractId);

      // Generate receivable entries
      const orgId = organization?.id || profile?.organization_id;
      const installmentValue = (contract.total_value - (contract.down_payment || 0)) / contract.installments;
      const entries: Record<string, unknown>[] = [];
      const baseDate = new Date(contract.start_date || new Date());

      // Down payment entry if exists
      if (contract.down_payment > 0) {
        entries.push({
          organization_id: orgId,
          type: 'receivable',
          contract_id: contractId,
          property_id: contract.property_id,
          related_person_type: 'client',
          related_person_name: contract.client_name,
          description: `Entrada - ${contract.contract_number}`,
          value: contract.down_payment,
          due_date: baseDate.toISOString().split('T')[0],
          status: 'pending',
          installment_number: 0,
          total_installments: contract.installments + 1,
          created_by: user?.id,
        });
      }

      // Installment entries
      for (let i = 0; i < contract.installments; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(dueDate.getMonth() + i + 1);
        
        entries.push({
          organization_id: orgId,
          type: 'receivable',
          contract_id: contractId,
          property_id: contract.property_id,
          related_person_type: 'client',
          related_person_name: contract.client_name,
          description: `Parcela ${i + 1}/${contract.installments} - ${contract.contract_number}`,
          value: installmentValue,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'pending',
          installment_number: i + 1,
          total_installments: contract.installments,
          created_by: user?.id,
        });
      }

      if (entries.length > 0) {
        await supabase.from('financial_entries').insert(entries as never[]);
      }

      // Generate commission forecasts for brokers
      const commissions = brokers.map((broker) => ({
        organization_id: orgId,
        contract_id: contractId,
        user_id: broker.user_id,
        property_id: contract.property_id,
        base_value: contract.total_value,
        percentage: broker.commission_percentage,
        calculated_value: contract.total_value * (broker.commission_percentage / 100),
        status: 'forecast',
        forecast_date: new Date().toISOString().split('T')[0],
      }));

      if (commissions.length > 0) {
        await supabase.from('commissions').insert(commissions as never[]);
      }

      return contract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract'] });
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
      toast({ title: "Contrato ativado com sucesso", description: "Contas a receber e comissões foram geradas automaticamente." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao ativar contrato", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({ title: "Contrato excluído com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir contrato", description: error.message, variant: "destructive" });
    },
  });
}
