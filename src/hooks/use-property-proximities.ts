import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PropertyProximity {
  id: string;
  name: string;
  icon: string | null;
  organization_id: string;
  created_at: string | null;
}

export const DEFAULT_PROXIMITIES = [
  "Metrô",
  "Ponto de Ônibus",
  "Shopping",
  "Supermercado",
  "Farmácia",
  "Hospital",
  "Escola",
  "Universidade",
  "Parque",
  "Praia",
  "Academia",
  "Restaurantes",
  "Bancos",
  "Padaria",
  "Mercado Municipal",
  "Centro Comercial",
  "Teatro/Cinema",
  "Igreja",
  "Delegacia",
  "Bombeiros",
];

export function usePropertyProximities() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["property-proximities", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("property_proximities")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as PropertyProximity[];
    },
    enabled: !!organization?.id,
  });
}

export function useCreatePropertyProximity() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!organization?.id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("property_proximities")
        .insert({
          name,
          organization_id: organization.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-proximities"] });
      toast.success("Proximidade criada!");
    },
    onError: (error) => {
      toast.error("Erro ao criar: " + error.message);
    },
  });
}

export function useSeedDefaultProximities() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error("No organization");

      const proximities = DEFAULT_PROXIMITIES.map((name) => ({
        name,
        organization_id: organization.id,
      }));

      const { error } = await supabase.from("property_proximities").insert(proximities);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-proximities"] });
    },
  });
}
