import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SourceDataPoint {
  name: string;
  value: number;
}

interface LeadSourcesChartProps {
  data: SourceDataPoint[];
  isLoading?: boolean;
}

// Gradientes modernos para cada fonte
const sourceGradients = [
  'from-primary to-primary/80',
  'from-violet-500 to-violet-600',
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
];

// Cores de borda/glow
const sourceBorderColors = [
  'border-primary/30 shadow-primary/20',
  'border-violet-500/30 shadow-violet-500/20',
  'border-blue-500/30 shadow-blue-500/20',
  'border-emerald-500/30 shadow-emerald-500/20',
  'border-amber-500/30 shadow-amber-500/20',
  'border-rose-500/30 shadow-rose-500/20',
  'border-cyan-500/30 shadow-cyan-500/20',
];

function ChartSkeleton() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 flex-1 rounded" />
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  );
}

export function LeadSourcesChart({ data, isLoading }: LeadSourcesChartProps) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-500" />
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
            <Target className="h-4 w-4 text-violet-500" />
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
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-500" />
            Origem dos Leads
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {total} leads
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <TooltipProvider delayDuration={100}>
          <div className="space-y-1.5">
            {data.map((item, index) => {
              const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
              const widthPercent = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
              const adjustedWidth = Math.max(widthPercent, 20);
              
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    <div className="group cursor-default">
                      <div className="flex items-center gap-3">
                        {/* Barra com gradiente */}
                        <div 
                          className="relative flex-1 transition-all duration-200 group-hover:scale-[1.01]"
                          style={{ width: `${adjustedWidth}%` }}
                        >
                          <div
                            className={cn(
                              "h-8 rounded flex items-center justify-between px-3",
                              "bg-gradient-to-r text-white text-sm",
                              "border shadow-sm transition-all duration-200",
                              "group-hover:shadow-md",
                              sourceGradients[index % sourceGradients.length],
                              sourceBorderColors[index % sourceBorderColors.length]
                            )}
                          >
                            <span className="text-xs font-medium truncate drop-shadow-sm">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold drop-shadow-sm">
                                {item.value}
                              </span>
                              <span className="text-[9px] opacity-80 font-medium bg-white/20 px-1 py-0.5 rounded-full">
                                {percentage}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover/95 backdrop-blur-sm">
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-foreground">{item.name}</p>
                      <p className="text-muted-foreground">
                        <span className="text-foreground font-medium">{item.value}</span> leads
                      </p>
                      <p className="text-muted-foreground">
                        <span className="text-foreground font-medium">{percentage}%</span> do total
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
        
        {/* Legenda inferior compacta */}
        <div className="mt-2 pt-2 border-t border-border/40">
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 justify-center">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1">
                <div 
                  className={cn(
                    "w-2 h-2 rounded-full bg-gradient-to-r",
                    sourceGradients[index % sourceGradients.length]
                  )}
                />
                <span className="text-[9px] text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
