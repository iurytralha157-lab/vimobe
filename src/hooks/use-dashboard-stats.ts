import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';
import { DashboardFilters } from './use-dashboard-filters';

export interface DashboardStats {
  totalLeads: number;
  leadsInProgress: number;
  leadsClosed: number;
  leadsLost: number;
  leadsTrend: number;
  closedTrend: number;
}

export interface EnhancedDashboardStats {
  totalLeads: number;
  conversionRate: number;
  closedLeads: number;
  avgResponseTime: string;
  totalSalesValue: number;
  pendingCommissions: number;
  leadsTrend: number;
  conversionTrend: number;
  closedTrend: number;
  // Financial data
  totalReceivables: number;
  totalPayables: number;
  overdueReceivables: number;
  overduePayables: number;
  paidCommissions: number;
}

export interface ChartDataPoint {
  name: string;
  meta: number;
  site: number;
  wordpress: number;
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

export interface TopBroker {
  id: string;
  name: string;
  avatar_url: string | null;
  closedLeads: number;
  salesValue: number;
}

export interface TopBrokersResult {
  brokers: TopBroker[];
  isFallbackMode: boolean; // true when showing leads instead of sales
}

export interface UpcomingTask {
  id: string;
  title: string;
  type: 'call' | 'email' | 'meeting' | 'message' | 'task';
  due_date: string;
  lead_name: string;
  lead_id: string;
}

// Usa RPC otimizada para buscar estatísticas do dashboard
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_dashboard_stats');
      
      if (error) {
        console.error('Error fetching dashboard stats:', error);
        // Fallback para valores padrão
        return {
          totalLeads: 0,
          leadsInProgress: 0,
          leadsClosed: 0,
          leadsLost: 0,
          leadsTrend: 0,
          closedTrend: 0,
        } as DashboardStats;
      }
      
      const stats = data as unknown as DashboardStats;
      return stats;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos para estatísticas
  });
}

