import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Edit2, Trash2, Play, MessageSquare, Clock, GitBranch, Tag, UserPlus,
  Zap, Loader2, CheckCircle2, XCircle, AlertCircle, History, MapPin,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  useAutomations, useDeleteAutomation, useToggleAutomation, useAutomationExecutions,
  TRIGGER_TYPE_LABELS, TriggerType, Automation,
} from '@/hooks/use-automations';
import { usePipelines, useStages } from '@/hooks/use-stages';
import { useTags } from '@/hooks/use-tags';
import { formatDistanceToNow, format } from 'date-fns';

interface AutomationListProps {
  onEdit: (automationId: string) => void;
  onViewHistory?: (automationId: string) => void;
}

const getTriggerIcon = (triggerType: TriggerType) => {
  switch (triggerType) {
    case 'message_received': return MessageSquare;
    case 'scheduled': return Clock;
    case 'lead_stage_changed': return GitBranch;
    case 'tag_added': return Tag;
    case 'lead_created': return UserPlus;
    case 'inactivity': return Clock;
    case 'manual': return Play;
    default: return Zap;
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
        {pipeline?.name || '—'}{stage ? ` → ${stage.name}` : ''}
      </span>
    );
  }

  if (triggerType === 'tag_added' && tagId) {
    const tag = tags?.find(t => t.id === tagId);
    if (!tag) return null;
    return (
      <span className="px-1.5 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: tag.color ? `${tag.color}22` : undefined, color: tag.color || undefined }}>
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
      lastRun: automationExecutions.length > 0 ? new Date(automationExecutions[0].started_at) : null,
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
          <div 
            key={automation.id} 
            className={`group rounded-2xl cursor-pointer relative aspect-[4/3] flex items-center justify-center transition-all duration-300 overflow-hidden ${
              !automation.is_active ? 'opacity-50' : ''
            }`}
            style={{ border: '1px solid hsl(var(--border))' }}
            onClick={() => onEdit(automation.id)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex flex-col items-center justify-center p-5 text-center w-full relative z-10">
              <div className="relative mb-3">
                <div className={`p-3 rounded-xl transition-all duration-300 group-hover:scale-110 ${automation.is_active ? 'bg-primary/15' : 'bg-muted'}`}>
                  <TriggerIcon className={`h-7 w-7 ${automation.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                {stats.running > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                )}
              </div>

              <h3 className="font-semibold text-sm mb-1 truncate max-w-full text-foreground">{automation.name}</h3>
              
              <span className="text-[11px] text-muted-foreground mb-1">
                {TRIGGER_TYPE_LABELS[automation.trigger_type as TriggerType] || automation.trigger_type}
              </span>

              {hasStats && (
                <div className="flex items-center gap-2 text-[10px] mb-1">
                  {stats.completed > 0 && (
                    <span className="flex items-center gap-0.5 text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
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
                    <span className="flex items-center gap-0.5 text-red-400">
                      <XCircle className="h-3 w-3" />
                      {stats.failed}
                    </span>
                  )}
                </div>
              )}

              {automation.created_at && (
                <span className="text-[10px] text-muted-foreground/60">
                  {format(new Date(automation.created_at), "dd/MM/yyyy")}
                </span>
              )}
            </div>

            {/* Top-right actions (visible on hover) */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20" onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={automation.is_active}
                onCheckedChange={(checked) => 
                  toggleAutomation.mutate({ id: automation.id, is_active: checked })
                }
                className="scale-75"
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10">
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
              className={`absolute top-2.5 left-2.5 text-[11px] px-2.5 py-0.5 font-medium border ${
                automation.is_active 
                  ? 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20' 
                  : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {automation.is_active ? 'Ativa' : 'Inativa'}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
