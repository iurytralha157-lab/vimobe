import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart as PieChartIcon, TrendingUp, Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { cn } from '@/lib/utils';

interface SourceDataPoint {
  name: string;
  value: number;
}

interface LeadSourcesChartProps {
  data: SourceDataPoint[];
  isLoading?: boolean;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(263, 70%, 50%)',
  'hsl(217, 91%, 60%)',
  'hsl(160, 84%, 39%)',
  'hsl(38, 92%, 50%)',
  'hsl(350, 89%, 60%)',
  'hsl(187, 92%, 42%)',
];

function ChartSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <Skeleton className="h-32 w-32 rounded-full" />
      <div className="grid grid-cols-2 gap-4 w-full px-4">
        <Skeleton className="h-10 rounded" />
        <Skeleton className="h-10 rounded" />
      </div>
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: SourceDataPoint & { percentage: number };
    fill: string;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0];
  return (
    <div className="bg-background/95 backdrop-blur-md border border-border shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl px-4 py-3 min-w-[180px] z-[100] animate-in fade-in zoom-in duration-200">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div 
          className="w-3 h-3 rounded-full ring-2 ring-background shadow-sm" 
          style={{ backgroundColor: data.fill }} 
        />
        <p className="font-bold text-foreground text-sm tracking-tight">{data.name}</p>
      </div>
      <div className="space-y-2 border-t border-border/50 pt-2.5">
        <div className="flex justify-between items-center gap-4 text-xs">
          <span className="text-muted-foreground font-medium">Total de Leads:</span>
          <span className="text-foreground font-bold">{data.value}</span>
        </div>
        <div className="flex justify-between items-center gap-4 text-xs">
          <span className="text-muted-foreground font-medium">Participação:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
              <div 
                className="h-full rounded-full transition-all duration-500" 
                style={{ backgroundColor: data.fill, width: `${data.payload.percentage}%` }}
              />
            </div>
            <span className="text-foreground font-black">{data.payload.percentage}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LeadSourcesChart({ data, isLoading }: LeadSourcesChartProps) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden h-full flex flex-col shadow-sm border-border/50">
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
            <PieChartIcon className="h-4 w-4 text-primary" />
            Origem dos Leads
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-4">
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const chartData = data
    .map(item => ({
      ...item,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const bestSource = chartData[0] || { name: 'N/A', value: 0, percentage: 0 };

  if (total === 0) {
    return (
      <Card className="overflow-hidden h-full flex flex-col shadow-sm border-border/50">
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
            <PieChartIcon className="h-4 w-4 text-primary" />
            Origem dos Leads
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="space-y-2">
            <div className="bg-muted rounded-full w-12 h-12 flex items-center justify-center mx-auto opacity-50">
              <PieChartIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">Nenhum dado de origem disponível para este período</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden h-full flex flex-col shadow-sm border-border/50">
      <CardHeader className="pb-0 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
            <PieChartIcon className="h-3.5 w-3.5 text-primary" />
            Origem dos Leads
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-4 pt-2 flex flex-col items-center justify-center">
        {/* Donut Chart Container */}
        <div className="w-full aspect-square max-w-[280px] relative mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="95%"
                paddingAngle={3}
                dataKey="value"
                animationBegin={0}
                animationDuration={1200}
                stroke="transparent"
                strokeWidth={0}
                className="outline-none"
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    className="transition-all duration-500 hover:opacity-90 hover:scale-[1.02] origin-center outline-none cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={false}
                wrapperStyle={{ zIndex: 1001 }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Central text for Donut - Improved Hierarchy */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-0">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-muted-foreground/70 tracking-[0.2em] mb-0.5">
              Leads
            </span>
            <div className="relative">
              <span className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter tabular-nums drop-shadow-sm">
                {total}
              </span>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary/20 rounded-full blur-[2px]" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
