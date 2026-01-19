import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Edit2, Zap } from "lucide-react";
import { useStageAutomations, useUpdateStageAutomation, useDeleteStageAutomation, StageAutomation } from "@/hooks/use-stage-automations";

interface AutomationsListProps {
  stageId: string;
  pipelineId: string;
  onEdit: (automation: StageAutomation) => void;
}

const triggerLabels: Record<string, string> = {
  on_enter: "Ao entrar",
  on_exit: "Ao sair",
  on_time: "Por tempo",
};

const actionLabels: Record<string, string> = {
  send_notification: "Notificação",
  send_email: "Email",
  send_whatsapp: "WhatsApp",
  assign_user: "Atribuir",
  add_tag: "Tag",
  create_task: "Tarefa",
};

export function AutomationsList({ stageId, pipelineId, onEdit }: AutomationsListProps) {
  const { data: automations = [], isLoading } = useStageAutomations(stageId);
  const updateMutation = useUpdateStageAutomation();
  const deleteMutation = useDeleteStageAutomation();

  const handleToggle = (automation: StageAutomation, isActive: boolean) => {
    updateMutation.mutate({
      id: automation.id,
      stage_id: automation.stage_id,
      is_active: isActive,
    });
  };

  const handleDelete = (automationId: string) => {
    deleteMutation.mutate({ id: automationId, stageId });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Carregando automações...
      </div>
    );
  }

  if (automations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
        <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhuma automação configurada</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {automations.map((automation) => (
        <div
          key={automation.id}
          className="flex items-center justify-between p-3 border rounded-lg bg-card"
        >
          <div className="flex items-center gap-3">
            <Switch
              checked={automation.is_active}
              onCheckedChange={(checked) => handleToggle(automation, checked)}
            />
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {triggerLabels[automation.trigger_type] || automation.trigger_type}
                </Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className="text-xs">
                  {actionLabels[automation.action_type] || automation.action_type}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(automation)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(automation.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
