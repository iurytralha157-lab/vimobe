import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export interface DashboardStats {
  totalLeads: number;
  newLeadsThisMonth: number;
  activeDeals: number;
  closedDeals: number;
  totalProperties: number;
  totalContracts: number;
  leadsByStage: { name: string; count: number; color: string }[];
  leadsBySource: { source: string; count: number }[];
  leadsOverTime: { date: string; count: number }[];
  conversionRate: number;
}

export function useDashboardStats(dateRange?: { from: Date; to: Date }) {
  const { organization } = useAuth();

  const from = dateRange?.from || startOfMonth(new Date());
  const to = dateRange?.to || endOfMonth(new Date());

  return useQuery({
    queryKey: ["dashboard-stats", organization?.id, from.toISOString(), to.toISOString()],
    queryFn: async (): Promise<DashboardStats> => {
      if (!organization?.id) {
        return {
          totalLeads: 0,
          newLeadsThisMonth: 0,
          activeDeals: 0,
          closedDeals: 0,
          totalProperties: 0,
          totalContracts: 0,
          leadsByStage: [],
          leadsBySource: [],
          leadsOverTime: [],
          conversionRate: 0,
        };
      }

      // Total leads
      const { count: totalLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization.id);

      // New leads this month
      const { count: newLeadsThisMonth } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization.id)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString());

      // Total properties
      const { count: totalProperties } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization.id);

      // Total contracts
      const { count: totalContracts } = await supabase
        .from("contracts")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization.id);

      // Leads by stage
      const { data: leadsWithStages } = await supabase
        .from("leads")
        .select(`
          stage_id,
          stage:stages(name, color)
        `)
        .eq("organization_id", organization.id);

      const stageCount: Record<string, { name: string; count: number; color: string }> = {};
      (leadsWithStages || []).forEach((lead: any) => {
        if (lead.stage) {
          const key = lead.stage.name;
          if (!stageCount[key]) {
            stageCount[key] = { name: key, count: 0, color: lead.stage.color || "#6366f1" };
          }
          stageCount[key].count++;
        }
      });
      const leadsByStage = Object.values(stageCount);

      // Closed deals count (stages with key 'fechado' or 'vendido')
      const closedStages = leadsByStage.filter(s => 
        s.name.toLowerCase().includes("fechado") || 
        s.name.toLowerCase().includes("vendido") ||
        s.name.toLowerCase().includes("concluído")
      );
      const closedDeals = closedStages.reduce((acc, s) => acc + s.count, 0);

      // Active deals (not lost, not closed)
      const lostStages = leadsByStage.filter(s => 
        s.name.toLowerCase().includes("perdido") || 
        s.name.toLowerCase().includes("cancelado")
      );
      const lostCount = lostStages.reduce((acc, s) => acc + s.count, 0);
      const activeDeals = (totalLeads || 0) - closedDeals - lostCount;

      // Conversion rate
      const conversionRate = totalLeads ? Math.round((closedDeals / totalLeads) * 100) : 0;

      return {
        totalLeads: totalLeads || 0,
        newLeadsThisMonth: newLeadsThisMonth || 0,
        activeDeals: Math.max(0, activeDeals),
        closedDeals,
        totalProperties: totalProperties || 0,
        totalContracts: totalContracts || 0,
        leadsByStage,
        leadsBySource: [],
        leadsOverTime: [],
        conversionRate,
      };
    },
    enabled: !!organization?.id,
  });
}
