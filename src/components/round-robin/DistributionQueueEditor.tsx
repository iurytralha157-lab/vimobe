import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ChevronDown, 
  Plus, 
  X, 
  Trash2, 
  Loader2, 
  Save,
  Settings2,
  Clock,
  Users,
  Filter,
  AlertCircle,
  Building2,
  UsersRound,
  MessageSquare,
  Globe,
  Webhook
} from 'lucide-react';
import { usePipelines, useStages } from '@/hooks/use-stages';
import { useTeams } from '@/hooks/use-teams';
import { useOrganizationUsers } from '@/hooks/use-users';
import { useTags } from '@/hooks/use-tags';
import { useProperties } from '@/hooks/use-properties';
import { useServicePlans } from '@/hooks/use-service-plans';
import { useWebhooks } from '@/hooks/use-webhooks';
import { useWhatsAppSessions } from '@/hooks/use-whatsapp-sessions';
import { useMetaFormConfigs } from '@/hooks/use-meta-forms';
import { useMetaIntegrations } from '@/hooks/use-meta-integration';
import { cn } from '@/lib/utils';

interface QueueSettings {
  enable_redistribution?: boolean;
  preserve_position?: boolean;
  require_checkin?: boolean;
  reentry_behavior?: 'redistribute' | 'keep_assignee';
}

interface ScheduleDay {
  day: number;
  enabled: boolean;
  start: string;
  end: string;
}

interface RuleCondition {
  id: string;
  type: 'source' | 'webhook' | 'whatsapp_session' | 'meta_form' | 'website_category' | 'campaign_contains' | 'tag' | 'city' | 'interest_property' | 'interest_plan';
  values: string[];
}

interface QueueMember {
  id?: string;
  type: 'user' | 'team';
  entityId: string;
  weight: number;
  name?: string;
}

interface QueueFormData {
  name: string;
  strategy: 'simple' | 'weighted';
  target_pipeline_id: string;
  target_stage_id: string;
  is_active: boolean;
  settings: QueueSettings;
  schedule: ScheduleDay[];
  conditions: RuleCondition[];
  members: QueueMember[];
}

interface DistributionQueueEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queue?: any; // existing queue for edit mode
  onSave: (data: QueueFormData) => Promise<void>;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const SOURCE_OPTIONS = [
  { value: 'meta_ads', label: 'Meta Ads' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'website', label: 'Website' },
];

const CONDITION_TYPES = [
  { value: 'source', label: 'Fonte (genérica)', icon: '🌐' },
  { value: 'webhook', label: 'Webhook Específico', icon: '🔗' },
  { value: 'whatsapp_session', label: 'Conexão WhatsApp', icon: '💬' },
  { value: 'meta_form', label: 'Formulário Meta', icon: '📝' },
  { value: 'website_category', label: 'Categoria do Site', icon: '🏷️' },
  { value: 'campaign_contains', label: 'Nome da Campanha (contém)', icon: '📣' },
  { value: 'tag', label: 'Tag', icon: '🏷️' },
  { value: 'city', label: 'Cidade', icon: '📍' },
  { value: 'interest_property', label: 'Interesse em Imóvel', icon: '🏠' },
  { value: 'interest_plan', label: 'Interesse em Plano', icon: '📋' },
];

const WEBSITE_CATEGORY_OPTIONS = [
  { value: 'venda', label: 'Venda' },
  { value: 'locacao', label: 'Locação' },
  { value: 'lancamento', label: 'Lançamento' },
];

const defaultSchedule: ScheduleDay[] = DAYS_OF_WEEK.map(d => ({
  day: d.value,
  enabled: d.value >= 1 && d.value <= 5, // seg-sex enabled by default
  start: '08:00',
  end: '18:00',
}));

