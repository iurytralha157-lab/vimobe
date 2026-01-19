import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePipelines, useStages } from "@/hooks/use-stages";
import { useUsers } from "@/hooks/use-users";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Zap, 
  Play, 
  Bell, 
  MessageSquare, 
  ArrowRight, 
  User,
  Clock,
  Plus,
  Trash2,
} from "lucide-react";

interface Automation {
  id?: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: any;
  is_active: boolean | null;
}

interface AutomationEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automation?: Automation | null;
}

interface AutomationAction {
  type: string;
  config: Record<string, any>;
}

const triggerTypes = [
  { value: "on_enter", label: "Ao entrar no estágio", icon: Play },
  { value: "on_exit", label: "Ao sair do estágio", icon: ArrowRight },
  { value: "on_time", label: "Tempo no estágio", icon: Clock },
  { value: "lead_created", label: "Lead criado", icon: Zap },
];

const actionTypes = [
  { value: "send_notification", label: "Enviar notificação", icon: Bell },
  { value: "send_whatsapp", label: "Enviar WhatsApp", icon: MessageSquare },
  { value: "move_stage", label: "Mover para estágio", icon: ArrowRight },
  { value: "assign_user", label: "Atribuir usuário", icon: User },
];

export function AutomationEditor({ open, onOpenChange, automation }: AutomationEditorProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: pipelines } = usePipelines();
  const { data: users } = useUsers();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("on_enter");
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [timeHours, setTimeHours] = useState("24");
  const [actions, setActions] = useState<AutomationAction[]>([]);

  const { data: stages } = useStages(selectedPipeline);

  useEffect(() => {
    if (automation) {
      setName(automation.name);
      setDescription(automation.description || "");
      setTriggerType(automation.trigger_type);
      
      if (automation.trigger_config) {
        setSelectedPipeline(automation.trigger_config.pipeline_id || "");
        setSelectedStage(automation.trigger_config.stage_id || "");
        setTimeHours(automation.trigger_config.hours?.toString() || "24");
        setActions(automation.trigger_config.actions || []);
      }
    } else {
      resetForm();
    }
  }, [automation, open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setTriggerType("on_enter");
    setSelectedPipeline("");
    setSelectedStage("");
    setTimeHours("24");
    setActions([]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const triggerConfig = {
        pipeline_id: selectedPipeline,
        stage_id: selectedStage,
        hours: triggerType === "on_time" ? parseInt(timeHours) : undefined,
        actions: actions.map((a) => ({ type: a.type, config: a.config })),
      };

      const payload = {
        name,
        description: description || null,
        trigger_type: triggerType,
        trigger_config: triggerConfig as any,
        organization_id: profile!.organization_id,
        is_active: automation?.is_active ?? true,
      };

      if (automation?.id) {
        const { error } = await supabase
          .from("automations")
          .update(payload as any)
          .eq("id", automation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("automations")
          .insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast.success(automation?.id ? "Automação atualizada" : "Automação criada");
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  const addAction = () => {
    setActions([...actions, { type: "send_notification", config: {} }]);
  };

  const updateAction = (index: number, updates: Partial<AutomationAction>) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], ...updates };
    setActions(newActions);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const renderActionConfig = (action: AutomationAction, index: number) => {
    switch (action.type) {
      case "send_notification":
        return (
          <div className="space-y-2">
            <Label>Título da notificação</Label>
            <Input
              value={action.config.title || ""}
              onChange={(e) =>
                updateAction(index, { config: { ...action.config, title: e.target.value } })
              }
              placeholder="Título..."
            />
            <Label>Mensagem</Label>
            <Textarea
              value={action.config.message || ""}
              onChange={(e) =>
                updateAction(index, { config: { ...action.config, message: e.target.value } })
              }
              placeholder="Mensagem da notificação..."
            />
          </div>
        );

      case "send_whatsapp":
        return (
          <div className="space-y-2">
            <Label>Template da mensagem</Label>
            <Textarea
              value={action.config.template || ""}
              onChange={(e) =>
                updateAction(index, { config: { ...action.config, template: e.target.value } })
              }
              placeholder="Use {nome}, {email} para variáveis..."
            />
          </div>
        );

      case "move_stage":
        return (
          <div className="space-y-2">
            <Label>Estágio destino</Label>
            <Select
              value={action.config.stage_id || ""}
              onValueChange={(value) =>
                updateAction(index, { config: { ...action.config, stage_id: value } })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o estágio" />
              </SelectTrigger>
              <SelectContent>
                {stages?.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "assign_user":
        return (
          <div className="space-y-2">
            <Label>Usuário</Label>
            <Select
              value={action.config.user_id || ""}
              onValueChange={(value) =>
                updateAction(index, { config: { ...action.config, user_id: value } })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o usuário" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {automation?.id ? "Editar Automação" : "Nova Automação"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label>Nome da automação</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Notificar quando lead entrar em negociação"
              />
            </div>

            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o que esta automação faz..."
              />
            </div>
          </div>

          <Separator />

          {/* Trigger */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Gatilho
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Quando executar</Label>
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(triggerType === "on_enter" || triggerType === "on_exit" || triggerType === "on_time") && (
                <>
                  <div>
                    <Label>Pipeline</Label>
                    <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o pipeline" />
                      </SelectTrigger>
                      <SelectContent>
                        {pipelines?.map((pipeline) => (
                          <SelectItem key={pipeline.id} value={pipeline.id}>
                            {pipeline.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedPipeline && (
                    <div>
                      <Label>Estágio</Label>
                      <Select value={selectedStage} onValueChange={setSelectedStage}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o estágio" />
                        </SelectTrigger>
                        <SelectContent>
                          {stages?.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {triggerType === "on_time" && (
                    <div>
                      <Label>Horas no estágio</Label>
                      <Input
                        type="number"
                        value={timeHours}
                        onChange={(e) => setTimeHours(e.target.value)}
                        min="1"
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Ações
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addAction}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar ação
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {actions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma ação configurada. Adicione uma ação acima.
                </p>
              ) : (
                actions.map((action, index) => (
                  <Card key={index} className="border-dashed">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <Label>Tipo de ação</Label>
                            <Select
                              value={action.type}
                              onValueChange={(value) =>
                                updateAction(index, { type: value, config: {} })
                              }
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {actionTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    <div className="flex items-center gap-2">
                                      <type.icon className="h-4 w-4" />
                                      {type.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {renderActionConfig(action, index)}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAction(index)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => saveMutation.mutate()}
            disabled={!name || saveMutation.isPending}
          >
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
