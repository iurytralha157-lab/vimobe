import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { KPICards } from '@/components/dashboard/KPICards';
import { SalesFunnel } from '@/components/dashboard/SalesFunnel';
import { LeadSourcesChart } from '@/components/dashboard/LeadSourcesChart';
import { LeadEvolutionChart } from '@/components/dashboard/LeadEvolutionChart';
import { TopBrokersWidget } from '@/components/dashboard/TopBrokersWidget';
import { UpcomingTasksWidget } from '@/components/dashboard/UpcomingTasksWidget';
import { useDashboardFilters, datePresetOptions } from '@/hooks/use-dashboard-filters';
import { 
  useEnhancedDashboardStats, 
  useLeadsChartData, 
  useFunnelData, 
  useLeadSourcesData,
  useTopBrokers,
  useUpcomingTasks,
} from '@/hooks/use-dashboard-stats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileChartTab, setMobileChartTab] = useState('funnel');

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

  // Data hooks
  const { data: stats, isLoading: statsLoading } = useEnhancedDashboardStats(filters);
  const { data: chartData = [], isLoading: chartLoading } = useLeadsChartData();
  const { data: funnelData = [], isLoading: funnelLoading } = useFunnelData();
  const { data: sourcesData = [], isLoading: sourcesLoading } = useLeadSourcesData();
  const { data: topBrokers = [], isLoading: brokersLoading } = useTopBrokers(filters);
  const { data: upcomingTasks = [], isLoading: tasksLoading } = useUpcomingTasks();

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('lead_tasks')
        .update({ 
          is_done: true, 
          done_at: new Date().toISOString() 
        })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcoming-tasks'] });
      toast.success('Tarefa concluída!');
    },
    onError: () => {
      toast.error('Erro ao concluir tarefa');
    },
  });

  const handleTaskClick = (leadId: string) => {
    navigate(`/conversas?leadId=${leadId}`);
  };

  const periodLabel = datePresetOptions.find(o => o.value === datePreset)?.label || 'Período selecionado';

  const kpiData = stats || {
    totalLeads: 0,
    conversionRate: 0,
    closedLeads: 0,
    avgResponseTime: '--',
    totalSalesValue: 0,
    leadsTrend: 0,
    conversionTrend: 0,
    closedTrend: 0,
  };

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Onboarding Checklist */}
        <OnboardingChecklist />

        {/* Header with Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
        </div>

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

        {/* KPI Cards */}
        <KPICards 
          data={kpiData} 
          isLoading={statsLoading} 
          periodLabel={periodLabel}
        />

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

        {/* Lead Evolution Chart */}
        <LeadEvolutionChart data={chartData} isLoading={chartLoading} />

        {/* Bottom Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TopBrokersWidget brokers={topBrokers} isLoading={brokersLoading} />
          <UpcomingTasksWidget 
            tasks={upcomingTasks} 
            isLoading={tasksLoading}
            onComplete={(taskId) => completeTaskMutation.mutate(taskId)}
            onTaskClick={handleTaskClick}
          />
        </div>
      </div>
    </AppLayout>
  );
}