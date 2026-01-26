import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateStageAutomation, useUpdateStageAutomation, AutomationType, AUTOMATION_TYPE_LABELS, AUTOMATION_TYPE_DESCRIPTIONS, DEAL_STATUS_LABELS, StageAutomation } from "@/hooks/use-stage-automations";
import { useStages } from "@/hooks/use-stages";
import { useOrganizationUsers } from "@/hooks/use-users";
import { Loader2, Info, User, Trophy, XCircle, Circle } from "lucide-react";

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
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [dealStatus, setDealStatus] = useState<'open' | 'won' | 'lost'>('won');

  const { data: stages } = useStages(pipelineId);
  const { data: users } = useOrganizationUsers();
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
      // Parse action_config for new fields
      const config = automation.action_config as Record<string, unknown> || {};
      setTargetUserId((config.target_user_id as string) || '');
      setDealStatus((config.deal_status as 'open' | 'won' | 'lost') || 'won');
    }
  }, [automation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      stage_id: stageId,
      automation_type: automationType,
      trigger_days: (automationType === 'move_after_inactivity' || automationType === 'alert_on_inactivity') ? triggerDays : null,
      target_stage_id: automationType === 'move_after_inactivity' ? targetStageId : null,
      whatsapp_template: automationType === 'send_whatsapp_on_enter' ? whatsappTemplate : null,
      alert_message: automationType === 'alert_on_inactivity' ? alertMessage : null,
      // Pass direct values - hook will build action_config
      deal_status: automationType === 'change_deal_status_on_enter' ? dealStatus : undefined,
      target_user_id: automationType === 'change_assignee_on_enter' ? targetUserId : undefined,
    };

    if (isEditing) {
      await updateAutomation.mutateAsync({ id: automation.id, ...data } as any);
    } else {
      await createAutomation.mutateAsync(data as any);
    }

    onSuccess?.();
  };

  const getDealStatusIcon = (status: string) => {
    switch (status) {
      case 'won': return <Trophy className="h-4 w-4 text-green-500" />;
      case 'lost': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Circle className="h-4 w-4 text-blue-500" />;
    }
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

      {/* Target User - for change assignee automation */}
      {automationType === 'change_assignee_on_enter' && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Novo Responsável
          </Label>
          <Select value={targetUserId} onValueChange={setTargetUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o responsável" />
            </SelectTrigger>
            <SelectContent>
              {users?.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            O lead será atribuído automaticamente a este usuário ao entrar no estágio
          </p>
        </div>
      )}

      {/* Deal Status - for change status automation */}
      {automationType === 'change_deal_status_on_enter' && (
        <div className="space-y-2">
          <Label>Novo Status do Deal</Label>
          <Select value={dealStatus} onValueChange={(v) => setDealStatus(v as 'open' | 'won' | 'lost')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4 text-blue-500" />
                  Aberto
                </div>
              </SelectItem>
              <SelectItem value="won">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-green-500" />
                  Ganho
                </div>
              </SelectItem>
              <SelectItem value="lost">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Perdido
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            O status do deal será alterado automaticamente ao entrar neste estágio
          </p>
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