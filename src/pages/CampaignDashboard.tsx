import React, { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { useDashboardFilters, datePresetOptions } from '@/hooks/use-dashboard-filters';
import { useCampaignInsights, useSyncCampaignInsights } from '@/hooks/use-campaign-insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  Users, 
  Target, 
  Eye, 
  TrendingUp, 
  BarChart3,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CampaignDashboard() {
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

  const { data: insights, isLoading } = useMetaInsights(filters);

  const totals = useMemo(() => {
    if (!insights) return { spend: 0, leads: 0, impressions: 0, reach: 0, cpl: 0 };
    const spend = insights.reduce((sum, item) => sum + (Number(item.spend) || 0), 0);
    const leads = insights.reduce((sum, item) => sum + (Number(item.leads_count) || 0), 0);
    const impressions = insights.reduce((sum, item) => sum + (Number(item.impressions) || 0), 0);
    const reach = insights.reduce((sum, item) => sum + (Number(item.reach) || 0), 0);
    const cpl = leads > 0 ? spend / leads : 0;
    return { spend, leads, impressions, reach, cpl };
  }, [insights]);

  const chartData = useMemo(() => {
    if (!insights) return [];
    // Group by date
    const grouped = insights.reduce((acc, item) => {
      const date = item.date_start;
      if (!acc[date]) {
        acc[date] = { date, spend: 0, leads: 0 };
      }
      acc[date].spend += Number(item.spend) || 0;
      acc[date].leads += Number(item.leads_count) || 0;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [insights]);

  const campaignStats = useMemo(() => {
    if (!insights) return [];
    // Group by campaign
    const grouped = insights.reduce((acc, item) => {
      const id = item.campaign_id;
      if (!acc[id]) {
        acc[id] = { 
          id, 
          name: item.campaign_name, 
          spend: 0, 
          leads: 0, 
          impressions: 0,
          cpl: 0
        };
      }
      acc[id].spend += Number(item.spend) || 0;
      acc[id].leads += Number(item.leads_count) || 0;
      acc[id].impressions += Number(item.impressions) || 0;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).map(c => ({
      ...c,
      cpl: c.leads > 0 ? c.spend / c.leads : 0
    })).sort((a, b) => b.spend - a.spend);
  }, [insights]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const periodLabel = datePresetOptions.find(o => o.value === datePreset)?.label || 'Período selecionado';

  return (
    <AppLayout title="Dashboard de Campanhas">
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Performance Meta Ads</h1>
            <p className="text-muted-foreground">Analise os resultados das suas campanhas em tempo real.</p>
          </div>
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
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="Investimento" 
            value={formatCurrency(totals.spend)} 
            icon={DollarSign} 
            color="blue" 
            isLoading={isLoading}
            description={periodLabel}
          />
          <KPICard 
            title="Leads" 
            value={formatNumber(totals.leads)} 
            icon={Users} 
            color="green" 
            isLoading={isLoading}
            description={periodLabel}
          />
          <KPICard 
            title="CPL Médio" 
            value={formatCurrency(totals.cpl)} 
            icon={Target} 
            color="orange" 
            isLoading={isLoading}
            description="Custo por Lead"
          />
          <KPICard 
            title="Impressões" 
            value={formatNumber(totals.impressions)} 
            icon={Eye} 
            color="purple" 
            isLoading={isLoading}
            description={periodLabel}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Evolução de Leads e Investimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(str) => format(new Date(str), 'dd/MM', { locale: ptBR })}
                        axisLine={false}
                        tickLine={false}
                        fontSize={12}
                        tick={{ fill: '#888' }}
                      />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#888' }} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#888' }} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        labelFormatter={(label) => format(new Date(label), 'dd MMMM yyyy', { locale: ptBR })}
                      />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="spend" 
                        name="Investimento" 
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorSpend)" 
                        strokeWidth={2}
                      />
                      <Area 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="leads" 
                        name="Leads" 
                        stroke="#10b981" 
                        fillOpacity={1} 
                        fill="url(#colorLeads)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Sem dados para o período selecionado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Leads por Campanha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : campaignStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={campaignStats.slice(0, 5)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={120} 
                        axisLine={false} 
                        tickLine={false} 
                        fontSize={11}
                        tick={{ fill: '#555' }}
                      />
                      <RechartsTooltip 
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar 
                        dataKey="leads" 
                        name="Leads" 
                        fill="#10b981" 
                        radius={[0, 4, 4, 0]} 
                        barSize={24}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Sem dados para o período selecionado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaign List */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento de Campanhas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 font-medium">Campanha</th>
                    <th className="text-right py-3 font-medium">Investimento</th>
                    <th className="text-right py-3 font-medium">Leads</th>
                    <th className="text-right py-3 font-medium">CPL</th>
                    <th className="text-right py-3 font-medium">Impressões</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-3"><Skeleton className="h-4 w-40" /></td>
                        <td className="py-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                        <td className="py-3 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                        <td className="py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                        <td className="py-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                      </tr>
                    ))
                  ) : campaignStats.length > 0 ? (
                    campaignStats.map((campaign) => (
                      <tr key={campaign.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 font-medium">{campaign.name}</td>
                        <td className="py-3 text-right">{formatCurrency(campaign.spend)}</td>
                        <td className="py-3 text-right">{formatNumber(campaign.leads)}</td>
                        <td className="py-3 text-right">
                          <Badge variant="secondary" className="font-normal">
                            {formatCurrency(campaign.cpl)}
                          </Badge>
                        </td>
                        <td className="py-3 text-right text-muted-foreground">{formatNumber(campaign.impressions)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhuma campanha encontrada no período
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'orange' | 'purple';
  isLoading: boolean;
  description?: string;
}

function KPICard({ title, value, icon: Icon, color, isLoading, description }: KPICardProps) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">{value}</p>
            )}
            {description && !isLoading && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className={cn("p-3 rounded-xl", colorMap[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
