import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TrendingDown } from 'lucide-react';

interface FunnelDataPoint {
  name: string;
  value: number;
  percentage: number;
  stage_key: string;
}

// Gradientes modernos para cada etapa do funil
const funnelGradients = [
  'from-primary to-primary/80',
  'from-violet-500 to-violet-600',
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
  'from-fuchsia-500 to-fuchsia-600',
];

// Cores de borda/glow
const funnelBorderColors = [
  'border-primary/30 shadow-primary/20',
  'border-violet-500/30 shadow-violet-500/20',
  'border-blue-500/30 shadow-blue-500/20',
  'border-emerald-500/30 shadow-emerald-500/20',
  'border-amber-500/30 shadow-amber-500/20',
  'border-rose-500/30 shadow-rose-500/20',
  'border-cyan-500/30 shadow-cyan-500/20',
  'border-fuchsia-500/30 shadow-fuchsia-500/20',
];

interface SalesFunnelProps {
  data: FunnelDataPoint[];
  isLoading?: boolean;
}

function FunnelSkeleton() {
  return (
    <div className="flex flex-col items-center space-y-1.5 py-4">
      {Array.from({ length: 5 }).map((_, i) => {
        const width = 100 - i * 12;
        return (
          <Skeleton 
            key={i}
            className="h-10 rounded-lg" 
            style={{ width: `${width}%` }}
          />
        );
      })}
    </div>
  );
}

export function SalesFunnel({ data, isLoading }: SalesFunnelProps) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-primary" />
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
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-primary" />
            Funil de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhum dado disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const maxStages = data.length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-primary" />
            Funil de Vendas
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {total} leads no total
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <TooltipProvider>
          <div className="flex flex-col items-center space-y-1">
            {data.map((item, index) => {
              // Calcula a largura baseada na posição (formato de funil)
              const baseWidth = 100 - (index * (60 / maxStages));
              const minWidth = 35;
              const width = Math.max(baseWidth, minWidth);
              
              // Altura dinâmica baseada no valor relativo
              const heightClass = item.value > 0 ? 'min-h-[44px]' : 'min-h-[36px]';
              
              return (
                <Tooltip key={item.stage_key || item.name}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "relative group cursor-default transition-all duration-300",
                        "hover:scale-[1.02] hover:z-10"
                      )}
                      style={{ width: `${width}%` }}
                    >
                      {/* Barra principal com gradiente */}
                      <div
                        className={cn(
                          "w-full rounded-lg flex items-center justify-between px-4 py-2.5",
                          "bg-gradient-to-r text-white font-medium",
                          "border shadow-lg transition-all duration-300",
                          "group-hover:shadow-xl",
                          heightClass,
                          funnelGradients[index % funnelGradients.length],
                          funnelBorderColors[index % funnelBorderColors.length]
                        )}
                      >
                        {/* Nome do estágio */}
                        <span className="text-xs sm:text-sm font-medium truncate max-w-[45%] drop-shadow-sm">
                          {item.name}
                        </span>
                        
                        {/* Valor e percentual */}
                        <div className="flex items-center gap-2">
                          <span className="text-lg sm:text-xl font-bold drop-shadow-sm">
                            {item.value}
                          </span>
                          <span className="text-[10px] sm:text-xs opacity-80 font-medium bg-white/20 px-1.5 py-0.5 rounded-full">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Connector visual (triângulo para próximo estágio) */}
                      {index < data.length - 1 && (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 
                          border-l-[8px] border-l-transparent 
                          border-r-[8px] border-r-transparent 
                          border-t-[6px] border-t-white/30 
                          z-10"
                        />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover/95 backdrop-blur-sm">
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-foreground">{item.name}</p>
                      <p className="text-muted-foreground">
                        <span className="text-foreground font-medium">{item.value}</span> leads
                      </p>
                      <p className="text-muted-foreground">
                        <span className="text-foreground font-medium">{item.percentage}%</span> do total
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
        
        {/* Legenda inferior */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
            {data.slice(0, 4).map((item, index) => (
              <div key={item.stage_key || item.name} className="flex items-center gap-1.5">
                <div 
                  className={cn(
                    "w-2.5 h-2.5 rounded-full bg-gradient-to-r",
                    funnelGradients[index % funnelGradients.length]
                  )}
                />
                <span className="text-[10px] text-muted-foreground">{item.name}</span>
              </div>
            ))}
            {data.length > 4 && (
              <span className="text-[10px] text-muted-foreground">
                +{data.length - 4} mais
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
