import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface FinancialCategory {
  id: string;
  organization_id: string;
  name: string;
  type: 'income' | 'expense';
  created_at: string;
}

export interface FinancialEntry {
  id: string;
  organization_id: string;
  type: 'payable' | 'receivable';
  category_id?: string;
  contract_id?: string;
  property_id?: string;
  related_person_type?: 'client' | 'broker' | 'supplier';
  related_person_id?: string;
  related_person_name?: string;
  description: string;
  value: number;
  due_date: string;
  competence_date?: string;
  payment_method?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_at?: string;
  paid_value?: number;
  installment_number: number;
  total_installments: number;
  parent_entry_id?: string;
  attachments: string[];
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  category?: FinancialCategory;
  contract?: { contract_number: string; client_name: string };
  property?: { code: string; title: string };
}

export function useFinancialCategories() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['financial-categories', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('financial_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as FinancialCategory[];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useCreateFinancialCategory() {
  const queryClient = useQueryClient();
  const { profile, organization } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string; type: 'income' | 'expense' }) => {
      const orgId = organization?.id || profile?.organization_id;
      const { data: result, error } = await (supabase as any)
        .from('financial_categories')
        .insert({
          name: data.name,
          type: data.type,
          organization_id: orgId,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-categories'] });
      toast({ title: "Categoria criada com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar categoria", description: error.message, variant: "destructive" });
    },
  });
}

export function useFinancialEntries(filters?: { type?: string; status?: string; startDate?: string; endDate?: string }) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['financial-entries', profile?.organization_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('financial_entries')
        .select(`
          *,
          category:financial_categories(id, name, type),
          contract:contracts(contract_number, client_name),
          property:properties(code, title)
        `)
        .order('due_date', { ascending: true });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.startDate) {
        query = query.gte('due_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('due_date', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as FinancialEntry[];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useCreateFinancialEntry() {
  const queryClient = useQueryClient();
  const { profile, user, organization } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<FinancialEntry> & { generateInstallments?: boolean }) => {
      const { generateInstallments, ...entryData } = data;
      const orgId = organization?.id || profile?.organization_id;
      
      if (generateInstallments && entryData.total_installments && entryData.total_installments > 1) {
        const entries = [];
        const baseDate = new Date(entryData.due_date!);
        const installmentValue = entryData.value! / entryData.total_installments;

        for (let i = 0; i < entryData.total_installments; i++) {
          const dueDate = new Date(baseDate);
          dueDate.setMonth(dueDate.getMonth() + i);
          
          entries.push({
            ...entryData,
            organization_id: orgId,
            created_by: user?.id,
            value: installmentValue,
            installment_number: i + 1,
            due_date: dueDate.toISOString().split('T')[0],
          });
        }

        const { data: result, error } = await supabase
          .from('financial_entries')
          .insert(entries as never[])
          .select();

        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await supabase
          .from('financial_entries')
          .insert({
            ...entryData,
            organization_id: orgId,
            created_by: user?.id,
          } as never)
          .select()
          .single();

        if (error) throw error;
        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
      toast({ title: "Lançamento criado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar lançamento", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateFinancialEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<FinancialEntry> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('financial_entries')
        .update(data as never)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
      toast({ title: "Lançamento atualizado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar lançamento", description: error.message, variant: "destructive" });
    },
  });
}

export function useMarkEntryAsPaid() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, paid_value }: { id: string; paid_value?: number }) => {
      const { data: result, error } = await supabase
        .from('financial_entries')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_value,
        } as never)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
      toast({ title: "Pagamento registrado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar pagamento", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteFinancialEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
      toast({ title: "Lançamento excluído com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir lançamento", description: error.message, variant: "destructive" });
    },
  });
}

export function useFinancialDashboard() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['financial-dashboard', profile?.organization_id],
    queryFn: async () => {
      const today = new Date();
      const days30 = new Date(today);
      days30.setDate(days30.getDate() + 30);
      const days60 = new Date(today);
      days60.setDate(days60.getDate() + 60);
      const days90 = new Date(today);
      days90.setDate(days90.getDate() + 90);

      // Fetch all pending receivables
      const { data: receivables } = await supabase
        .from('financial_entries')
        .select('value, due_date')
        .eq('type', 'receivable')
        .eq('status', 'pending');

      // Fetch all pending payables
      const { data: payables } = await supabase
        .from('financial_entries')
        .select('value, due_date')
        .eq('type', 'payable')
        .eq('status', 'pending');

      // Fetch commissions
      const { data: commissions } = await supabase
        .from('commissions')
        .select('calculated_value, status');

      // Calculate totals
      const receivablesTyped = receivables as unknown as { value: number; due_date: string }[] || [];
      const payablesTyped = payables as unknown as { value: number; due_date: string }[] || [];
      const commissionsTyped = commissions as unknown as { calculated_value: number; status: string }[] || [];

      const receivable30 = receivablesTyped.filter(r => new Date(r.due_date) <= days30).reduce((sum, r) => sum + Number(r.value), 0);
      const receivable60 = receivablesTyped.filter(r => new Date(r.due_date) <= days60).reduce((sum, r) => sum + Number(r.value), 0);
      const receivable90 = receivablesTyped.filter(r => new Date(r.due_date) <= days90).reduce((sum, r) => sum + Number(r.value), 0);
      const totalPayable = payablesTyped.reduce((sum, p) => sum + Number(p.value), 0);

      const forecastCommissions = commissionsTyped.filter(c => c.status === 'forecast' || c.status === 'approved').reduce((sum, c) => sum + Number(c.calculated_value), 0);
      const paidCommissions = commissionsTyped.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.calculated_value), 0);
      const pendingCommissions = commissionsTyped.filter(c => c.status === 'approved').reduce((sum, c) => sum + Number(c.calculated_value), 0);

      // Overdue entries
      const overdueReceivables = receivablesTyped.filter(r => new Date(r.due_date) < today).length;
      const overduePayables = payablesTyped.filter(p => new Date(p.due_date) < today).length;

      return {
        receivable30,
        receivable60,
        receivable90,
        totalPayable,
        forecastCommissions,
        paidCommissions,
        pendingCommissions,
        overdueReceivables,
        overduePayables,
      };
    },
    enabled: !!profile?.organization_id,
  });
}
