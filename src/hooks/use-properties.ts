import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

export type Property = Tables<'properties'>;

// Campos otimizados para listagem (evita SELECT *)
const PROPERTY_LIST_FIELDS = `
  id, code, title, tipo_de_imovel, tipo_de_negocio, 
  status, destaque, bairro, cidade, uf,
  quartos, banheiros, vagas, area_util, preco, 
  imagem_principal, created_at, organization_id
`;

export function useProperties(search?: string) {
  return useQuery({
    queryKey: ['properties', search],
    queryFn: async () => {
      let query = supabase
        .from('properties')
        .select(PROPERTY_LIST_FIELDS)
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (search) {
        query = query.or(`code.ilike.%${search}%,title.ilike.%${search}%,bairro.ilike.%${search}%,cidade.ilike.%${search}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Property[];
    },
  });
}

export function useProperty(id: string | null) {
  return useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Property;
    },
    enabled: !!id,
  });
}

async function generatePropertyCode(organizationId: string, tipoImovel: string): Promise<string> {
  const prefix = tipoImovel === 'Casa' ? 'CA' : 
                 tipoImovel === 'Cobertura' ? 'CB' :
                 tipoImovel === 'Comercial' ? 'CO' : 'AP';
  
  const { data: seq } = await supabase
    .from('property_sequences')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('prefix', prefix)
    .single();
  
  let nextNumber = 1;
  
  if (seq) {
    nextNumber = (seq.last_number || 0) + 1;
    await supabase
      .from('property_sequences')
      .update({ last_number: nextNumber })
      .eq('id', seq.id);
  } else {
    await supabase
      .from('property_sequences')
      .insert({ organization_id: organizationId, prefix, last_number: 1 });
  }
  
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (propertyInput: Omit<Partial<Property>, 'id' | 'code' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');
      
      // Check if impersonating
      const impersonating = localStorage.getItem('impersonating');
      let organizationId: string | null = null;
      
      if (impersonating) {
        const session = JSON.parse(impersonating);
        organizationId = session.orgId;
      } else {
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.user.id)
          .single();
        organizationId = userData?.organization_id || null;
      }
      
      if (!organizationId) throw new Error('Organização não encontrada');
      
      const code = await generatePropertyCode(organizationId, propertyInput.tipo_de_imovel || 'Apartamento');
      
      const { data, error } = await supabase
        .from('properties')
        .insert({
          ...propertyInput,
          code,
          organization_id: organizationId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Imóvel cadastrado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao cadastrar imóvel: ' + error.message);
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Property> & { id: string }) => {
      const { data, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', variables.id] });
      toast.success('Imóvel atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar imóvel: ' + error.message);
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Imóvel excluído!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir imóvel: ' + error.message);
    },
  });
}