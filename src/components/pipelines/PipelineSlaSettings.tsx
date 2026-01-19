import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePipelineSlaSettings, useUpsertPipelineSlaSettings } from "@/hooks/use-pipeline-sla-settings";
import { Loader2, Clock, AlertTriangle, Bell } from "lucide-react";

interface PipelineSlaSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  pipelineName: string;
}

export function PipelineSlaSettings({
  open,
  onOpenChange,
  pipelineId,
  pipelineName,
}: PipelineSlaSettingsProps) {
  const { data: settings, isLoading } = usePipelineSlaSettings(pipelineId);
  const upsertMutation = useUpsertPipelineSlaSettings();

  // Form state
  const [isActive, setIsActive] = useState(true);
  const [targetMinutes, setTargetMinutes] = useState(5);
  const [warnMinutes, setWarnMinutes] = useState(3);
  const [overdueMinutes, setOverdueMinutes] = useState(5);
  const [notifyAssignee, setNotifyAssignee] = useState(true);
  const [notifyManager, setNotifyManager] = useState(true);

  // Load existing settings
  useEffect(() => {
    if (settings) {
      setIsActive(settings.is_active);
      setTargetMinutes(Math.round(settings.first_response_target_seconds / 60));
      setWarnMinutes(Math.round(settings.warn_after_seconds / 60));
      setOverdueMinutes(Math.round(settings.overdue_after_seconds / 60));
      setNotifyAssignee(settings.notify_assignee);
      setNotifyManager(settings.notify_manager);
    }
  }, [settings]);

  const handleSave = () => {
    upsertMutation.mutate(
      {
        pipeline_id: pipelineId,
        is_active: isActive,
        first_response_target_seconds: targetMinutes * 60,
        warn_after_seconds: warnMinutes * 60,
        overdue_after_seconds: overdueMinutes * 60,
        notify_assignee: notifyAssignee,
        notify_manager: notifyManager,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Configurações de SLA
          </DialogTitle>
          <DialogDescription>
            Configure os alertas de tempo de resposta para o pipeline "{pipelineName}"
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Enable SLA */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sla-active" className="text-base font-medium">
                  SLA Ativo
                </Label>
                <p className="text-sm text-muted-foreground">
                  Ativar monitoramento de tempo de resposta
                </p>
              </div>
              <Switch
                id="sla-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            {isActive && (
              <>
                {/* Target Time */}
                <div className="space-y-2">
                  <Label htmlFor="target-time" className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Meta de primeira resposta
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="target-time"
                      type="number"
                      min={1}
                      max={1440}
                      value={targetMinutes}
                      onChange={(e) => setTargetMinutes(parseInt(e.target.value) || 5)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">minutos</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tempo ideal para primeira resposta ao lead
                  </p>
                </div>

                {/* Warning Time */}
                <div className="space-y-2">
                  <Label htmlFor="warn-time" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Alertar após
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="warn-time"
                      type="number"
                      min={1}
                      max={1440}
                      value={warnMinutes}
                      onChange={(e) => setWarnMinutes(parseInt(e.target.value) || 3)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">minutos</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tempo para enviar alerta de warning
                  </p>
                </div>

                {/* Overdue Time */}
                <div className="space-y-2">
                  <Label htmlFor="overdue-time" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Marcar atrasado após
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="overdue-time"
                      type="number"
                      min={1}
                      max={1440}
                      value={overdueMinutes}
                      onChange={(e) => setOverdueMinutes(parseInt(e.target.value) || 5)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">minutos</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tempo para marcar como SLA estourado
                  </p>
                </div>

                {/* Notifications */}
                <div className="space-y-4 pt-4 border-t">
                  <Label className="flex items-center gap-2 text-base font-medium">
                    <Bell className="h-4 w-4" />
                    Notificações
                  </Label>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notify-assignee" className="font-normal">
                        Notificar corretor
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Enviar notificação para o responsável pelo lead
                      </p>
                    </div>
                    <Switch
                      id="notify-assignee"
                      checked={notifyAssignee}
                      onCheckedChange={setNotifyAssignee}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notify-manager" className="font-normal">
                        Notificar gestor
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Enviar notificação para admins quando SLA estourar
                      </p>
                    </div>
                    <Switch
                      id="notify-manager"
                      checked={notifyManager}
                      onCheckedChange={setNotifyManager}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={upsertMutation.isPending}>
            {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
