import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';

import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { KPICards } from '@/components/dashboard/KPICards';
import { SalesFunnelWithPipeline } from '@/components/dashboard/SalesFunnelWithPipeline';
import { DealsEvolutionChart } from '@/components/dashboard/DealsEvolutionChart';

import { useDashboardFilters, datePresetOptions } from '@/hooks/use-dashboard-filters';
import { 
  useEnhancedDashboardStats, 
  useDealsEvolutionData,
} from '@/hooks/use-dashboard-stats';

import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const [mobileChartTab, setMobileChartTab] = useState('funnel');
  const { organization, user } = useAuth();
  

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


  // Site visits count - unique sessions (respects date filters)
  const { data: siteVisits = 0 } = useQuery({
    queryKey: ['dashboard-site-visits', organization?.id, filters.dateRange.from.toISOString(), filters.dateRange.to.toISOString()],
    queryFn: async () => {
      if (!organization?.id) return 0;
      const { data, error } = await supabase
        .from('lead_events')
        .select('session_id')
        .eq('organization_id', organization.id)
        .gte('created_at', filters.dateRange.from.toISOString())
        .lte('created_at', filters.dateRange.to.toISOString());
      if (error) throw error;
      const uniqueSessions = new Set((data || []).map(e => e.session_id));
      return uniqueSessions.size;
    },
    enabled: !!organization?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

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
    <AppLayout title="Dashboard" disableMainScroll>
      <div className="flex flex-col gap-3 animate-fade-in h-full overflow-hidden">

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
        />

        {/* ===== DESKTOP LAYOUT ===== */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-3 flex-1 min-h-0">
          {/* Left column (col 1-8): KPIs + Activities + Evolution */}
          <div className="col-span-8 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3 auto-rows-min">
              <KPICardsGrid 
                data={kpiData} 
                isLoading={statsLoading} 
                periodLabel={periodLabel} 
                propertyCount={propertyCount}
                siteVisits={siteVisits}
              />
            </div>

            {/* Evolution chart - fills remaining height */}
            <div className="flex-1 min-h-0">
                <DealsEvolutionChart data={evolutionData} isLoading={evolutionLoading} />
            </div>
          </div>

          {/* Right column (col 9-12): Sales Funnel */}
          <div className="col-span-4 min-h-0 overflow-hidden">
            {funnelComponent}
          </div>
        </div>

        {/* ===== MOBILE LAYOUT ===== */}
        <div className="lg:hidden space-y-4">
          {/* KPIs */}
          <KPICards 
            data={kpiData} 
            isLoading={statsLoading} 
            periodLabel={periodLabel}
          />

          {/* Charts Tabs */}
          <Tabs value={mobileChartTab} onValueChange={setMobileChartTab}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="funnel" className="text-xs">Funil</TabsTrigger>
              <TabsTrigger value="evolution" className="text-xs">Evolução</TabsTrigger>
            </TabsList>
            <TabsContent value="funnel" className="mt-3">
              {funnelComponent}
            </TabsContent>
            <TabsContent value="evolution" className="mt-3">
                <DealsEvolutionChart data={evolutionData} isLoading={evolutionLoading} />
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
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
}

function KPICardsGrid({ data, isLoading, periodLabel, propertyCount, siteVisits }: KPICardsGridProps) {
  if (isLoading) {
    return (
      <>
        <div className="col-span-2 grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={`top-${i}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="col-span-2 grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={`bot-${i}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  const topKpis = [
    { title: 'Leads', value: data.totalLeads, trend: data.leadsTrend, icon: Users, tooltip: `Total de leads - ${periodLabel}`, format: 'number', color: 'primary' },
    { title: 'Conversão', value: data.conversionRate, trend: data.conversionTrend, icon: Target, tooltip: 'Taxa de conversão', format: 'percent', color: 'chart-2' },
    { title: 'Ganhos', value: data.closedLeads, trend: data.closedTrend, icon: CheckCircle2, tooltip: `Leads convertidos - ${periodLabel}`, format: 'number', color: 'chart-3' },
    { title: 'Tempo Resp.', value: data.avgResponseTime, icon: Clock, tooltip: 'Tempo médio de resposta', format: 'time', color: 'chart-4' },
  ];

  const bottomKpis = [
    { title: 'VGV', value: data.totalSalesValue, icon: DollarSign, tooltip: `Valor em vendas - ${periodLabel}`, format: 'currency', color: 'chart-5' },
    { title: 'Imóveis', value: propertyCount ?? 0, icon: Building2, tooltip: 'Total de imóveis cadastrados', format: 'number', color: 'chart-1' },
    { title: 'Visitas ao Site', value: siteVisits ?? 0, icon: Eye, tooltip: `Visitas ao site no período - ${periodLabel}`, format: 'number', color: 'chart-2' },
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
              <CardContent className="p-3 sm:p-4 h-full flex items-center">
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{kpi.title}</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold mt-0.5 truncate">
                      {formatKPIValue(kpi.value, kpi.format)}
                    </p>
                    {hasTrend && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-destructive" />
                        )}
                        <span className={cn(
                          "text-[11px] sm:text-xs font-medium",
                          isPositive ? "text-emerald-500" : "text-destructive"
                        )}>
                          {kpi.trend! > 0 ? '+' : ''}{kpi.trend}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div
                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `hsl(var(--${kpi.color}) / 0.1)` }}
                  >
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

  return (
    <>
      {/* Row 1: 4 KPIs */}
      <div className="col-span-2 grid grid-cols-4 gap-3">
        {topKpis.map(renderKPI)}
      </div>
      {/* Row 2: 3 KPIs */}
      <div className="col-span-2 grid grid-cols-3 gap-3">
        {bottomKpis.map(renderKPI)}
      </div>
    </>
  );
}
