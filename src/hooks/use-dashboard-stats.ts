import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { performanceTracker } from '@/lib/performance';
import { subDays, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardFilters } from './use-dashboard-filters';
import { useAuth } from '@/contexts/AuthContext';
import { checkLeadVisibility, applyVisibilityFilter, LeadVisibility } from './use-lead-visibility';

export interface DealsEvolutionPoint {
  date: string;
  ganhos: number;
  perdas: number;
  abertos: number;
}

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
  totalCommissions: number;
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
  const { profile } = useAuth();
  const currentUserId = profile?.id;
  const organizationId = profile?.organization_id;

  return useQuery({
    queryKey: ['enhanced-dashboard-stats', currentUserId, organizationId, filters?.dateRange?.from?.toISOString(), filters?.dateRange?.to?.toISOString(), filters?.teamId, filters?.userId, filters?.source, filters?.campaignId, filters?.adSetId, filters?.adId],
    enabled: !!currentUserId && !!organizationId,
    queryFn: async (): Promise<EnhancedDashboardStats> => {
      return performanceTracker.trackTimed('useEnhancedDashboardStats', async () => {
        const currentFrom = filters?.dateRange?.from || subDays(new Date(), 30);
        const currentTo = filters?.dateRange?.to || new Date();

        const { data, error } = await (supabase as any).rpc('get_enhanced_dashboard_stats', {
          p_organization_id: organizationId,
          p_user_id_filter: filters?.userId || null,
          p_team_id_filter: filters?.teamId || null,
          p_date_from: currentFrom.toISOString(),
          p_date_to: currentTo.toISOString(),
          p_source_filter: filters?.source || null,
          p_campaign_id_filter: filters?.campaignId || null,
          p_adset_id_filter: filters?.adset_id || null, // Corrigido para minúsculo conforme padrão
          p_ad_id_filter: filters?.adId || null
        });

        if (error) {
          console.error('Error fetching enhanced stats via RPC:', error);
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

        return data as unknown as EnhancedDashboardStats;
      });
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Dados do gráfico de leads por dia (otimizado)
export function useLeadsChartData() {
  const { profile } = useAuth();
  const currentUserId = profile?.id;

  return useQuery({
    queryKey: ['leads-chart-data', currentUserId],
    enabled: !!currentUserId,
    queryFn: async () => {
      // Get visibility level
      const visibility = currentUserId 
        ? await checkLeadVisibility(currentUserId) 
        : { canViewAll: false, userId: undefined };
      
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      
      // Query with role-based visibility
      let query = supabase
        .from('leads')
        .select('created_at, source, assigned_user_id')
        .gte('created_at', sevenDaysAgo)
        .order('created_at');
      
      // Apply visibility filter
      query = applyVisibilityFilter(query, visibility);
      
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
          site: dayLeads.filter((l: any) => l.source === 'site').length,
        });
      }
      
      return chartData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// Usa RPC otimizada para dados do funil COM filtros
// IMPORTANTE: Aplica filtro de role - considera líderes de equipe
export function useFunnelData(filters?: DashboardFilters, pipelineId?: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['funnel-data', filters?.dateRange?.from?.toISOString(), filters?.dateRange?.to?.toISOString(), filters?.teamId, filters?.userId, filters?.source, filters?.campaignId, filters?.adSetId, filters?.adId, pipelineId, user?.id],
    queryFn: async () => {
      // Get visibility level (admin, team leader, or normal user)
      const visibility = user?.id 
        ? await checkLeadVisibility(user.id) 
        : { canViewAll: false, userId: undefined };
      
      // Determinar userId efetivo baseado na visibilidade
      let effectiveUserId = filters?.userId;
      if (!effectiveUserId && !visibility.canViewAll) {
        // Se é líder de equipe, a RPC não suporta array - vamos passar null e filtrar no frontend
        // Se é usuário normal, passar o próprio ID
        effectiveUserId = visibility.teamMemberIds ? null : visibility.userId;
      }
      
      // Funil mostra snapshot ATUAL dos leads - não filtra por data de criação
      // Apenas aplica filtros de equipe/usuário/fonte/pipeline
      const { data, error } = await (supabase as any).rpc('get_funnel_data', {
        p_date_from: filters?.dateRange?.from?.toISOString() || null,
        p_date_to: filters?.dateRange?.to?.toISOString() || null,
        p_team_id: filters?.teamId || null,
        p_user_id: effectiveUserId || null,
        p_source: filters?.source || null,
        p_pipeline_id: pipelineId || null,
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
// IMPORTANTE: Aplica filtro de role - considera líderes de equipe
export function useLeadSourcesData(filters?: DashboardFilters, pipelineId?: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['lead-sources-data', filters?.dateRange?.from?.toISOString(), filters?.dateRange?.to?.toISOString(), filters?.teamId, filters?.userId, filters?.source, filters?.campaignId, filters?.adSetId, filters?.adId, pipelineId, user?.id],
    queryFn: async () => {
      // Get visibility level (admin, team leader, or normal user)
      const visibility = user?.id 
        ? await checkLeadVisibility(user.id) 
        : { canViewAll: false, userId: undefined };
      
      // Determinar userId efetivo baseado na visibilidade
      let effectiveUserId = filters?.userId;
      if (!effectiveUserId && !visibility.canViewAll) {
        effectiveUserId = visibility.teamMemberIds ? null : visibility.userId;
      }
      
      const { data, error } = await (supabase as any).rpc('get_lead_sources_data', {
        p_date_from: filters?.dateRange?.from?.toISOString() || null,
        p_date_to: filters?.dateRange?.to?.toISOString() || null,
        p_team_id: filters?.teamId || null,
        p_user_id: effectiveUserId || null,
        p_source: filters?.source || null,
        p_pipeline_id: pipelineId || null,
      });
      
      if (error) {
        console.error('Error fetching lead sources:', error);
        return [] as SourceDataPoint[];
      }
      
      // Map source names to friendly labels
      const sourceLabels: Record<string, string> = {
        'meta': 'Meta Ads',
        'site': 'Site',
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
  const { profile } = useAuth();
  const currentUserId = profile?.id;
  const organizationId = profile?.organization_id;

  return useQuery({
    queryKey: ['top-brokers', currentUserId, organizationId, filters?.dateRange?.from?.toISOString(), filters?.dateRange?.to?.toISOString(), filters?.teamId, filters?.userId, filters?.source, filters?.campaignId, filters?.adSetId, filters?.adId],
    enabled: !!currentUserId && !!organizationId,
    queryFn: async (): Promise<TopBrokersResult> => {
      // Get current user to check visibility
      const visibility = currentUserId 
        ? await checkLeadVisibility(currentUserId) 
        : { canViewAll: false, userId: undefined };
      
      // Team leaders and admins can see broker ranking
      // Non-privileged users shouldn't see the full broker ranking
      if (!visibility.canViewAll && !visibility.teamMemberIds) {
        return { brokers: [], isFallbackMode: false };
      }
      
      // First try: Get leads with won status using deal_status
      let selectString = `
          assigned_user_id,
          valor_interesse,
          deal_status,
          user:users!leads_assigned_user_id_fkey(id, name, avatar_url)
        `;
      if (filters?.campaignId || filters?.adSetId || filters?.adId) {
        selectString += ', lead_meta!inner(campaign_id, adset_id, ad_id)';
      }

      let query = supabase
        .from('leads')
        .select(selectString)
        .eq('organization_id', organizationId!)
        .not('assigned_user_id', 'is', null)
        .eq('deal_status', 'won');

      // Apply Meta filters
      if (filters?.campaignId) {
        query = query.eq('lead_meta.campaign_id', filters.campaignId);
      }
      if (filters?.adSetId) {
        query = query.eq('lead_meta.adset_id', filters.adSetId);
      }
      if (filters?.adId) {
        query = query.eq('lead_meta.ad_id', filters.adId);
      }

      // Team leaders only see their team members
      if (visibility.teamMemberIds) {
        query = query.in('assigned_user_id', visibility.teamMemberIds);
      }

      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.from.toISOString())
          .lte('created_at', filters.dateRange.to.toISOString());
      }

      if (filters?.userId) {
        query = query.eq('assigned_user_id', filters.userId);
      }
      if (filters?.source) {
        query = query.eq('source', filters.source);
      }

      const { data: wonLeads, error } = await query;

      if (error) {
        console.error('Error fetching top brokers:', error);
        return { brokers: [], isFallbackMode: false };
      }

      // If we have won leads, use them for ranking
      if (wonLeads && wonLeads.length > 0) {
        // Get all user IDs with won leads
        const userIds = [...new Set(wonLeads.map((l: any) => l.assigned_user_id).filter(Boolean))];
        
        // Fetch commissions for these users
        const { data: commissions } = await supabase
          .from('commissions')
          .select('user_id, amount, status')
          .in('user_id', userIds);
        
        // Build commission totals map (only forecast, approved, paid)
        const commissionTotals: Record<string, number> = {};
        (commissions || []).forEach((c: any) => {
          if (['forecast', 'approved', 'paid'].includes(c.status)) {
            commissionTotals[c.user_id] = (commissionTotals[c.user_id] || 0) + (c.amount || 0);
          }
        });

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
              totalCommissions: commissionTotals[userId] || 0,
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
      let fallbackSelectString = `
          assigned_user_id,
          valor_interesse,
          user:users!leads_assigned_user_id_fkey(id, name, avatar_url)
        `;
      if (filters?.campaignId || filters?.adSetId || filters?.adId) {
        fallbackSelectString += ', lead_meta!inner(campaign_id, adset_id, ad_id)';
      }

      let fallbackQuery = supabase
        .from('leads')
        .select(fallbackSelectString)
        .not('assigned_user_id', 'is', null);
      
      // Apply Meta filters
      if (filters?.campaignId) {
        fallbackQuery = fallbackQuery.eq('lead_meta.campaign_id', filters.campaignId);
      }
      if (filters?.adSetId) {
        fallbackQuery = fallbackQuery.eq('lead_meta.adset_id', filters.adSetId);
      }
      if (filters?.adId) {
        fallbackQuery = fallbackQuery.eq('lead_meta.ad_id', filters.adId);
      }

      if (filters?.dateRange) {
        fallbackQuery = fallbackQuery
          .gte('created_at', filters.dateRange.from.toISOString())
          .lte('created_at', filters.dateRange.to.toISOString());
      }

      if (filters?.userId) {
        fallbackQuery = fallbackQuery.eq('assigned_user_id', filters.userId);
      }
      if (filters?.source) {
        fallbackQuery = fallbackQuery.eq('source', filters.source);
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
            totalCommissions: 0,
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
  const { profile } = useAuth();
  const currentUserId = profile?.id;

  return useQuery({
    queryKey: ['upcoming-tasks', currentUserId],
    enabled: !!currentUserId,
    queryFn: async (): Promise<UpcomingTask[]> => {
      // Get visibility level
      const visibility = currentUserId 
        ? await checkLeadVisibility(currentUserId) 
        : { canViewAll: false, userId: undefined };
      
      // Build lead IDs array based on visibility
      let leadIds: string[] = [];
      if (!visibility.canViewAll) {
        // For team leaders, get leads of all team members
        // For normal users, get only their own leads
        const userIdsToFilter = visibility.teamMemberIds || (visibility.userId ? [visibility.userId] : []);
        
        if (userIdsToFilter.length > 0) {
          const { data: userLeads } = await supabase
            .from('leads')
            .select('id')
            .in('assigned_user_id', userIdsToFilter);
          leadIds = (userLeads || []).map((l: any) => l.id);
          
          if (leadIds.length === 0) {
            return [];
          }
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
      
      // Users without full visibility only see tasks for their/team leads
      if (!visibility.canViewAll && leadIds.length > 0) {
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

// Deals evolution (ganhos, perdas, em aberto) grouped by time
export function useDealsEvolutionData(filters?: DashboardFilters) {
  const { profile } = useAuth();
  const currentUserId = profile?.id;
  const organizationId = profile?.organization_id;

  return useQuery({
    queryKey: ['deals-evolution', currentUserId, organizationId, filters?.dateRange?.from?.toISOString(), filters?.dateRange?.to?.toISOString(), filters?.teamId, filters?.userId, filters?.source, filters?.campaignId, filters?.adSetId, filters?.adId],
    enabled: !!currentUserId && !!organizationId,
    queryFn: async (): Promise<DealsEvolutionPoint[]> => {
      return performanceTracker.trackTimed('useDealsEvolutionData', async () => {
      // Get visibility level
      const visibility = currentUserId 
        ? await checkLeadVisibility(currentUserId) 
        : { canViewAll: false, userId: undefined };
      
      // Calculate date range
      const now = new Date();
      const dateFrom = filters?.dateRange?.from || subDays(now, 30);
      const dateTo = filters?.dateRange?.to || now;
      const daysDiff = differenceInDays(dateTo, dateFrom);
      
      // Build base query
      let selectString = 'id, created_at, deal_status, assigned_user_id, source';
      if (filters?.campaignId || filters?.adSetId || filters?.adId) {
        selectString += ', lead_meta!inner(campaign_id, adset_id, ad_id)';
      }

      let query = supabase
        .from('leads')
        .select(selectString)
        .eq('organization_id', organizationId!)
        .gte('created_at', dateFrom.toISOString())
        .lte('created_at', dateTo.toISOString());

      // Apply Meta filters
      if (filters?.campaignId) {
        query = query.eq('lead_meta.campaign_id', filters.campaignId);
      }
      if (filters?.adSetId) {
        query = query.eq('lead_meta.adset_id', filters.adSetId);
      }
      if (filters?.adId) {
        query = query.eq('lead_meta.ad_id', filters.adId);
      }

      // Apply visibility filter (admin, team leader, or self-only)
      query = applyVisibilityFilter(query, visibility, 'assigned_user_id', filters?.userId);

      // Apply source filter
      if (filters?.source) {
        query = query.eq('source', filters.source as any);
      }

      // Apply team filter (only for users who can view all or are team leaders)
      if (filters?.teamId && (visibility.canViewAll || visibility.teamMemberIds)) {
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
        console.error('Error fetching deals evolution:', error);
        return [];
      }

      if (!leads || leads.length === 0) {
        return [];
      }

      // Determine grouping strategy based on date range
      let intervals: Date[];
      let formatLabel: (date: Date) => string;

      if (daysDiff <= 7) {
        // Group by day
        intervals = eachDayOfInterval({ start: dateFrom, end: dateTo });
        formatLabel = (date) => format(date, 'EEE', { locale: ptBR });
      } else if (daysDiff <= 31) {
        // Group by day with short date
        intervals = eachDayOfInterval({ start: dateFrom, end: dateTo });
        formatLabel = (date) => format(date, 'dd/MM', { locale: ptBR });
      } else if (daysDiff <= 90) {
        // Group by week
        intervals = eachWeekOfInterval({ start: dateFrom, end: dateTo }, { weekStartsOn: 1 });
        formatLabel = (date) => format(date, "'Sem' w", { locale: ptBR });
      } else {
        // Group by month
        intervals = eachMonthOfInterval({ start: dateFrom, end: dateTo });
        formatLabel = (date) => format(date, 'MMM', { locale: ptBR });
      }

      // Limit intervals to prevent too many points
      if (intervals.length > 12) {
        const step = Math.ceil(intervals.length / 12);
        intervals = intervals.filter((_, i) => i % step === 0);
      }

      // Group leads by interval
      const result: DealsEvolutionPoint[] = intervals.map((intervalStart, index) => {
        const intervalEnd = index < intervals.length - 1 
          ? intervals[index + 1] 
          : dateTo;
        
        const intervalLeads = leads.filter((lead: any) => {
          const leadDate = new Date(lead.created_at);
          return leadDate >= intervalStart && leadDate < intervalEnd;
        });

        return {
          date: formatLabel(intervalStart),
          ganhos: intervalLeads.filter((l: any) => l.deal_status === 'won').length,
          perdas: intervalLeads.filter((l: any) => l.deal_status === 'lost').length,
          abertos: intervalLeads.filter((l: any) => l.deal_status === 'open' || !l.deal_status).length,
        };
      });

      return result;
    });
  },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
