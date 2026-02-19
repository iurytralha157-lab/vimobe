import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, endOfMonth } from "date-fns";

export interface TeamRankingEntry {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  closedCount: number; // only sales count, NEVER R$ value
  position: number;
  isCurrentUser: boolean;
}

export interface TeamRankingData {
  ranking: TeamRankingEntry[];
  myPosition: number | null;
}

export function useTeamRanking(dateRange?: { from: Date; to: Date }) {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const organizationId = profile?.organization_id;

  return useQuery({
    queryKey: ["team-ranking", organizationId, userId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<TeamRankingData> => {
      if (!organizationId || !userId) {
        return { ranking: [], myPosition: null };
      }

      const now = new Date();
      const monthStart = dateRange ? dateRange.from.toISOString() : startOfMonth(now).toISOString();
      const monthEnd = dateRange ? dateRange.to.toISOString() : endOfMonth(now).toISOString();

      // Fetch active users in org
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, name, avatar_url")
        .eq("organization_id", organizationId)
        .eq("is_active", true);

      if (usersError) throw usersError;
      if (!users || users.length === 0) return { ranking: [], myPosition: null };

      // Fetch won leads in current month — only count, no R$ values
      const { data: wonLeads, error: leadsError } = await supabase
        .from("leads")
        .select("id, assigned_user_id")
        .eq("organization_id", organizationId)
        .eq("deal_status", "won")
        .gte("won_at", monthStart)
        .lte("won_at", monthEnd)
        .not("assigned_user_id", "is", null);

      if (leadsError) throw leadsError;

      // Count per user
      const countMap = new Map<string, number>();
      (wonLeads || []).forEach((l) => {
        if (l.assigned_user_id) {
          countMap.set(
            l.assigned_user_id,
            (countMap.get(l.assigned_user_id) || 0) + 1
          );
        }
      });

      // Build ranking sorted by closedCount desc
      const ranking: TeamRankingEntry[] = users
        .map((u) => ({
          userId: u.id,
          userName: u.name,
          avatarUrl: u.avatar_url,
          closedCount: countMap.get(u.id) || 0,
          position: 0,
          isCurrentUser: u.id === userId,
        }))
        .sort((a, b) => b.closedCount - a.closedCount)
        .map((entry, index) => ({ ...entry, position: index + 1 }));

      const myEntry = ranking.find((r) => r.isCurrentUser);
      const myPosition = myEntry?.position ?? null;

      return { ranking, myPosition };
    },
    enabled: !!organizationId && !!userId,
  });
}
