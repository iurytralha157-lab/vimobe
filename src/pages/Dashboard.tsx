import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { KPICards } from '@/components/dashboard/KPICards';
import { SalesFunnelWithPipeline } from '@/components/dashboard/SalesFunnelWithPipeline';
import { TopBrokersWidget } from '@/components/dashboard/TopBrokersWidget';
import { DealsEvolutionChart } from '@/components/dashboard/DealsEvolutionChart';
import { TelecomKPICards } from '@/components/dashboard/TelecomKPICards';
import { TelecomEvolutionChart } from '@/components/dashboard/TelecomEvolutionChart';
import { DashboardCalendarFilter } from '@/components/dashboard/DashboardCalendarFilter';
import { useDashboardFilters, datePresetOptions } from '@/hooks/use-dashboard-filters';
import { 
  useEnhancedDashboardStats, 
  useTopBrokers,
  useDealsEvolutionData,
} from '@/hooks/use-dashboard-stats';
import { useTelecomDashboardStats, useTelecomEvolutionData } from '@/hooks/use-telecom-dashboard-stats';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignPerformanceWidget } from '@/components/dashboard/CampaignPerformanceWidget';


export default function Dashboard() {
  const [mobileChartTab, setMobileChartTab] = useState('funnel');
  const { organization } = useAuth();
  const isTelecom = organization?.segment === 'telecom';

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
  const { data: topBrokersData, isLoading: brokersLoading } = useTopBrokers(filters);
  const topBrokers = topBrokersData?.brokers || [];
  const isBrokersFallback = topBrokersData?.isFallbackMode || false;
  const { data: evolutionData = [], isLoading: evolutionLoading } = useDealsEvolutionData(filters);

  // Data hooks - Telecom
  const { data: telecomStats, isLoading: telecomStatsLoading } = useTelecomDashboardStats(filters);
  const { data: telecomEvolutionData = [], isLoading: telecomEvolutionLoading } = useTelecomEvolutionData(filters);

  // Funnel with pipeline selector
  const { funnelComponent, sourcesComponent } = SalesFunnelWithPipeline({ filters });

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
    <AppLayout title="Dashboard">
      <div className="space-y-4 sm:space-y-4 animate-fade-in">
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

        {/* ===== NEW GRID LAYOUT ===== */}
        {/* Desktop: Complex grid | Mobile: stacked */}

        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-4">
          {/* Row 1+2 Left: KPI Cards (4 cards in 2x2 grid) */}
          <div className="col-span-8 grid grid-cols-2 gap-4">
            {isTelecom ? (
              <div className="col-span-2">
                <TelecomKPICards 
                  data={telecomKpiData} 
                  isLoading={telecomStatsLoading} 
                  periodLabel={periodLabel}
                />
              </div>
            ) : (
              <>
                {/* 4 KPI cards in 2x2 */}
                <KPICardsGrid data={kpiData} isLoading={statsLoading} periodLabel={periodLabel} />
              </>
            )}

            {/* Row 2: 2 medium widgets */}
            <TopBrokersWidget brokers={topBrokers} isLoading={brokersLoading} isFallbackMode={isBrokersFallback} />
            {isTelecom ? (
              <TelecomEvolutionChart data={telecomEvolutionData} isLoading={telecomEvolutionLoading} />
            ) : (
              <DealsEvolutionChart data={evolutionData} isLoading={evolutionLoading} />
            )}
          </div>

          {/* Row 1+2 Right: Calendar (spans both rows) */}
          <div className="col-span-4 row-span-1">
            <DashboardCalendarFilter
              datePreset={datePreset}
              onDatePresetChange={setDatePreset}
              customDateRange={customDateRange}
              onCustomDateRangeChange={setCustomDateRange}
            />
          </div>
        </div>

        {/* Row 3: Full width - Funnel + Sources */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-4">
          {funnelComponent}
          {sourcesComponent}
        </div>

        {/* Campaign Performance */}
        {!isTelecom && (
          <div className="hidden lg:block">
            <CampaignPerformanceWidget filters={filters} />
          </div>
        )}

        {/* ===== MOBILE LAYOUT ===== */}
        <div className="lg:hidden space-y-4">
          {/* Calendar */}
          <DashboardCalendarFilter
            datePreset={datePreset}
            onDatePresetChange={setDatePreset}
            customDateRange={customDateRange}
            onCustomDateRangeChange={setCustomDateRange}
          />

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
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="funnel" className="text-xs">Funil</TabsTrigger>
              <TabsTrigger value="evolution" className="text-xs">Evolução</TabsTrigger>
            </TabsList>
            <TabsContent value="funnel" className="mt-3">
              {funnelComponent}
            </TabsContent>
            <TabsContent value="evolution" className="mt-3">
              {isTelecom ? (
                <TelecomEvolutionChart data={telecomEvolutionData} isLoading={telecomEvolutionLoading} />
              ) : (
                <DealsEvolutionChart data={evolutionData} isLoading={evolutionLoading} />
              )}
            </TabsContent>
          </Tabs>

          {/* Brokers + Sources */}
          <TopBrokersWidget brokers={topBrokers} isLoading={brokersLoading} isFallbackMode={isBrokersFallback} />
          {sourcesComponent}

          {/* Campaign */}
          {!isTelecom && <CampaignPerformanceWidget filters={filters} />}
        </div>
      </div>
    </AppLayout>
  );
}

// Separate KPI grid component for the 2x2 desktop layout
import { 
  Users, 
  Target, 
  CheckCircle2, 
  Clock,
  DollarSign,
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

function KPICardsGrid({ data, isLoading, periodLabel }: { data: any; isLoading?: boolean; periodLabel: string }) {
  if (isLoading) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
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
      </>
    );
  }

  const kpis = [
    { title: 'Leads', value: data.totalLeads, trend: data.leadsTrend, icon: Users, tooltip: `Total de leads - ${periodLabel}`, format: 'number', color: 'primary' },
    { title: 'Conversão', value: data.conversionRate, trend: data.conversionTrend, icon: Target, tooltip: 'Taxa de conversão', format: 'percent', color: 'chart-2' },
    { title: 'Ganhos', value: data.closedLeads, trend: data.closedTrend, icon: CheckCircle2, tooltip: `Leads convertidos - ${periodLabel}`, format: 'number', color: 'chart-3' },
    { title: 'VGV', value: data.totalSalesValue, icon: DollarSign, tooltip: `Valor em vendas - ${periodLabel}`, format: 'currency', color: 'chart-5' },
  ];

  return (
    <>
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const hasTrend = kpi.trend !== undefined && kpi.trend !== 0;
        const isPositive = (kpi.trend ?? 0) >= 0;

        return (
          <TooltipProvider key={kpi.title}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="card-hover cursor-default">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{kpi.title}</p>
                        <p className="text-lg sm:text-2xl font-bold mt-0.5">
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
                      <div
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center flex-shrink-0"
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
      })}
    </>
  );
}
