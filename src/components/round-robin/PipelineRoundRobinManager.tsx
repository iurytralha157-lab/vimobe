import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, GitBranch, Shuffle, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePipelines } from '@/hooks/use-pipelines';

interface RoundRobin {
  id: string;
  name: string;
  is_active: boolean;
}

interface PipelineRoundRobinManagerProps {
  roundRobins: RoundRobin[];
  isLoading?: boolean;
  onUpdate?: (pipelineId: string, roundRobinId: string | null) => Promise<void>;
}

export function PipelineRoundRobinManager({ 
  roundRobins = [], 
  isLoading: rrLoading,
  onUpdate 
}: PipelineRoundRobinManagerProps) {
  const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines();
  
  const handleChange = async (pipelineId: string, roundRobinId: string | null) => {
    if (onUpdate) {
      await onUpdate(pipelineId, roundRobinId === 'none' ? null : roundRobinId);
    }
  };
  
  if (pipelinesLoading || rrLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  const activeRoundRobins = roundRobins.filter(rr => rr.is_active);
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-2">Round-Robin Padrão por Pipeline</h3>
        <p className="text-sm text-muted-foreground">
          Configure qual fila de distribuição será usada como fallback para cada pipeline, 
          quando nenhuma regra específica corresponder ao lead.
        </p>
      </div>
      
      {activeRoundRobins.length === 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">
            Nenhum round-robin ativo encontrado. Crie e ative filas de distribuição primeiro.
          </p>
        </div>
      )}
      
      <div className="grid gap-4">
        {pipelines.map((pipeline) => (
          <Card key={pipeline.id}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <GitBranch className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{pipeline.name}</p>
                    {pipeline.is_default && (
                      <Badge variant="secondary" className="text-xs mt-1">Padrão</Badge>
                    )}
                  </div>
                </div>
                
                <Select
                  defaultValue="none"
                  onValueChange={(value) => handleChange(pipeline.id, value)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">Nenhum</span>
                    </SelectItem>
                    {activeRoundRobins.map((rr) => (
                      <SelectItem key={rr.id} value={rr.id}>
                        <div className="flex items-center gap-2">
                          <Shuffle className="h-3 w-3" />
                          {rr.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
