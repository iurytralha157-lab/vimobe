import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: string | null;
  organization_id: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export function useUsers() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["users", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name");

      if (error) throw error;
      return data as User[];
    },
    enabled: !!organization?.id,
  });
}

export function useOrganizationUsers() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["organization-users", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("users")
        .select("id, name, avatar_url, email, role, is_active")
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Pick<User, 'id' | 'name' | 'avatar_url' | 'email' | 'role' | 'is_active'>[];
    },
    enabled: !!organization?.id,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as User;
    },
    enabled: !!id,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<User> & { id: string }) => {
      const { data, error } = await supabase
        .from("users")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["organization-users"] });
      queryClient.invalidateQueries({ queryKey: ["user", data.id] });
      toast({ title: "Usuário atualizado!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar usuário",
        description: error.message,
      });
    },
  });
}
