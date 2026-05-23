import { useState, useEffect } from 'react';
import { performanceTracker } from '@/lib/performance';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';

import { KPICards } from '@/components/dashboard/KPICards';
import { SalesFunnelWithPipeline } from '@/components/dashboard/SalesFunnelWithPipeline';
import { DealsEvolutionChart } from '@/components/dashboard/DealsEvolutionChart';
import { LeadSourcesChart } from '@/components/dashboard/LeadSourcesChart';

import { useDashboardFilters, datePresetOptions } from '@/hooks/use-dashboard-filters';
import { 
  useEnhancedDashboardStats, 
  useDealsEvolutionData,
  useLeadSourcesData,
} from '@/hooks/use-dashboard-stats';

import { useAuth } from '@/contexts/AuthContext';
import { useLeadVisibility, applyVisibilityFilter } from '@/hooks/use-lead-visibility';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const isMobile = useIsMobile();
  const [mobileChartTab, setMobileChartTab] = useState('funnel');
  const { organization, user } = useAuth();
  const { data: visibility } = useLeadVisibility(user?.id);

  // Property count query
  const { data: propertyCount = 0 } = useQuery({
    queryKey: ['dashboard-property-count', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return 0;
      const { count, error } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!organization?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const {
    filters,
    datePreset,
    setDatePreset,
    customDateRange,
    setCustomDateRange,
    teamId,
    setTeamId,
    userId,
    setUserId,
    source,
    setSource,
    campaignId,
    setCampaignId,
    adSetId,
    setAdSetId,
    adId,
    setAdId,
    clearFilters,
    hasActiveFilters,
  } = useDashboardFilters();

  // Data hooks - Imobiliário
  const { data: stats, isLoading: statsLoading } = useEnhancedDashboardStats(filters);
  const { data: evolutionData = [], isLoading: evolutionLoading } = useDealsEvolutionData(filters);
  const { data: sourcesData = [], isLoading: sourcesLoading } = useLeadSourcesData(filters);


  // Site visits count - unique sessions (respects date filters)
  const { data: siteVisits = 0 } = useQuery({
    queryKey: ['dashboard-site-visits', organization?.id, filters.dateRange.from.toISOString(), filters.dateRange.to.toISOString()],
    queryFn: async () => {
      if (!organization?.id) return 0;
      const { data, error } = await (supabase as any).rpc('count_unique_sessions', {
        p_organization_id: organization.id,
        p_date_from: filters.dateRange.from.toISOString(),
        p_date_to: filters.dateRange.to.toISOString()
      });
      if (error) throw error;
      return Number(data) || 0;
    },
    enabled: !!organization?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Scheduled visits count
  const { data: scheduledVisitsCount = 0 } = useQuery({
    queryKey: ['dashboard-scheduled-visits', organization?.id, filters.dateRange.from.toISOString(), filters.dateRange.to.toISOString(), filters.userId, visibility],
    queryFn: async () => {
      if (!organization?.id || !visibility) return 0;
      let query = supabase
        .from('schedule_events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('event_type', 'visit')
        .gte('start_time', filters.dateRange.from.toISOString())
        .lte('start_time', filters.dateRange.to.toISOString());
      
      query = applyVisibilityFilter(query, visibility, 'user_id', filters.userId);
      
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!organization?.id && !!visibility,
    staleTime: 1000 * 60, // 1 minute (reduced from 5 to be more precise)
  });

  useEffect(() => {
    if (!statsLoading && !evolutionLoading) {
      performanceTracker.addMetric('Dashboard Full Load', performance.now(), 'ms');
    }
  }, [statsLoading, evolutionLoading]);

  const funnelComponent = <SalesFunnelWithPipeline filters={filters} />;

  const periodLabel = datePresetOptions.find(o => o.value === datePreset)?.label || 'Período selecionado';

  const kpiData = stats || {
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


  return (
    <AppLayout title="Dashboard" disableMainScroll={true}>
      <div className={cn(
        "flex flex-col gap-2 md:gap-3 animate-fade-in h-full w-full",
        !isMobile ? "flex-1 min-h-0 overflow-hidden" : ""
      )}>

        {/* Filters bar */}
        <DashboardFilters
          datePreset={datePreset}
          onDatePresetChange={setDatePreset}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
          teamId={teamId}
          onTeamChange={setTeamId}
          userId={userId}
          onUserChange={setUserId}
          source={source}
          onSourceChange={setSource}
          campaignId={campaignId}
          onCampaignChange={setCampaignId}
          adSetId={adSetId}
          onAdSetChange={setAdSetId}
          adId={adId}
          onAdChange={setAdId}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
          dynamicSources={dynamicSources}
          campaigns={campaigns}
          adSets={adSets}
          ads={ads}
          isLoadingSources={isLoadingSources}
          isLoadingCampaigns={isLoadingCampaigns}
          isLoadingAdSets={isLoadingAdSets}
          isLoadingAds={isLoadingAds}
        />

        {/* ===== DESKTOP LAYOUT ===== */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-2 md:gap-3 flex-1 min-h-0 overflow-hidden">
          {/* Left column (col 1-8): KPIs + Evolution Chart */}
          <div className="col-span-8 flex flex-col gap-3 min-h-0">
            {/* KPIs on top */}
            <div className="flex-shrink-0">
              <KPICardsGrid 
                data={kpiData} 
                isLoading={statsLoading} 
                periodLabel={periodLabel} 
                propertyCount={propertyCount}
                siteVisits={siteVisits}
                scheduledVisits={scheduledVisitsCount}
                layout="top"
              />
            </div>
            
            {/* Evolution chart - Fills ALL remaining height down to footer */}
            <div className="flex-1 min-h-0">
              <DealsEvolutionChart data={evolutionData} isLoading={evolutionLoading} />
            </div>
          </div>

          {/* Right column (col 9-12): Sales Funnel + Lead Sources */}
          <div className="col-span-4 min-h-0 flex flex-col gap-3">
            <div className="h-[48%] min-h-0">
              {funnelComponent}
            </div>
            <div className="h-[52%] min-h-0">
              <LeadSourcesChart data={sourcesData} isLoading={sourcesLoading} />
            </div>
          </div>
        </div>

        {/* ===== MOBILE LAYOUT ===== */}
        <div className={cn(
          "lg:hidden flex flex-col gap-4 overflow-y-auto",
          !isMobile ? "flex-1 min-h-0" : ""
        )}>
          {/* KPIs */}
          <KPICards 
            data={kpiData} 
            isLoading={statsLoading} 
            periodLabel={periodLabel}
            scheduledVisits={scheduledVisitsCount}
            propertyCount={propertyCount}
            siteVisits={siteVisits}
          />

          {/* Charts Tabs */}
          <Tabs value={mobileChartTab} onValueChange={setMobileChartTab} className={cn(!isMobile ? "flex-1 flex flex-col min-h-0" : "")}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="funnel" className="text-xs">Funil</TabsTrigger>
              <TabsTrigger value="evolution" className="text-xs">Evolução</TabsTrigger>
              <TabsTrigger value="sources" className="text-xs">Origem</TabsTrigger>
            </TabsList>
            <TabsContent value="funnel" className={cn("mt-3", !isMobile ? "flex-1 min-h-0" : "")}>
              <div className="h-[400px]">
                {funnelComponent}
              </div>
            </TabsContent>
            <TabsContent value="evolution" className={cn("mt-3", !isMobile ? "flex-1 min-h-0" : "")}>
              <div className="h-[400px]">
                <DealsEvolutionChart data={evolutionData} isLoading={evolutionLoading} />
              </div>
            </TabsContent>
            <TabsContent value="sources" className={cn("mt-3", !isMobile ? "flex-1 min-h-0" : "")}>
              <div className="h-[450px]">
                <LeadSourcesChart data={sourcesData} isLoading={sourcesLoading} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}

// Separate KPI grid component for the 4+4 desktop layout
import { 
  Users, 
  Target, 
  CheckCircle2, 
  DollarSign,
  Building2,
  Clock,
  Eye,
  TrendingUp,
  TrendingDown,
  CalendarCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function formatKPIValue(value: string | number, format: string): string {
  if (typeof value === 'string') return value;
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        notation: value >= 100000 ? 'compact' : 'standard',
        maximumFractionDigits: value >= 100000 ? 1 : 0,
      }).format(value);
    case 'percent':
      return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;
    default:
      return value.toLocaleString('pt-BR');
  }
}

interface KPICardsGridProps {
  data: any;
  isLoading?: boolean;
  periodLabel: string;
  propertyCount?: number;
  siteVisits?: number;
  scheduledVisits?: number;
  layout?: 'top' | 'side';
}

function KPICardsGrid({ data, isLoading, periodLabel, propertyCount, siteVisits, scheduledVisits, layout = 'top' }: KPICardsGridProps) {
  if (isLoading) {
    const isSide = layout === 'side';
    return (
      <div className="space-y-3">
        <div className={cn("grid gap-3", isSide ? "grid-cols-2" : "grid-cols-4")}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={`skeleton-top-${i}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-12" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-9 w-9 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className={cn("grid gap-3", isSide ? "grid-cols-2" : "grid-cols-3")}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={`skeleton-bottom-${i}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-12" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-9 w-9 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const allKpis = [
    { title: 'Leads', value: data.totalLeads, trend: data.leadsTrend, icon: Users, tooltip: `Total de leads - ${periodLabel}`, format: 'number', color: 'primary' },
    { title: 'Conversão', value: data.conversionRate, trend: data.conversionTrend, icon: Target, tooltip: 'Taxa de conversão', format: 'percent', color: 'chart-2' },
    { title: 'Ganhos', value: data.closedLeads, trend: data.closedTrend, icon: CheckCircle2, tooltip: `Leads convertidos - ${periodLabel}`, format: 'number', color: 'chart-3' },
    { title: 'Tempo Resp.', value: data.avgResponseTime, icon: Clock, tooltip: 'Tempo médio de resposta', format: 'time', color: 'chart-4' },
    { title: 'VGV', value: data.totalSalesValue, icon: DollarSign, tooltip: `Valor em vendas - ${periodLabel}`, format: 'currency', color: 'chart-5' },
    { title: 'Imóveis', value: propertyCount ?? 0, icon: Building2, tooltip: 'Total de imóveis cadastrados', format: 'number', color: 'chart-1' },
    { title: 'Visitas no site', value: siteVisits ?? 0, icon: Eye, tooltip: `Visitas ao site no período - ${periodLabel}`, format: 'number', color: 'chart-2' },
    { title: 'Visitas Agendadas', value: scheduledVisits ?? 0, icon: CalendarCheck, tooltip: `Visitas agendadas no período - ${periodLabel}`, format: 'number', color: 'chart-4' },
  ];

  const renderKPI = (kpi: any) => {
    const Icon = kpi.icon;
    const hasTrend = kpi.trend !== undefined && kpi.trend !== 0;
    const isPositive = (kpi.trend ?? 0) >= 0;

    return (
      <TooltipProvider key={kpi.title}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="card-hover cursor-default h-full">
              <CardContent className="p-3 sm:p-4 h-full">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium truncate mb-1">{kpi.title}</p>
                    <p className="text-lg sm:text-2xl font-bold truncate">
                      {formatKPIValue(kpi.value, kpi.format)}
                    </p>
                    {hasTrend && (
                      <div className="flex items-center gap-0.5 mt-1">
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-destructive" />
                        )}
                        <span className={cn(
                          "text-[10px] sm:text-xs font-medium",
                          isPositive ? "text-emerald-500" : "text-destructive"
                        )}>
                          {kpi.trend! > 0 ? '+' : ''}{kpi.trend}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `hsl(var(--${kpi.color}) / 0.1)` }}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: `hsl(var(--${kpi.color}))` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{kpi.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const isSide = layout === 'side';

  return (
    <div className="space-y-3">
      <div className={cn("grid gap-3", isSide ? "grid-cols-2" : "grid-cols-4")}>
        {allKpis.slice(0, 4).map(renderKPI)}
      </div>
      <div className={cn("grid gap-3", isSide ? "grid-cols-1" : "grid-cols-4")}>
        {allKpis.slice(4).map(renderKPI)}
      </div>
    </div>
  );
}
