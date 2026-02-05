import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, parseISO, startOfWeek, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { checkLeadVisibility, applyVisibilityFilter } from './use-lead-visibility';

export interface TelecomDashboardStats {
  totalCustomers: number;
  activeCustomers: number; // INSTALADOS
  conversionRate: number;
  monthlyRecurringRevenue: number; // Soma do plan_value de clientes INSTALADOS
  customersTrend: number;
  activeTrend: number;
  conversionTrend: number;
}

export interface TelecomEvolutionPoint {
  date: string;
  novos: number;
  instalados: number;
  aguardando: number;
  em_analise: number;
  cancelado: number;
  suspenso: number;
  inadimplente: number;
}

interface DashboardFilters {
  dateFrom?: Date;
  dateTo?: Date;
  teamId?: string;
  userId?: string;
}

export function useTelecomDashboardStats(filters?: DashboardFilters) {
  const { organization, profile } = useAuth();

  return useQuery({
    queryKey: ['telecom-dashboard-stats', organization?.id, filters, profile?.id],
    queryFn: async () => {
      if (!organization?.id || !profile?.id) {
        return {
          totalCustomers: 0,
          activeCustomers: 0,
          conversionRate: 0,
          monthlyRecurringRevenue: 0,
          customersTrend: 0,
          activeTrend: 0,
          conversionTrend: 0,
        };
      }

      // Get visibility level (admin, team leader, or normal user)
      const visibility = await checkLeadVisibility(profile.id);

      // Build base query conditions
      const buildQuery = (baseQuery: any) => {
        let q = baseQuery.eq('organization_id', organization.id);
        
        // Apply visibility filter or explicit user filter
        if (filters?.userId) {
          q = q.eq('seller_id', filters.userId);
        } else {
          q = applyVisibilityFilter(q, visibility, 'seller_id');
        }
        
        return q;
      };

      // Current period counts
      const [
        { count: total },
        { count: instalados },
        { data: mrrData },
      ] = await Promise.all([
        buildQuery(
          supabase.from('telecom_customers').select('*', { count: 'exact', head: true })
        ),
        buildQuery(
          supabase.from('telecom_customers').select('*', { count: 'exact', head: true })
        ).eq('status', 'INSTALADOS'),
        buildQuery(
          supabase.from('telecom_customers').select('plan_value')
        ).eq('status', 'INSTALADOS'),
      ]);

      // Calculate MRR
      const mrr = (mrrData || []).reduce((sum, c) => sum + (c.plan_value || 0), 0);

      // Conversion rate: instalados / total
      const conversionRate = total && total > 0 
        ? Math.round((instalados || 0) / total * 100) 
        : 0;

      // Previous period for trends (30 days ago)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const [
        { count: prevTotal },
        { count: prevInstalados },
      ] = await Promise.all([
        buildQuery(
          supabase.from('telecom_customers').select('*', { count: 'exact', head: true })
        ).lt('created_at', thirtyDaysAgo.toISOString()),
        buildQuery(
          supabase.from('telecom_customers').select('*', { count: 'exact', head: true })
        ).eq('status', 'INSTALADOS').lt('created_at', thirtyDaysAgo.toISOString()),
      ]);

      // Calculate trends
      const customersTrend = prevTotal && prevTotal > 0
        ? Math.round(((total || 0) - prevTotal) / prevTotal * 100)
        : 0;
      
      const activeTrend = prevInstalados && prevInstalados > 0
        ? Math.round(((instalados || 0) - prevInstalados) / prevInstalados * 100)
        : 0;

      const prevConversion = prevTotal && prevTotal > 0 
        ? (prevInstalados || 0) / prevTotal * 100 
        : 0;
      const conversionTrend = prevConversion > 0
        ? Math.round((conversionRate - prevConversion) / prevConversion * 100)
        : 0;

      return {
        totalCustomers: total || 0,
        activeCustomers: instalados || 0,
        conversionRate,
        monthlyRecurringRevenue: mrr,
        customersTrend,
        activeTrend,
        conversionTrend,
      };
    },
    enabled: !!organization?.id,
  });
}

export function useTelecomEvolutionData(filters?: DashboardFilters) {
  const { organization, profile } = useAuth();

  return useQuery({
    queryKey: ['telecom-evolution-data', organization?.id, filters, profile?.id],
    queryFn: async (): Promise<TelecomEvolutionPoint[]> => {
      if (!organization?.id || !profile?.id) return [];

      // Get visibility level (admin, team leader, or normal user)
      const visibility = await checkLeadVisibility(profile.id);

      // Determine date range
      const dateTo = filters?.dateTo || new Date();
      const dateFrom = filters?.dateFrom || new Date(dateTo.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Build query
      let query = supabase
        .from('telecom_customers')
        .select('created_at, status, installation_date')
        .eq('organization_id', organization.id)
        .gte('created_at', dateFrom.toISOString())
        .lte('created_at', dateTo.toISOString());

      // Apply visibility filter or explicit user filter
      if (filters?.userId) {
        query = query.eq('seller_id', filters.userId);
      } else {
        query = applyVisibilityFilter(query, visibility, 'seller_id');
      }

      const { data: customers, error } = await query;

      if (error) {
        console.error('Error fetching telecom evolution:', error);
        return [];
      }

      if (!customers || customers.length === 0) return [];

      // Determine grouping interval
      const daysDiff = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
      
      let intervals: Date[];
      let formatPattern: string;
      let getIntervalKey: (date: Date) => string;

      if (daysDiff <= 14) {
        // Daily
        intervals = eachDayOfInterval({ start: dateFrom, end: dateTo });
        formatPattern = 'dd/MM';
        getIntervalKey = (date) => format(date, 'yyyy-MM-dd');
      } else if (daysDiff <= 90) {
        // Weekly
        intervals = eachWeekOfInterval({ start: dateFrom, end: dateTo }, { locale: ptBR });
        formatPattern = "'Sem' w";
        getIntervalKey = (date) => format(startOfWeek(date, { locale: ptBR }), 'yyyy-MM-dd');
      } else {
        // Monthly
        intervals = eachMonthOfInterval({ start: dateFrom, end: dateTo });
        formatPattern = 'MMM';
        getIntervalKey = (date) => format(startOfMonth(date), 'yyyy-MM');
      }

      // Group customers by interval and status at creation time
      const grouped = new Map<string, TelecomEvolutionPoint>();

      intervals.forEach((interval) => {
        const key = getIntervalKey(interval);
        grouped.set(key, {
          date: format(interval, formatPattern, { locale: ptBR }),
          novos: 0,
          instalados: 0,
          aguardando: 0,
          em_analise: 0,
          cancelado: 0,
          suspenso: 0,
          inadimplente: 0,
        });
      });

      // Contar clientes na lógica correta de evolução:
      // - Todos contam como "novos" na data de criação
      // - "instalados" são contados pela data de instalação (não criação)
      customers.forEach((customer) => {
        const createdDate = parseISO(customer.created_at);
        const createdKey = getIntervalKey(createdDate);
        const createdPoint = grouped.get(createdKey);
        
        // Todo cliente conta como "novo" na data de criação
        if (createdPoint) {
          createdPoint.novos++;
        }
        
        // Se tem installation_date, contar como instalado nessa data
        if (customer.installation_date) {
          const installDate = parseISO(customer.installation_date);
          const installKey = getIntervalKey(installDate);
          const installPoint = grouped.get(installKey);
          if (installPoint) {
            installPoint.instalados++;
          }
        }
      });

      return Array.from(grouped.values());
    },
    enabled: !!organization?.id,
  });
}
