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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  MessageSquare, 
  Clock, 
  Zap,
  Loader2,
  Settings,
  Edit3,
} from 'lucide-react';
import { useWhatsAppSessions } from '@/hooks/use-whatsapp-sessions';
import { useTags } from '@/hooks/use-tags';
import { useStages } from '@/hooks/use-stages';
import { useCreateAutomation, useSaveAutomationFlow, TriggerType } from '@/hooks/use-automations';
import { toast } from 'sonner';
import { FollowUpTemplate, FOLLOW_UP_TEMPLATES } from './FollowUpTemplates';

interface FollowUpWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: FollowUpTemplate | null;
  onComplete: (automationId: string) => void;
}

type Step = 'configure' | 'messages' | 'trigger' | 'review';

interface FollowUpConfig {
  name: string;
  description: string;
  sessionId: string | null;
  triggerType: TriggerType;
  triggerConfig: {
    tag_id?: string;
    to_stage_id?: string;
  };
  messages: {
    day: number;
    title: string;
    content: string;
  }[];
}

export function FollowUpWizard({ open, onOpenChange, template, onComplete }: FollowUpWizardProps) {
  const { data: sessions } = useWhatsAppSessions();
  const { data: tags } = useTags();
  const { data: stages } = useStages();
  const createAutomation = useCreateAutomation();
  const saveFlow = useSaveAutomationFlow();
  
  const [step, setStep] = useState<Step>('configure');
  const [isCreating, setIsCreating] = useState(false);
  
  const [config, setConfig] = useState<FollowUpConfig>({
    name: template?.name || 'Meu Follow-up',
    description: template?.description || '',
    sessionId: null,
    triggerType: 'tag_added',
    triggerConfig: {},
    messages: template?.messages || [
      { day: 1, title: 'Dia 1', content: 'Olá {{lead.name}}! Como posso ajudar?' },
    ],
  });

  // Reset when template changes
  useState(() => {
    if (template) {
      setConfig({
        name: template.name,
        description: template.description,
        sessionId: null,
        triggerType: 'tag_added',
        triggerConfig: {},
        messages: [...template.messages],
      });
    }
  });

  const steps: { key: Step; label: string; icon: React.ElementType }[] = [
    { key: 'configure', label: 'Configurar', icon: Settings },
    { key: 'messages', label: 'Mensagens', icon: Edit3 },
    { key: 'trigger', label: 'Gatilho', icon: Zap },
    { key: 'review', label: 'Revisar', icon: Check },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  const handleNext = () => {
    const nextStep = steps[currentStepIndex + 1];
    if (nextStep) {
      setStep(nextStep.key);
    }
  };

  const handleBack = () => {
    const prevStep = steps[currentStepIndex - 1];
    if (prevStep) {
      setStep(prevStep.key);
    }
  };

  const handleMessageChange = (index: number, field: 'title' | 'content', value: string) => {
    const newMessages = [...config.messages];
    newMessages[index] = { ...newMessages[index], [field]: value };
    setConfig({ ...config, messages: newMessages });
  };

  const addMessage = () => {
    const nextDay = config.messages.length + 1;
    setConfig({
      ...config,
      messages: [...config.messages, { day: nextDay, title: `Dia ${nextDay}`, content: '' }],
    });
  };

  const removeMessage = (index: number) => {
    if (config.messages.length <= 1) return;
    const newMessages = config.messages.filter((_, i) => i !== index).map((msg, i) => ({
      ...msg,
      day: i + 1,
      title: `Dia ${i + 1}`,
    }));
    setConfig({ ...config, messages: newMessages });
  };

  const handleCreate = async () => {
    if (!config.sessionId) {
      toast.error('Selecione uma sessão WhatsApp');
      return;
    }

    if (!config.name.trim()) {
      toast.error('Digite um nome para a automação');
      return;
    }

    setIsCreating(true);

    try {
      // 1. Create the automation
      const automation = await createAutomation.mutateAsync({
        name: config.name,
        description: config.description,
        trigger_type: config.triggerType,
        trigger_config: config.triggerConfig,
      });

      // 2. Build the nodes and connections for the follow-up flow
      const nodes: {
        id: string;
        node_type: 'trigger' | 'action' | 'delay';
        action_type: 'send_whatsapp' | 'move_lead' | 'add_tag' | 'remove_tag' | 'create_task' | 'assign_user' | 'webhook' | 'send_whatsapp_template' | 'send_email' | null;
        config: Record<string, unknown>;
        position_x: number;
        position_y: number;
      }[] = [];
      
      const connections: {
        source_node_id: string;
        target_node_id: string;
        condition_branch: string;
      }[] = [];

      // Trigger node
      const triggerNodeId = `trigger-${Date.now()}`;
      nodes.push({
        id: triggerNodeId,
        node_type: 'trigger',
        action_type: null,
        config: { 
          trigger_type: config.triggerType,
          ...config.triggerConfig,
        },
        position_x: 250,
        position_y: 50,
      });

      let previousNodeId = triggerNodeId;
      let yPosition = 150;

      // Add message + delay nodes for each day
      config.messages.forEach((msg, index) => {
        const isLastMessage = index === config.messages.length - 1;

        // Action node (send WhatsApp)
        const actionNodeId = `action-${index}-${Date.now()}`;
        nodes.push({
          id: actionNodeId,
          node_type: 'action',
          action_type: 'send_whatsapp',
          config: {
            session_id: config.sessionId,
            message: msg.content,
            actionType: 'send_whatsapp',
          },
          position_x: 250,
          position_y: yPosition,
        });

        // Connect previous node to this action
        connections.push({
          source_node_id: previousNodeId,
          target_node_id: actionNodeId,
          condition_branch: 'default',
        });

        previousNodeId = actionNodeId;
        yPosition += 120;

        // Add delay node if not last message
        if (!isLastMessage) {
          const delayNodeId = `delay-${index}-${Date.now()}`;
          nodes.push({
            id: delayNodeId,
            node_type: 'delay',
            action_type: null,
            config: {
              delay_type: 'days',
              delay_value: 1,
              nodeType: 'delay',
            },
            position_x: 250,
            position_y: yPosition,
          });

          connections.push({
            source_node_id: previousNodeId,
            target_node_id: delayNodeId,
            condition_branch: 'default',
          });

          previousNodeId = delayNodeId;
          yPosition += 120;
        }
      });

      // 3. Save the flow
      await saveFlow.mutateAsync({
        automationId: automation.id,
        nodes: nodes.map(n => ({
          id: n.id,
          automation_id: automation.id,
          node_type: n.node_type,
          action_type: n.action_type,
          config: n.config as unknown as import('@/integrations/supabase/types').Json,
          position_x: n.position_x,
          position_y: n.position_y,
        })),
        connections: connections.map(c => ({
          automation_id: automation.id,
          source_node_id: c.source_node_id,
          target_node_id: c.target_node_id,
          condition_branch: c.condition_branch,
        })),
      });

      toast.success('Follow-up criado com sucesso!');
      onComplete(automation.id);
      
    } catch (error) {
      console.error('Error creating follow-up:', error);
      toast.error('Erro ao criar follow-up');
    } finally {
      setIsCreating(false);
    }
  };

  const connectedSessions = sessions?.filter(s => s.status === 'connected') || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {template ? `Configurar ${template.name}` : 'Criar Follow-up'}
          </DialogTitle>
          <DialogDescription>
            {template 
              ? 'Personalize o template e configure sua instância WhatsApp'
              : 'Crie uma sequência de mensagens automáticas'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-2 py-4 border-b">
          {steps.map((s, index) => {
            const Icon = s.icon;
            const isActive = s.key === step;
            const isCompleted = index < currentStepIndex;
            
            return (
              <div key={s.key} className="flex items-center">
                <div 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : isCompleted 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <ScrollArea className="flex-1 px-1">
          <div className="py-4 space-y-4">
            {step === 'configure' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Follow-up</Label>
                  <Input
                    id="name"
                    value={config.name}
                    onChange={(e) => setConfig({ ...config, name: e.target.value })}
                    placeholder="Ex: Follow-up Leads Novos"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    value={config.description}
                    onChange={(e) => setConfig({ ...config, description: e.target.value })}
                    placeholder="Descreva o objetivo deste follow-up"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session">Sessão WhatsApp *</Label>
                  <Select
                    value={config.sessionId || undefined}
                    onValueChange={(v) => setConfig({ ...config, sessionId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a sessão" />
                    </SelectTrigger>
                    <SelectContent>
                      {connectedSessions.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhuma sessão conectada
                        </SelectItem>
                      ) : (
                        connectedSessions.map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            {session.display_name || session.instance_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {connectedSessions.length === 0 && (
                    <p className="text-sm text-destructive">
                      Conecte uma sessão WhatsApp antes de criar um follow-up
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 'messages' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Personalize as mensagens que serão enviadas a cada dia
                  </p>
                  <Button variant="outline" size="sm" onClick={addMessage}>
                    Adicionar dia
                  </Button>
                </div>

                <Tabs defaultValue="0" className="w-full">
                  <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
                    {config.messages.map((_, index) => (
                      <TabsTrigger 
                        key={index} 
                        value={index.toString()}
                        className="flex-1 min-w-[60px]"
                      >
                        Dia {index + 1}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {config.messages.map((msg, index) => (
                    <TabsContent key={index} value={index.toString()} className="mt-4">
                      <Card className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Dia {msg.day}
                          </Badge>
                          {config.messages.length > 1 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive"
                              onClick={() => removeMessage(index)}
                            >
                              Remover
                            </Button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Mensagem</Label>
                          <Textarea
                            value={msg.content}
                            onChange={(e) => handleMessageChange(index, 'content', e.target.value)}
                            placeholder="Digite a mensagem..."
                            rows={5}
                          />
                          <p className="text-xs text-muted-foreground">
                            Variáveis: {'{{lead.name}}'}, {'{{lead.phone}}'}, {'{{organization.name}}'}
                          </p>
                        </div>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}

            {step === 'trigger' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Escolha quando o follow-up deve ser iniciado automaticamente
                </p>

                <div className="space-y-2">
                  <Label>Iniciar quando</Label>
                  <Select
                    value={config.triggerType}
                    onValueChange={(v: TriggerType) => setConfig({ 
                      ...config, 
                      triggerType: v,
                      triggerConfig: {},
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tag_added">Tag for adicionada</SelectItem>
                      <SelectItem value="lead_created">Lead for criado</SelectItem>
                      <SelectItem value="lead_stage_changed">Lead mudar de etapa</SelectItem>
                      <SelectItem value="manual">Disparo manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.triggerType === 'tag_added' && (
                  <div className="space-y-2">
                    <Label>Tag específica</Label>
                    <Select
                      value={config.triggerConfig.tag_id || undefined}
                      onValueChange={(v) => setConfig({
                        ...config,
                        triggerConfig: { ...config.triggerConfig, tag_id: v },
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma tag" />
                      </SelectTrigger>
                      <SelectContent>
                        {tags?.map((tag) => (
                          <SelectItem key={tag.id} value={tag.id}>
                            {tag.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {config.triggerType === 'lead_stage_changed' && (
                  <div className="space-y-2">
                    <Label>Para etapa</Label>
                    <Select
                      value={config.triggerConfig.to_stage_id || undefined}
                      onValueChange={(v) => setConfig({
                        ...config,
                        triggerConfig: { ...config.triggerConfig, to_stage_id: v },
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma etapa" />
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
              </div>
            )}

            {step === 'review' && (
              <div className="space-y-4">
                <Card className="p-4 space-y-3">
                  <h4 className="font-medium">Resumo</h4>
                  
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nome:</span>
                      <span className="font-medium">{config.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mensagens:</span>
                      <span className="font-medium">{config.messages.length} dias</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gatilho:</span>
                      <span className="font-medium">
                        {config.triggerType === 'tag_added' && 'Tag adicionada'}
                        {config.triggerType === 'lead_created' && 'Lead criado'}
                        {config.triggerType === 'lead_stage_changed' && 'Mudança de etapa'}
                        {config.triggerType === 'manual' && 'Manual'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sessão:</span>
                      <span className="font-medium">
                        {connectedSessions.find(s => s.id === config.sessionId)?.display_name || 'Não selecionada'}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 space-y-3">
                  <h4 className="font-medium">Fluxo de mensagens</h4>
                  <div className="space-y-2">
                    {config.messages.map((msg, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <Badge variant="outline" className="shrink-0">
                          Dia {msg.day}
                        </Badge>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {msg.content.substring(0, 100)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <div className="flex w-full justify-between">
            <Button 
              variant="outline" 
              onClick={currentStepIndex === 0 ? () => onOpenChange(false) : handleBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {currentStepIndex === 0 ? 'Cancelar' : 'Voltar'}
            </Button>

            {step === 'review' ? (
              <Button 
                onClick={handleCreate} 
                disabled={isCreating || !config.sessionId}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Criar Follow-up
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
