import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LeaderStats {
  userId: string;
  userName: string;
  userAvatar: string | null;
  teamId: string;
  teamName: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
}

export function useLeaderStats() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["leader-stats", organization?.id],
    queryFn: async (): Promise<LeaderStats[]> => {
      if (!organization?.id) return [];

      // Fetch all team leaders
      const { data: leaders, error: leadersError } = await supabase
        .from("team_members")
        .select(`
          user_id,
          team_id,
          user:users(id, name, avatar_url),
          team:teams!inner(id, name, organization_id)
        `)
        .eq("is_leader", true)
        .eq("team.organization_id", organization.id);

      if (leadersError) throw leadersError;
      if (!leaders || leaders.length === 0) return [];

      // Fetch leads assigned to each leader
      const leaderIds = leaders.map((l) => l.user_id);
      
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select(`
          id,
          assigned_user_id,
          stage:stages(stage_key)
        `)
        .eq("organization_id", organization.id)
        .in("assigned_user_id", leaderIds);

      if (leadsError) throw leadsError;

      // Calculate stats for each leader
      const stats: LeaderStats[] = leaders.map((leader) => {
        const leaderLeads = leads?.filter(
          (l) => l.assigned_user_id === leader.user_id
        ) || [];
        
        const totalLeads = leaderLeads.length;
        const convertedLeads = leaderLeads.filter(
          (l) => l.stage?.stage_key === "won" || l.stage?.stage_key === "closed_won"
        ).length;
        
        const conversionRate = totalLeads > 0 
          ? Math.round((convertedLeads / totalLeads) * 100) 
          : 0;

        const user = leader.user as { id: string; name: string; avatar_url: string | null } | null;
        const team = leader.team as { id: string; name: string } | null;

        return {
          userId: leader.user_id,
          userName: user?.name || "Usuário",
          userAvatar: user?.avatar_url || null,
          teamId: leader.team_id,
          teamName: team?.name || "Equipe",
          totalLeads,
          convertedLeads,
          conversionRate,
        };
      });

      return stats.sort((a, b) => b.conversionRate - a.conversionRate);
    },
    enabled: !!organization?.id,
  });
}
