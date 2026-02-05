import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { TelecomEvolutionPoint } from '@/hooks/use-telecom-dashboard-stats';

interface TelecomEvolutionChartProps {
  data: TelecomEvolutionPoint[];
  isLoading?: boolean;
}

const STATUS_COLORS = {
  novos: '#3B82F6',      // blue
  instalados: '#22C55E', // green
  aguardando: '#EAB308', // yellow
  em_analise: '#8B5CF6', // purple
  cancelado: '#EF4444',  // red
  suspenso: '#F97316',   // orange
  inadimplente: '#DC2626', // dark red
} as const;

const STATUS_LABELS = {
  novos: 'Novos',
  instalados: 'Instalados',
  aguardando: 'Aguardando',
  em_analise: 'Em Análise',
  cancelado: 'Cancelados',
  suspenso: 'Suspensos',
  inadimplente: 'Inadimplentes',
} as const;

function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end h-[200px] px-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Skeleton 
              className="w-8 rounded-t-sm" 
              style={{ height: `${40 + Math.random() * 100}px` }} 
            />
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-4 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-16" />
        ))}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl max-w-xs">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[10px] text-muted-foreground truncate">
                {STATUS_LABELS[entry.dataKey as keyof typeof STATUS_LABELS] || entry.dataKey}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-foreground">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TelecomEvolutionChart({ data, isLoading }: TelecomEvolutionChartProps) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Evolução de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="overflow-hidden h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Evolução de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum dado disponível
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals for the legend
  const totals = data.reduce(
    (acc, item) => ({
      novos: acc.novos + item.novos,
      instalados: acc.instalados + item.instalados,
      aguardando: acc.aguardando + item.aguardando,
      em_analise: acc.em_analise + item.em_analise,
      cancelado: acc.cancelado + item.cancelado,
      suspenso: acc.suspenso + item.suspenso,
      inadimplente: acc.inadimplente + item.inadimplente,
    }),
    { novos: 0, instalados: 0, aguardando: 0, em_analise: 0, cancelado: 0, suspenso: 0, inadimplente: 0 }
  );

  // Only show statuses that have data
  const activeStatuses = (Object.keys(totals) as (keyof typeof totals)[]).filter(
    (key) => totals[key] > 0
  );

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Evolução de Clientes
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 flex-1 flex flex-col">
        {/* Chart - Fixed height for visibility */}
        <div className="flex-1 min-h-[220px] h-[220px] sm:h-auto sm:min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradientNovos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={STATUS_COLORS.novos} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={STATUS_COLORS.novos} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradientInstalados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={STATUS_COLORS.instalados} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={STATUS_COLORS.instalados} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradientAguardando" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={STATUS_COLORS.aguardando} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={STATUS_COLORS.aguardando} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradientEmAnalise" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={STATUS_COLORS.em_analise} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={STATUS_COLORS.em_analise} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradientCancelado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={STATUS_COLORS.cancelado} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={STATUS_COLORS.cancelado} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradientSuspenso" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={STATUS_COLORS.suspenso} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={STATUS_COLORS.suspenso} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradientInadimplente" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={STATUS_COLORS.inadimplente} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={STATUS_COLORS.inadimplente} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.3}
                vertical={false}
              />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                dy={8}
                interval="preserveStartEnd"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                width={40}
                allowDecimals={false}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Render areas for active statuses */}
              {activeStatuses.includes('instalados') && (
                <Area
                  type="monotone"
                  dataKey="instalados"
                  stroke={STATUS_COLORS.instalados}
                  strokeWidth={2}
                  fill="url(#gradientInstalados)"
                  dot={false}
                />
              )}
              {activeStatuses.includes('novos') && (
                <Area
                  type="monotone"
                  dataKey="novos"
                  stroke={STATUS_COLORS.novos}
                  strokeWidth={2}
                  fill="url(#gradientNovos)"
                  dot={false}
                />
              )}
              {activeStatuses.includes('aguardando') && (
                <Area
                  type="monotone"
                  dataKey="aguardando"
                  stroke={STATUS_COLORS.aguardando}
                  strokeWidth={2}
                  fill="url(#gradientAguardando)"
                  dot={false}
                />
              )}
              {activeStatuses.includes('em_analise') && (
                <Area
                  type="monotone"
                  dataKey="em_analise"
                  stroke={STATUS_COLORS.em_analise}
                  strokeWidth={2}
                  fill="url(#gradientEmAnalise)"
                  dot={false}
                />
              )}
              {activeStatuses.includes('cancelado') && (
                <Area
                  type="monotone"
                  dataKey="cancelado"
                  stroke={STATUS_COLORS.cancelado}
                  strokeWidth={2}
                  fill="url(#gradientCancelado)"
                  dot={false}
                />
              )}
              {activeStatuses.includes('suspenso') && (
                <Area
                  type="monotone"
                  dataKey="suspenso"
                  stroke={STATUS_COLORS.suspenso}
                  strokeWidth={2}
                  fill="url(#gradientSuspenso)"
                  dot={false}
                />
              )}
              {activeStatuses.includes('inadimplente') && (
                <Area
                  type="monotone"
                  dataKey="inadimplente"
                  stroke={STATUS_COLORS.inadimplente}
                  strokeWidth={2}
                  fill="url(#gradientInadimplente)"
                  dot={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend with totals - only show active statuses */}
        <div className="flex justify-center gap-3 sm:gap-4 pt-3 border-t border-border/50 mt-2 flex-wrap">
          {activeStatuses.map((status) => (
            <div key={status} className="flex items-center gap-1.5">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: STATUS_COLORS[status] }} 
              />
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                {STATUS_LABELS[status]}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-foreground">
                {totals[status]}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
