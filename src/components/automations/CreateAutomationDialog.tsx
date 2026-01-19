import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  MessageSquare, 
  Clock, 
  GitBranch, 
  Tag, 
  UserPlus, 
  Play,
  AlertCircle,
} from "lucide-react";
import { useCreateAutomation, TriggerType, TRIGGER_TYPE_LABELS, TRIGGER_TYPE_DESCRIPTIONS } from "@/hooks/use-automations";
import { cn } from "@/lib/utils";

interface CreateAutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (id: string) => void;
}

const triggerOptions: Array<{
  type: TriggerType;
  icon: typeof MessageSquare;
  color: string;
}> = [
  { type: "lead_created", icon: UserPlus, color: "text-green-600" },
  { type: "lead_stage_changed", icon: GitBranch, color: "text-blue-600" },
  { type: "message_received", icon: MessageSquare, color: "text-emerald-600" },
  { type: "tag_added", icon: Tag, color: "text-orange-600" },
  { type: "scheduled", icon: Clock, color: "text-purple-600" },
  { type: "inactivity", icon: AlertCircle, color: "text-amber-600" },
  { type: "manual", icon: Play, color: "text-gray-600" },
];

export function CreateAutomationDialog({ open, onOpenChange, onSuccess }: CreateAutomationDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType | null>(null);
  
  const createMutation = useCreateAutomation();

  const handleCreate = async () => {
    if (!name.trim() || !selectedTrigger) return;

    const result = await createMutation.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      trigger_type: selectedTrigger,
    });

    onOpenChange(false);
    resetForm();
    
    if (onSuccess && result?.id) {
      onSuccess(result.id);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedTrigger(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Automação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome da Automação</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Boas-vindas a novos leads"
            />
          </div>

          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que essa automação faz..."
              rows={2}
            />
          </div>

          <div>
            <Label className="mb-2 block">Gatilho</Label>
            <div className="grid grid-cols-2 gap-2">
              {triggerOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => setSelectedTrigger(option.type)}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                    selectedTrigger === option.type
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <option.icon className={cn("h-5 w-5 mt-0.5 shrink-0", option.color)} />
                  <div>
                    <div className="font-medium text-sm">{TRIGGER_TYPE_LABELS[option.type]}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {TRIGGER_TYPE_DESCRIPTIONS[option.type]}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || !selectedTrigger || createMutation.isPending}
          >
            {createMutation.isPending ? "Criando..." : "Criar Automação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
