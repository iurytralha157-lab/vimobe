import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BrokerPerformance {
  id: string;
  name: string;
  avatar_url: string | null;
  total_leads: number;
  closed_leads: number;
  conversion_rate: number;
  total_sales: number;
  avg_response_time: number | null;
  position?: number;
}

export interface TeamAverages {
  avgConversion: number;
  avgLeads: number;
  avgSales: number;
  avgResponseTime: number | null;
}

export function useBrokerPerformance(dateRange: { from: Date; to: Date }) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["broker-performance", organization?.id, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<BrokerPerformance[]> => {
      if (!organization?.id) return [];

      // Get all users in the organization
      const { data: users } = await supabase
        .from("users")
        .select("id, name, avatar_url")
        .eq("organization_id", organization.id)
        .eq("is_active", true);

      if (!users || users.length === 0) return [];

      // Get leads with their stages for the period
      const { data: leads } = await supabase
        .from("leads")
        .select("id, assigned_user_id, stage:stages(stage_key), created_at")
        .eq("organization_id", organization.id)
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString());

      // Get contracts for sales value
      const { data: contracts } = await supabase
        .from("contracts")
        .select("value, created_by")
        .eq("organization_id", organization.id)
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString());

      const performance: BrokerPerformance[] = users.map(user => {
        const userLeads = leads?.filter(l => l.assigned_user_id === user.id) || [];
        const closedLeads = userLeads.filter((l: any) => l.stage?.stage_key === 'vendido' || l.stage?.stage_key === 'fechado');
        const userContracts = contracts?.filter(c => c.created_by === user.id) || [];
        const totalSales = userContracts.reduce((acc, c) => acc + (c.value || 0), 0);

        return {
          id: user.id,
          name: user.name || 'Sem nome',
          avatar_url: user.avatar_url,
          total_leads: userLeads.length,
          closed_leads: closedLeads.length,
          conversion_rate: userLeads.length > 0 ? Math.round((closedLeads.length / userLeads.length) * 100) : 0,
          total_sales: totalSales,
          avg_response_time: null,
        };
      });

      // Sort by closed leads and add position
      return performance
        .sort((a, b) => b.closed_leads - a.closed_leads)
        .map((broker, index) => ({ ...broker, position: index + 1 }));
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeamAverages(dateRange: { from: Date; to: Date }): TeamAverages {
  const { data: brokers } = useBrokerPerformance(dateRange);

  if (!brokers || brokers.length === 0) {
    return { avgConversion: 0, avgLeads: 0, avgSales: 0, avgResponseTime: null };
  }

  const avgConversion = Math.round(
    brokers.reduce((acc, b) => acc + b.conversion_rate, 0) / brokers.length
  );
  const avgLeads = Math.round(
    brokers.reduce((acc, b) => acc + b.total_leads, 0) / brokers.length
  );
  const avgSales = Math.round(
    brokers.reduce((acc, b) => acc + b.total_sales, 0) / brokers.length
  );

  return { avgConversion, avgLeads, avgSales, avgResponseTime: null };
}
