import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, MessageSquare, Clock, GitBranch, Tag, UserPlus, Zap, Play } from 'lucide-react';
import { 
  useCreateAutomation, 
  TriggerType, 
  TRIGGER_TYPE_LABELS, 
  TRIGGER_TYPE_DESCRIPTIONS 
} from '@/hooks/use-automations';

interface CreateAutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (automationId: string) => void;
}

const triggerOptions: { type: TriggerType; icon: React.ElementType }[] = [
  { type: 'message_received', icon: MessageSquare },
  { type: 'lead_created', icon: UserPlus },
  { type: 'lead_stage_changed', icon: GitBranch },
  { type: 'tag_added', icon: Tag },
  { type: 'scheduled', icon: Clock },
  { type: 'inactivity', icon: Zap },
  { type: 'manual', icon: Play },
];

export function CreateAutomationDialog({ open, onOpenChange, onCreated }: CreateAutomationDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('message_received');
  
  const createAutomation = useCreateAutomation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    try {
      const automation = await createAutomation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        trigger_type: triggerType,
      });
      
      onCreated(automation.id);
      
      // Reset form
      setName('');
      setDescription('');
      setTriggerType('message_received');
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Automação</DialogTitle>
          <DialogDescription>
            Configure o gatilho que iniciará esta automação
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da automação *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Boas-vindas para novos leads"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o objetivo desta automação..."
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <Label>Gatilho</Label>
              <RadioGroup value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
                <div className="grid gap-2">
                  {triggerOptions.map(({ type, icon: Icon }) => (
                    <div 
                      key={type}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        triggerType === type 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setTriggerType(type)}
                    >
                      <RadioGroupItem value={type} id={type} />
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <Label htmlFor={type} className="font-medium cursor-pointer">
                          {TRIGGER_TYPE_LABELS[type]}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {TRIGGER_TYPE_DESCRIPTIONS[type]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || createAutomation.isPending}>
              {createAutomation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar e Configurar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
