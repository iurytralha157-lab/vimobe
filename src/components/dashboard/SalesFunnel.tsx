import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';

interface FunnelDataPoint {
  name: string;
  value: number;
  percentage: number;
  stage_key: string;
}

// Cores que funcionam bem em ambos os temas
const funnelColorClasses = [
  'bg-primary text-primary-foreground',
  'bg-[hsl(var(--chart-2))] text-white',
  'bg-[hsl(var(--chart-3))] text-white',
  'bg-[hsl(var(--chart-4))] text-white',
  'bg-[hsl(var(--chart-5))] text-white',
];

interface SalesFunnelProps {
  data: FunnelDataPoint[];
  isLoading?: boolean;
}


function FunnelSkeleton() {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton 
            className="h-8 rounded" 
            style={{ width: `${100 - i * 15}%` }}
          />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SalesFunnel({ data, isLoading }: SalesFunnelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Funil de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FunnelSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Funil de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhum dado disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Funil de Vendas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-2">
            {data.map((item, index) => {
              const widthPercent = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
              const minWidth = 25;
              const adjustedWidth = Math.max(widthPercent, minWidth);
              
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3 group cursor-default">
                      <div className="flex-1">
                        <div 
                          className={cn(
                            "h-8 rounded flex items-center justify-center",
                            "transition-all duration-300 group-hover:scale-[1.02]",
                            "font-semibold text-sm shadow-sm",
                            funnelColorClasses[index % funnelColorClasses.length]
                          )}
                          style={{ 
                            width: `${adjustedWidth}%`,
                            minWidth: '60px',
                          }}
                        >
                          {item.value}
                        </div>
                      </div>
                      <div className="w-20 sm:w-24 text-right flex-shrink-0">
                        <p className="text-[10px] sm:text-xs font-medium truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.percentage}%</p>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <div className="text-xs">
                      <p className="font-medium">{item.name}</p>
                      <p>{item.value} leads ({item.percentage}% do total)</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
