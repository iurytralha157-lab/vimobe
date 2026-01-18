import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, endOfMonth, subDays, format, eachDayOfInterval } from "date-fns";
import { DashboardFilters } from "./use-dashboard-filters";

export interface EnhancedDashboardStats {
  totalLeads: number;
  conversionRate: number;
  closedLeads: number;
  avgResponseTime: string;
  totalSalesValue: number;
  leadsTrend: number;
  conversionTrend: number;
  closedTrend: number;
}

export interface FunnelDataPoint {
  name: string;
  value: number;
  percentage: number;
  stage_key: string;
}

export interface SourceDataPoint {
  name: string;
  value: number;
}

export interface ChartDataPoint {
  name: string;
  meta: number;
  site: number;
  wordpress: number;
}

export interface Broker {
  id: string;
  name: string;
  avatar_url: string | null;
  closedLeads: number;
  salesValue: number;
}

export interface Task {
  id: string;
  title: string;
  type: 'call' | 'email' | 'meeting' | 'message' | 'task';
  due_date: string;
  lead_name: string;
  lead_id: string;
}

export function useEnhancedDashboardStats(filters: DashboardFilters) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["enhanced-dashboard-stats", organization?.id, filters],
    queryFn: async (): Promise<EnhancedDashboardStats> => {
      if (!organization?.id) {
        return { totalLeads: 0, conversionRate: 0, closedLeads: 0, avgResponseTime: '--', totalSalesValue: 0, leadsTrend: 0, conversionTrend: 0, closedTrend: 0 };
      }

      const { from, to } = filters.dateRange;
      let query = supabase.from("leads").select("*, stage:stages(name, stage_key)").eq("organization_id", organization.id).gte("created_at", from.toISOString()).lte("created_at", to.toISOString());
      if (filters.userId) query = query.eq("assigned_user_id", filters.userId);

      const { data: leads } = await query;
      const totalLeads = leads?.length || 0;
      const closedLeads = leads?.filter((l: any) => l.stage?.stage_key === 'vendido' || l.stage?.name?.toLowerCase().includes('fechado')).length || 0;
      const conversionRate = totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0;

      const { data: contracts } = await supabase.from("contracts").select("value").eq("organization_id", organization.id).gte("created_at", from.toISOString()).lte("created_at", to.toISOString());
      const totalSalesValue = contracts?.reduce((acc, c) => acc + (c.value || 0), 0) || 0;

      return { totalLeads, conversionRate, closedLeads, avgResponseTime: '--', totalSalesValue, leadsTrend: 0, conversionTrend: 0, closedTrend: 0 };
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLeadsChartData() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["leads-chart-data", organization?.id],
    queryFn: async (): Promise<ChartDataPoint[]> => {
      if (!organization?.id) return [];
      const from = subDays(new Date(), 6);
      const to = new Date();
      const { data: leads } = await supabase.from("leads").select("created_at").eq("organization_id", organization.id).gte("created_at", from.toISOString());
      const days = eachDayOfInterval({ start: from, end: to });
      
      return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const count = leads?.filter(l => format(new Date(l.created_at), 'yyyy-MM-dd') === dayStr).length || 0;
        return { name: format(day, 'dd/MM'), meta: count, site: 0, wordpress: 0 };
      });
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useFunnelData() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["funnel-data", organization?.id],
    queryFn: async (): Promise<FunnelDataPoint[]> => {
      if (!organization?.id) return [];
      const { data: leads } = await supabase.from("leads").select("stage:stages(name, stage_key, position)").eq("organization_id", organization.id);
      if (!leads || leads.length === 0) return [];

      const stageCount: Record<string, { count: number; stage_key: string; position: number }> = {};
      leads.forEach((lead: any) => {
        if (lead.stage) {
          const key = lead.stage.name;
          if (!stageCount[key]) stageCount[key] = { count: 0, stage_key: lead.stage.stage_key || 'unknown', position: lead.stage.position || 0 };
          stageCount[key].count++;
        }
      });

      const totalLeads = leads.length;
      return Object.entries(stageCount).sort(([, a], [, b]) => a.position - b.position).map(([name, data]) => ({
        name, value: data.count, percentage: Math.round((data.count / totalLeads) * 100), stage_key: data.stage_key,
      }));
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLeadSourcesData() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["lead-sources-data", organization?.id],
    queryFn: async (): Promise<SourceDataPoint[]> => {
      if (!organization?.id) return [];
      const { data: leads } = await supabase.from("leads").select("id").eq("organization_id", organization.id);
      if (!leads || leads.length === 0) return [];
      return [{ name: 'Direto', value: leads.length }];
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTopBrokers(filters: DashboardFilters) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["top-brokers", organization?.id, filters],
    queryFn: async (): Promise<Broker[]> => {
      if (!organization?.id) return [];
      const { from, to } = filters.dateRange;
      const { data: leads } = await supabase.from("leads").select("assigned_user_id, stage:stages(stage_key)").eq("organization_id", organization.id).gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).not("assigned_user_id", "is", null);
      if (!leads || leads.length === 0) return [];

      const brokerStats: Record<string, { closedLeads: number }> = {};
      leads.forEach((lead: any) => {
        if (!lead.assigned_user_id) return;
        if (!brokerStats[lead.assigned_user_id]) brokerStats[lead.assigned_user_id] = { closedLeads: 0 };
        if (lead.stage?.stage_key === 'vendido') brokerStats[lead.assigned_user_id].closedLeads++;
      });

      const { data: users } = await supabase.from("users").select("id, name, avatar_url").in("id", Object.keys(brokerStats));
      return (users || []).map(user => ({ id: user.id, name: user.name, avatar_url: user.avatar_url, closedLeads: brokerStats[user.id]?.closedLeads || 0, salesValue: 0 })).sort((a, b) => b.closedLeads - a.closedLeads).slice(0, 5);
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpcomingTasks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["upcoming-tasks", user?.id],
    queryFn: async (): Promise<Task[]> => {
      if (!user?.id) return [];
      const { data: tasks } = await supabase.from("lead_tasks").select("id, title, due_date, lead_id, lead:leads(name)").eq("is_done", false).order("due_date", { ascending: true }).limit(5);
      return (tasks || []).map((task: any) => ({ id: task.id, title: task.title, type: 'task' as const, due_date: task.due_date || new Date().toISOString(), lead_name: task.lead?.name || 'Lead', lead_id: task.lead_id }));
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Legacy export for backward compatibility
export function useDashboardStats(dateRange?: { from: Date; to: Date }) {
  const { organization } = useAuth();
  const from = dateRange?.from || startOfMonth(new Date());
  const to = dateRange?.to || endOfMonth(new Date());

  return useQuery({
    queryKey: ["dashboard-stats", organization?.id, from.toISOString(), to.toISOString()],
    queryFn: async () => {
      if (!organization?.id) return { totalLeads: 0, newLeadsThisMonth: 0, activeDeals: 0, closedDeals: 0, totalProperties: 0, totalContracts: 0, leadsByStage: [], leadsBySource: [], leadsOverTime: [], conversionRate: 0 };
      const { count: totalLeads } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("organization_id", organization.id);
      const { count: totalProperties } = await supabase.from("properties").select("*", { count: "exact", head: true }).eq("organization_id", organization.id);
      const { count: totalContracts } = await supabase.from("contracts").select("*", { count: "exact", head: true }).eq("organization_id", organization.id);
      return { totalLeads: totalLeads || 0, newLeadsThisMonth: 0, activeDeals: 0, closedDeals: 0, totalProperties: totalProperties || 0, totalContracts: totalContracts || 0, leadsByStage: [], leadsBySource: [], leadsOverTime: [], conversionRate: 0 };
    },
    enabled: !!organization?.id,
  });
}
