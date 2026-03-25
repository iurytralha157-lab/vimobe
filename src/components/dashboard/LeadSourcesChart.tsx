import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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
    <div className="flex items-center justify-center h-full">
      <Skeleton className="h-32 w-32 rounded-full" />
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

const RADIAN = Math.PI / 180;

function renderCustomLabel({
  cx, cy, midAngle, innerRadius, outerRadius, percentage, name,
}: any) {
  if (percentage < 5) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-[10px] font-semibold pointer-events-none"
      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
    >
      {percentage}%
    </text>
  );
}

export function LeadSourcesChart({ data, isLoading }: LeadSourcesChartProps) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden h-full flex flex-col">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-violet-500" />
            Origem dos Leads
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-2">
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="overflow-hidden h-full flex flex-col">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-violet-500" />
            Origem dos Leads
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Nenhum dado disponível</span>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const chartData = data.map(item => ({
    ...item,
    percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
  }));

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <CardHeader className="pb-1 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-violet-500" />
            Origem dos Leads
          </CardTitle>
          <span className="text-xs text-muted-foreground">{total} leads</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-2 pb-3">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius="90%"
              innerRadius="0%"
              paddingAngle={1}
              dataKey="value"
              stroke="hsl(var(--border))"
              strokeWidth={1}
              animationBegin={0}
              animationDuration={800}
              label={renderCustomLabel}
              labelLine={false}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  className="transition-opacity duration-200 hover:opacity-80"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
