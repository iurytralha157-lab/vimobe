import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  stage_id: string | null;
  pipeline_id: string | null;
  assigned_user_id: string | null;
  organization_id: string;
  property_id: string | null;
  property_code: string | null;
  stage_entered_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  stage?: { id: string; name: string; color: string | null; position: number };
  assigned_user?: { id: string; name: string; avatar_url: string | null };
  property?: { id: string; code: string; title: string | null };
  tags?: { id: string; name: string; color: string }[];
}

export interface CreateLeadInput {
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  stage_id?: string;
  pipeline_id?: string;
  assigned_user_id?: string;
  property_id?: string;
  property_code?: string;
}

export interface UpdateLeadInput extends Partial<CreateLeadInput> {
  id: string;
}

export function useLeads(filters?: {
  stageId?: string;
  assignedUserId?: string;
  pipelineId?: string;
  search?: string;
}) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["leads", organization?.id, filters],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from("leads")
        .select(`
          *,
          stage:stages(id, name, color, position),
          assigned_user:users!leads_assigned_user_id_fkey(id, name, avatar_url),
          property:properties(id, code, title),
          lead_tags(tag:tags(id, name, color))
        `)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (filters?.stageId) {
        query = query.eq("stage_id", filters.stageId);
      }
      if (filters?.assignedUserId) {
        query = query.eq("assigned_user_id", filters.assignedUserId);
      }
      if (filters?.pipelineId) {
        query = query.eq("pipeline_id", filters.pipelineId);
      }
      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((lead) => ({
        ...lead,
        tags: lead.lead_tags?.map((lt: any) => lt.tag) || [],
      })) as Lead[];
    },
    enabled: !!organization?.id,
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("leads")
        .select(`
          *,
          stage:stages(id, name, color, position),
          assigned_user:users!leads_assigned_user_id_fkey(id, name, avatar_url, email),
          property:properties(id, code, title, preco, bairro, cidade),
          lead_tags(tag:tags(id, name, color))
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      return {
        ...data,
        tags: data.lead_tags?.map((lt: any) => lt.tag) || [],
      } as Lead;
    },
    enabled: !!id,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateLeadInput) => {
      if (!organization?.id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("leads")
        .insert({
          ...input,
          organization_id: organization.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead criado com sucesso!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar lead",
        description: error.message,
      });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateLeadInput) => {
      const { data, error } = await supabase
        .from("leads")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead", data.id] });
      toast({ title: "Lead atualizado!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar lead",
        description: error.message,
      });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead excluído!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir lead",
        description: error.message,
      });
    },
  });
}

export function useMoveLeadToStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, stageId }: { leadId: string; stageId: string }) => {
      const { data, error } = await supabase
        .from("leads")
        .update({ 
          stage_id: stageId,
          stage_entered_at: new Date().toISOString(),
        })
        .eq("id", leadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

// Lightweight hook for counting leads (used in OnboardingChecklist)
export function useLeadsCount() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["leads-count", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return 0;
      
      const { count, error } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization.id);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
