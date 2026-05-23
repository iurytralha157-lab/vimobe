import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { performanceTracker } from '@/lib/performance';
import { subDays, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardFilters, sourceLabels } from './use-dashboard-filters';
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
  rawSource?: string;
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
  const { user, organization } = useAuth();
  const currentUserId = user?.id;
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['enhanced-dashboard-stats', currentUserId, organizationId, filters?.dateRange?.from?.toISOString(), filters?.dateRange?.to?.toISOString(), filters?.teamId, filters?.userId, filters?.source, filters?.campaignId, filters?.adSetId, filters?.adId],
    enabled: !!currentUserId && !!organizationId,
    queryFn: async (): Promise<EnhancedDashboardStats> => {
      return performanceTracker.trackTimed('useEnhancedDashboardStats', async () => {
        const currentFrom = filters?.dateRange?.from || subDays(new Date(), 30);
        const currentTo = filters?.dateRange?.to || new Date();
        const interval = currentTo.getTime() - currentFrom.getTime();
        const prevFrom = new Date(currentFrom.getTime() - interval);

        // Visibilidade obrigatória — usuário comum só vê próprios leads
        // Otimização: checkLeadVisibility usa cache do TanStack se chamado via hook, 
        // mas aqui estamos num queryFn. O cache manual ou Promise.all ajuda.
        const visibility = currentUserId
          ? await checkLeadVisibility(currentUserId)
          : { canViewAll: false, userId: undefined };

        // 1. Definição das queries básicas
        
        // Base filters for current period
        let query = supabase
          .from('leads')
          .select('id, deal_status, first_response_seconds, valor_interesse', { count: 'exact' })
          .eq('organization_id', organizationId)
          .gte('created_at', currentFrom.toISOString())
          .lte('created_at', currentTo.toISOString());

        if (filters?.campaignId || filters?.adSetId || filters?.adId) {
          query = supabase
            .from('leads')
            .select('id, deal_status, first_response_seconds, valor_interesse, lead_meta!inner(campaign_id, adset_id, ad_id)', { count: 'exact' })
            .eq('organization_id', organizationId)
            .gte('created_at', currentFrom.toISOString())
            .lte('created_at', currentTo.toISOString());

          if (filters.campaignId) query = query.eq('lead_meta.campaign_id', filters.campaignId);
          if (filters.adSetId) query = query.eq('lead_meta.adset_id', filters.adSetId);
          if (filters.adId) query = query.eq('lead_meta.ad_id', filters.adId);
        }
        if (filters?.source) query = query.eq('source', filters.source);
        query = applyVisibilityFilter(query, visibility, 'assigned_user_id', filters?.userId);

        // 2. Query de Vendas Ganhas
        let wonQuery = supabase
          .from('leads')
          .select('id, valor_interesse, assigned_user_id, source, lead_meta!left(campaign_id, adset_id, ad_id)')
          .eq('organization_id', organizationId)
          .eq('deal_status', 'won')
          .gte('won_at', currentFrom.toISOString())
          .lte('won_at', currentTo.toISOString());

        if (filters?.campaignId) wonQuery = wonQuery.eq('lead_meta.campaign_id', filters.campaignId);
        if (filters?.adSetId) wonQuery = wonQuery.eq('lead_meta.adset_id', filters.adSetId);
        if (filters?.adId) wonQuery = wonQuery.eq('lead_meta.ad_id', filters.adId);
        if (filters?.source) wonQuery = wonQuery.eq('source', filters.source);
        wonQuery = applyVisibilityFilter(wonQuery, visibility, 'assigned_user_id', filters?.userId);

        // 3. Query de Período Anterior (Trends)
        let prevQuery = supabase
          .from('leads')
          .select('id, deal_status', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .gte('created_at', prevFrom.toISOString())
          .lt('created_at', currentFrom.toISOString());

        if (filters?.campaignId || filters?.adSetId || filters?.adId) {
          prevQuery = supabase
            .from('leads')
            .select('id, deal_status, lead_meta!inner(campaign_id, adset_id, ad_id)', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .gte('created_at', prevFrom.toISOString())
            .lt('created_at', currentFrom.toISOString());
          if (filters.campaignId) prevQuery = prevQuery.eq('lead_meta.campaign_id', filters.campaignId);
          if (filters.adSetId) prevQuery = prevQuery.eq('lead_meta.adset_id', filters.adSetId);
          if (filters.adId) prevQuery = prevQuery.eq('lead_meta.ad_id', filters.adId);
        }
        if (filters?.source) prevQuery = prevQuery.eq('source', filters.source);
        prevQuery = applyVisibilityFilter(prevQuery, visibility, 'assigned_user_id', filters?.userId);

        // 4. Se houver filtro de equipe, buscar membros primeiro (necessário para as outras queries)
        let teamMemberIds: string[] | null = null;
        if (filters?.teamId && (visibility.canViewAll || visibility.teamMemberIds)) {
          const { data: teamMembers } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', filters.teamId);
          if (teamMembers?.length) {
            teamMemberIds = teamMembers.map(m => m.user_id);
            query = query.in('assigned_user_id', teamMemberIds);
            wonQuery = wonQuery.in('assigned_user_id', teamMemberIds);
            prevQuery = prevQuery.in('assigned_user_id', teamMemberIds);
          }
        }

        // EXECUÇÃO PARALELA DAS QUERIES
        const [leadsResult, wonResult, prevResult] = await Promise.all([
          query,
          wonQuery,
          prevQuery
        ]);

        const totalLeads = leadsResult.count || 0;
        const leads = leadsResult.data || [];
        const wonLeads = wonResult.data || [];
        const closedLeads = wonLeads.length;
        const prevTotal = prevResult.count || 0;

        const totalSalesValue = wonLeads.reduce(
          (sum, l: any) => sum + (Number(l.valor_interesse) || 0),
          0
        );

        const respTimes = leads.filter(l => l.first_response_seconds != null)
          .map(l => Number(l.first_response_seconds)) || [];
        const avgRespSec = respTimes.length > 0 
          ? respTimes.reduce((a, b) => a + b, 0) / respTimes.length 
          : null;

        const formatAvgTime = (seconds: number | null) => {
          if (seconds === null) return '--';
          if (seconds < 60) return `${Math.round(seconds)}s`;
          if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
          return `${Math.round(seconds / 3600)}h`;
        };

        const wonFromPeriod = leads.filter(l => l.deal_status === 'won').length;
        const conversionRate = totalLeads > 0 ? (wonFromPeriod / totalLeads) * 100 : 0;
        const leadsTrend = prevTotal && prevTotal > 0 
          ? Math.round(((totalLeads - prevTotal) / prevTotal) * 100) 
          : 0;

        return {
          totalLeads,
          conversionRate,
          closedLeads,
          avgResponseTime: formatAvgTime(avgRespSec),
          totalSalesValue,
          pendingCommissions: 0,
          leadsTrend,
          conversionTrend: 0,
          closedTrend: 0,
          totalReceivables: 0,
          totalPayables: 0,
          overdueReceivables: 0,
          overduePayables: 0,
          paidCommissions: 0,
        };
      });
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Dados do gráfico de leads por dia (otimizado)
export function useLeadsChartData() {
  const { user } = useAuth();
  const currentUserId = user?.id;

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
      
      // Map source names to friendly labels using the exported mapping
      const labels = sourceLabels;
      
      const aggregatedData: Record<string, { count: number; rawSource: string }> = {};
      
      (data || []).forEach((item: any) => {
        const rawSource = item.source_name;
        const label = labels[rawSource] || rawSource || 'Outros';
        
        if (!aggregatedData[label]) {
          aggregatedData[label] = { count: 0, rawSource: rawSource };
        }
        aggregatedData[label].count += (Number(item.lead_count) || 0);
      });
      
      return Object.entries(aggregatedData)
        .map(([name, data]) => ({ 
          name, 
          value: data.count, 
          rawSource: data.rawSource 
        }))
        .sort((a, b) => b.value - a.value) as SourceDataPoint[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// Top Brokers (ranking de corretores) - com fallback para leads totais
export function useTopBrokers(filters?: DashboardFilters) {
  const { user, organization } = useAuth();
  const currentUserId = user?.id;
  const organizationId = organization?.id;

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
          .gte('won_at', filters.dateRange.from.toISOString())
          .lte('won_at', filters.dateRange.to.toISOString());
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
  const { user } = useAuth();
  const currentUserId = user?.id;

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
  const { user, organization } = useAuth();
  const currentUserId = user?.id;
  const organizationId = organization?.id;

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
      
      // Build base query — buscar leads que entraram OU foram ganhos OU foram perdidos no período
      let selectString = 'id, created_at, won_at, lost_at, deal_status, assigned_user_id, source';
      if (filters?.campaignId || filters?.adSetId || filters?.adId) {
        selectString += ', lead_meta!inner(campaign_id, adset_id, ad_id)';
      }

      let query = supabase
        .from('leads')
        .select(selectString)
        .eq('organization_id', organizationId!)
        .or(
          `and(created_at.gte.${dateFrom.toISOString()},created_at.lte.${dateTo.toISOString()}),` +
          `and(won_at.gte.${dateFrom.toISOString()},won_at.lte.${dateTo.toISOString()}),` +
          `and(lost_at.gte.${dateFrom.toISOString()},lost_at.lte.${dateTo.toISOString()})`
        );

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
      let shouldLimitPoints = true;

      if (daysDiff <= 31) {
        // Group by day - ALWAYS show all days for up to 31 days
        intervals = eachDayOfInterval({ start: dateFrom, end: dateTo });
        formatLabel = (date) => format(date, 'dd/MM', { locale: ptBR });
        shouldLimitPoints = false; // Do not skip days for short ranges
      } else if (daysDiff <= 90) {
        // Group by week
        intervals = eachWeekOfInterval({ start: dateFrom, end: dateTo }, { weekStartsOn: 1 });
        formatLabel = (date) => format(date, "'Sem' w", { locale: ptBR });
      } else {
        // Group by month
        intervals = eachMonthOfInterval({ start: dateFrom, end: dateTo });
        formatLabel = (date) => format(date, 'MMM', { locale: ptBR });
      }

      // Limit intervals to prevent too many points ONLY for long ranges
      if (shouldLimitPoints && intervals.length > 12) {
        const step = Math.ceil(intervals.length / 12);
        intervals = intervals.filter((_, i) => i % step === 0);
      }

      // Group leads by interval — usa a DATA CORRETA para cada categoria:
      // - abertos: created_at (entrada do lead)
      // - ganhos: won_at (data da venda)
      // - perdas: lost_at (data da perda)
      const inRange = (iso: string | null, start: Date, end: Date) => {
        if (!iso) return false;
        const d = new Date(iso);
        return d >= start && d < end;
      };

      const result: DealsEvolutionPoint[] = intervals.map((intervalStart, index) => {
        const intervalEnd = index < intervals.length - 1
          ? intervals[index + 1]
          : dateTo;

        const ganhos = leads.filter((l: any) =>
          l.deal_status === 'won' && inRange(l.won_at, intervalStart, intervalEnd)
        ).length;

        const perdas = leads.filter((l: any) =>
          l.deal_status === 'lost' && inRange(l.lost_at, intervalStart, intervalEnd)
        ).length;

        const abertos = leads.filter((l: any) =>
          (l.deal_status === 'open' || !l.deal_status) &&
          inRange(l.created_at, intervalStart, intervalEnd)
        ).length;

        return {
          date: formatLabel(intervalStart),
          ganhos,
          perdas,
          abertos,
        };
      });

      return result;
    });
    },
    staleTime: 1000 * 60 * 5,
  });
}