// Enhanced dashboard stats with filters
export function useEnhancedDashboardStats(filters?: DashboardFilters) {
  return useQuery({
    queryKey: ['enhanced-dashboard-stats', filters?.dateRange?.from?.toISOString(), filters?.dateRange?.to?.toISOString(), filters?.teamId, filters?.userId, filters?.source],
    queryFn: async (): Promise<EnhancedDashboardStats> => {
      // Get current user info to check role
      const { data: { user } } = await supabase.auth.getUser();
      let currentUserRole = 'user';
      let currentUserId = user?.id;
      
      if (user?.id) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        currentUserRole = userData?.role || 'user';
      }
      
      const isAdmin = currentUserRole === 'admin';
      
      // Calculate date ranges for current and previous periods
      const now = new Date();
      const currentFrom = filters?.dateRange?.from || subDays(now, 30);
      const currentTo = filters?.dateRange?.to || now;
      
      // Calculate previous period (same duration, before current period)
      const periodDays = Math.ceil((currentTo.getTime() - currentFrom.getTime()) / (1000 * 60 * 60 * 24));
      const previousFrom = subDays(currentFrom, periodDays);
      const previousTo = subDays(currentTo, periodDays);
      
      // Build base query for current period - using deal_status for accurate conversion tracking
      let query = supabase
        .from('leads')
        .select('id, created_at, stage_id, assigned_user_id, source, valor_interesse, deal_status')
        .gte('created_at', currentFrom.toISOString())
        .lte('created_at', currentTo.toISOString());

      // Role-based filter: non-admins only see their own leads
      if (!isAdmin && currentUserId) {
        query = query.eq('assigned_user_id', currentUserId);
      } else if (filters?.userId) {
        // Admin can filter by specific user
        query = query.eq('assigned_user_id', filters.userId);
      }

      // Apply source filter
      if (filters?.source) {
        query = query.eq('source', filters.source as any);
      }

      // Apply team filter (only for admins)
      let memberIds: string[] = [];
      if (isAdmin && filters?.teamId) {
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', filters.teamId);
        
        if (teamMembers && teamMembers.length > 0) {
          memberIds = teamMembers.map(m => m.user_id);
          query = query.in('assigned_user_id', memberIds);
        }
      }

      const { data: leads, error } = await query;

      if (error) {
        console.error('Error fetching enhanced stats:', error);
        return {
          totalLeads: 0,
          conversionRate: 0,
          closedLeads: 0,
          avgResponseTime: '--',
          totalSalesValue: 0,
          pendingCommissions: 0,
          leadsTrend: 0,
          conversionTrend: 0,
          closedTrend: 0,
          totalReceivables: 0,
          totalPayables: 0,
          overdueReceivables: 0,
          overduePayables: 0,
          paidCommissions: 0,
        };
      }

      // Fetch previous period data for trends
      let previousQuery = supabase
        .from('leads')
        .select('id, deal_status')
        .gte('created_at', previousFrom.toISOString())
        .lte('created_at', previousTo.toISOString());
      
      // Role-based filter for previous period
      if (!isAdmin && currentUserId) {
        previousQuery = previousQuery.eq('assigned_user_id', currentUserId);
      } else if (filters?.userId) {
        previousQuery = previousQuery.eq('assigned_user_id', filters.userId);
      }
      if (filters?.source) {
        previousQuery = previousQuery.eq('source', filters.source as any);
      }
      if (memberIds.length > 0) {
        previousQuery = previousQuery.in('assigned_user_id', memberIds);
      }
      
      const { data: previousLeads } = await previousQuery;

      // Fetch commissions
      const { data: commissions } = await supabase
        .from('commissions')
        .select('amount, status');
      
      const pendingCommissions = commissions
        ?.filter(c => c.status === 'forecast' || c.status === 'approved')
        ?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
      
      const paidCommissions = commissions
        ?.filter(c => c.status === 'paid')
        ?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      // Fetch financial entries
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const { data: financialEntries } = await supabase
        .from('financial_entries')
        .select('type, amount, status, due_date')
        .gte('due_date', currentFrom.toISOString().split('T')[0])
        .lte('due_date', currentTo.toISOString().split('T')[0]);

      const receivables = financialEntries?.filter(e => e.type === 'receivable') || [];
      const payables = financialEntries?.filter(e => e.type === 'payable') || [];
      
      const totalReceivables = receivables
        .filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      
      const totalPayables = payables
        .filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      
      const overdueReceivables = receivables
        .filter(e => e.status === 'pending' && e.due_date && e.due_date < todayStr)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      
      const overduePayables = payables
        .filter(e => e.status === 'pending' && e.due_date && e.due_date < todayStr)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      // Calculate current stats using deal_status instead of stage_key
      const totalLeads = leads?.length || 0;
      const closedLeads = leads?.filter((l: any) => l.deal_status === 'won').length || 0;
      
      const conversionRate = totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0;
      
      // Calculate total sales from won leads (using valor_interesse)
      const totalSalesValue = leads?.reduce((sum: number, l: any) => {
        if (l.deal_status === 'won') {
          return sum + (l.valor_interesse || 0);
        }
        return sum;
      }, 0) || 0;

      // Calculate previous stats for trends using deal_status
      const prevTotalLeads = previousLeads?.length || 0;
      const prevClosedLeads = previousLeads?.filter((l: any) => l.deal_status === 'won').length || 0;
      const prevConversionRate = prevTotalLeads > 0 ? Math.round((prevClosedLeads / prevTotalLeads) * 100) : 0;

      // Calculate trends (percentage change from previous period)
      const leadsTrend = prevTotalLeads > 0 
        ? Math.round(((totalLeads - prevTotalLeads) / prevTotalLeads) * 100) 
        : totalLeads > 0 ? 100 : 0;
      
      const conversionTrend = prevConversionRate > 0 
        ? conversionRate - prevConversionRate 
        : conversionRate;
      
      const closedTrend = prevClosedLeads > 0 
        ? Math.round(((closedLeads - prevClosedLeads) / prevClosedLeads) * 100) 
        : closedLeads > 0 ? 100 : 0;

      // Calculate average response time from activities
      let avgResponseTime = '--';
      try {
        const leadIds = leads?.map((l: any) => l.id) || [];
        if (leadIds.length > 0) {
          const { data: activities } = await supabase
            .from('activities')
            .select('lead_id, created_at')
            .in('lead_id', leadIds.slice(0, 100)) // Limit for performance
            .order('created_at', { ascending: true });
          
          if (activities && activities.length > 0) {
            // Get first activity for each lead
            const firstActivities = new Map<string, Date>();
            activities.forEach((a: any) => {
              if (!firstActivities.has(a.lead_id)) {
                firstActivities.set(a.lead_id, new Date(a.created_at));
              }
            });
            
            // Calculate response times
            const responseTimes: number[] = [];
            leads?.forEach((lead: any) => {
              const firstActivity = firstActivities.get(lead.id);
              if (firstActivity) {
                const leadCreated = new Date(lead.created_at);
                const diff = firstActivity.getTime() - leadCreated.getTime();
                if (diff > 0) {
                  responseTimes.push(diff);
                }
              }
            });
            
            if (responseTimes.length > 0) {
              const avgMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
              const hours = Math.floor(avgMs / (1000 * 60 * 60));
              const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));
              avgResponseTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            }
          }
        }
      } catch (e) {
        console.error('Error calculating avg response time:', e);
      }

      return {
        totalLeads,
        conversionRate,
        closedLeads,
        avgResponseTime,
        totalSalesValue,
        pendingCommissions,
        leadsTrend,
        conversionTrend,
        closedTrend,
        totalReceivables,
        totalPayables,
        overdueReceivables,
        overduePayables,
        paidCommissions,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Dados do gráfico de leads por dia (otimizado)
export function useLeadsChartData() {
  return useQuery({
    queryKey: ['leads-chart-data'],
    queryFn: async () => {
      // Get current user info to check role
      const { data: { user } } = await supabase.auth.getUser();
      let currentUserRole = 'user';
      let currentUserId = user?.id;
      
      if (user?.id) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        currentUserRole = userData?.role || 'user';
      }
      
      const isAdmin = currentUserRole === 'admin';
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      
      // Query with role-based visibility
      let query = supabase
        .from('leads')
        .select('created_at, source, assigned_user_id')
        .gte('created_at', sevenDaysAgo)
        .order('created_at');
      
      // Non-admins only see their own leads
      if (!isAdmin && currentUserId) {
        query = query.eq('assigned_user_id', currentUserId);
      }
      
      const { data: leads } = await query;
      
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
      const chartData: ChartDataPoint[] = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayName = days[date.getDay()];
        const dateStr = format(date, 'yyyy-MM-dd');
        
        const dayLeads = (leads || []).filter((l: any) => 
          l.created_at?.startsWith(dateStr)
        );
        
        chartData.push({
          name: dayName,
          meta: dayLeads.filter((l: any) => l.source === 'meta').length,
          site: dayLeads.filter((l: any) => l.source === 'site' || l.source === 'wordpress').length,
          wordpress: dayLeads.filter((l: any) => l.source === 'wordpress').length,
        });
      }
      
      return chartData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// Usa RPC otimizada para dados do funil COM filtros
export function useFunnelData(filters?: DashboardFilters) {
  return useQuery({
    queryKey: ['funnel-data', filters?.dateRange?.from?.toISOString(), filters?.dateRange?.to?.toISOString(), filters?.teamId, filters?.userId, filters?.source],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_funnel_data', {
        p_date_from: filters?.dateRange?.from?.toISOString() || null,
        p_date_to: filters?.dateRange?.to?.toISOString() || null,
        p_team_id: filters?.teamId || null,
        p_user_id: filters?.userId || null,
        p_source: filters?.source || null,
      });
      
      if (error) {
        console.error('Error fetching funnel data:', error);
        return [] as FunnelDataPoint[];
      }
      
      // Map the RPC response to the expected format
      const result = (data || []).map((item: any) => ({
        name: item.stage_name,
        value: Number(item.lead_count) || 0,
        percentage: 0, // Will be calculated in the component
        stage_key: item.stage_key || item.stage_name,
      }));
      
      // Calculate percentages
      const total = result.reduce((sum: number, item: FunnelDataPoint) => sum + item.value, 0);
      return result.map((item: FunnelDataPoint) => ({
        ...item,
        percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
      })) as FunnelDataPoint[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// Usa RPC otimizada para dados de fontes de leads COM filtros
export function useLeadSourcesData(filters?: DashboardFilters) {
  return useQuery({
    queryKey: ['lead-sources-data', filters?.dateRange?.from?.toISOString(), filters?.dateRange?.to?.toISOString(), filters?.teamId, filters?.userId, filters?.source],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_lead_sources_data', {
        p_date_from: filters?.dateRange?.from?.toISOString() || null,
        p_date_to: filters?.dateRange?.to?.toISOString() || null,
        p_team_id: filters?.teamId || null,
        p_user_id: filters?.userId || null,
        p_source: filters?.source || null,
      });
      
      if (error) {
        console.error('Error fetching lead sources:', error);
        return [] as SourceDataPoint[];
      }
      
      // Map source names to friendly labels
      const sourceLabels: Record<string, string> = {
        'meta': 'Meta Ads',
        'site': 'Site',
        'wordpress': 'WordPress',
        'whatsapp': 'WhatsApp',
        'manual': 'Manual',
        'webhook': 'Webhook',
      };
      
      return (data || []).map((item: any) => ({
        name: sourceLabels[item.source_name] || item.source_name || 'Outros',
        value: Number(item.lead_count) || 0,
      })) as SourceDataPoint[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// Top Brokers (ranking de corretores) - com fallback para leads totais
export function useTopBrokers(filters?: DashboardFilters) {
  return useQuery({
    queryKey: ['top-brokers', filters?.dateRange?.from?.toISOString(), filters?.teamId],
    queryFn: async (): Promise<TopBrokersResult> => {
      // First try: Get leads with won status using deal_status
      let query = supabase
        .from('leads')
        .select(`
          assigned_user_id,
          valor_interesse,
          deal_status,
          user:users!leads_assigned_user_id_fkey(id, name, avatar_url)
        `)
        .not('assigned_user_id', 'is', null)
        .eq('deal_status', 'won');

      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.from.toISOString())
          .lte('created_at', filters.dateRange.to.toISOString());
      }

      const { data: wonLeads, error } = await query;

      if (error) {
        console.error('Error fetching top brokers:', error);
        return { brokers: [], isFallbackMode: false };
      }

      // If we have won leads, use them for ranking
      if (wonLeads && wonLeads.length > 0) {
        const brokerStats = wonLeads.reduce((acc: Record<string, TopBroker>, lead: any) => {
          const userId = lead.assigned_user_id;
          if (!userId || !lead.user) return acc;

          if (!acc[userId]) {
            acc[userId] = {
              id: userId,
              name: lead.user.name || 'Usuário',
              avatar_url: lead.user.avatar_url,
              closedLeads: 0,
              salesValue: 0,
            };
          }

          acc[userId].closedLeads += 1;
          acc[userId].salesValue += lead.valor_interesse || 0;

          return acc;
        }, {});

        return {
          brokers: Object.values(brokerStats)
            .sort((a, b) => b.closedLeads - a.closedLeads)
            .slice(0, 5),
          isFallbackMode: false,
        };
      }

      // Fallback: No won leads, show ranking by total leads assigned
      let fallbackQuery = supabase
        .from('leads')
        .select(`
          assigned_user_id,
          valor_interesse,
          user:users!leads_assigned_user_id_fkey(id, name, avatar_url)
        `)
        .not('assigned_user_id', 'is', null);

      if (filters?.dateRange) {
        fallbackQuery = fallbackQuery
          .gte('created_at', filters.dateRange.from.toISOString())
          .lte('created_at', filters.dateRange.to.toISOString());
      }

      const { data: allLeads, error: fallbackError } = await fallbackQuery;

      if (fallbackError || !allLeads || allLeads.length === 0) {
        return { brokers: [], isFallbackMode: true };
      }

      // Aggregate all leads by user (closedLeads = total leads in fallback mode)
      const brokerStats = allLeads.reduce((acc: Record<string, TopBroker>, lead: any) => {
        const userId = lead.assigned_user_id;
        if (!userId || !lead.user) return acc;

        if (!acc[userId]) {
          acc[userId] = {
            id: userId,
            name: lead.user.name || 'Usuário',
            avatar_url: lead.user.avatar_url,
            closedLeads: 0, // In fallback mode, this represents total leads
            salesValue: 0,
          };
        }

        acc[userId].closedLeads += 1;
        acc[userId].salesValue += lead.valor_interesse || 0;

        return acc;
      }, {});

      return {
        brokers: Object.values(brokerStats)
          .sort((a, b) => b.closedLeads - a.closedLeads)
          .slice(0, 5),
        isFallbackMode: true,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Upcoming tasks
export function useUpcomingTasks() {
  return useQuery({
    queryKey: ['upcoming-tasks'],
    queryFn: async (): Promise<UpcomingTask[]> => {
      // Get current user info to check role
      const { data: { user } } = await supabase.auth.getUser();
      let currentUserRole = 'user';
      let currentUserId = user?.id;
      
      if (user?.id) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        currentUserRole = userData?.role || 'user';
      }
      
      const isAdmin = currentUserRole === 'admin';
      
      // For non-admins, first get their lead IDs
      let leadIds: string[] = [];
      if (!isAdmin && currentUserId) {
        const { data: userLeads } = await supabase
          .from('leads')
          .select('id')
          .eq('assigned_user_id', currentUserId);
        leadIds = (userLeads || []).map((l: any) => l.id);
        
        if (leadIds.length === 0) {
          return [];
        }
      }
      
      let query = supabase
        .from('lead_tasks')
        .select(`
          id,
          title,
          type,
          due_date,
          lead_id,
          lead:leads(id, name)
        `)
        .eq('is_done', false)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .limit(10);
      
      // Non-admins only see tasks for their leads
      if (!isAdmin && leadIds.length > 0) {
        query = query.in('lead_id', leadIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching upcoming tasks:', error);
        return [];
      }

      return (data || []).slice(0, 5).map((task: any) => ({
        id: task.id,
        title: task.title,
        type: task.type || 'task',
        due_date: task.due_date,
        lead_name: task.lead?.name || 'Lead',
        lead_id: task.lead?.id || '',
      }));
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}
