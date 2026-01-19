import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateStageAutomation, useUpdateStageAutomation, AutomationType, AUTOMATION_TYPE_LABELS, AUTOMATION_TYPE_DESCRIPTIONS, StageAutomation } from "@/hooks/use-stage-automations";
import { useStages } from "@/hooks/use-stages";
import { usePipelines } from "@/hooks/use-stages";
import { Loader2, Info } from "lucide-react";

interface AutomationFormProps {
  stageId: string;
  pipelineId: string;
  automation?: StageAutomation | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AutomationForm({ stageId, pipelineId, automation, onSuccess, onCancel }: AutomationFormProps) {
  const [automationType, setAutomationType] = useState<AutomationType>('move_after_inactivity');
  const [triggerDays, setTriggerDays] = useState<number>(7);
  const [targetStageId, setTargetStageId] = useState<string>('');
  const [whatsappTemplate, setWhatsappTemplate] = useState<string>('');
  const [alertMessage, setAlertMessage] = useState<string>('');

  const { data: stages } = useStages(pipelineId);
  const createAutomation = useCreateStageAutomation();
  const updateAutomation = useUpdateStageAutomation();

  const isEditing = !!automation;
  const isLoading = createAutomation.isPending || updateAutomation.isPending;

  // Filter out current stage from target options
  const targetStageOptions = stages?.filter(s => s.id !== stageId) || [];

  useEffect(() => {
    if (automation) {
      setAutomationType(automation.automation_type as AutomationType);
      setTriggerDays(automation.trigger_days || 7);
      setTargetStageId(automation.target_stage_id || '');
      setWhatsappTemplate(automation.whatsapp_template || '');
      setAlertMessage(automation.alert_message || '');
    }
  }, [automation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      stage_id: stageId,
      automation_type: automationType,
      trigger_days: automationType !== 'send_whatsapp_on_enter' ? triggerDays : null,
      target_stage_id: automationType === 'move_after_inactivity' ? targetStageId : null,
      whatsapp_template: automationType === 'send_whatsapp_on_enter' ? whatsappTemplate : null,
      alert_message: automationType === 'alert_on_inactivity' ? alertMessage : null,
    };

    if (isEditing) {
      await updateAutomation.mutateAsync({ id: automation.id, ...data });
    } else {
      await createAutomation.mutateAsync(data);
    }

    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de Automação</Label>
        <Select value={automationType} onValueChange={(v) => setAutomationType(v as AutomationType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(AUTOMATION_TYPE_LABELS) as AutomationType[]).map(type => (
              <SelectItem key={type} value={type}>
                {AUTOMATION_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" />
          {AUTOMATION_TYPE_DESCRIPTIONS[automationType]}
        </p>
      </div>

      {/* Trigger Days - for inactivity-based automations */}
      {(automationType === 'move_after_inactivity' || automationType === 'alert_on_inactivity') && (
        <div className="space-y-2">
          <Label>Dias de Inatividade</Label>
          <Input
            type="number"
            min={1}
            max={365}
            value={triggerDays}
            onChange={(e) => setTriggerDays(parseInt(e.target.value) || 1)}
          />
          <p className="text-xs text-muted-foreground">
            Número de dias sem atividade para disparar a automação
          </p>
        </div>
      )}

      {/* Target Stage - for move automation */}
      {automationType === 'move_after_inactivity' && (
        <div className="space-y-2">
          <Label>Estágio de Destino</Label>
          <Select value={targetStageId} onValueChange={setTargetStageId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o estágio" />
            </SelectTrigger>
            <SelectContent>
              {targetStageOptions.map(stage => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* WhatsApp Template */}
      {automationType === 'send_whatsapp_on_enter' && (
        <div className="space-y-2">
          <Label>Mensagem do WhatsApp</Label>
          <Textarea
            value={whatsappTemplate}
            onChange={(e) => setWhatsappTemplate(e.target.value)}
            placeholder="Olá {{lead_name}}, você foi movido para o estágio {{stage_name}}..."
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Variáveis disponíveis: {"{{lead_name}}"}, {"{{stage_name}}"}, {"{{broker_name}}"}
          </p>
        </div>
      )}

      {/* Alert Message */}
      {automationType === 'alert_on_inactivity' && (
        <div className="space-y-2">
          <Label>Mensagem do Alerta</Label>
          <Input
            value={alertMessage}
            onChange={(e) => setAlertMessage(e.target.value)}
            placeholder="Lead está há X dias sem atendimento"
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? 'Salvar' : 'Criar Automação'}
        </Button>
      </div>
    </form>
  );
}
