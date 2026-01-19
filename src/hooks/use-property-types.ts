import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PropertyType {
  id: string;
  name: string;
  organization_id: string;
  created_at: string | null;
}

export function usePropertyTypes() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["property-types", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("property_types")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as PropertyType[];
    },
    enabled: !!organization?.id,
  });
}

export function useCreatePropertyType() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!organization?.id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("property_types")
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
      queryClient.invalidateQueries({ queryKey: ["property-types"] });
      toast.success("Tipo de imóvel criado!");
    },
    onError: (error) => {
      toast.error("Erro ao criar tipo: " + error.message);
    },
  });
}

export function useDeletePropertyType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("property_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-types"] });
      toast.success("Tipo excluído!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });
}
