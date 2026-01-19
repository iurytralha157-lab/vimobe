import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useCreateStageAutomation, useUpdateStageAutomation, StageAutomation } from "@/hooks/use-stage-automations";

interface AutomationFormProps {
  stageId: string;
  pipelineId: string;
  automation?: StageAutomation | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const triggerTypes = [
  { value: "on_enter", label: "Quando lead entrar no estágio" },
  { value: "on_exit", label: "Quando lead sair do estágio" },
  { value: "on_time", label: "Após tempo no estágio" },
];

const actionTypes = [
  { value: "send_notification", label: "Enviar notificação" },
  { value: "send_email", label: "Enviar email" },
  { value: "send_whatsapp", label: "Enviar WhatsApp" },
  { value: "assign_user", label: "Atribuir responsável" },
  { value: "add_tag", label: "Adicionar tag" },
  { value: "create_task", label: "Criar tarefa" },
];

export function AutomationForm({
  stageId,
  pipelineId,
  automation,
  onSuccess,
  onCancel,
}: AutomationFormProps) {
  const [triggerType, setTriggerType] = useState(automation?.trigger_type || "on_enter");
  const [actionType, setActionType] = useState(automation?.action_type || "send_notification");
  const [actionConfig, setActionConfig] = useState<Record<string, any>>(
    automation?.action_config || {}
  );

  const createMutation = useCreateStageAutomation();
  const updateMutation = useUpdateStageAutomation();

  const isEditing = !!automation;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async () => {
    if (isEditing && automation) {
      await updateMutation.mutateAsync({
        id: automation.id,
        stage_id: stageId,
        trigger_type: triggerType,
        action_type: actionType,
        action_config: actionConfig,
      });
    } else {
      await createMutation.mutateAsync({
        stage_id: stageId,
        trigger_type: triggerType,
        action_type: actionType,
        action_config: actionConfig,
      });
    }
    onSuccess();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Quando disparar</Label>
        <Select value={triggerType} onValueChange={setTriggerType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {triggerTypes.map((trigger) => (
              <SelectItem key={trigger.value} value={trigger.value}>
                {trigger.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {triggerType === "on_time" && (
        <div className="space-y-2">
          <Label>Tempo (minutos)</Label>
          <Input
            type="number"
            min={1}
            value={actionConfig.delay_minutes || 60}
            onChange={(e) =>
              setActionConfig({ ...actionConfig, delay_minutes: parseInt(e.target.value) })
            }
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Ação</Label>
        <Select value={actionType} onValueChange={setActionType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {actionTypes.map((action) => (
              <SelectItem key={action.value} value={action.value}>
                {action.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(actionType === "send_notification" || actionType === "send_email") && (
        <div className="space-y-2">
          <Label>Mensagem</Label>
          <Input
            value={actionConfig.message || ""}
            onChange={(e) => setActionConfig({ ...actionConfig, message: e.target.value })}
            placeholder="Mensagem da automação..."
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? "Salvar" : "Criar"}
        </Button>
      </div>
    </div>
  );
}
