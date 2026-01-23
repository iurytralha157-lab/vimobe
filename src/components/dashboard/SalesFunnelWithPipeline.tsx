import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TrendingDown } from 'lucide-react';
import { usePipelines } from '@/hooks/use-stages';
import { useFunnelData, useLeadSourcesData, FunnelDataPoint, SourceDataPoint } from '@/hooks/use-dashboard-stats';
import { DashboardFilters } from '@/hooks/use-dashboard-filters';
import { LeadSourcesChart } from './LeadSourcesChart';

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

interface SalesFunnelWithPipelineProps {
  filters?: DashboardFilters;
}

function FunnelSkeleton() {
  return (
    <div className="flex flex-col items-center space-y-1 py-2">
      {Array.from({ length: 5 }).map((_, i) => {
        const width = 100 - i * 12;
        return (
          <Skeleton 
            key={i}
            className="h-7 rounded" 
            style={{ width: `${width}%` }}
          />
        );
      })}
    </div>
  );
}

export function SalesFunnelWithPipeline({ filters }: SalesFunnelWithPipelineProps) {
  const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

  // Set default pipeline when pipelines load
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
      setSelectedPipelineId(defaultPipeline.id);
    }
  }, [pipelines, selectedPipelineId]);

  const { data: funnelData = [], isLoading: funnelLoading } = useFunnelData(filters, selectedPipelineId);
  const { data: sourcesData = [], isLoading: sourcesLoading } = useLeadSourcesData(filters, selectedPipelineId);

  const isLoading = pipelinesLoading || funnelLoading;
  const total = funnelData.reduce((sum, d) => sum + d.value, 0);
  const maxStages = funnelData.length;

  const selectedPipelineName = pipelines.find(p => p.id === selectedPipelineId)?.name || 'Pipeline';

  return {
    funnelComponent: (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" />
              Funil de Vendas
            </CardTitle>
            <div className="flex items-center gap-2">
              {pipelines.length > 1 && (
                <Select 
                  value={selectedPipelineId || ''} 
                  onValueChange={setSelectedPipelineId}
                >
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue placeholder="Selecione pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id} className="text-xs">
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {total} leads
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          {isLoading ? (
            <FunnelSkeleton />
          ) : funnelData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
              Nenhum dado disponível
            </div>
          ) : (
            <TooltipProvider delayDuration={100}>
              <div className="flex flex-col items-center space-y-0.5">
                {funnelData.map((item, index) => {
                  // Calcula a largura baseada na posição (formato de funil)
                  const baseWidth = 100 - (index * (55 / maxStages));
                  const minWidth = 40;
                  const width = Math.max(baseWidth, minWidth);
                  
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
                              "w-full rounded flex items-center justify-between px-3 py-1.5",
                              "bg-gradient-to-r text-white text-sm",
                              "border shadow-sm transition-all duration-200",
                              "group-hover:shadow-md",
                              funnelGradients[index % funnelGradients.length],
                              funnelBorderColors[index % funnelBorderColors.length]
                            )}
                          >
                            {/* Nome do estágio */}
                            <span className="text-xs font-medium truncate max-w-[50%] drop-shadow-sm">
                              {item.name}
                            </span>
                            
                            {/* Valor e percentual */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold drop-shadow-sm">
                                {item.value}
                              </span>
                              <span className="text-[9px] opacity-80 font-medium bg-white/20 px-1 py-0.5 rounded-full">
                                {item.percentage}%
                              </span>
                            </div>
                          </div>
                          
                          {/* Connector visual (pequeno triângulo) */}
                          {index < funnelData.length - 1 && (
                            <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-0 h-0 
                              border-l-[5px] border-l-transparent 
                              border-r-[5px] border-r-transparent 
                              border-t-[4px] border-t-white/20 
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
          )}
          
          {/* Legenda inferior compacta */}
          {funnelData.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/40">
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 justify-center">
                {funnelData.slice(0, 5).map((item, index) => (
                  <div key={item.stage_key || item.name} className="flex items-center gap-1">
                    <div 
                      className={cn(
                        "w-2 h-2 rounded-full bg-gradient-to-r",
                        funnelGradients[index % funnelGradients.length]
                      )}
                    />
                    <span className="text-[9px] text-muted-foreground">{item.name}</span>
                  </div>
                ))}
                {funnelData.length > 5 && (
                  <span className="text-[9px] text-muted-foreground">+{funnelData.length - 5}</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    ),
    sourcesComponent: (
      <LeadSourcesChart data={sourcesData} isLoading={sourcesLoading} />
    ),
    selectedPipelineId,
    selectedPipelineName,
  };
}
