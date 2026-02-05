import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle2, XCircle, Clock, Play, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAutomationExecutions, AutomationExecution } from '@/hooks/use-automations';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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

// Translate common error messages to Portuguese
function translateError(error: string): string {
  if (error.includes("exists") && error.includes("false")) {
    return "Número WhatsApp inválido ou não cadastrado";
  }
  if (error.includes("Connection refused") || error.includes("ECONNREFUSED")) {
    return "Falha na conexão com WhatsApp";
  }
  if (error.includes("timeout") || error.includes("ETIMEDOUT")) {
    return "Tempo limite excedido";
  }
  if (error.includes("not connected")) {
    return "Sessão WhatsApp desconectada";
  }
  if (error.includes("Node not found")) {
    return "Nó de automação não encontrado";
  }
  if (error.includes("Failed to send WhatsApp")) {
    // Extract the error details
    const match = error.match(/Failed to send WhatsApp: (.+)/);
    if (match) {
      try {
        const details = JSON.parse(match[1]);
        if (details.status === "error" && details.message) {
          return `Erro WhatsApp: ${details.message}`;
        }
      } catch {
        // If not JSON, try to get a readable message
        if (error.includes("exists")) {
          return "Número WhatsApp inválido ou não cadastrado";
        }
      }
    }
    return "Falha ao enviar mensagem WhatsApp";
  }
  return error;
}

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
          <CardDescription>Últimas 100 execuções • Atualiza automaticamente</CardDescription>
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
  const [isOpen, setIsOpen] = useState(false);
  const statusConfig = getStatusConfig(execution.status);
  const StatusIcon = statusConfig.icon;

  const leadName = execution.lead?.name || 'Lead desconhecido';
  const automationName = execution.automation?.name || 'Automação';
  const hasError = !!execution.error_message;
  const translatedError = execution.error_message ? translateError(execution.error_message) : '';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`p-2 rounded-full shrink-0 ${statusConfig.bgClass} ${statusConfig.textClass}`}>
            <StatusIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium truncate">
                {leadName}
              </span>
              <Badge variant={statusConfig.variant} className="shrink-0">
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {automationName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Iniciado {formatDistanceToNow(new Date(execution.started_at), { 
                addSuffix: true, 
                locale: ptBR 
              })}
              {execution.next_execution_at && execution.status === 'waiting' && (
                <span className="ml-2 text-accent-foreground">
                  • Próximo: {formatDistanceToNow(new Date(execution.next_execution_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            {execution.completed_at && (
              <p className="text-xs text-muted-foreground">
                Concluído {formatDistanceToNow(new Date(execution.completed_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </p>
            )}
          </div>

          {hasError && (
            <CollapsibleTrigger asChild>
              <button className="p-1 rounded hover:bg-muted">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
          )}
        </div>
      </div>

      {hasError && (
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium text-destructive">
                    {translatedError}
                  </p>
                  {execution.error_message !== translatedError && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground">
                        Ver detalhes técnicos
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto whitespace-pre-wrap break-all">
                        {execution.error_message}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
