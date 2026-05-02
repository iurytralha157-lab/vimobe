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

  const { data: insightData, isLoading } = useCampaignInsights(filters);
  const syncMutation = useSyncCampaignInsights();

  const handleSync = () => {
    syncMutation.mutate({
      dateStart: filters.dateRange.from.toISOString().split('T')[0],
      dateStop: filters.dateRange.to.toISOString().split('T')[0]
    });
  };

  const totals = useMemo(() => {
    if (!insightData?.summary) return { spend: 0, leads: 0, impressions: 0, reach: 0, cpl: 0 };
    return {
      spend: insightData.summary.totalSpend || 0,
      leads: insightData.summary.totalLeads || 0,
      impressions: insightData.summary.totalImpressions || 0,
      reach: insightData.summary.totalReach || 0,
      cpl: insightData.summary.avgCpl || 0
    };
  }, [insightData]);

  const campaignStats = useMemo(() => {
    if (!insightData?.campaigns) return [];
    return insightData.campaigns.map(c => ({
      id: c.campaign_id,
      name: c.campaign_name,
      spend: c.spend || 0,
      leads: c.leads_count,
      impressions: c.impressions || 0,
      cpl: c.cpl || 0
    }));
  }, [insightData]);

  // For the chart, we'll use campaign data since useCampaignInsights returns aggregated data
  // In a more complete version, we would have daily data
  const chartData = useMemo(() => {
    if (!campaignStats.length) return [];
    return campaignStats.slice(0, 10).map(c => ({
      name: c.name,
      spend: c.spend,
      leads: c.leads
    }));
  }, [campaignStats]);

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
        {!insightData?.hasSpendData && !isLoading && (
          <Alert variant="destructive" className="bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/20 dark:border-orange-900/30">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle>Dados de investimento não sincronizados</AlertTitle>
            <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <span>Os leads estão sendo capturados em tempo real, mas os dados de custo e investimento precisam ser sincronizados com o Meta Ads.</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white border-orange-200 text-orange-700 hover:bg-orange-100 h-8"
                onClick={handleSync}
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sincronizar agora
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Performance Meta Ads</h1>
              {insightData?.lastSync && (
                <Badge variant="outline" className="font-normal text-[10px] py-0 h-5">
                  Sincronizado: {format(new Date(insightData.lastSync), "HH:mm 'de' dd/MM", { locale: ptBR })}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">Analise os resultados das suas campanhas e leads em tempo real.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSync}
              disabled={syncMutation.isPending || isLoading}
            >
              {syncMutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sincronizar
            </Button>
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
            title="Leads do Meta" 
            value={formatNumber(totals.leads)} 
            icon={Users} 
            color="green" 
            isLoading={isLoading}
            description="Capturados via Webhook"
          />
          <KPICard 
            title="CPL Médio" 
            value={formatCurrency(totals.cpl)} 
            icon={Target} 
            color="orange" 
            isLoading={isLoading}
            description="Baseado no investimento"
          />
          <KPICard 
            title="Alcance Total" 
            value={formatNumber(totals.reach)} 
            icon={Eye} 
            color="purple" 
            isLoading={isLoading}
            description={periodLabel}
          />
        </div>

        {/* Account Status Card */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">Conexão Meta Ads: Ativa</span>
              <span className="text-xs text-muted-foreground border-l pl-3">Sincronização em background ativa a cada 1h</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex flex-col items-end">
                <span className="text-muted-foreground">Última atualização geral</span>
                <span className="font-medium">{insightData?.lastSync ? format(new Date(insightData.lastSync), "dd/MM 'às' HH:mm") : 'Aguardando sincronização'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

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
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        fontSize={10}
                        tick={{ fill: '#888' }}
                      />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#888' }} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#888' }} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
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
                    <th className="text-right py-3 font-medium">Status</th>
                    <th className="text-right py-3 font-medium">Investimento</th>
                    <th className="text-right py-3 font-medium">Leads</th>
                    <th className="text-right py-3 font-medium">CPL</th>
                    <th className="text-right py-3 font-medium">Alcance</th>
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
                        <td className="py-3 font-medium">
                          <div className="flex flex-col">
                            <span>{campaign.name}</span>
                            <span className="text-[10px] text-muted-foreground">ID: {campaign.id}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                            Ativa
                          </Badge>
                        </td>
                        <td className="py-3 text-right">{formatCurrency(campaign.spend)}</td>
                        <td className="py-3 text-right">{formatNumber(campaign.leads)}</td>
                        <td className="py-3 text-right">
                          <Badge variant="secondary" className="font-normal">
                            {formatCurrency(campaign.cpl)}
                          </Badge>
                        </td>
                        <td className="py-3 text-right text-muted-foreground">{formatNumber(campaign.reach)}</td>
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
