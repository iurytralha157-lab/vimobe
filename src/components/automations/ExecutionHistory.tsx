import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle2, XCircle, Clock, Play, AlertTriangle } from 'lucide-react';
import { useAutomationExecutions, AutomationExecution } from '@/hooks/use-automations';

interface ExecutionHistoryProps {
  automationId?: string;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'completed':
      return {
        label: 'Concluída',
        icon: CheckCircle2,
        variant: 'default' as const,
        bgClass: 'bg-primary/10',
        textClass: 'text-primary',
        borderClass: 'border-primary/20',
      };
    case 'running':
      return {
        label: 'Executando',
        icon: Play,
        variant: 'default' as const,
        bgClass: 'bg-accent',
        textClass: 'text-accent-foreground',
        borderClass: 'border-accent',
      };
    case 'waiting':
      return {
        label: 'Aguardando',
        icon: Clock,
        variant: 'secondary' as const,
        bgClass: 'bg-secondary',
        textClass: 'text-secondary-foreground',
        borderClass: 'border-secondary',
      };
    case 'failed':
      return {
        label: 'Falhou',
        icon: XCircle,
        variant: 'destructive' as const,
        bgClass: 'bg-destructive/10',
        textClass: 'text-destructive',
        borderClass: 'border-destructive/20',
      };
    default:
      return {
        label: status,
        icon: AlertTriangle,
        variant: 'outline' as const,
        bgClass: 'bg-muted',
        textClass: 'text-muted-foreground',
        borderClass: 'border-muted',
      };
  }
};

export function ExecutionHistory({ automationId }: ExecutionHistoryProps) {
  const { data: executions, isLoading } = useAutomationExecutions(automationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!executions || executions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma execução ainda</h3>
          <p className="text-muted-foreground text-sm">
            As execuções das automações aparecerão aqui quando forem disparadas
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group executions by status
  const runningExecutions = executions.filter(e => e.status === 'running' || e.status === 'waiting');
  const completedExecutions = executions.filter(e => e.status === 'completed');
  const failedExecutions = executions.filter(e => e.status === 'failed');

  const stats = {
    running: runningExecutions.length,
    completed: completedExecutions.length,
    failed: failedExecutions.length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-accent/50 border-accent">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl text-foreground">{stats.running}</CardTitle>
            <CardDescription className="text-foreground/70">Em andamento</CardDescription>
          </CardHeader>
        </Card>
        <Card className="bg-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl text-primary">{stats.completed}</CardTitle>
            <CardDescription className="text-primary/80">Concluídas</CardDescription>
          </CardHeader>
        </Card>
        <Card className="bg-destructive/10 border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl text-destructive">{stats.failed}</CardTitle>
            <CardDescription className="text-destructive/80">Com erro</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Executions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Execuções</CardTitle>
          <CardDescription>Últimas 100 execuções</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {executions.map((execution) => (
                <ExecutionRow key={execution.id} execution={execution} />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function ExecutionRow({ execution }: { execution: AutomationExecution }) {
  const statusConfig = getStatusConfig(execution.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-full ${statusConfig.bgClass} ${statusConfig.textClass}`}>
          <StatusIcon className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {execution.lead_id ? `Lead` : execution.conversation_id ? 'Conversa' : 'Execução'}
            </span>
            <Badge variant={statusConfig.variant}>
              {statusConfig.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Iniciado {formatDistanceToNow(new Date(execution.started_at), { 
              addSuffix: true, 
              locale: ptBR 
            })}
            {execution.next_execution_at && execution.status === 'waiting' && (
              <span className="ml-2">
                • Próximo: {formatDistanceToNow(new Date(execution.next_execution_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="text-right">
        {execution.completed_at && (
          <p className="text-xs text-muted-foreground">
            Concluído {formatDistanceToNow(new Date(execution.completed_at), { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </p>
        )}
        {execution.error_message && (
          <p className="text-xs text-destructive mt-1 max-w-[200px] truncate">
            {execution.error_message}
          </p>
        )}
      </div>
    </div>
  );
}
