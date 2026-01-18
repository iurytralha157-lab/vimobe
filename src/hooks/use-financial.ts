import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FinancialEntry {
  id: string;
  type: string;
  category: string | null;
  description: string | null;
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  status: string | null;
  payment_method: string | null;
  notes: string | null;
  lead_id: string | null;
  contract_id: string | null;
  broker_id: string | null;
  organization_id: string;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useFinancialEntries(filters?: { type?: string; status?: string }) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["financial-entries", profile?.organization_id, filters],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      let query = supabase
        .from("financial_entries")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("due_date", { ascending: false });

      if (filters?.type) query = query.eq("type", filters.type);
      if (filters?.status) query = query.eq("status", filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return data as FinancialEntry[];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useFinancialSummary() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["financial-summary", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return { totalReceitas: 0, totalDespesas: 0, saldo: 0, receitasPendentes: 0, despesasPendentes: 0 };

      const { data, error } = await supabase
        .from("financial_entries")
        .select("type, status, amount")
        .eq("organization_id", profile.organization_id);

      if (error) throw error;

      let totalReceitas = 0, totalDespesas = 0, receitasPendentes = 0, despesasPendentes = 0;
      data?.forEach((e) => {
        if (e.type === "receita") {
          if (e.status === "pago") totalReceitas += e.amount;
          else receitasPendentes += e.amount;
        } else {
          if (e.status === "pago") totalDespesas += e.amount;
          else despesasPendentes += e.amount;
        }
      });

      return { totalReceitas, totalDespesas, saldo: totalReceitas - totalDespesas, receitasPendentes, despesasPendentes };
    },
    enabled: !!profile?.organization_id,
  });
}

export function useCreateFinancialEntry() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (entry: Partial<FinancialEntry>) => {
      if (!profile?.organization_id || !user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("financial_entries")
        .insert({
          type: entry.type || "receita",
          amount: entry.amount || 0,
          category: entry.category,
          description: entry.description,
          due_date: entry.due_date,
          paid_date: entry.paid_date,
          status: entry.status || "pendente",
          payment_method: entry.payment_method,
          lead_id: entry.lead_id,
          broker_id: entry.broker_id,
          notes: entry.notes,
          organization_id: profile.organization_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-entries"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      toast.success("Lançamento criado!");
    },
  });
}

export function useUpdateFinancialEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; paid_date?: string }) => {
      const { data, error } = await supabase.from("financial_entries").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-entries"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      toast.success("Lançamento atualizado!");
    },
  });
}

export function useDeleteFinancialEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-entries"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      toast.success("Lançamento excluído!");
    },
  });
}
