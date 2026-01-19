import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
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
  TRIGGER_TYPE_LABELS,
  TriggerType,
} from '@/hooks/use-automations';
import { CreateAutomationDialog } from './CreateAutomationDialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AutomationListProps {
  onEdit: (automationId: string) => void;
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

export function AutomationList({ onEdit }: AutomationListProps) {
  const { data: automations, isLoading } = useAutomations();
  const deleteAutomation = useDeleteAutomation();
  const toggleAutomation = useToggleAutomation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nova Automação
        </Button>
      </div>

      {automations?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Zap className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma automação criada</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Crie fluxos automáticos para enviar mensagens, mover leads e muito mais
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira automação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {automations?.map((automation) => {
            const TriggerIcon = getTriggerIcon(automation.trigger_type as TriggerType);
            
            return (
              <Card key={automation.id} className="group">
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div className="flex items-start gap-3 w-full sm:w-auto">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <TriggerIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex flex-wrap items-center gap-2">
                          <span className="truncate">{automation.name}</span>
                          <Badge variant={automation.is_active ? 'default' : 'secondary'} className="shrink-0">
                            {automation.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">
                          {automation.description || 'Sem descrição'}
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={automation.is_active}
                      onCheckedChange={(checked) => 
                        toggleAutomation.mutate({ id: automation.id, is_active: checked })
                      }
                      className="shrink-0"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground">
                      <span className="truncate">
                        <span className="hidden sm:inline">Gatilho: </span>
                        {TRIGGER_TYPE_LABELS[automation.trigger_type as TriggerType] || automation.trigger_type}
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span className="text-xs">
                        {formatDistanceToNow(new Date(automation.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(automation.id)} className="flex-1 sm:flex-none">
                        <Edit2 className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
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
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateAutomationDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onCreated={(id) => {
          setCreateDialogOpen(false);
          onEdit(id);
        }}
      />
    </div>
  );
}
