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
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl px-4 py-3 min-w-[150px]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.fill }} />
        <p className="font-bold text-foreground text-sm">{data.name}</p>
      </div>
      <div className="space-y-1.5 border-t border-border/50 pt-2">
        <div className="flex justify-between items-center gap-4 text-xs">
          <span className="text-muted-foreground">Total de Leads:</span>
          <span className="text-foreground font-semibold">{data.value}</span>
        </div>
        <div className="flex justify-between items-center gap-4 text-xs">
          <span className="text-muted-foreground">Participação:</span>
          <span className="text-primary font-bold">{data.payload.percentage}%</span>
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
      
      <CardContent className="flex-1 p-4 pt-2 flex flex-col">
        {/* Donut Chart */}
        <div className="flex-1 min-h-[250px] relative mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="65%"
                outerRadius="90%"
                paddingAngle={2}
                dataKey="value"
                animationBegin={0}
                animationDuration={1000}
                stroke="transparent"
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    className="transition-all duration-300 hover:opacity-80 outline-none"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Central text for Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Leads</span>
            <span className="text-2xl font-black text-foreground">{total}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
          {chartData.slice(0, 4).map((item, index) => (
            <div key={item.name} className="flex items-center gap-2 overflow-hidden">
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }} 
              />
              <span className="text-[10px] font-medium text-muted-foreground truncate flex-1">{item.name}</span>
              <span className="text-[10px] font-bold text-foreground">{item.percentage}%</span>
            </div>
          ))}
          {chartData.length > 4 && (
             <div className="flex items-center gap-2 col-span-2 justify-center pt-1 border-t border-border/50 mt-1">
                <span className="text-[9px] text-muted-foreground italic">+ {chartData.length - 4} outras fontes</span>
             </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
