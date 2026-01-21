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
  role?: string;
  created_at: string;
  user?: { id: string; name: string; email: string };
}

export interface Contract {
  id: string;
  organization_id: string;
  contract_number: string | null;
  contract_type: string | null;
  status: string | null;
  property_id?: string | null;
  lead_id?: string | null;
  value: number | null;
  commission_percentage: number | null;
  commission_value: number | null;
  // Novos campos adicionados na migration
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  client_document?: string | null;
  down_payment?: number | null;
  installments?: number | null;
  payment_conditions?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  signing_date?: string | null;
  closing_date?: string | null;
  notes?: string | null;
  attachments?: unknown;
  created_by?: string | null;
  created_at: string | null;
  updated_at: string | null;
  property?: { id: string; code: string; title: string | null } | null;
  lead?: { id: string; name: string } | null;
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
      let query = (supabase as any)
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
        query = query.eq('contract_type', filters.type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Contract[];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      if (!id) return null;

      const { data: contract, error } = await (supabase as any)
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

      const { data: contract, error } = await (supabase as any)
        .from('contracts')
        .insert({
          ...contractData,
          contract_number: contractNumber,
          organization_id: orgId,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      const contractTyped = contract as Contract;

      // Insert brokers if provided
      if (brokers && brokers.length > 0) {
        const brokerEntries = brokers.map(b => ({
          contract_id: contractTyped.id,
          user_id: b.user_id,
          commission_percentage: b.commission_percentage,
          commission_value: (contractData.value || 0) * (b.commission_percentage / 100),
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
      const { data: contract, error } = await (supabase as any)
        .from('contracts')
        .update(data)
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
            commission_value: (data.value || 0) * (b.commission_percentage / 100),
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
      const { data: contractRaw, error: contractError } = await (supabase as any)
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (contractError) throw contractError;

      const contract = contractRaw as Contract;

      // Get brokers
      const { data: brokersRaw } = await (supabase as any)
        .from('contract_brokers')
        .select('*')
        .eq('contract_id', contractId);

      const brokers = (brokersRaw || []) as ContractBroker[];

      // Update contract status
      await (supabase as any)
        .from('contracts')
        .update({ status: 'active', signing_date: new Date().toISOString().split('T')[0] })
        .eq('id', contractId);

      // Generate receivable entries
      const orgId = organization?.id || profile?.organization_id;
      const totalValue = contract.value || 0;
      const entries: Record<string, unknown>[] = [];

      // Commission entries for brokers
      const commissions = brokers.map((broker) => ({
        organization_id: orgId,
        contract_id: contractId,
        user_id: broker.user_id,
        property_id: contract.property_id,
        base_value: totalValue,
        percentage: broker.commission_percentage,
        calculated_value: totalValue * (broker.commission_percentage / 100),
        status: 'forecast',
        forecast_date: new Date().toISOString().split('T')[0],
      }));

      if (commissions.length > 0) {
        await (supabase as any).from('commissions').insert(commissions);
      }

      return contract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract'] });
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
      toast({ title: "Contrato ativado com sucesso", description: "Comissões foram geradas automaticamente." });
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
