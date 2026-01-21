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
  category?: string;
  contract_id?: string;
  lead_id?: string;
  broker_id?: string;
  description?: string;
  amount: number;
  due_date?: string;
  paid_date?: string;
  payment_method?: string;
  status?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  contract?: { contract_number?: string };
  // Installments
  installment_number?: number;
  total_installments?: number;
  // Recurring
  is_recurring?: boolean;
  recurring_type?: 'monthly' | 'weekly' | 'yearly';
  parent_entry_id?: string;
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
          contract:contracts(contract_number)
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
    mutationFn: async (data: Partial<FinancialEntry>) => {
      const orgId = organization?.id || profile?.organization_id;
      
      const { data: result, error } = await supabase
        .from('financial_entries')
        .insert({
          type: data.type,
          category: data.category,
          description: data.description,
          amount: data.amount,
          due_date: data.due_date,
          payment_method: data.payment_method,
          contract_id: data.contract_id || null,
          notes: data.notes,
          status: data.status || 'pending',
          organization_id: orgId,
          created_by: user?.id,
        } as never)
        .select()
        .single();

      if (error) throw error;
      return result;
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

      // Calculate 6 months ago for historical data
      const sixMonthsAgo = new Date(today);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Fetch all pending receivables
      const { data: receivables } = await supabase
        .from('financial_entries')
        .select('amount, due_date')
        .eq('type', 'receivable')
        .eq('status', 'pending');

      // Fetch all pending payables
      const { data: payables } = await supabase
        .from('financial_entries')
        .select('amount, due_date')
        .eq('type', 'payable')
        .eq('status', 'pending');

      // Fetch all paid entries for the last 6 months (for cash flow chart)
      const { data: paidEntries } = await supabase
        .from('financial_entries')
        .select('amount, type, paid_date')
        .eq('status', 'paid')
        .gte('paid_date', sixMonthsAgo.toISOString().split('T')[0]);

      // Fetch commissions
      const { data: commissions } = await supabase
        .from('commissions')
        .select('amount, status');

      // Calculate totals
      const receivablesTyped = receivables as { amount: number; due_date: string }[] || [];
      const payablesTyped = payables as { amount: number; due_date: string }[] || [];
      const commissionsTyped = commissions as { amount: number; status: string }[] || [];
      const paidEntriesTyped = paidEntries as { amount: number; type: string; paid_date: string }[] || [];

      const receivable30 = receivablesTyped.filter(r => new Date(r.due_date) <= days30).reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const receivable60 = receivablesTyped.filter(r => new Date(r.due_date) <= days60).reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const receivable90 = receivablesTyped.filter(r => new Date(r.due_date) <= days90).reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const totalPayable = payablesTyped.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const forecastCommissions = commissionsTyped.filter(c => c.status === 'forecast' || c.status === 'pending').reduce((sum, c) => sum + Number(c.amount || 0), 0);
      const paidCommissions = commissionsTyped.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.amount || 0), 0);
      const pendingCommissions = commissionsTyped.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.amount || 0), 0);

      // Overdue entries (sum values, not count)
      const overdueReceivables = receivablesTyped.filter(r => new Date(r.due_date) < today).reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const overduePayables = payablesTyped.filter(p => new Date(p.due_date) < today).reduce((sum, p) => sum + Number(p.amount || 0), 0);

      // Build monthly cash flow data for the last 6 months
      const monthlyData: { month: string; receitas: number; despesas: number }[] = [];
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        const year = date.getFullYear();
        const month = date.getMonth();
        
        const monthReceitas = paidEntriesTyped
          .filter(e => {
            const paidDate = new Date(e.paid_date);
            return e.type === 'receivable' && paidDate.getMonth() === month && paidDate.getFullYear() === year;
          })
          .reduce((sum, e) => sum + Number(e.amount || 0), 0);

        const monthDespesas = paidEntriesTyped
          .filter(e => {
            const paidDate = new Date(e.paid_date);
            return e.type === 'payable' && paidDate.getMonth() === month && paidDate.getFullYear() === year;
          })
          .reduce((sum, e) => sum + Number(e.amount || 0), 0);

        monthlyData.push({
          month: `${monthNames[month]}/${String(year).slice(2)}`,
          receitas: monthReceitas,
          despesas: monthDespesas,
        });
      }

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
        monthlyData,
      };
    },
    enabled: !!profile?.organization_id,
  });
}
