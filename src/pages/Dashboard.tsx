import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { KPICards } from '@/components/dashboard/KPICards';
import { SalesFunnelWithPipeline } from '@/components/dashboard/SalesFunnelWithPipeline';
import { DealsEvolutionChart } from '@/components/dashboard/DealsEvolutionChart';
import { TelecomKPICards } from '@/components/dashboard/TelecomKPICards';
import { TelecomEvolutionChart } from '@/components/dashboard/TelecomEvolutionChart';
import { RecentActivities } from '@/components/dashboard/RecentActivities';
import { useDashboardFilters, datePresetOptions } from '@/hooks/use-dashboard-filters';
import { 
  useEnhancedDashboardStats, 
  useDealsEvolutionData,
} from '@/hooks/use-dashboard-stats';
import { useTelecomDashboardStats, useTelecomEvolutionData } from '@/hooks/use-telecom-dashboard-stats';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';


export default function Dashboard() {
  const [mobileChartTab, setMobileChartTab] = useState('funnel');
  const { organization, user } = useAuth();
  const isTelecom = organization?.segment === 'telecom';

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
  });

  // Running automations count (same logic as ExecutionHistory: running + waiting)
  const { data: runningAutomations = 0 } = useQuery({
    queryKey: ['dashboard-running-automations', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return 0;
      const { count, error } = await supabase
        .from('automation_executions')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .in('status', ['running', 'waiting']);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!organization?.id,
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
    clearFilters,
    hasActiveFilters,
  } = useDashboardFilters();

  // Data hooks - Imobiliário
  const { data: stats, isLoading: statsLoading } = useEnhancedDashboardStats(filters);
  const { data: evolutionData = [], isLoading: evolutionLoading } = useDealsEvolutionData(filters);

  // Data hooks - Telecom
  const { data: telecomStats, isLoading: telecomStatsLoading } = useTelecomDashboardStats(filters);
  const { data: telecomEvolutionData = [], isLoading: telecomEvolutionLoading } = useTelecomEvolutionData(filters);

  // Funnel with pipeline selector
  const { funnelComponent } = SalesFunnelWithPipeline({ filters });

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

  const telecomKpiData = telecomStats || {
    totalCustomers: 0,
    activeCustomers: 0,
    conversionRate: 0,
    monthlyRecurringRevenue: 0,
    customersTrend: 0,
    activeTrend: 0,
    conversionTrend: 0,
  };

  return (
    <AppLayout title="Dashboard" disableMainScroll>
      <div className="flex flex-col gap-3 animate-fade-in h-full overflow-hidden">
        {/* Onboarding */}
        <OnboardingChecklist />

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
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* ===== DESKTOP LAYOUT ===== */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-3 flex-1 min-h-0">
          {/* Left column (col 1-8): KPIs + Activities + Evolution */}
          <div className="col-span-8 grid grid-cols-2 gap-3 auto-rows-min">
            {isTelecom ? (
              <div className="col-span-2">
                <TelecomKPICards 
                  data={telecomKpiData} 
                  isLoading={telecomStatsLoading} 
                  periodLabel={periodLabel}
                />
              </div>
            ) : (
              <KPICardsGrid 
                data={kpiData} 
                isLoading={statsLoading} 
                periodLabel={periodLabel} 
                propertyCount={propertyCount}
                runningAutomations={runningAutomations}
              />
            )}

            {/* Row 3: Recent Activities + Evolution */}
            <RecentActivities />
            {isTelecom ? (
              <TelecomEvolutionChart data={telecomEvolutionData} isLoading={telecomEvolutionLoading} />
            ) : (
              <DealsEvolutionChart data={evolutionData} isLoading={evolutionLoading} />
            )}
          </div>

          {/* Right column (col 9-12): Sales Funnel */}
          <div className="col-span-4">
            {funnelComponent}
          </div>
        </div>

        {/* ===== MOBILE LAYOUT ===== */}
        <div className="lg:hidden space-y-4">
          {/* KPIs */}
          {isTelecom ? (
            <TelecomKPICards 
              data={telecomKpiData} 
              isLoading={telecomStatsLoading} 
              periodLabel={periodLabel}
            />
          ) : (
            <KPICards 
              data={kpiData} 
              isLoading={statsLoading} 
              periodLabel={periodLabel}
            />
          )}

          {/* Charts Tabs */}
          <Tabs value={mobileChartTab} onValueChange={setMobileChartTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="funnel" className="text-xs">Funil</TabsTrigger>
              <TabsTrigger value="activities" className="text-xs">Atividades</TabsTrigger>
              <TabsTrigger value="evolution" className="text-xs">Evolução</TabsTrigger>
            </TabsList>
            <TabsContent value="funnel" className="mt-3">
              {funnelComponent}
            </TabsContent>
            <TabsContent value="activities" className="mt-3">
              <RecentActivities />
            </TabsContent>
            <TabsContent value="evolution" className="mt-3">
              {isTelecom ? (
                <TelecomEvolutionChart data={telecomEvolutionData} isLoading={telecomEvolutionLoading} />
              ) : (
                <DealsEvolutionChart data={evolutionData} isLoading={evolutionLoading} />
              )}
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
  Zap,
  RefreshCw,
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
      return `${value}%`;
    default:
      return value.toLocaleString('pt-BR');
  }
}

interface KPICardsGridProps {
  data: any;
  isLoading?: boolean;
  periodLabel: string;
  propertyCount?: number;
  runningAutomations?: number;
}

function KPICardsGrid({ data, isLoading, periodLabel, propertyCount, runningAutomations }: KPICardsGridProps) {
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
        <div className="col-span-2 grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
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
    { title: 'Tempo Resp.', value: data.avgResponseTime, icon: Clock, tooltip: 'Tempo médio de primeira resposta', format: 'time', color: 'chart-4' },
  ];

  const bottomKpis = [
    { title: 'VGV', value: data.totalSalesValue, icon: DollarSign, tooltip: `Valor em vendas - ${periodLabel}`, format: 'currency', color: 'chart-5' },
    { title: 'Imóveis', value: propertyCount ?? 0, icon: Building2, tooltip: 'Total de imóveis cadastrados', format: 'number', color: 'chart-1' },
    { title: 'Automações', value: runningAutomations ?? 0, icon: Zap, tooltip: 'Automações em andamento (running + aguardando)', format: 'number', color: 'chart-2' },
  ];

  const renderKPI = (kpi: any) => {
    const Icon = kpi.icon;
    const hasTrend = kpi.trend !== undefined && kpi.trend !== 0;
    const isPositive = (kpi.trend ?? 0) >= 0;

    return (
      <TooltipProvider key={kpi.title}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="card-hover cursor-default">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground truncate">{kpi.title}</p>
                    <p className="text-base sm:text-lg font-bold mt-0.5 truncate">
                      {formatKPIValue(kpi.value, kpi.format)}
                    </p>
                    {hasTrend && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {isPositive ? (
                          <TrendingUp className="h-2.5 w-2.5 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-2.5 w-2.5 text-destructive" />
                        )}
                        <span className={cn(
                          "text-[10px] font-medium",
                          isPositive ? "text-emerald-500" : "text-destructive"
                        )}>
                          {kpi.trend! > 0 ? '+' : ''}{kpi.trend}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `hsl(var(--${kpi.color}) / 0.1)` }}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: `hsl(var(--${kpi.color}))` }} />
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
      {/* Row 2: 4 KPIs */}
      <div className="col-span-2 grid grid-cols-4 gap-3">
        {bottomKpis.map(renderKPI)}
      </div>
    </>
  );
}
