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

export interface DealsEvolutionPoint {
  date: string;
  ganhos: number;
  perdas: number;
  abertos: number;
}

interface DealsEvolutionChartProps {
  data: DealsEvolutionPoint[];
  isLoading?: boolean;
}

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
      <div className="flex justify-center gap-6">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-muted-foreground">
                {entry.name === 'ganhos' ? 'Ganhos' : entry.name === 'perdas' ? 'Perdas' : 'Em Aberto'}
              </span>
            </div>
            <span className="text-xs font-semibold text-foreground">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DealsEvolutionChart({ data, isLoading }: DealsEvolutionChartProps) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Evolução de Negócios
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
            Evolução de Negócios
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
      ganhos: acc.ganhos + item.ganhos,
      perdas: acc.perdas + item.perdas,
      abertos: acc.abertos + item.abertos,
    }),
    { ganhos: 0, perdas: 0, abertos: 0 }
  );

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Evolução de Negócios
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 flex-1 flex flex-col">
        {/* Chart */}
        <div className="flex-1 min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradientGanhos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradientPerdas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradientAbertos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.6}
                vertical={false}
              />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                dy={8}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                width={40}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="abertos"
                name="abertos"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#gradientAbertos)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
              />
              <Area
                type="monotone"
                dataKey="ganhos"
                name="ganhos"
                stroke="#22C55E"
                strokeWidth={2}
                fill="url(#gradientGanhos)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
              />
              <Area
                type="monotone"
                dataKey="perdas"
                name="perdas"
                stroke="#EF4444"
                strokeWidth={2}
                fill="url(#gradientPerdas)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend with totals */}
        <div className="flex justify-center gap-6 pt-3 border-t border-border/50 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#22C55E]" />
            <span className="text-xs text-muted-foreground">Ganhos</span>
            <span className="text-xs font-semibold text-foreground">{totals.ganhos}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
            <span className="text-xs text-muted-foreground">Perdas</span>
            <span className="text-xs font-semibold text-foreground">{totals.perdas}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
            <span className="text-xs text-muted-foreground">Em Aberto</span>
            <span className="text-xs font-semibold text-foreground">{totals.abertos}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
