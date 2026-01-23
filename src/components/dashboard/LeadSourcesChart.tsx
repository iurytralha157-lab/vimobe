import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart as PieChartIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface SourceDataPoint {
  name: string;
  value: number;
}

interface LeadSourcesChartProps {
  data: SourceDataPoint[];
  isLoading?: boolean;
}

// Cores vibrantes para o gráfico de pizza (mesma paleta do funil)
const COLORS = [
  'hsl(var(--primary))',
  'hsl(263, 70%, 50%)', // violet
  'hsl(217, 91%, 60%)', // blue
  'hsl(160, 84%, 39%)', // emerald
  'hsl(38, 92%, 50%)',  // amber
  'hsl(350, 89%, 60%)', // rose
  'hsl(187, 92%, 42%)', // cyan
];

// Gradientes para a legenda
const legendGradients = [
  'from-primary to-primary/80',
  'from-violet-500 to-violet-600',
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
];

function ChartSkeleton() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="relative">
        <Skeleton className="h-32 w-32 rounded-full" />
        <Skeleton className="absolute inset-4 h-24 w-24 rounded-full bg-background" />
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
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  
  const data = payload[0];
  
  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-lg px-3 py-2">
      <div className="text-xs space-y-1">
        <p className="font-semibold text-foreground">{data.name}</p>
        <p className="text-muted-foreground">
          <span className="text-foreground font-medium">{data.value}</span> leads
        </p>
        <p className="text-muted-foreground">
          <span className="text-foreground font-medium">{data.payload.percentage}%</span> do total
        </p>
      </div>
    </div>
  );
}

export function LeadSourcesChart({ data, isLoading }: LeadSourcesChartProps) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-violet-500" />
            Origem dos Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-violet-500" />
            Origem dos Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhum dado disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Add percentage to data for tooltip
  const chartData = data.map(item => ({
    ...item,
    percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
  }));

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-violet-500" />
            Origem dos Leads
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {total} leads
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-4 flex-1 flex flex-col">
        <div className="flex flex-col lg:flex-row items-center gap-6 flex-1">
          {/* Gráfico de Pizza - maior e proporcional */}
          <div className="w-full lg:w-1/2 h-[200px] lg:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {chartData.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      className="transition-all duration-200 hover:opacity-80"
                      style={{
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legenda lateral */}
          <div className="w-full lg:w-1/2 space-y-2">
            {chartData.map((item, index) => (
              <div 
                key={item.name} 
                className="flex items-center justify-between group cursor-default hover:bg-muted/50 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className={cn(
                      "w-4 h-4 rounded-full bg-gradient-to-r shrink-0",
                      legendGradients[index % legendGradients.length]
                    )}
                  />
                  <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">
                    {item.value}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}