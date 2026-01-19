import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PropertyFeature {
  id: string;
  name: string;
  icon: string | null;
  organization_id: string;
  created_at: string | null;
}

export const DEFAULT_FEATURES = [
  "Ar Condicionado",
  "Aquecedor",
  "Churrasqueira",
  "Piscina",
  "Academia",
  "Playground",
  "Salão de Festas",
  "Quadra Esportiva",
  "Portaria 24h",
  "Elevador",
  "Varanda/Sacada",
  "Armários Embutidos",
  "Área de Serviço",
  "Depósito/Despensa",
  "Jardim",
  "Vista para o Mar",
  "Vista Panorâmica",
  "Pet Friendly",
  "Closet",
  "Suíte Master",
];

export function usePropertyFeatures() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["property-features", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("property_features")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as PropertyFeature[];
    },
    enabled: !!organization?.id,
  });
}

export function useCreatePropertyFeature() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!organization?.id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("property_features")
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
      queryClient.invalidateQueries({ queryKey: ["property-features"] });
      toast.success("Característica criada!");
    },
    onError: (error) => {
      toast.error("Erro ao criar: " + error.message);
    },
  });
}

export function useSeedDefaultFeatures() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error("No organization");

      const features = DEFAULT_FEATURES.map((name) => ({
        name,
        organization_id: organization.id,
      }));

      const { error } = await supabase.from("property_features").insert(features);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-features"] });
    },
  });
}
