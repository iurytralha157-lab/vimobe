import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { usePipelines } from "@/hooks/use-stages";
import { useTags } from "@/hooks/use-tags";
import { useUsers } from "@/hooks/use-users";
import { useWhatsAppSessions } from "@/hooks/use-whatsapp-sessions";

interface NodeConfigPanelProps {
  node: {
    id: string;
    type: string;
    data: Record<string, any>;
  };
  onClose: () => void;
  onUpdate: (nodeId: string, data: Record<string, any>) => void;
}

export function NodeConfigPanel({ node, onClose, onUpdate }: NodeConfigPanelProps) {
  const { data: pipelines = [] } = usePipelines();
  const stages = pipelines.flatMap(p => p.stages || []);
  const { data: tags = [] } = useTags();
  const { data: users = [] } = useUsers();
  const { data: sessions = [] } = useWhatsAppSessions();

  const updateField = (field: string, value: any) => {
    onUpdate(node.id, { ...node.data, [field]: value });
  };

  const renderActionConfig = () => {
    const actionType = node.data.action_type;

    switch (actionType) {
      case "send_whatsapp":
        return (
          <div className="space-y-4">
            <div>
              <Label>Sessão WhatsApp</Label>
              <Select
                value={node.data.session_id || ""}
                onValueChange={(v) => updateField("session_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma sessão" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.instance_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mensagem</Label>
              <Textarea
                value={node.data.message || ""}
                onChange={(e) => updateField("message", e.target.value)}
                placeholder="Olá {{nome}}, ..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {"{{nome}}"}, {"{{email}}"}, {"{{telefone}}"} para variáveis
              </p>
            </div>
          </div>
        );

      case "send_email":
        return (
          <div className="space-y-4">
            <div>
              <Label>Assunto</Label>
              <Input
                value={node.data.subject || ""}
                onChange={(e) => updateField("subject", e.target.value)}
                placeholder="Assunto do email"
              />
            </div>
            <div>
              <Label>Corpo</Label>
              <Textarea
                value={node.data.body || ""}
                onChange={(e) => updateField("body", e.target.value)}
                placeholder="Conteúdo do email..."
                rows={4}
              />
            </div>
          </div>
        );

      case "move_lead":
        return (
          <div className="space-y-4">
            <div>
              <Label>Mover para etapa</Label>
              <Select
                value={node.data.target_stage_id || ""}
                onValueChange={(v) => updateField("target_stage_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma etapa" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "add_tag":
      case "remove_tag":
        return (
          <div className="space-y-4">
            <div>
              <Label>{actionType === "add_tag" ? "Adicionar" : "Remover"} Tag</Label>
              <Select
                value={node.data.tag_id || ""}
                onValueChange={(v) => updateField("tag_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma tag" />
                </SelectTrigger>
                <SelectContent>
                  {tags.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "assign_user":
        return (
          <div className="space-y-4">
            <div>
              <Label>Atribuir a</Label>
              <Select
                value={node.data.user_id || ""}
                onValueChange={(v) => updateField("user_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "create_task":
        return (
          <div className="space-y-4">
            <div>
              <Label>Título da Tarefa</Label>
              <Input
                value={node.data.task_title || ""}
                onChange={(e) => updateField("task_title", e.target.value)}
                placeholder="Título da tarefa"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={node.data.task_description || ""}
                onChange={(e) => updateField("task_description", e.target.value)}
                placeholder="Descrição da tarefa..."
                rows={3}
              />
            </div>
            <div>
              <Label>Prazo (dias)</Label>
              <Input
                type="number"
                min={1}
                value={node.data.due_days || 1}
                onChange={(e) => updateField("due_days", parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case "webhook":
        return (
          <div className="space-y-4">
            <div>
              <Label>URL do Webhook</Label>
              <Input
                value={node.data.webhook_url || ""}
                onChange={(e) => updateField("webhook_url", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Método</Label>
              <Select
                value={node.data.method || "POST"}
                onValueChange={(v) => updateField("method", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground">
            Selecione o tipo de ação para configurar.
          </p>
        );
    }
  };

  const renderDelayConfig = () => (
    <div className="space-y-4">
      <div>
        <Label>Tempo de espera</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            value={node.data.delay_value || 5}
            onChange={(e) => updateField("delay_value", parseInt(e.target.value))}
            className="w-20"
          />
          <Select
            value={node.data.delay_type || "minutes"}
            onValueChange={(v) => updateField("delay_type", v)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">Minutos</SelectItem>
              <SelectItem value="hours">Horas</SelectItem>
              <SelectItem value="days">Dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderConditionConfig = () => (
    <div className="space-y-4">
      <div>
        <Label>Campo</Label>
        <Select
          value={node.data.condition_field || ""}
          onValueChange={(v) => updateField("condition_field", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um campo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stage_id">Etapa</SelectItem>
            <SelectItem value="assigned_user_id">Usuário Atribuído</SelectItem>
            <SelectItem value="has_tag">Tem Tag</SelectItem>
            <SelectItem value="email">Email preenchido</SelectItem>
            <SelectItem value="phone">Telefone preenchido</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Operador</Label>
        <Select
          value={node.data.condition_operator || "equals"}
          onValueChange={(v) => updateField("condition_operator", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equals">Igual a</SelectItem>
            <SelectItem value="not_equals">Diferente de</SelectItem>
            <SelectItem value="contains">Contém</SelectItem>
            <SelectItem value="is_empty">Está vazio</SelectItem>
            <SelectItem value="is_not_empty">Não está vazio</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!["is_empty", "is_not_empty"].includes(node.data.condition_operator) && (
        <div>
          <Label>Valor</Label>
          <Input
            value={node.data.condition_value || ""}
            onChange={(e) => updateField("condition_value", e.target.value)}
            placeholder="Valor para comparação"
          />
        </div>
      )}
    </div>
  );

  const renderTriggerConfig = () => {
    const triggerType = node.data.trigger_type;

    switch (triggerType) {
      case "scheduled":
        return (
          <div className="space-y-4">
            <div>
              <Label>Horário</Label>
              <Input
                type="time"
                value={node.data.schedule_time || "09:00"}
                onChange={(e) => updateField("schedule_time", e.target.value)}
              />
            </div>
            <div>
              <Label>Dias da semana</Label>
              <div className="flex gap-1 mt-1">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day, i) => (
                  <Button
                    key={day}
                    variant={node.data.schedule_days?.includes(i) ? "default" : "outline"}
                    size="sm"
                    className="w-10 h-8 text-xs"
                    onClick={() => {
                      const current = node.data.schedule_days || [];
                      const updated = current.includes(i)
                        ? current.filter((d: number) => d !== i)
                        : [...current, i];
                      updateField("schedule_days", updated);
                    }}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case "inactivity":
        return (
          <div className="space-y-4">
            <div>
              <Label>Dias de inatividade</Label>
              <Input
                type="number"
                min={1}
                value={node.data.inactivity_days || 7}
                onChange={(e) => updateField("inactivity_days", parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case "lead_stage_changed":
        return (
          <div className="space-y-4">
            <div>
              <Label>Quando entrar na etapa</Label>
              <Select
                value={node.data.target_stage_id || ""}
                onValueChange={(v) => updateField("target_stage_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Qualquer etapa</SelectItem>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "tag_added":
        return (
          <div className="space-y-4">
            <div>
              <Label>Quando adicionar tag</Label>
              <Select
                value={node.data.tag_id || ""}
                onValueChange={(v) => updateField("tag_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Qualquer tag</SelectItem>
                  {tags.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground">
            Este gatilho não requer configuração adicional.
          </p>
        );
    }
  };

  const getNodeTitle = () => {
    switch (node.type) {
      case "trigger":
        return "Configurar Gatilho";
      case "action":
        return "Configurar Ação";
      case "condition":
        return "Configurar Condição";
      case "delay":
        return "Configurar Delay";
      default:
        return "Configurar Nó";
    }
  };

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-background border-l shadow-lg z-10">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">{getNodeTitle()}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-60px)]">
        {node.type === "trigger" && renderTriggerConfig()}
        {node.type === "action" && renderActionConfig()}
        {node.type === "condition" && renderConditionConfig()}
        {node.type === "delay" && renderDelayConfig()}
      </div>
    </div>
  );
}
