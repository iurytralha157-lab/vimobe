import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { KPICards } from '@/components/dashboard/KPICards';
import { SalesFunnel } from '@/components/dashboard/SalesFunnel';
import { LeadSourcesChart } from '@/components/dashboard/LeadSourcesChart';
import { TopBrokersWidget } from '@/components/dashboard/TopBrokersWidget';
import { DealsEvolutionChart } from '@/components/dashboard/DealsEvolutionChart';
import { TelecomKPICards } from '@/components/dashboard/TelecomKPICards';
import { TelecomEvolutionChart } from '@/components/dashboard/TelecomEvolutionChart';
import { useDashboardFilters, datePresetOptions } from '@/hooks/use-dashboard-filters';
import { 
  useEnhancedDashboardStats, 
  useFunnelData, 
  useLeadSourcesData,
  useTopBrokers,
  useDealsEvolutionData,
} from '@/hooks/use-dashboard-stats';
import { useTelecomDashboardStats, useTelecomEvolutionData } from '@/hooks/use-telecom-dashboard-stats';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Dashboard() {
  const [mobileChartTab, setMobileChartTab] = useState('funnel');
  const { organization } = useAuth();
  
  // Detect if telecom segment
  const isTelecom = organization?.segment === 'telecom';

  // Filters
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
  const { data: funnelData = [], isLoading: funnelLoading } = useFunnelData(filters);
  const { data: sourcesData = [], isLoading: sourcesLoading } = useLeadSourcesData(filters);
  const { data: topBrokersData, isLoading: brokersLoading } = useTopBrokers(filters);
  const topBrokers = topBrokersData?.brokers || [];
  const isBrokersFallback = topBrokersData?.isFallbackMode || false;
  const { data: evolutionData = [], isLoading: evolutionLoading } = useDealsEvolutionData(filters);

  // Data hooks - Telecom
  const { data: telecomStats, isLoading: telecomStatsLoading } = useTelecomDashboardStats(filters);
  const { data: telecomEvolutionData = [], isLoading: telecomEvolutionLoading } = useTelecomEvolutionData(filters);

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
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Onboarding Checklist */}
        <OnboardingChecklist />

        {/* Filters */}
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

        {/* KPI Cards - Conditional based on segment */}
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

        {/* Charts Section - Conditional based on segment */}
        {isTelecom ? (
          /* Telecom: Only Evolution Chart */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="lg:col-span-2">
              <TelecomEvolutionChart 
                data={telecomEvolutionData} 
                isLoading={telecomEvolutionLoading} 
              />
            </div>
          </div>
        ) : (
          /* Imobiliário: Funnel + Sources + Evolution + Top Brokers */
          <>
            {/* Charts - Desktop: Side by Side, Mobile: Tabs */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-4">
              <SalesFunnel data={funnelData} isLoading={funnelLoading} />
              <LeadSourcesChart data={sourcesData} isLoading={sourcesLoading} />
            </div>

            {/* Charts - Mobile: Tabs */}
            <div className="lg:hidden">
              <Tabs value={mobileChartTab} onValueChange={setMobileChartTab}>
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="funnel" className="text-xs">Funil</TabsTrigger>
                  <TabsTrigger value="sources" className="text-xs">Origens</TabsTrigger>
                </TabsList>
                <TabsContent value="funnel" className="mt-3">
                  <SalesFunnel data={funnelData} isLoading={funnelLoading} />
                </TabsContent>
                <TabsContent value="sources" className="mt-3">
                  <LeadSourcesChart data={sourcesData} isLoading={sourcesLoading} />
                </TabsContent>
              </Tabs>
            </div>

            {/* Bottom Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TopBrokersWidget brokers={topBrokers} isLoading={brokersLoading} isFallbackMode={isBrokersFallback} />
              <DealsEvolutionChart data={evolutionData} isLoading={evolutionLoading} />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
