import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Invitation {
  id: string;
  email: string | null;
  token: string;
  organization_id: string;
  expires_at: string;
  used_at: string | null;
  created_at: string | null;
  created_by: string | null;
}

export function useAdminInvitations(organizationId?: string) {
  return useQuery({
    queryKey: ["admin-invitations", organizationId],
    queryFn: async () => {
      let query = supabase
        .from("invitations")
        .select("*")
        .is("used_at", null)
        .order("created_at", { ascending: false });

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!organizationId,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      organizationId, 
      email,
      role = "user",
    }: { 
      organizationId: string; 
      email: string;
      role?: string;
    }) => {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      const { data, error } = await supabase
        .from("invitations")
        .insert({
          organization_id: organizationId,
          email,
          token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-invitations", organizationId] });
      toast.success("Convite criado com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar convite: " + error.message);
    },
  });
}

export function useDeleteInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, organizationId }: { id: string; organizationId: string }) => {
      const { error } = await supabase
        .from("invitations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return organizationId;
    },
    onSuccess: (organizationId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-invitations", organizationId] });
      toast.success("Convite excluído");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir convite: " + error.message);
    },
  });
}

export function getInviteLink(token: string) {
  return `${window.location.origin}/auth?invite=${token}`;
}
