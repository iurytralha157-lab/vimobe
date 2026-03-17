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

  return (
    <div className="grid gap-3">
      {automations.map((automation) => {
        const TriggerIcon = getTriggerIcon(automation.trigger_type as TriggerType);
        const stats = getExecutionStats(automation.id);
        const hasStats = stats.running > 0 || stats.completed > 0 || stats.failed > 0;
        
        return (
          <Card 
            key={automation.id} 
            className="group bg-card/50 backdrop-blur-sm border-border/50 rounded-2xl hover:border-primary/30 transition-all duration-200"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="relative shrink-0">
                  <div className={`p-2.5 rounded-xl ${automation.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                    <TriggerIcon className={`h-5 w-5 ${automation.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  {stats.running > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{automation.name}</span>
                    <Badge 
                      variant={automation.is_active ? 'default' : 'secondary'} 
                      className="shrink-0 text-[10px] px-1.5 py-0"
                    >
                      {automation.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {TRIGGER_TYPE_LABELS[automation.trigger_type as TriggerType] || automation.trigger_type}
                    </span>
                    <TriggerContext automation={automation} />
                  </div>

                  {/* Stats row */}
                  {hasStats && (
                    <div className="flex items-center gap-3 mt-2">
                      {stats.running > 0 && (
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <AlertCircle className="h-3 w-3" />
                          <span>{stats.running}</span>
                        </div>
                      )}
                      {stats.completed > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                          <span>{stats.completed}</span>
                        </div>
                      )}
                      {stats.failed > 0 && (
                        <div className="flex items-center gap-1 text-xs text-destructive">
                          <XCircle className="h-3 w-3" />
                          <span>{stats.failed}</span>
                        </div>
                      )}
                      {stats.lastRun && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(stats.lastRun, { addSuffix: true, locale: ptBR })}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onViewHistory && hasStats && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => onViewHistory(automation.id)}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => onEdit(automation.id)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
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

                  <Switch
                    checked={automation.is_active}
                    onCheckedChange={(checked) => 
                      toggleAutomation.mutate({ id: automation.id, is_active: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
