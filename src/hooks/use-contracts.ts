import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Contract {
  id: string;
  contract_number: string | null;
  contract_type: string | null;
  status: string | null;
  value: number | null;
  commission_percentage: number | null;
  commission_value: number | null;
  signing_date: string | null;
  closing_date: string | null;
  notes: string | null;
  lead_id: string | null;
  property_id: string | null;
  organization_id: string;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useContracts(filters?: { status?: string }) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["contracts", profile?.organization_id, filters],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      let query = supabase
        .from("contracts")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Contract[];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (contract: Partial<Contract>) => {
      if (!profile?.organization_id || !user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("contracts")
        .insert({
          contract_number: contract.contract_number,
          contract_type: contract.contract_type,
          status: contract.status || "draft",
          value: contract.value,
          commission_percentage: contract.commission_percentage,
          signing_date: contract.signing_date,
          closing_date: contract.closing_date,
          lead_id: contract.lead_id,
          property_id: contract.property_id,
          notes: contract.notes,
          organization_id: profile.organization_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrato criado!");
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrato excluído!");
    },
  });
}
