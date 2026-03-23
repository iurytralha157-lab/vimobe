import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Edit2, 
  Trash2, 
  Play, 
  MessageSquare, 
  Clock, 
  GitBranch, 
  Tag, 
  UserPlus,
  Zap,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
  MapPin,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  useAutomations, 
  useDeleteAutomation, 
  useToggleAutomation,
  useAutomationExecutions,
  TRIGGER_TYPE_LABELS,
  TriggerType,
  Automation,
} from '@/hooks/use-automations';
import { usePipelines, useStages } from '@/hooks/use-stages';
import { useTags } from '@/hooks/use-tags';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AutomationListProps {
  onEdit: (automationId: string) => void;
  onViewHistory?: (automationId: string) => void;
}

const getTriggerIcon = (triggerType: TriggerType) => {
  switch (triggerType) {
    case 'message_received':
      return MessageSquare;
    case 'scheduled':
      return Clock;
    case 'lead_stage_changed':
      return GitBranch;
    case 'tag_added':
      return Tag;
    case 'lead_created':
      return UserPlus;
    case 'inactivity':
      return Clock;
    case 'manual':
      return Play;
    default:
      return Zap;
  }
};

function TriggerContext({ automation }: { automation: Automation }) {
  const config = automation.trigger_config as Record<string, unknown> || {};
  const triggerType = automation.trigger_type as TriggerType;

  const pipelineId = config.pipeline_id as string | undefined;
  const stageId = config.to_stage_id as string | undefined;
  const tagId = config.tag_id as string | undefined;

  const { data: pipelines } = usePipelines();
  const { data: stages } = useStages(pipelineId);
  const { data: tags } = useTags();

  if (triggerType === 'lead_stage_changed' && pipelineId) {
    const pipeline = pipelines?.find(p => p.id === pipelineId);
    const stage = stageId ? stages?.find(s => s.id === stageId) : null;
    if (!pipeline && !stage) return null;

    return (
      <span className="text-xs text-muted-foreground">
        {pipeline?.name || '—'}
        {stage ? ` → ${stage.name}` : ''}
      </span>
    );
  }

  if (triggerType === 'tag_added' && tagId) {
    const tag = tags?.find(t => t.id === tagId);
    if (!tag) return null;

    return (
      <span
        className="px-1.5 py-0.5 rounded-full text-xs font-medium"
        style={{
          backgroundColor: tag.color ? `${tag.color}22` : undefined,
          color: tag.color || undefined,
        }}
      >
        {tag.name}
      </span>
    );
  }

  return null;
}

export function AutomationList({ onEdit, onViewHistory }: AutomationListProps) {
  const { data: automations, isLoading } = useAutomations();
  const { data: executions } = useAutomationExecutions();
  const deleteAutomation = useDeleteAutomation();
  const toggleAutomation = useToggleAutomation();

  const getExecutionStats = (automationId: string) => {
    const automationExecutions = executions?.filter(e => e.automation_id === automationId) || [];
    return {
      running: automationExecutions.filter(e => e.status === 'running' || e.status === 'waiting').length,
      completed: automationExecutions.filter(e => e.status === 'completed').length,
      failed: automationExecutions.filter(e => e.status === 'failed').length,
      lastRun: automationExecutions.length > 0 
        ? new Date(automationExecutions[0].started_at)
        : null,
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!automations || automations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-2xl bg-primary/10 mb-4">
          <Zap className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhuma automação criada</h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          Vá para a aba "Modelos" para criar sua primeira automação a partir de templates prontos
        </p>
      </div>
    );
  }

  const getNodeCount = (automation: Automation) => {
    const flow = automation.flow_definition as unknown as Record<string, unknown> | null;
    if (!flow) return 0;
    const nodes = flow.nodes as unknown[] | undefined;
    return nodes?.length || 0;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {automations.map((automation) => {
        const TriggerIcon = getTriggerIcon(automation.trigger_type as TriggerType);
        const stats = getExecutionStats(automation.id);
        const hasStats = stats.running > 0 || stats.completed > 0 || stats.failed > 0;
        
        return (
          <Card 
            key={automation.id} 
            className={`group rounded-2xl border-border/50 hover:border-primary/40 transition-all duration-200 cursor-pointer relative aspect-[4/3] flex items-center justify-center ${
              automation.is_active ? 'bg-card/50 backdrop-blur-sm' : 'bg-muted/30 opacity-70'
            }`}
            onClick={() => onEdit(automation.id)}
          >
            <CardContent className="flex flex-col items-center justify-center p-5 text-center w-full">
              <div className="relative mb-3">
                <div className={`p-3 rounded-xl ${automation.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                  <TriggerIcon className={`h-7 w-7 ${automation.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                {stats.running > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                )}
              </div>

              <h3 className="font-semibold text-sm mb-1 truncate max-w-full">{automation.name}</h3>
              
              <span className="text-[11px] text-muted-foreground mb-2">
                {TRIGGER_TYPE_LABELS[automation.trigger_type as TriggerType] || automation.trigger_type}
              </span>

              {hasStats && (
                <div className="flex items-center gap-2 text-[10px]">
                  {stats.completed > 0 && (
                    <span className="flex items-center gap-0.5 text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                      {stats.completed}
                    </span>
                  )}
                  {stats.running > 0 && (
                    <span className="flex items-center gap-0.5 text-primary">
                      <AlertCircle className="h-3 w-3" />
                      {stats.running}
                    </span>
                  )}
                  {stats.failed > 0 && (
                    <span className="flex items-center gap-0.5 text-destructive">
                      <XCircle className="h-3 w-3" />
                      {stats.failed}
                    </span>
                  )}
                </div>
              )}
            </CardContent>

            {/* Top-right actions (visible on hover) */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={automation.is_active}
                onCheckedChange={(checked) => 
                  toggleAutomation.mutate({ id: automation.id, is_active: checked })
                }
                className="scale-75"
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir automação?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. A automação "{automation.name}" será excluída permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAutomation.mutate(automation.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Status badge */}
            <Badge 
              variant={automation.is_active ? 'default' : 'secondary'} 
              className="absolute top-2 left-2 text-[9px] px-1.5 py-0"
            >
              {automation.is_active ? 'Ativa' : 'Inativa'}
            </Badge>
          </Card>
        );
      })}
    </div>
  );
}
