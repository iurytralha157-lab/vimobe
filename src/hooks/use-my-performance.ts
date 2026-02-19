import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, endOfMonth, subMonths, format, parseISO } from "date-fns";
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
  ticketMedio: number;
  activeContracts: number;
  currentGoal: number;
  goalProgress: number; // 0-100
  streak: number;
  last6Months: MonthlyPerformance[];
}

export function useMyPerformance() {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const organizationId = profile?.organization_id;

  return useQuery({
    queryKey: ["my-performance", userId],
    queryFn: async (): Promise<MyPerformanceData> => {
      if (!userId || !organizationId) {
        return {
          totalSales: 0,
          closedCount: 0,
          ticketMedio: 0,
          activeContracts: 0,
          currentGoal: 0,
          goalProgress: 0,
          streak: 0,
          last6Months: [],
        };
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-12

      // Fetch leads won in current month
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      const [leadsResult, contractsResult, goalsResult] = await Promise.all([
        supabase
          .from("leads")
          .select("id, valor_interesse, won_at")
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
      ]);

      const wonLeads = leadsResult.data || [];
      const totalSales = wonLeads.reduce(
        (sum, l) => sum + (l.valor_interesse || 0),
        0
      );
      const closedCount = wonLeads.length;
      const ticketMedio = closedCount > 0 ? totalSales / closedCount : 0;
      const activeContracts = contractsResult.data?.length || 0;

      // Build goals map
      const goalsMap = new Map<string, number>();
      (goalsResult.data || []).forEach((g) => {
        goalsMap.set(`${g.year}-${g.month}`, g.goal_amount);
      });

      const currentGoal = goalsMap.get(`${currentYear}-${currentMonth}`) || 0;
      const goalProgress =
        currentGoal > 0 ? Math.min((totalSales / currentGoal) * 100, 100) : 0;

      // Build last 6 months (including current)
      const last6Months: MonthlyPerformance[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        const mStart = startOfMonth(d).toISOString();
        const mEnd = endOfMonth(d).toISOString();
        const year = d.getFullYear();
        const month = d.getMonth() + 1;

        const { data: mLeads } = await supabase
          .from("leads")
          .select("valor_interesse")
          .eq("organization_id", organizationId)
          .eq("assigned_user_id", userId)
          .eq("deal_status", "won")
          .gte("won_at", mStart)
          .lte("won_at", mEnd);

        const mTotal = (mLeads || []).reduce(
          (sum, l) => sum + (l.valor_interesse || 0),
          0
        );
        const mCount = (mLeads || []).length;
        const mGoal = goalsMap.get(`${year}-${month}`) || 0;

        last6Months.push({
          month: format(d, "MMM", { locale: ptBR }),
          monthKey: format(d, "yyyy-MM"),
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
        ticketMedio,
        activeContracts,
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
      queryClient.invalidateQueries({ queryKey: ["my-performance", user?.id] });
    },
  });
}
