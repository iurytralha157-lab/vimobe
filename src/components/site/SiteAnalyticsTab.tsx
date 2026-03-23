import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSiteAnalytics } from '@/hooks/use-site-analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, FileText, MousePointerClick, Clock, Monitor, Smartphone, ArrowUpRight, ArrowDownRight, Minus, BarChart3 } from 'lucide-react';

type Period = 'day' | 'week' | 'month';

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
  const [period, setPeriod] = useState<Period>('week');

  const now = new Date();
  const dateFrom = new Date(now);
  if (period === 'day') dateFrom.setDate(dateFrom.getDate() - 1);
  else if (period === 'week') dateFrom.setDate(dateFrom.getDate() - 7);
  else dateFrom.setMonth(dateFrom.getMonth() - 1);

  const { data, isLoading } = useSiteAnalytics(dateFrom, now);

  const periodLabels: Record<Period, string> = { day: 'Dia', week: 'Semana', month: 'Mês' };

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
    totalViews: 0, totalPages: 0, uniquePages: 0, avgDuration: 0,
    desktopPct: 0, mobilePct: 0, tabletPct: 0,
    directPct: 0, searchPct: 0, socialPct: 0, campaignPct: 0,
    conversions: 0,
    prevViews: 0, prevPages: 0, prevUniquePages: 0, prevAvgDuration: 0,
    prevDesktopPct: 0, prevMobilePct: 0, prevConversions: 0,
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Indicadores</h3>
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

      {/* Visits Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            Visitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatBlock label="Gerais" current={stats.totalViews} previous={stats.prevViews} />
            <StatBlock label="Páginas" current={stats.totalPages} previous={stats.prevPages} />
            <StatBlock label="Páginas únicas" current={stats.uniquePages} previous={stats.prevUniquePages} />
            <StatBlock label="Tempo médio" current={stats.avgDuration} previous={stats.prevAvgDuration} suffix="s" />
          </div>
        </CardContent>
      </Card>

      {/* Sources Card */}
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

      {/* Bottom Row: Devices + Conversions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              <MousePointerClick className="w-4 h-4 text-primary" />
              Conversões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatBlock label="Conversões gerais" current={stats.conversions} previous={stats.prevConversions} />
          </CardContent>
        </Card>
      </div>
    </div>
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