export function DistributionQueueEditor({ 
  open, 
  onOpenChange, 
  queue, 
  onSave 
}: DistributionQueueEditorProps) {
  const { data: pipelines = [] } = usePipelines();
  const { data: teams = [] } = useTeams();
  const { data: users = [] } = useOrganizationUsers();
  const { data: tags = [] } = useTags();
  const { data: properties = [] } = useProperties();
  const { data: plans = [] } = useServicePlans();
  const { data: webhooks = [] } = useWebhooks();
  const { data: whatsappSessions = [] } = useWhatsAppSessions();
  const { data: metaIntegrations = [] } = useMetaIntegrations();
  const activeMetaIntegration = metaIntegrations.find(i => i.is_connected);
  const { data: metaFormConfigs = [] } = useMetaFormConfigs(activeMetaIntegration?.id);
  
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(['basic', 'rules', 'members']);
  
  const [formData, setFormData] = useState<QueueFormData>({
    name: '',
    strategy: 'simple',
    target_pipeline_id: '',
    target_stage_id: '',
    is_active: true,
    settings: {
      enable_redistribution: false,
      preserve_position: true,
      require_checkin: false,
    },
    schedule: defaultSchedule,
    conditions: [],
    members: [],
  });

  // Get stages for selected pipeline
  const { data: stages = [] } = useStages(formData.target_pipeline_id || undefined);

  // Initialize form when queue changes
  useEffect(() => {
    if (queue) {
      // Parse existing queue data - rules
      const existingConditions: RuleCondition[] = (queue.rules || []).map((rule: any) => {
        // Try to parse from match_type and match_value (stored format)
        const matchType = rule.match_type as RuleCondition['type'];
        const matchValueStr = rule.match_value || '';
        
        // Parse values based on type
        let values: string[] = [];
        if (matchValueStr) {
          // Some values are comma-separated
          values = matchValueStr.split(',').map((v: string) => v.trim()).filter(Boolean);
        }
        
        return {
          id: rule.id,
          type: matchType,
          values,
        };
      });

      // Parse existing members - group by team_id to avoid duplicates
      const membersMap = new Map<string, QueueMember>();
      
      for (const m of (queue.members || [])) {
        if (m.team_id) {
          // It's a team member - group by team_id
          const key = `team_${m.team_id}`;
          if (!membersMap.has(key)) {
            const team = teams.find(t => t.id === m.team_id);
            membersMap.set(key, {
              id: m.id,
              type: 'team',
              entityId: m.team_id,
              weight: m.weight || 10,
              name: team?.name || 'Equipe',
            });
          }
        } else {
          // Individual user
          const key = `user_${m.user_id}`;
          if (!membersMap.has(key)) {
            membersMap.set(key, {
              id: m.id,
              type: 'user',
              entityId: m.user_id,
              weight: m.weight || 10,
              name: m.user?.name || 'Usuário',
            });
          }
        }
      }
      
      const existingMembers = Array.from(membersMap.values());

      setFormData({
        name: queue.name || '',
        strategy: queue.strategy || 'simple',
        target_pipeline_id: queue.target_pipeline_id || '',
        target_stage_id: queue.target_stage_id || '',
        is_active: queue.is_active ?? true,
        settings: queue.settings || {},
        schedule: queue.settings?.schedule || defaultSchedule,
        conditions: existingConditions,
        members: existingMembers,
      });
    } else {
      // Reset for new queue
      setFormData({
        name: '',
        strategy: 'simple',
        target_pipeline_id: '',
        target_stage_id: '',
        is_active: true,
        settings: {},
        schedule: defaultSchedule,
        conditions: [],
        members: [],
      });
    }
  }, [queue, open, teams]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        { id: crypto.randomUUID(), type: 'source', values: [] }
      ],
    }));
  };

  const updateCondition = (id: string, updates: Partial<RuleCondition>) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => 
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  };

  const removeCondition = (id: string) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== id),
    }));
  };

  const addMember = (type: 'user' | 'team', entityId: string, name: string) => {
    if (formData.members.some(m => m.type === type && m.entityId === entityId)) return;
    
    setFormData(prev => ({
      ...prev,
      members: [...prev.members, { type, entityId, weight: 10, name }],
    }));
  };

  const updateMemberWeight = (entityId: string, weight: number) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.map(m => 
        m.entityId === entityId ? { ...m, weight: Math.max(1, weight) } : m
      ),
    }));
  };

  const removeMember = (entityId: string) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(m => m.entityId !== entityId),
    }));
  };

  const updateScheduleDay = (day: number, updates: Partial<ScheduleDay>) => {
    setFormData(prev => ({
      ...prev,
      schedule: prev.schedule.map(s => 
        s.day === day ? { ...s, ...updates } : s
      ),
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    
    setSaving(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const totalWeight = formData.members.reduce((sum, m) => sum + m.weight, 0);
  const is24_7 = formData.schedule.every(s => s.enabled && s.start === '00:00' && s.end === '23:59');

  const renderConditionValueSelector = (condition: RuleCondition) => {
    switch (condition.type) {
      case 'source':
        return (
          <div className="flex flex-wrap gap-1">
            {SOURCE_OPTIONS.map(opt => (
              <Badge
                key={opt.value}
                variant={condition.values.includes(opt.value) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => {
                  const newValues = condition.values.includes(opt.value)
                    ? condition.values.filter(v => v !== opt.value)
                    : [...condition.values, opt.value];
                  updateCondition(condition.id, { values: newValues });
                }}
              >
                {opt.label}
              </Badge>
            ))}
          </div>
        );

      case 'webhook':
        return (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Selecione os webhooks que ativarão esta fila:</p>
            <div className="flex flex-wrap gap-1">
              {webhooks.filter(w => w.type === 'incoming').map(wh => (
                <Badge
                  key={wh.id}
                  variant={condition.values.includes(wh.id) ? 'default' : 'outline'}
                  className="cursor-pointer gap-1"
                  onClick={() => {
                    const newValues = condition.values.includes(wh.id)
                      ? condition.values.filter(v => v !== wh.id)
                      : [...condition.values, wh.id];
                    updateCondition(condition.id, { values: newValues });
                  }}
                >
                  <Webhook className="h-3 w-3" />
                  {wh.name}
                </Badge>
              ))}
              {webhooks.filter(w => w.type === 'incoming').length === 0 && (
                <span className="text-sm text-muted-foreground italic">Nenhum webhook de entrada configurado</span>
              )}
            </div>
          </div>
        );

      case 'whatsapp_session':
        return (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Selecione as conexões WhatsApp:</p>
            <div className="flex flex-wrap gap-1">
              {whatsappSessions.filter(s => s.is_active).map(session => (
                <Badge
                  key={session.id}
                  variant={condition.values.includes(session.id) ? 'default' : 'outline'}
                  className="cursor-pointer gap-1"
                  onClick={() => {
                    const newValues = condition.values.includes(session.id)
                      ? condition.values.filter(v => v !== session.id)
                      : [...condition.values, session.id];
                    updateCondition(condition.id, { values: newValues });
                  }}
                >
                  <MessageSquare className="h-3 w-3" />
                  {session.display_name || session.phone_number || session.instance_name}
                </Badge>
              ))}
              {whatsappSessions.filter(s => s.is_active).length === 0 && (
                <span className="text-sm text-muted-foreground italic">Nenhuma conexão WhatsApp ativa</span>
              )}
            </div>
          </div>
        );

      case 'meta_form':
        return (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Selecione os formulários Meta (configurados ou não):</p>
            <div className="flex flex-wrap gap-1">
              {metaFormConfigs.map(form => {
                const isConfigured = form.is_active;
                return (
                  <Badge
                    key={form.form_id}
                    variant={condition.values.includes(form.form_id) ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer gap-1",
                      !isConfigured && "border-dashed"
                    )}
                    onClick={() => {
                      const newValues = condition.values.includes(form.form_id)
                        ? condition.values.filter(v => v !== form.form_id)
                        : [...condition.values, form.form_id];
                      updateCondition(condition.id, { values: newValues });
                    }}
                  >
                    {isConfigured ? '✓' : '⚠️'} {form.form_name || form.form_id}
                  </Badge>
                );
              })}
              {metaFormConfigs.length === 0 && (
                <span className="text-sm text-muted-foreground italic">
                  {activeMetaIntegration ? (
                    <span>
                      Nenhum formulário.{' '}
                      <a href="/settings/integrations/meta" className="text-primary underline">Configurar Meta</a>
                    </span>
                  ) : (
                    <span>
                      Meta Ads não conectado.{' '}
                      <a href="/settings/integrations/meta" className="text-primary underline">Conectar</a>
                    </span>
                  )}
                </span>
              )}
            </div>
            {metaFormConfigs.some(f => !f.is_active) && (
              <p className="text-xs text-muted-foreground">
                ⚠️ = Formulário sem mapeamento de campos.{' '}
                <a href="/settings/integrations/meta" className="text-primary underline">Configurar</a>
              </p>
            )}
          </div>
        );

      case 'website_category':
        return (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Selecione as categorias de imóvel do site:</p>
            <div className="flex flex-wrap gap-1">
              {WEBSITE_CATEGORY_OPTIONS.map(opt => (
                <Badge
                  key={opt.value}
                  variant={condition.values.includes(opt.value) ? 'default' : 'outline'}
                  className="cursor-pointer gap-1"
                  onClick={() => {
                    const newValues = condition.values.includes(opt.value)
                      ? condition.values.filter(v => v !== opt.value)
                      : [...condition.values, opt.value];
                    updateCondition(condition.id, { values: newValues });
                  }}
                >
                  <Globe className="h-3 w-3" />
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>
        );
      
      case 'campaign_contains':
        return (
          <Input
            placeholder="Digite parte do nome da campanha..."
            value={condition.values[0] || ''}
            onChange={e => updateCondition(condition.id, { values: [e.target.value] })}
          />
        );
      
      case 'tag':
        return (
          <div className="flex flex-wrap gap-1">
            {tags.map(tag => (
              <Badge
                key={tag.id}
                variant={condition.values.includes(tag.id) ? 'default' : 'outline'}
                className="cursor-pointer"
                style={condition.values.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                onClick={() => {
                  const newValues = condition.values.includes(tag.id)
                    ? condition.values.filter(v => v !== tag.id)
                    : [...condition.values, tag.id];
                  updateCondition(condition.id, { values: newValues });
                }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        );
      
      case 'city':
        return (
          <Input
            placeholder="Ex: São Paulo, Campinas"
            value={condition.values.join(', ')}
            onChange={e => updateCondition(condition.id, { 
              values: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
            })}
          />
        );
      
      case 'interest_property':
        return (
          <Select
            value={condition.values[0] || ''}
            onValueChange={v => updateCondition(condition.id, { values: [v] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um imóvel..." />
            </SelectTrigger>
            <SelectContent>
              {properties.map(prop => (
                <SelectItem key={prop.id} value={prop.id}>
                  {prop.code} - {prop.title || prop.bairro || 'Imóvel'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'interest_plan':
        return (
          <Select
            value={condition.values[0] || ''}
            onValueChange={v => updateCondition(condition.id, { values: [v] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um plano..." />
            </SelectTrigger>
            <SelectContent>
              {plans.map(plan => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name} - R${plan.price?.toLocaleString('pt-BR')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            {queue ? 'Editar Fila de Distribuição' : 'Nova Fila de Distribuição'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Section 1: Basic Info */}
          <Collapsible open={openSections.includes('basic')} onOpenChange={() => toggleSection('basic')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                <span className="font-medium">Informações Básicas</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.includes('basic') && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 px-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Fila *</Label>
                  <Input
                    placeholder="Ex: Leads Facebook"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estratégia</Label>
                  <Select 
                    value={formData.strategy} 
                    onValueChange={v => setFormData(prev => ({ ...prev, strategy: v as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Round Robin (sequencial)</SelectItem>
                      <SelectItem value="weighted">Ponderada (por peso)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pipeline de Destino</Label>
                  <Select 
                    value={formData.target_pipeline_id || '__none__'} 
                    onValueChange={v => setFormData(prev => ({ 
                      ...prev, 
                      target_pipeline_id: v === '__none__' ? '' : v,
                      target_stage_id: ''
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum (usar padrão)</SelectItem>
                      {pipelines.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estágio Inicial</Label>
                  <Select 
                    value={formData.target_stage_id || '__none__'} 
                    onValueChange={v => setFormData(prev => ({ 
                      ...prev, 
                      target_stage_id: v === '__none__' ? '' : v 
                    }))}
                    disabled={!formData.target_pipeline_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.target_pipeline_id ? "Selecione..." : "Selecione um pipeline"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Primeiro estágio</SelectItem>
                      {stages.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: s.color }} 
                            />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Section 2: Entry Rules */}
          <Collapsible open={openSections.includes('rules')} onOpenChange={() => toggleSection('rules')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <span className="font-medium">Regras de Entrada</span>
                {formData.conditions.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {formData.conditions.length}
                  </Badge>
                )}
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.includes('rules') && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 px-1 space-y-4">
              {formData.conditions.length === 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Se nenhum critério for selecionado, qualquer lead poderá ser distribuído nesta fila!
                  </p>
                </div>
              )}

              {formData.conditions.map((condition, idx) => (
                <div key={condition.id} className="p-3 rounded-lg border space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {idx > 0 && (
                        <Badge variant="outline" className="text-xs">E TAMBÉM</Badge>
                      )}
                      <Select
                        value={condition.type}
                        onValueChange={v => updateCondition(condition.id, { 
                          type: v as RuleCondition['type'], 
                          values: [] 
                        })}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_TYPES.map(ct => (
                            <SelectItem key={ct.value} value={ct.value}>
                              <span className="mr-2">{ct.icon}</span>
                              {ct.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeCondition(condition.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {renderConditionValueSelector(condition)}
                </div>
              ))}

              <Button 
                variant="outline" 
                onClick={addCondition}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Nova Condição
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Section 3: Schedule */}
          <Collapsible open={openSections.includes('schedule')} onOpenChange={() => toggleSection('schedule')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-medium">Configurações de Horário</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.includes('schedule') && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 px-1 space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={is24_7}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData(prev => ({
                        ...prev,
                        schedule: prev.schedule.map(s => ({
                          ...s,
                          enabled: true,
                          start: '00:00',
                          end: '23:59',
                        })),
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        schedule: defaultSchedule,
                      }));
                    }
                  }}
                />
                <Label>Fila ativa todos os dias (24/7)</Label>
              </div>

              {!is24_7 && (
                <div className="space-y-2">
                  {formData.schedule.map(day => (
                    <div key={day.day} className="flex items-center gap-3">
                      <Checkbox
                        checked={day.enabled}
                        onCheckedChange={(checked) => updateScheduleDay(day.day, { enabled: !!checked })}
                      />
                      <span className="w-12 text-sm font-medium">
                        {DAYS_OF_WEEK.find(d => d.value === day.day)?.label}
                      </span>
                      <Input
                        type="time"
                        value={day.start}
                        onChange={e => updateScheduleDay(day.day, { start: e.target.value })}
                        disabled={!day.enabled}
                        className="w-28"
                      />
                      <span className="text-muted-foreground">até</span>
                      <Input
                        type="time"
                        value={day.end}
                        onChange={e => updateScheduleDay(day.day, { end: e.target.value })}
                        disabled={!day.enabled}
                        className="w-28"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={formData.settings.require_checkin || false}
                  onCheckedChange={checked => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, require_checkin: checked },
                  }))}
                />
                <Label>Usuários devem realizar Check-in?</Label>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Section 4: Members */}
          <Collapsible open={openSections.includes('members')} onOpenChange={() => toggleSection('members')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium">Usuários Ativos na Fila</span>
                {formData.members.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {formData.members.length}
                  </Badge>
                )}
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.includes('members') && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 px-1 space-y-4">
              {formData.members.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Participante</TableHead>
                        <TableHead className="text-center w-32">
                          {formData.strategy === 'weighted' ? 'Peso' : 'Ordem'}
                        </TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.members.map((member, idx) => {
                        const percentage = totalWeight > 0 
                          ? Math.round((member.weight / totalWeight) * 100) 
                          : 0;
                        
                        return (
                          <TableRow key={member.entityId}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {member.type === 'team' ? (
                                  <UsersRound className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                      {member.name?.[0] || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div>
                                  <span className="font-medium text-sm">{member.name || 'Desconhecido'}</span>
                                  {member.type === 'team' && (
                                    <Badge variant="outline" className="ml-2 text-xs">Equipe</Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {formData.strategy === 'weighted' ? (
                                <div className="flex items-center justify-center gap-2">
                                  <Input
                                    type="number"
                                    value={member.weight}
                                    onChange={e => updateMemberWeight(member.entityId, parseInt(e.target.value) || 1)}
                                    className="w-16 text-center"
                                    min={1}
                                    max={100}
                                  />
                                  <span className="text-xs text-muted-foreground w-10">
                                    ({percentage}%)
                                  </span>
                                </div>
                              ) : (
                                <div className="text-center text-muted-foreground">
                                  #{idx + 1}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeMember(member.entityId)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex gap-2">
                <Select onValueChange={v => {
                  const user = users.find(u => u.id === v);
                  if (user) addMember('user', v, user.name);
                }}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Adicionar corretor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter(u => !formData.members.some(m => m.type === 'user' && m.entityId === u.id))
                      .map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {user.name}
                          </div>
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                
                <Select onValueChange={v => {
                  const team = teams.find(t => t.id === v);
                  if (team) addMember('team', v, team.name);
                }}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Adicionar equipe..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams
                      .filter(t => !formData.members.some(m => m.type === 'team' && m.entityId === t.id))
                      .map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {team.name}
                          </div>
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Section 5: Advanced Settings */}
          <Collapsible open={openSections.includes('advanced')} onOpenChange={() => toggleSection('advanced')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                <span className="font-medium">Configurações Avançadas</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.includes('advanced') && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 px-1 space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Switch
                    checked={formData.settings.enable_redistribution || false}
                    onCheckedChange={checked => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, enable_redistribution: checked },
                    }))}
                  />
                  <div>
                    <Label>Ativar redistribuição?</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Leads não atendidos serão redistribuídos automaticamente após o tempo configurado no pipeline.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Switch
                    checked={formData.settings.preserve_position || false}
                    onCheckedChange={checked => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, preserve_position: checked },
                    }))}
                  />
                  <div>
                    <Label>Preservar posição na fila?</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Usuários temporariamente indisponíveis mantêm sua posição quando voltam.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <div className="flex items-start gap-3">
                    <Switch
                      checked={formData.settings.reentry_behavior === 'keep_assignee'}
                      onCheckedChange={checked => setFormData(prev => ({
                        ...prev,
                        settings: { 
                          ...prev.settings, 
                          reentry_behavior: checked ? 'keep_assignee' : 'redistribute' 
                        },
                      }))}
                    />
                    <div>
                      <Label>Manter responsável em reentradas?</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.settings.reentry_behavior === 'keep_assignee' 
                          ? 'Quando um lead reentrar, ele continuará com o responsável anterior (sem redistribuição).'
                          : 'Quando um lead reentrar, ele será redistribuído pela fila normalmente.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formData.name.trim() || saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
