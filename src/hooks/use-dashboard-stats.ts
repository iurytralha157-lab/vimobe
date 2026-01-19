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
  leadsTrend: number;
  conversionTrend: number;
  closedTrend: number;
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
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      
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
      let query = supabase
        .from('leads')
        .select('id, created_at, stage_id, assigned_user_id, source, valor_interesse, stages!inner(stage_key)');

      // Apply date filter
      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.from.toISOString())
          .lte('created_at', filters.dateRange.to.toISOString());
      }

      // Apply user filter
      if (filters?.userId) {
        query = query.eq('assigned_user_id', filters.userId);
      }

      // Apply source filter
      if (filters?.source) {
        query = query.eq('source', filters.source as any);
      }

      // Apply team filter
      if (filters?.teamId) {
        // Get team members first
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', filters.teamId);
        
        if (teamMembers && teamMembers.length > 0) {
          const memberIds = teamMembers.map(m => m.user_id);
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
          leadsTrend: 0,
          conversionTrend: 0,
          closedTrend: 0,
        };
      }

      const totalLeads = leads?.length || 0;
      const closedLeads = leads?.filter((l: any) => 
        l.stages?.stage_key === 'won' || l.stages?.stage_key === 'closed'
      ).length || 0;
      
      const conversionRate = totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0;
      
      const totalSalesValue = leads?.reduce((sum: number, l: any) => {
        if (l.stages?.stage_key === 'won' || l.stages?.stage_key === 'closed') {
          return sum + (l.valor_interesse || 0);
        }
        return sum;
      }, 0) || 0;

      // TODO: Calculate real trends comparing with previous period
      // For now, using mock data
      return {
        totalLeads,
        conversionRate,
        closedLeads,
        avgResponseTime: '2h 30m', // TODO: Calculate from activities
        totalSalesValue,
        leadsTrend: Math.round(Math.random() * 20) - 5,
        conversionTrend: Math.round(Math.random() * 10) - 3,
        closedTrend: Math.round(Math.random() * 15) - 5,
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
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      
      // Query otimizada: apenas campos necessários
      const { data: leads } = await supabase
        .from('leads')
        .select('created_at, source')
        .gte('created_at', sevenDaysAgo)
        .order('created_at');
      
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
      const chartData: ChartDataPoint[] = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayName = days[date.getDay()];
        const dateStr = format(date, 'yyyy-MM-dd');
        
        const dayLeads = (leads || []).filter(l => 
          l.created_at.startsWith(dateStr)
        );
        
        chartData.push({
          name: dayName,
          meta: dayLeads.filter(l => l.source === 'meta').length,
          site: dayLeads.filter(l => l.source === 'site' || l.source === 'wordpress').length,
          wordpress: dayLeads.filter(l => l.source === 'wordpress').length,
        });
      }
      
      return chartData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// Usa RPC otimizada para dados do funil
export function useFunnelData() {
  return useQuery({
    queryKey: ['funnel-data'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_funnel_data');
      
      if (error) {
        console.error('Error fetching funnel data:', error);
        return [] as FunnelDataPoint[];
      }
      
      return (data as unknown as FunnelDataPoint[]) || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// Usa RPC otimizada para dados de fontes de leads
export function useLeadSourcesData() {
  return useQuery({
    queryKey: ['lead-sources-data'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_lead_sources_data');
      
      if (error) {
        console.error('Error fetching lead sources:', error);
        return [] as SourceDataPoint[];
      }
      
      return (data as unknown as SourceDataPoint[]) || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// Top Brokers (ranking de corretores)
export function useTopBrokers(filters?: DashboardFilters) {
  return useQuery({
    queryKey: ['top-brokers', filters?.dateRange?.from?.toISOString(), filters?.teamId],
    queryFn: async (): Promise<TopBroker[]> => {
      // Get leads with closed status
      let query = supabase
        .from('leads')
        .select(`
          assigned_user_id,
          valor_interesse,
          stages!inner(stage_key),
          user:users!leads_assigned_user_id_fkey(id, name, avatar_url)
        `)
        .not('assigned_user_id', 'is', null);

      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.from.toISOString())
          .lte('created_at', filters.dateRange.to.toISOString());
      }

      const { data: leads, error } = await query;

      if (error || !leads) {
        console.error('Error fetching top brokers:', error);
        return [];
      }

      // Filter closed leads and aggregate by user
      const closedLeads = leads.filter((l: any) => 
        l.stages?.stage_key === 'won' || l.stages?.stage_key === 'closed'
      );

      const brokerStats = closedLeads.reduce((acc: Record<string, TopBroker>, lead: any) => {
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

      // Sort by closedLeads desc
      return Object.values(brokerStats)
        .sort((a, b) => b.closedLeads - a.closedLeads)
        .slice(0, 5);
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Upcoming tasks
export function useUpcomingTasks() {
  return useQuery({
    queryKey: ['upcoming-tasks'],
    queryFn: async (): Promise<UpcomingTask[]> => {
      const { data, error } = await supabase
        .from('lead_tasks')
        .select(`
          id,
          title,
          type,
          due_date,
          lead:leads(id, name)
        `)
        .eq('is_done', false)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .limit(5);

      if (error) {
        console.error('Error fetching upcoming tasks:', error);
        return [];
      }

      return (data || []).map((task: any) => ({
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
