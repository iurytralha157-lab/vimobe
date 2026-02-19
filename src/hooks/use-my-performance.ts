import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface MonthlyPerformance {
  month: string; // "Jan", "Fev", etc.
  monthKey: string; // "2026-01"
  totalSales: number;
  closedCount: number;
  goal: number;
}

export interface MyPerformanceData {
  totalSales: number;
  closedCount: number;
  totalCommission: number;
  activeContracts: number;
  activeLeads: number;
  avgResponseSeconds: number | null;
  currentGoal: number;
  goalProgress: number; // 0-100
  streak: number;
  last6Months: MonthlyPerformance[];
}

export function useMyPerformance(dateRange?: { from: Date; to: Date }) {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const organizationId = profile?.organization_id;

  return useQuery({
    queryKey: ["my-performance", userId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<MyPerformanceData> => {
      if (!userId || !organizationId) {
        return {
          totalSales: 0,
          closedCount: 0,
          totalCommission: 0,
          activeContracts: 0,
          activeLeads: 0,
          avgResponseSeconds: null,
          currentGoal: 0,
          goalProgress: 0,
          streak: 0,
          last6Months: [],
        };
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-12

      // Fetch leads won in selected date range (or current month as fallback)
      const monthStart = dateRange ? dateRange.from.toISOString() : startOfMonth(now).toISOString();
      const monthEnd = dateRange ? dateRange.to.toISOString() : endOfMonth(now).toISOString();

      const [leadsResult, contractsResult, goalsResult, activeLeadsResult] = await Promise.all([
        supabase
          .from("leads")
          .select("id, valor_interesse, won_at, assigned_at, first_response_at")
          .eq("organization_id", organizationId)
          .eq("assigned_user_id", userId)
          .eq("deal_status", "won")
          .gte("won_at", monthStart)
          .lte("won_at", monthEnd),

        supabase
          .from("contracts")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("created_by", userId)
          .eq("status", "active"),

        supabase
          .from("broker_monthly_goals")
          .select("year, month, goal_amount")
          .eq("user_id", userId)
          .gte("year", currentYear - 1)
          .order("year", { ascending: false })
          .order("month", { ascending: false }),

        supabase
          .from("leads")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("assigned_user_id", userId)
          .eq("deal_status", "open"),
      ]);

      const wonLeads = leadsResult.data || [];
      const totalSales = wonLeads.reduce(
        (sum, l) => sum + (l.valor_interesse || 0),
        0
      );
      const closedCount = wonLeads.length;
      const activeContracts = contractsResult.data?.length || 0;
      const activeLeads = activeLeadsResult.data?.length || 0;

      // Average response time: mean of (first_response_at - assigned_at) for won leads
      const responseLeads = wonLeads.filter(
        (l) => l.first_response_at && l.assigned_at
      );
      const avgResponseSeconds =
        responseLeads.length > 0
          ? responseLeads.reduce((sum, l) => {
              const diff =
                new Date(l.first_response_at!).getTime() -
                new Date(l.assigned_at!).getTime();
              return sum + diff / 1000;
            }, 0) / responseLeads.length
          : null;

      // Build goals map
      const goalsMap = new Map<string, number>();
      (goalsResult.data || []).forEach((g) => {
        goalsMap.set(`${g.year}-${g.month}`, g.goal_amount);
      });

      const currentGoal = goalsMap.get(`${currentYear}-${currentMonth}`) || 0;
      const goalProgress =
        currentGoal > 0 ? Math.min((totalSales / currentGoal) * 100, 100) : 0;

      // Build last 6 months — ALL org sales (no user filter) + commissions in parallel
      const sixMonthsAgo = startOfMonth(subMonths(now, 5));
      const [chartLeadsResult, commissionsResult] = await Promise.all([
        supabase
          .from("leads")
          .select("won_at, valor_interesse")
          .eq("organization_id", organizationId)
          .eq("deal_status", "won")
          .gte("won_at", sixMonthsAgo.toISOString())
          .lte("won_at", endOfMonth(now).toISOString()),

        supabase
          .from("commissions")
          .select("amount")
          .eq("organization_id", organizationId)
          .eq("user_id", userId)
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd),
      ]);

      const chartLeads = chartLeadsResult.data;
      const totalCommission = (commissionsResult.data || []).reduce(
        (sum, c) => sum + (c.amount || 0),
        0
      );

      const last6Months: MonthlyPerformance[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const monthKey = format(d, "yyyy-MM");

        const monthLeads = (chartLeads || []).filter((l) => {
          if (!l.won_at) return false;
          const wonDate = new Date(l.won_at);
          return wonDate.getFullYear() === year && wonDate.getMonth() + 1 === month;
        });

        const mTotal = monthLeads.reduce((sum, l) => sum + (l.valor_interesse || 0), 0);
        const mCount = monthLeads.length;
        const mGoal = goalsMap.get(`${year}-${month}`) || 0;

        last6Months.push({
          month: format(d, "MMM", { locale: ptBR }),
          monthKey,
          totalSales: mTotal,
          closedCount: mCount,
          goal: mGoal,
        });
      }

      // Calculate streak (consecutive months hitting goal, going backwards from current month)
      let streak = 0;
      for (let i = last6Months.length - 1; i >= 0; i--) {
        const m = last6Months[i];
        if (m.goal > 0 && m.totalSales >= m.goal) {
          streak++;
        } else {
          break;
        }
      }

      return {
        totalSales,
        closedCount,
        totalCommission,
        activeContracts,
        activeLeads,
        avgResponseSeconds,
        currentGoal,
        goalProgress,
        streak,
        last6Months,
      };
    },
    enabled: !!userId && !!organizationId,
  });
}

export function useUpsertMyGoal() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalAmount: number) => {
      if (!user?.id || !profile?.organization_id) throw new Error("Not authenticated");

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const { error } = await supabase
        .from("broker_monthly_goals")
        .upsert(
          {
            user_id: user.id,
            organization_id: profile.organization_id,
            year,
            month,
            goal_amount: goalAmount,
          },
          { onConflict: "user_id,year,month" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-performance"] });
    },
  });
}
