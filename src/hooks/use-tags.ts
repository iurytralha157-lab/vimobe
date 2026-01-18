import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Tag {
  id: string;
  name: string;
  color: string;
  description: string | null;
  organization_id: string;
  created_at: string;
}

export function useTags() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["tags", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name");

      if (error) throw error;
      return data as Tag[];
    },
    enabled: !!organization?.id,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { name: string; color?: string; description?: string }) => {
      if (!organization?.id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("tags")
        .insert({
          name: input.name,
          color: input.color || "#6366f1",
          description: input.description,
          organization_id: organization.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast({ title: "Tag criada!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar tag",
        description: error.message,
      });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast({ title: "Tag excluída!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir tag",
        description: error.message,
      });
    },
  });
}

export function useAddTagToLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, tagId }: { leadId: string; tagId: string }) => {
      const { error } = await supabase.from("lead_tags").insert({
        lead_id: leadId,
        tag_id: tagId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useRemoveTagFromLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, tagId }: { leadId: string; tagId: string }) => {
      const { error } = await supabase
        .from("lead_tags")
        .delete()
        .eq("lead_id", leadId)
        .eq("tag_id", tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
