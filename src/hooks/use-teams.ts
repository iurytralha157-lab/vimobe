import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Team {
  id: string;
  name: string;
  organization_id: string;
  created_at: string | null;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  is_leader: boolean | null;
  created_at: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
}

export function useTeams() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["teams", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          members:team_members(
            *,
            user:users(id, name, email, avatar_url)
          )
        `)
        .eq("organization_id", organization.id)
        .order("name");

      if (error) throw error;
      return data as Team[];
    },
    enabled: !!organization?.id,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { name: string; memberIds?: string[]; leaderId?: string }) => {
      if (!organization?.id) throw new Error("No organization");

      // Create team
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: input.name,
          organization_id: organization.id,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add members
      if (input.memberIds?.length) {
        const members = input.memberIds.map((userId) => ({
          team_id: team.id,
          user_id: userId,
          is_leader: userId === input.leaderId,
        }));

        const { error: membersError } = await supabase
          .from("team_members")
          .insert(members);

        if (membersError) throw membersError;
      }

      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Equipe criada!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar equipe",
        description: error.message,
      });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { 
      id: string; 
      name: string; 
      memberIds: string[]; 
      leaderIds: string[];
    }) => {
      // Update team name
      const { error: teamError } = await supabase
        .from("teams")
        .update({ name: input.name })
        .eq("id", input.id);

      if (teamError) throw teamError;

      // Remove all existing members
      const { error: deleteError } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", input.id);

      if (deleteError) throw deleteError;

      // Add new members
      if (input.memberIds.length > 0) {
        const members = input.memberIds.map((userId) => ({
          team_id: input.id,
          user_id: userId,
          is_leader: input.leaderIds.includes(userId),
        }));

        const { error: membersError } = await supabase
          .from("team_members")
          .insert(members);

        if (membersError) throw membersError;
      }

      return { id: input.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Equipe atualizada!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar equipe",
        description: error.message,
      });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Equipe excluída!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir equipe",
        description: error.message,
      });
    },
  });
}
