import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Commission {
  id: string;
  user_id: string;
  lead_id: string | null;
  amount: number;
  percentage: number | null;
  status: string | null;
  paid_at: string | null;
  notes: string | null;
  organization_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export function useCommissions(filters?: { status?: string }) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["commissions", profile?.organization_id, filters],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      let query = supabase
        .from("commissions")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });

      if (filters?.status) query = query.eq("status", filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return data as Commission[];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useCommissionsSummary() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["commissions-summary", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return { total: 0, pending: 0, paid: 0 };

      const { data, error } = await supabase
        .from("commissions")
        .select("amount, status")
        .eq("organization_id", profile.organization_id);

      if (error) throw error;

      let total = 0, pending = 0, paid = 0;
      data?.forEach((c) => {
        total += c.amount;
        if (c.status === "paid") paid += c.amount;
        else pending += c.amount;
      });

      return { total, pending, paid };
    },
    enabled: !!profile?.organization_id,
  });
}

export function useCreateCommission() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (commission: Partial<Commission>) => {
      if (!profile?.organization_id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("commissions")
        .insert({
          user_id: commission.user_id || "",
          amount: commission.amount || 0,
          percentage: commission.percentage,
          lead_id: commission.lead_id,
          status: commission.status || "pending",
          organization_id: profile.organization_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast.success("Comissão criada!");
    },
  });
}

export function useUpdateCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; paid_at?: string }) => {
      const { data, error } = await supabase.from("commissions").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast.success("Comissão atualizada!");
    },
  });
}
