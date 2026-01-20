import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInMinutes, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";

export interface BrokerPerformance {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  totalLeads: number;
  closedLeads: number;
  conversionRate: number;
  avgResponseTimeMinutes: number | null;
  totalSales: number;
  totalCommissions: number;
  activeLeads: number;
}

interface DateRange {
  from: Date;
  to: Date;
}

export function useBrokerPerformance(dateRange?: DateRange) {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;

  return useQuery({
    queryKey: ['broker-performance', organizationId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<BrokerPerformance[]> => {
      if (!organizationId) return [];

      // Use default date range if not provided (current month)
      const from = dateRange?.from || startOfMonth(new Date());
      const to = dateRange?.to || endOfMonth(new Date());

      // Fetch all users (brokers) from the organization
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (usersError) throw usersError;
      if (!users || users.length === 0) return [];

      // Fetch all leads assigned to users in the date range - using deal_status for accurate tracking
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select(`
          id,
          assigned_user_id,
          created_at,
          stage_id,
          deal_status,
          valor_interesse,
          stages (
            stage_key
          )
        `)
        .eq('organization_id', organizationId)
        .not('assigned_user_id', 'is', null)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString());

      if (leadsError) throw leadsError;

      // Fetch activities for response time calculation
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('id, lead_id, user_id, created_at')
        .not('user_id', 'is', null)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: true });

      if (activitiesError) throw activitiesError;

      // Fetch contracts for sales - use value instead of total_value (column name in DB)
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('id, created_by, value, signing_date')
        .eq('organization_id', organizationId)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString());

      if (contractsError) throw contractsError;

      // Fetch commissions - use amount instead of calculated_value (column name in DB)
      const { data: commissions, error: commissionsError } = await supabase
        .from('commissions')
        .select('id, user_id, amount')
        .eq('organization_id', organizationId)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString());

      if (commissionsError) throw commissionsError;

      // Calculate performance for each broker
      const performance: BrokerPerformance[] = users.map(user => {
        // Leads assigned to this broker
        const userLeads = leads?.filter(l => l.assigned_user_id === user.id) || [];
        const totalLeads = userLeads.length;

        // Closed leads using deal_status = 'won' (more accurate than stage_key)
        const closedLeads = userLeads.filter(l => l.deal_status === 'won').length;

        // Conversion rate
        const conversionRate = totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0;

        // Active leads (deal_status = 'open' or null)
        const activeLeads = userLeads.filter(l => 
          !l.deal_status || l.deal_status === 'open'
        ).length;
        
        // Total sales from won leads (using valor_interesse)
        const totalSalesFromLeads = userLeads
          .filter(l => l.deal_status === 'won')
          .reduce((sum, l) => sum + (l.valor_interesse || 0), 0);

        // Calculate average response time
        const responseTimes: number[] = [];
        userLeads.forEach(lead => {
          const leadActivities = activities?.filter(
            a => a.lead_id === lead.id && a.user_id === user.id
          ) || [];
          
          if (leadActivities.length > 0) {
            const firstActivity = leadActivities[0];
            const responseTime = differenceInMinutes(
              parseISO(firstActivity.created_at),
              parseISO(lead.created_at)
            );
            if (responseTime >= 0) {
              responseTimes.push(responseTime);
            }
          }
        });

        const avgResponseTimeMinutes = responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : null;

        // Total sales - prioritize leads valor_interesse, fallback to contracts
        const userContracts = contracts?.filter(c => c.created_by === user.id) || [];
        const totalSalesFromContracts = userContracts.reduce((sum, c) => sum + ((c as any).value || 0), 0);
        const totalSales = totalSalesFromLeads > 0 ? totalSalesFromLeads : totalSalesFromContracts;

        // Total commissions
        const userCommissions = commissions?.filter(c => c.user_id === user.id) || [];
        const totalCommissions = userCommissions.reduce((sum, c) => sum + ((c as any).amount || 0), 0);

        return {
          userId: user.id,
          userName: user.name,
          avatarUrl: user.avatar_url,
          totalLeads,
          closedLeads,
          conversionRate,
          avgResponseTimeMinutes,
          totalSales,
          totalCommissions,
          activeLeads
        };
      });

      // Sort by total sales (descending) for ranking
      return performance.sort((a, b) => b.totalSales - a.totalSales);
    },
    enabled: !!organizationId
  });
}

export function useTeamAverages(dateRange?: DateRange) {
  const { data: brokerPerformance } = useBrokerPerformance(dateRange);

  if (!brokerPerformance || brokerPerformance.length === 0) {
    return {
      avgConversionRate: 0,
      avgResponseTime: null,
      totalSales: 0,
      totalCommissions: 0,
      totalLeads: 0
    };
  }

  const brokersWithLeads = brokerPerformance.filter(b => b.totalLeads > 0);
  const brokersWithResponseTime = brokerPerformance.filter(b => b.avgResponseTimeMinutes !== null);

  return {
    avgConversionRate: brokersWithLeads.length > 0
      ? brokersWithLeads.reduce((sum, b) => sum + b.conversionRate, 0) / brokersWithLeads.length
      : 0,
    avgResponseTime: brokersWithResponseTime.length > 0
      ? brokersWithResponseTime.reduce((sum, b) => sum + (b.avgResponseTimeMinutes || 0), 0) / brokersWithResponseTime.length
      : null,
    totalSales: brokerPerformance.reduce((sum, b) => sum + b.totalSales, 0),
    totalCommissions: brokerPerformance.reduce((sum, b) => sum + b.totalCommissions, 0),
    totalLeads: brokerPerformance.reduce((sum, b) => sum + b.totalLeads, 0)
  };
}
