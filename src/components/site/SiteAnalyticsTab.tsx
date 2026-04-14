import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSiteAnalytics, useSiteAnalyticsDetailed } from '@/hooks/use-site-analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, MousePointerClick, Monitor, ArrowUpRight, ArrowDownRight, Minus, BarChart3, TrendingUp, Star, FileText, Users, Route } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeadJourneyDashboard } from './LeadJourneyDashboard';
import { DateFilterPopover } from '@/components/ui/date-filter-popover';
import { DatePreset, getDateRangeFromPreset } from '@/hooks/use-dashboard-filters';

function getTrendIcon(current: number, previous: number) {
  if (current > previous) return <ArrowUpRight className="w-3 h-3 text-emerald-500" />;
  if (current < previous) return <ArrowDownRight className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

function getTrendColor(current: number, previous: number) {
  if (current > previous) return 'text-emerald-500';
  if (current < previous) return 'text-red-500';
  return 'text-muted-foreground';
}

export function SiteAnalyticsTab() {
  const [datePreset, setDatePreset] = useState<DatePreset>('last7days');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);

  const { dateFrom, dateTo } = useMemo(() => {
    if (datePreset === 'custom' && customDateRange) {
      return { dateFrom: customDateRange.from, dateTo: customDateRange.to };
    }

    const range = getDateRangeFromPreset(datePreset);
    return { dateFrom: range.from, dateTo: range.to };
  }, [datePreset, customDateRange]);

  const { data, isLoading } = useSiteAnalytics(dateFrom, dateTo);
  const { data: detailed } = useSiteAnalyticsDetailed(dateFrom, dateTo);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const stats = data || {
    totalViews: 0, totalPages: 0, uniquePages: 0, uniqueSessions: 0, avgDuration: 0,
    desktopPct: 0, mobilePct: 0, tabletPct: 0,
    directPct: 0, searchPct: 0, socialPct: 0, campaignPct: 0,
    conversions: 0,
    prevViews: 0, prevPages: 0, prevUniquePages: 0, prevAvgDuration: 0,
    prevDesktopPct: 0, prevMobilePct: 0, prevConversions: 0,
  };

  const hasData = stats.uniqueSessions > 0 || stats.totalPages > 0 || (detailed?.totalSessions ?? 0) > 0;

  const chartData = (detailed?.dailyViews || []).map(d => ({
    date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    views: d.views,
  }));

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="w-4 h-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="journeys" className="gap-1.5">
            <Route className="w-4 h-4" />
            Percurso dos Leads
          </TabsTrigger>
        </TabsList>

        <DateFilterPopover
          datePreset={datePreset}
          onDatePresetChange={setDatePreset}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
          defaultPreset="last7days"
        />
      </div>

      <TabsContent value="overview" className="space-y-6">
        {!hasData && (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold mb-1">Nenhum dado registrado ainda</p>
              <p className="text-sm text-muted-foreground">
                Os dados aparecerão automaticamente quando visitantes acessarem seu site público. Certifique-se de que o site está ativo e publicado.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Indicadores</h3>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Visitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <StatBlock label="Sessões" current={stats.uniqueSessions} previous={stats.prevViews} />
              <StatBlock label="Páginas vistas" current={stats.totalPages} previous={stats.prevPages} />
              <StatBlock label="Páginas únicas" current={stats.uniquePages} previous={stats.prevUniquePages} />
              <StatBlock label="Tempo médio" current={stats.avgDuration} previous={stats.prevAvgDuration} suffix="s" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-primary" />
              Entradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <StatBlock label="Link direto" current={stats.directPct} previous={0} suffix="%" hideArrow />
              <StatBlock label="Busca" current={stats.searchPct} previous={0} suffix="%" hideArrow />
              <StatBlock label="Campanhas" current={stats.campaignPct} previous={0} suffix="%" hideArrow />
              <StatBlock label="Redes sociais" current={stats.socialPct} previous={0} suffix="%" hideArrow />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Monitor className="w-4 h-4 text-primary" />
                Dispositivos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <StatBlock label="Web" current={stats.desktopPct} previous={stats.prevDesktopPct} suffix="%" />
                <StatBlock label="Mobile" current={stats.mobilePct} previous={stats.prevMobilePct} suffix="%" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Taxa de Conversão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <span className="text-3xl font-bold">{detailed?.conversionRate ?? 0}%</span>
                <p className="text-xs text-muted-foreground mt-1">{detailed?.totalConversions ?? 0} conversões / {detailed?.totalSessions ?? 0} sessões</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Leads do Site
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <span className="text-3xl font-bold">{detailed?.siteLeads ?? 0}</span>
                <p className="text-xs text-muted-foreground mt-1">leads gerados via site</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {chartData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Evolução de Visitas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="views"
                      name="Visitas"
                      className="stroke-primary"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {(detailed?.topProperties?.length ?? 0) > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                Imóveis Mais Vistos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Favoritos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailed!.topProperties.map((prop, i) => (
                    <TableRow key={prop.property_id}>
                      <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{prop.code}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{prop.title}</TableCell>
                      <TableCell className="text-right font-semibold">{prop.views}</TableCell>
                      <TableCell className="text-right">{prop.favorites}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {(detailed?.topPages?.length ?? 0) > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Páginas Mais Acessadas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Página</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailed!.topPages.map((page, i) => (
                    <TableRow key={page.page_path}>
                      <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[300px] truncate">{page.page_path}</TableCell>
                      <TableCell className="text-right font-semibold">{page.views}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="journeys" className="space-y-6">
        <LeadJourneyDashboard dateFrom={dateFrom} dateTo={dateTo} />
      </TabsContent>
    </Tabs>
  );
}

function StatBlock({ label, current, previous, suffix = '', hideArrow = false }: {
  label: string;
  current: number;
  previous: number;
  suffix?: string;
  hideArrow?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        <span className="text-xl font-bold">{current}{suffix}</span>
        {!hideArrow && getTrendIcon(current, previous)}
      </div>
      <p className="text-[11px] text-muted-foreground mt-0.5">Atual</p>
      {!hideArrow && (
        <>
          <p className={`text-sm font-medium mt-2 ${getTrendColor(current, previous)}`}>
            {previous}{suffix}
          </p>
          <p className="text-[11px] text-muted-foreground">Anterior</p>
        </>
      )}
    </div>
  );
}

