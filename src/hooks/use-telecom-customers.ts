import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TelecomCustomer {
  id: string;
  organization_id: string;
  external_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  cpf_cnpj: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  uf: string | null;
  cep: string | null;
  plan_id: string | null;
  plan_code: string | null;
  plan_value: number | null;
  due_day: number | null;
  seller_id: string | null;
  status: string;
  installation_date: string | null;
  contract_date: string | null;
  chip_category: string | null;
  chip_quantity: number | null;
  mesh_repeater: string | null;
  mesh_quantity: number | null;
  is_combo: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  plan?: {
    id: string;
    name: string;
    code: string;
    price: number;
  } | null;
  seller?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateTelecomCustomerInput {
  external_id?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  cpf_cnpj?: string | null;
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  uf?: string | null;
  cep?: string | null;
  plan_id?: string | null;
  plan_value?: number | null;
  due_day?: number | null;
  seller_id?: string | null;
  status?: string;
  installation_date?: string | null;
  contract_date?: string | null;
  chip_category?: string | null;
  chip_quantity?: number | null;
  mesh_repeater?: string | null;
  mesh_quantity?: number | null;
  is_combo?: boolean;
  notes?: string | null;
}

export const CHIP_CATEGORIES = [
  { value: 'CONVENCIONAL', label: 'Convencional' },
  { value: 'PROMOCIONAL', label: 'Promocional' },
  { value: 'SEM_CHIP', label: 'Sem Chip' },
] as const;

export const MESH_REPEATER_OPTIONS = [
  { value: 'NO_ATO', label: 'No Ato' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'SEM_REPETIDOR', label: 'Sem Repetidor' },
] as const;

export const TELECOM_CUSTOMER_STATUSES = [
  { value: 'NOVO', label: 'Novo', color: 'bg-blue-500' },
  { value: 'INSTALADOS', label: 'Instalado', color: 'bg-green-500' },
  { value: 'AGUARDANDO', label: 'Aguardando', color: 'bg-yellow-500' },
  { value: 'EM_ANALISE', label: 'Em Análise', color: 'bg-purple-500' },
  { value: 'CANCELADO', label: 'Cancelado', color: 'bg-red-500' },
  { value: 'SUSPENSO', label: 'Suspenso', color: 'bg-orange-500' },
  { value: 'INADIMPLENTE', label: 'Inadimplente', color: 'bg-red-400' },
] as const;

export function useTelecomCustomers(filters?: {
  status?: string;
  search?: string;
  plan_id?: string;
}) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['telecom-customers', organization?.id, filters],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      let query = supabase
        .from('telecom_customers')
        .select(`
          *,
          plan:service_plans(id, name, code, price),
          seller:users!telecom_customers_seller_id_fkey(id, name)
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.plan_id) {
        query = query.eq('plan_id', filters.plan_id);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%,cpf_cnpj.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TelecomCustomer[];
    },
    enabled: !!organization?.id,
  });
}

export function useTelecomCustomerStats() {
  const { data: customers = [] } = useTelecomCustomers();

  const stats = {
    total: customers.length,
    instalados: customers.filter(c => c.status === 'INSTALADOS').length,
    cancelados: customers.filter(c => c.status === 'CANCELADO').length,
    aguardando: customers.filter(c => c.status === 'AGUARDANDO').length,
    inadimplentes: customers.filter(c => c.status === 'INADIMPLENTE').length,
  };

  return stats;
}

export function useCreateTelecomCustomer() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateTelecomCustomerInput) => {
      if (!organization?.id) throw new Error('Organização não encontrada');

      const { data, error } = await supabase
        .from('telecom_customers')
        .insert({
          organization_id: organization.id,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telecom-customers'] });
      toast.success('Cliente cadastrado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cadastrar cliente: ${error.message}`);
    },
  });
}

export function useUpdateTelecomCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<TelecomCustomer> & { id: string }) => {
      const { data, error } = await supabase
        .from('telecom_customers')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telecom-customers'] });
      toast.success('Cliente atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar cliente: ${error.message}`);
    },
  });
}

export function useDeleteTelecomCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('telecom_customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telecom-customers'] });
      toast.success('Cliente excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir cliente: ${error.message}`);
    },
  });
}
