import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Team {
  id: string;
  name: string;
  organization_id: string;
  created_at: string;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  created_at: string;
  is_leader?: boolean;
  user?: { id: string; name: string; avatar_url: string | null };
}

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data: teams, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      if (!teams || teams.length === 0) return [];
      
      const teamIds = teams.map(t => t.id);
      
      const { data: members } = await supabase
        .from('team_members')
        .select('*, user:users(id, name, avatar_url)')
        .in('team_id', teamIds);
      
      // Cast the result to include is_leader
      const membersWithLeader = (members || []).map(m => ({
        ...m,
        is_leader: (m as any).is_leader ?? false,
      }));
      
      const membersByTeam = membersWithLeader.reduce((acc, m) => {
        if (!acc[m.team_id]) acc[m.team_id] = [];
        acc[m.team_id].push(m as TeamMember);
        return acc;
      }, {} as Record<string, TeamMember[]>);
      
      return teams.map(team => ({
        ...team,
        members: membersByTeam[team.id] || [],
      })) as Team[];
    },
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; memberIds?: string[] }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Não autenticado');
      
      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single();
      
      if (!profile?.organization_id) throw new Error('Organização não encontrada');
      
      const { data: team, error } = await supabase
        .from('teams')
        .insert({
          name: data.name,
          organization_id: profile.organization_id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (data.memberIds && data.memberIds.length > 0) {
        const membersToInsert = data.memberIds.map(userId => ({
          team_id: team.id,
          user_id: userId,
        }));
        
        await supabase.from('team_members').insert(membersToInsert);
      }
      
      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Equipe criada!');
    },
    onError: (error) => {
      toast.error('Erro ao criar equipe: ' + error.message);
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, name, memberIds }: { id: string; name?: string; memberIds?: string[] }) => {
      if (name) {
        const { error } = await supabase
          .from('teams')
          .update({ name })
          .eq('id', id);
        
        if (error) throw error;
      }
      
      if (memberIds !== undefined) {
        // Remove all current members
        await supabase.from('team_members').delete().eq('team_id', id);
        
        // Add new members
        if (memberIds.length > 0) {
          const membersToInsert = memberIds.map(userId => ({
            team_id: id,
            user_id: userId,
          }));
          
          await supabase.from('team_members').insert(membersToInsert);
        }
      }
      
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Equipe atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar equipe: ' + error.message);
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Equipe excluída!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir equipe: ' + error.message);
    },
  });
}
