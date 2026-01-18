import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Property {
  id: string;
  code: string;
  title: string | null;
  descricao: string | null;
  organization_id: string;
  tipo_de_imovel: string | null;
  tipo_de_negocio: string | null;
  status: string | null;
  preco: number | null;
  area_util: number | null;
  area_total: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  andar: number | null;
  condominio: number | null;
  iptu: number | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  destaque: boolean | null;
  imagem_principal: string | null;
  fotos: string[] | null;
  video_imovel: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePropertyInput {
  code?: string;
  title?: string;
  descricao?: string;
  tipo_de_imovel?: string;
  tipo_de_negocio?: string;
  status?: string;
  preco?: number;
  area_util?: number;
  area_total?: number;
  quartos?: number;
  suites?: number;
  banheiros?: number;
  vagas?: number;
  andar?: number;
  condominio?: number;
  iptu?: number;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  destaque?: boolean;
  imagem_principal?: string;
  fotos?: string[];
}

export function useProperties(filters?: {
  status?: string;
  tipoNegocio?: string;
  tipoImovel?: string;
  search?: string;
}) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["properties", organization?.id, filters],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from("properties")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.tipoNegocio) {
        query = query.eq("tipo_de_negocio", filters.tipoNegocio);
      }
      if (filters?.tipoImovel) {
        query = query.eq("tipo_de_imovel", filters.tipoImovel);
      }
      if (filters?.search) {
        query = query.or(
          `code.ilike.%${filters.search}%,title.ilike.%${filters.search}%,bairro.ilike.%${filters.search}%,cidade.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Property[];
    },
    enabled: !!organization?.id,
  });
}

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Property;
    },
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreatePropertyInput) => {
      if (!organization?.id) throw new Error("No organization");

      // Generate code if not provided
      let code = input.code;
      if (!code) {
        const { data: sequence } = await supabase
          .from("property_sequences")
          .select("*")
          .eq("organization_id", organization.id)
          .single();

        const nextNumber = (sequence?.last_number || 0) + 1;
        code = `${sequence?.prefix || "IMV"}${String(nextNumber).padStart(4, "0")}`;

        // Update sequence
        if (sequence) {
          await supabase
            .from("property_sequences")
            .update({ last_number: nextNumber })
            .eq("id", sequence.id);
        } else {
          await supabase.from("property_sequences").insert({
            organization_id: organization.id,
            prefix: "IMV",
            last_number: nextNumber,
          });
        }
      }

      const { data, error } = await supabase
        .from("properties")
        .insert({
          ...input,
          code,
          organization_id: organization.id,
          status: input.status || "disponivel",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast({ title: "Imóvel cadastrado!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar imóvel",
        description: error.message,
      });
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Property> & { id: string }) => {
      const { data, error } = await supabase
        .from("properties")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["property", data.id] });
      toast({ title: "Imóvel atualizado!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar imóvel",
        description: error.message,
      });
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast({ title: "Imóvel excluído!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir imóvel",
        description: error.message,
      });
    },
  });
}
