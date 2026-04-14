import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeadAnalytics } from '@/hooks/use-lead-analytics';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { Route, MousePointerClick, Users, TrendingUp, FileText, Monitor, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Period = 'day' | 'week' | 'month';

const EVENT_LABELS: Record<string, string> = {
  pageview: 'Visualização',
  form_submit: 'Formulário',
  whatsapp_click: 'WhatsApp',
  cta_click: 'CTA',
  favorite: 'Favorito',
};

export function LeadJourneyDashboard() {
  const [period, setPeriod] = useState<Period>('week');

  const { dateFrom, dateTo } = useMemo(() => {
    const now = new Date();
    const start = new Date(now);

    if (period === 'day') start.setDate(start.getDate() - 1);
    else if (period === 'week') start.setDate(start.getDate() - 7);
    else start.setMonth(start.getMonth() - 1);

    return { dateFrom: start, dateTo: now };
  }, [period]);

  const { data, isLoading } = useLeadAnalytics(dateFrom, dateTo);

  const periodLabels: Record<Period, string> = { day: 'Dia', week: 'Semana', month: 'Mês' };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const analytics = data || {
    journeys: [], funnel: [], top_pages: [], daily_views: [],
    total_sessions: 0, total_conversions: 0, device_breakdown: [],
  };

  const conversionRate = analytics.total_sessions > 0
    ? ((analytics.total_conversions / analytics.total_sessions) * 100).toFixed(1)
    : '0';

  const funnelData = analytics.funnel.map(f => ({
    name: EVENT_LABELS[f.event_type] || f.event_type,
    total: f.total,
  }));

  const chartData = analytics.daily_views.map(d => ({
    date: format(new Date(d.date), 'dd/MM', { locale: ptBR }),
    views: d.views,
  }));

  const deviceTotal = analytics.device_breakdown.reduce((acc, d) => acc + d.total, 0);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Percurso dos Leads</h3>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(['day', 'week', 'month'] as Period[]).map(p => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? 'default' : 'ghost'}
              className="text-xs px-3 h-7"
              onClick={() => setPeriod(p)}
            >
              {periodLabels[p]}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Sessões</span>
            </div>
            <span className="text-2xl font-bold">{analytics.total_sessions}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MousePointerClick className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Conversões</span>
            </div>
            <span className="text-2xl font-bold">{analytics.total_conversions}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Taxa de Conversão</span>
            </div>
            <span className="text-2xl font-bold">{conversionRate}%</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Dispositivos</span>
            </div>
            <div className="flex gap-2 text-xs">
              {analytics.device_breakdown.map(d => (
                <span key={d.device_type} className="text-muted-foreground">
                  {d.device_type === 'desktop' ? '💻' : d.device_type === 'mobile' ? '📱' : '📋'}
                  {deviceTotal > 0 ? Math.round((d.total / deviceTotal) * 100) : 0}%
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Chart */}
      {funnelData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-primary" />
              Funil de Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Views Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Evolução Diária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="views"
                    name="Views"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Pages */}
      {analytics.top_pages.length > 0 && (
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
                {analytics.top_pages.map((page, i) => (
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

      {/* Lead Journeys */}
      {analytics.journeys.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Route className="w-4 h-4 text-primary" />
              Últimas Jornadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sessão</TableHead>
                  <TableHead>Percurso</TableHead>
                  <TableHead>Eventos</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead className="text-center">Converteu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.journeys.slice(0, 20).map((j) => (
                  <TableRow key={j.session_id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {j.session_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      <div className="flex flex-wrap gap-1">
                        {j.path_sequence.slice(0, 5).map((path, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[10px] font-mono">
                            {path.length > 20 ? `${path.substring(0, 20)}…` : path}
                          </Badge>
                        ))}
                        {j.path_sequence.length > 5 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{j.path_sequence.length - 5}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(j.event_sequence)].map((evt, idx) => (
                          <Badge key={idx} variant="outline" className="text-[10px]">
                            {EVENT_LABELS[evt] || evt}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(j.first_event), 'dd/MM HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-center">
                      {j.converted ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {analytics.journeys.length === 0 && analytics.total_sessions === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Route className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold mb-1">Nenhuma jornada registrada ainda</p>
            <p className="text-sm text-muted-foreground">
              Os dados aparecerão quando visitantes navegarem pelo site público.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
