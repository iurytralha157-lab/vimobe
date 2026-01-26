import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { Phone, Mail, MessageCircle, Building2, Loader2, CheckCircle, X, Plus, Save, User, Briefcase, MapPin, DollarSign, Clock, ChevronRight, Calendar, Target, Facebook, Instagram, Lightbulb, FileEdit, Zap, Bot, Check, Activity, ListTodo, Contact, Handshake, History, Timer, ChevronDown, Trophy, XCircle, CircleDot, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useLeadTasks, useCompleteCadenceTask } from '@/hooks/use-lead-tasks';
import { useCadenceTemplates } from '@/hooks/use-cadences';
import { useActivities } from '@/hooks/use-activities';
import { useUpdateLead, useAddLeadTag, useRemoveLeadTag } from '@/hooks/use-leads';
import { useProperties } from '@/hooks/use-properties';
import { useServicePlans } from '@/hooks/use-service-plans';
import { useScheduleEvents, ScheduleEvent } from '@/hooks/use-schedule-events';
import { useLeadMeta } from '@/hooks/use-lead-meta';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFloatingChat } from '@/contexts/FloatingChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { LeadHistory } from '@/components/leads/LeadHistory';
import { TelecomCustomerTab } from '@/components/leads/TelecomCustomerTab';
import { formatResponseTime } from '@/hooks/use-lead-timeline';
import { EventsList } from '@/components/schedule/EventsList';
import { EventForm } from '@/components/schedule/EventForm';
import { toast } from 'sonner';
import { formatPhoneForDisplay } from '@/lib/phone-utils';
import { TagSelectorPopoverContent } from '@/components/ui/tag-selector';
import { useCreateCommissionOnWon } from '@/hooks/use-create-commission';
const sourceLabels: Record<string, string> = {
  meta: 'Meta Ads',
  wordpress: 'WordPress',
  site: 'Site',
  manual: 'Manual',
  facebook: 'Facebook',
  instagram: 'Instagram',
  import: 'Importação',
  google: 'Google Ads',
  indicacao: 'Indicação',
  whatsapp: 'WhatsApp',
  outros: 'Outros'
};
const sourceIcons: Record<string, typeof MessageCircle> = {
  meta: Facebook,
  facebook: Facebook,
  instagram: Instagram,
  whatsapp: MessageCircle
};
const taskTypeLabels: Record<string, string> = {
  call: 'Ligação',
  message: 'Mensagem',
  email: 'Email',
  note: 'Observação'
};
const activityTypeLabels: Record<string, string> = {
  call: 'Ligação realizada',
  message: 'Mensagem enviada',
  email: 'Email enviado',
  note: 'Nota registrada',
  task_completed: 'Tarefa concluída',
  lead_created: 'Lead criado',
  stage_change: 'Movido de estágio',
  assignee_changed: 'Responsável alterado',
  status_change: 'Status alterado'
};
const activityTypeIcons: Record<string, typeof Phone> = {
  call: Phone,
  message: MessageCircle,
  email: Mail,
  note: Building2,
  lead_created: Plus,
  stage_change: ChevronRight,
  assignee_changed: UserCheck,
  status_change: Target
};
interface LeadDetailDialogProps {
  lead: any;
  stages: any[];
  onClose: () => void;
  allTags: any[];
  allUsers: any[];
  refetchStages: () => void;
}
export function LeadDetailDialog({
  lead,
  stages,
  onClose,
  allTags,
  allUsers,
  refetchStages
}: LeadDetailDialogProps) {
  const {
    t,
    language
  } = useLanguage();
  const isMobile = useIsMobile();
  const dateLocale = language === 'pt-BR' ? ptBR : enUS;
  const {
    openNewChat,
    openNewChatWithMessage
  } = useFloatingChat();
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [editingScheduleEvent, setEditingScheduleEvent] = useState<ScheduleEvent | null>(null);
  const [activeTab, setActiveTab] = useState('activities');
  const [stagePopoverOpen, setStagePopoverOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [roteiroDialogOpen, setRoteiroDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    cargo: '',
    empresa: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    valor_interesse: '',
    property_id: '',
    message: '',
    renda_familiar: '',
    trabalha: false,
    profissao: '',
    faixa_valor_imovel: '',
    finalidade_compra: '',
    procura_financiamento: false
  });

  // Sync edit form with lead data whenever lead changes
  useEffect(() => {
    if (lead) {
      setEditForm({
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        cargo: lead.cargo || '',
        empresa: lead.empresa || '',
        endereco: lead.endereco || '',
        numero: lead.numero || '',
        complemento: lead.complemento || '',
        bairro: lead.bairro || '',
        cidade: lead.cidade || '',
        uf: lead.uf || '',
        cep: lead.cep || '',
        valor_interesse: lead.valor_interesse?.toString() || '',
        property_id: lead.property_id || '',
        message: lead.message || '',
        renda_familiar: lead.renda_familiar || '',
        trabalha: lead.trabalha || false,
        profissao: lead.profissao || '',
        faixa_valor_imovel: lead.faixa_valor_imovel || '',
        finalidade_compra: lead.finalidade_compra || '',
        procura_financiamento: lead.procura_financiamento || false
      });
    }
  }, [lead]);
  const {
    data: leadTasks = [],
    isLoading: leadTasksLoading
  } = useLeadTasks(lead?.id);
  const {
    data: cadenceTemplates = []
  } = useCadenceTemplates();
  const {
    data: activities = [],
    isLoading: activitiesLoading
  } = useActivities(lead?.id);
  const {
    data: properties = []
  } = useProperties();
  const {
    data: scheduleEvents = [],
    isLoading: scheduleEventsLoading
  } = useScheduleEvents({
    leadId: lead?.id
  });
  const {
    data: leadMeta,
    isLoading: leadMetaLoading
  } = useLeadMeta(lead?.id);
  const completeCadenceTask = useCompleteCadenceTask();
  const updateLead = useUpdateLead();
  const addTag = useAddLeadTag();
  const removeTag = useRemoveLeadTag();
  const createCommission = useCreateCommissionOnWon();
  const { profile, organization } = useAuth();
  const { data: servicePlans = [] } = useServicePlans();
  const isTelecom = organization?.segment === 'telecom';
  const handleEditScheduleEvent = (event: ScheduleEvent) => {
    setEditingScheduleEvent(event);
    setScheduleFormOpen(true);
  };
  const handleCloseScheduleForm = () => {
    setScheduleFormOpen(false);
    setEditingScheduleEvent(null);
  };
  if (!lead) return null;

  // Find cadence template for this lead's stage
  const stageTemplate = cadenceTemplates.find(t => t.stage_key === lead.stage?.stage_key);
  const templateTasks = stageTemplate?.tasks || [];

  // Map lead tasks by a key to check if completed
  const leadTasksMap = new Map(leadTasks.map(t => [`${t.title}-${t.day_offset}-${t.type}`, t]));
  const completedTasksCount = leadTasks.filter(t => t.is_done).length;
  const totalTasksCount = templateTasks.length;
  const leadTagIds = (lead.tags || []).map((t: any) => t.id);
  const availableTags = allTags.filter(t => !leadTagIds.includes(t.id));
  const currentStageIndex = stages.findIndex(s => s.id === lead.stage_id);
  const handleAddTag = async (tagId: string) => {
    try {
      await addTag.mutateAsync({
        leadId: lead.id,
        tagId
      });
      setTagPopoverOpen(false);
      refetchStages();
    } catch (error) {
      // Error handled by mutation
    }
  };
  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTag.mutateAsync({
        leadId: lead.id,
        tagId
      });
      refetchStages();
    } catch (error) {
      // Error handled by mutation
    }
  };
  const handleAssignUser = async (userId: string | null) => {
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        assigned_user_id: userId
      });
      setAssigneePopoverOpen(false);
      refetchStages();
    } catch (error) {
      // Error handled by mutation
    }
  };
  const handleToggleCadenceTask = async (task: any) => {
    await completeCadenceTask.mutateAsync({
      leadId: lead.id,
      templateTaskId: task.id,
      dayOffset: task.day_offset,
      type: task.type,
      title: task.title,
      description: task.description
    });
  };
  const handleCadenceTaskClick = (task: any) => {
    const existingTask = leadTasksMap.get(`${task.title}-${task.day_offset}-${task.type}`);
    const isDone = existingTask?.is_done;

    // Se tem observação/roteiro, abrir o popup
    if (task.observation && !isDone) {
      setSelectedTask(task);
      setRoteiroDialogOpen(true);
      return;
    }

    // Se for tarefa de mensagem com mensagem recomendada e tem telefone
    if (task.type === 'message' && task.recommended_message && lead.phone) {
      // Substituir variáveis na mensagem
      const message = task.recommended_message.replace(/{nome}/gi, lead.name || '').replace(/{empresa}/gi, lead.empresa || '').replace(/{email}/gi, lead.email || '');
      openNewChatWithMessage(lead.phone, message, lead.id, lead.name);
    } else if (!isDone) {
      // Apenas toggle se não estiver completo
      handleToggleCadenceTask(task);
    }
  };
  const handleRoteiroAction = (action: 'complete' | 'message') => {
    if (!selectedTask) return;
    if (action === 'message' && selectedTask.recommended_message && lead.phone) {
      const message = selectedTask.recommended_message.replace(/{nome}/gi, lead.name || '').replace(/{empresa}/gi, lead.empresa || '').replace(/{email}/gi, lead.email || '');
      openNewChatWithMessage(lead.phone, message, lead.id, lead.name);
    } else {
      handleToggleCadenceTask(selectedTask);
    }
    setRoteiroDialogOpen(false);
    setSelectedTask(null);
  };
  const handleSaveContact = async () => {
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        name: editForm.name,
        phone: editForm.phone || null,
        email: editForm.email || null,
        cargo: editForm.cargo || null,
        empresa: editForm.empresa || null,
        endereco: editForm.endereco || null,
        numero: editForm.numero || null,
        complemento: editForm.complemento || null,
        bairro: editForm.bairro || null,
        cidade: editForm.cidade || null,
        uf: editForm.uf || null,
        cep: editForm.cep || null,
        valor_interesse: editForm.valor_interesse ? parseFloat(editForm.valor_interesse) : null,
        property_id: editForm.property_id || null,
        message: editForm.message || null,
        renda_familiar: editForm.renda_familiar || null,
        trabalha: editForm.trabalha || null,
        profissao: editForm.profissao || null,
        faixa_valor_imovel: editForm.faixa_valor_imovel || null,
        finalidade_compra: editForm.finalidade_compra || null,
        procura_financiamento: editForm.procura_financiamento || null
      } as any);
      setIsEditingContact(false);
      refetchStages();
      toast.success('Dados salvos com sucesso!');
    } catch (error) {
      // Error handled by mutation
    }
  };
  const handleMoveToStage = async (stageId: string) => {
    if (stageId === lead.stage_id) return;
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        stage_id: stageId
      });
      setStagePopoverOpen(false);
      refetchStages();
      toast.success('Lead movido!');
    } catch (error) {
      // Error handled by mutation
    }
  };
  // Mostrar todas as atividades importantes no histórico recente
  const taskActivities = activities.filter((a: any) => 
    ['call', 'message', 'email', 'note', 'task_completed', 'lead_created', 'stage_change', 'assignee_changed', 'status_change'].includes(a.type)
  );
  const SourceIcon = sourceIcons[lead.source] || Target;

  // State for roteiro dialog is now at top of component

  // Tabs configuration - simplified (removed cadences and timeline)
  const tabs = [{
    id: 'activities',
    label: 'Atividades',
    icon: Activity,
    badge: totalTasksCount > 0 ? `${completedTasksCount}/${totalTasksCount}` : null
  }, {
    id: 'schedule',
    label: 'Agenda',
    icon: Calendar,
    badge: scheduleEvents.length > 0 ? scheduleEvents.length.toString() : null
  }, {
    id: 'contact',
    label: isTelecom ? 'Cliente' : 'Contato',
    icon: isTelecom ? UserCheck : Contact
  }, {
    id: 'deal',
    label: 'Negócio',
    icon: Handshake
  }, {
    id: 'history',
    label: 'Histórico',
    icon: History
  }];

  // Mobile content component
  const MobileContent = () => <div className="flex flex-col h-full">
      {/* Mobile Header - Compact & Premium */}
      <div className="relative px-4 pt-4 pb-3 border-b bg-gradient-to-br from-card via-card to-primary/5">
        {/* Close button */}
        <button onClick={onClose} className="absolute right-3 top-3 h-8 w-8 rounded-full bg-muted/80 flex items-center justify-center z-10">
          <X className="h-4 w-4" />
        </button>

        {/* Lead Info */}
        <div className="flex items-center gap-3 mb-3 pr-10">
          <div className="relative shrink-0">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/40 to-primary/10 rounded-full blur-sm" />
            <Avatar className="relative h-12 w-12 border-2 border-primary/20 shadow-lg">
              <AvatarImage src={lead.whatsapp_picture} alt={lead.name} />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {lead.name?.[0]?.toUpperCase() || <User className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-lg truncate">{lead.name}</h2>
            {lead.empresa && <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{lead.empresa}</span>
              </p>}
          </div>
        </div>

        {/* Quick Actions Row */}
        <div className="flex items-center gap-2 mb-3">
          {lead.phone && <>
              <Button variant="outline" size="sm" onClick={() => window.open(`tel:${lead.phone.replace(/\D/g, '')}`, '_blank')} className="h-9 flex-1 rounded-full border-2">
                <Phone className="h-4 w-4 mr-1.5" />
                Ligar
              </Button>
              <Button size="sm" onClick={() => openNewChat(lead.phone, lead.name)} className="h-9 flex-1 rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-md">
                <MessageCircle className="h-4 w-4 mr-1.5" />
                Chat
              </Button>
            </>}
          {lead.email && <Button variant="outline" size="sm" onClick={() => {
          const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(lead.email)}`;
          window.open(gmailUrl, '_blank');
        }} className="h-9 w-9 p-0 rounded-full border-2 shrink-0">
              <Mail className="h-4 w-4" />
            </Button>}
        </div>

        {/* Stage Selector - Mobile */}
        <Popover open={stagePopoverOpen} onOpenChange={setStagePopoverOpen}>
          <PopoverTrigger asChild>
            <button className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground text-sm font-medium shadow-lg">
              <span className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary-foreground/80 animate-pulse" />
                {lead.stage?.name || 'Sem estágio'}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] p-2" align="start">
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {stages.map((stage, idx) => {
              const isActive = stage.id === lead.stage_id;
              const isPast = idx < currentStageIndex;
              return <button key={stage.id} onClick={() => handleMoveToStage(stage.id)} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all", isActive ? "bg-primary text-primary-foreground" : isPast ? "bg-primary/10 text-primary hover:bg-primary/20" : "hover:bg-accent")}>
                    {isPast && <Check className="h-4 w-4 shrink-0" />}
                    {isActive && <div className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />}
                    {!isPast && !isActive && <div className="h-2 w-2 rounded-full bg-muted" />}
                    <span className="font-medium">{stage.name}</span>
                  </button>;
            })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Deal Status Selector - Prominent */}
        <div className="mt-3">
          <Select 
            value={lead.deal_status || 'open'} 
            onValueChange={async (value) => {
              const previousStatus = lead.deal_status;
              await updateLead.mutateAsync({
                id: lead.id,
                deal_status: value,
                lost_reason: value === 'lost' ? '' : null
              } as any);
              
              // Auto-create commission when status changes to 'won'
              if (value === 'won' && previousStatus !== 'won' && profile?.organization_id) {
                createCommission.mutate({
                  leadId: lead.id,
                  organizationId: profile.organization_id,
                  userId: lead.assigned_user_id,
                  propertyId: lead.property_id,
                  valorInteresse: lead.valor_interesse
                });
              }
              
              refetchStages();
            }}
          >
            <SelectTrigger 
              className={cn(
                "w-full rounded-xl font-medium text-sm border-2",
                lead.deal_status === 'won' && "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-300",
                lead.deal_status === 'lost' && "bg-red-50 border-red-300 text-red-700 dark:bg-red-950/30 dark:border-red-700 dark:text-red-300",
                (!lead.deal_status || lead.deal_status === 'open') && "bg-muted/50 border-muted-foreground/20"
              )}
            >
              <SelectValue placeholder="Status do Negócio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">
                <span className="flex items-center gap-2">
                  <CircleDot className="h-4 w-4 text-muted-foreground" />
                  Aberto
                </span>
              </SelectItem>
              <SelectItem value="won">
                <span className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-emerald-600" />
                  Ganho
                </span>
              </SelectItem>
              <SelectItem value="lost">
                <span className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Perdido
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {/* Lost reason inline input */}
          {lead.deal_status === 'lost' && (
            <Input 
              defaultValue={lead.lost_reason || ''} 
              onBlur={async (e) => {
                if (e.target.value !== (lead.lost_reason || '')) {
                  await updateLead.mutateAsync({
                    id: lead.id,
                    lost_reason: e.target.value
                  } as any);
                  refetchStages();
                }
              }}
              placeholder="Motivo da perda..."
              className="mt-2 rounded-xl text-sm border-red-200 dark:border-red-800"
            />
          )}
        </div>

        {/* Tags Row - Using TagSelector for inline creation */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {lead.tags?.slice(0, 3).map((tag: any) => <Badge key={tag.id} className="flex items-center gap-1 pr-1 py-0.5 text-xs rounded-full" style={{
            backgroundColor: `${tag.color}15`,
            color: tag.color,
            borderColor: `${tag.color}30`
          }}>
            <div className="h-1.5 w-1.5 rounded-full" style={{
              backgroundColor: tag.color
            }} />
            {tag.name}
            <button onClick={() => handleRemoveTag(tag.id)} className="ml-0.5 p-0.5 hover:bg-black/10 rounded-full">
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>)}
          {lead.tags?.length > 3 && <Badge variant="secondary" className="text-xs py-0.5">
            +{lead.tags.length - 3}
          </Badge>}
          <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 rounded-full text-xs border border-dashed">
                <Plus className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <TagSelectorPopoverContent
                availableTags={availableTags}
                onAddTag={handleAddTag}
                onClose={() => setTagPopoverOpen(false)}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* First Response Badge - Compact */}
        {lead.first_response_seconds !== null && lead.first_response_seconds !== undefined && <div className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-yellow-500/20 w-fit">
            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              1ª resposta: {formatResponseTime(lead.first_response_seconds)}
            </span>
            {lead.first_response_is_automation && <Badge variant="secondary" className="h-4 text-[9px] px-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-0">
                <Bot className="h-2.5 w-2.5 mr-0.5" />
                Auto
              </Badge>}
          </div>}
      </div>

      {/* Mobile Tabs - Scrollable */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-10 overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
          <div className="flex items-center gap-1 px-3 py-2 w-max">
            {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0", isActive ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge && <Badge variant={isActive ? "outline" : "secondary"} className={cn("h-4 px-1 text-[9px]", isActive && "border-primary-foreground/30 text-primary-foreground")}>
                      {tab.badge}
                    </Badge>}
                </button>;
          })}
          </div>
        </div>
      </div>

      {/* Mobile Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-8">
          {/* Activities Tab */}
          {activeTab === 'activities' && <div className="space-y-4">
              {/* Próximas atividades */}
              <div className="rounded-xl bg-gradient-to-br from-card to-muted/30 border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ListTodo className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <h3 className="font-medium text-sm">Próximas atividades</h3>
                  </div>
                  {totalTasksCount > 0 && <Badge variant="outline" className="text-xs">
                      {completedTasksCount}/{totalTasksCount}
                    </Badge>}
                </div>
                
                {leadTasksLoading ? <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div> : templateTasks.length > 0 ? <div className="space-y-2">
                    {templateTasks.slice(0, 3).map((task: any) => {
                const existingTask = leadTasksMap.get(`${task.title}-${task.day_offset}-${task.type}`);
                const isDone = existingTask?.is_done || false;
                const TaskIcon = activityTypeIcons[task.type] || Clock;
                return <div key={task.id} onClick={() => handleCadenceTaskClick(task)} className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.98]", isDone ? "bg-muted/50 border-border" : "hover:bg-accent/50 hover:border-primary/20", task.type === 'message' && task.recommended_message && !isDone && "border-primary/30 bg-primary/5")}>
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", isDone ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-primary/80 to-primary")}>
                            {isDone ? <Check className="h-3.5 w-3.5 text-white" /> : <TaskIcon className="h-3.5 w-3.5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-medium truncate", isDone && "line-through text-muted-foreground")}>
                              {task.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {taskTypeLabels[task.type]} • Dia {task.day_offset}
                            </p>
                          </div>
                          {!isDone && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                        </div>;
              })}
                  </div> : <div className="text-center py-6 border border-dashed rounded-xl bg-muted/20">
                    <ListTodo className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma cadência</p>
                  </div>}
              </div>

              {/* Atividades recentes */}
              <div className="rounded-xl bg-gradient-to-br from-card to-muted/30 border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <h3 className="font-medium text-sm">Atividades recentes</h3>
                </div>
                
                {activitiesLoading ? <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div> : taskActivities.length > 0 ? <div className="space-y-2">
                    {taskActivities.slice(0, 4).map((activity: any) => {
                const ActivityIcon = activityTypeIcons[activity.type] || CheckCircle;
                return <div key={activity.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent/30">
                          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <ActivityIcon className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{activityTypeLabels[activity.type] || activity.type}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                            </p>
                          </div>
                        </div>;
              })}
                  </div> : <div className="text-center py-6 border border-dashed rounded-xl bg-muted/20">
                    <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma atividade</p>
                  </div>}
              </div>
            </div>}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && <div className="space-y-4">
              <Button onClick={() => setScheduleFormOpen(true)} className="w-full rounded-xl h-11">
                <Plus className="h-4 w-4 mr-2" />
                Novo agendamento
              </Button>

              {scheduleFormOpen && <div className="rounded-xl border bg-card p-4">
                  <EventForm open={scheduleFormOpen} onOpenChange={open => !open && handleCloseScheduleForm()} leadId={lead.id} leadName={lead.name} event={editingScheduleEvent} />
                </div>}
              
              <EventsList events={scheduleEvents} onEditEvent={handleEditScheduleEvent} />
            </div>}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            isTelecom ? (
              <TelecomCustomerTab lead={lead} onSaved={refetchStages} />
            ) : (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Contact className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <h3 className="font-medium text-sm">Dados do contato</h3>
                  </div>
                  {!isEditingContact ? <Button variant="ghost" size="sm" onClick={() => {
                    setActiveTab('contact');
                    setIsEditingContact(true);
                  }} className="h-8 px-3 rounded-full">
                    <FileEdit className="h-3.5 w-3.5 mr-1" />
                    Editar
                  </Button> : <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingContact(false)} className="h-8 px-3 rounded-full">
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveContact} className="h-8 px-3 rounded-full">
                      <Save className="h-3.5 w-3.5 mr-1" />
                      Salvar
                    </Button>
                  </div>}
                </div>

              {/* Contact Info */}
              <div className="rounded-xl bg-gradient-to-br from-card to-muted/30 border p-4 space-y-4">
                {isEditingContact ? <>
                    {/* Informações Pessoais */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Informações Pessoais
                      </Label>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Nome</Label>
                        <Input value={editForm.name} onChange={e => setEditForm({
                    ...editForm,
                    name: e.target.value
                  })} placeholder="Nome completo" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Telefone</Label>
                          <PhoneInput value={editForm.phone} onChange={value => setEditForm({
                      ...editForm,
                      phone: value
                    })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Email</Label>
                          <Input value={editForm.email} onChange={e => setEditForm({
                      ...editForm,
                      email: e.target.value
                    })} placeholder="email@exemplo.com" type="email" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Cargo</Label>
                          <Input value={editForm.cargo} onChange={e => setEditForm({
                      ...editForm,
                      cargo: e.target.value
                    })} placeholder="Cargo" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Empresa</Label>
                          <Input value={editForm.empresa} onChange={e => setEditForm({
                      ...editForm,
                      empresa: e.target.value
                    })} placeholder="Empresa" />
                        </div>
                      </div>
                    </div>

                    {/* Perfil Financeiro */}
                    <div className="space-y-3 pt-3 border-t">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Perfil Financeiro
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Renda Familiar</Label>
                          <Select value={editForm.renda_familiar || 'none'} onValueChange={v => setEditForm({
                      ...editForm,
                      renda_familiar: v === 'none' ? '' : v
                    })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Não informado</SelectItem>
                              <SelectItem value="ate_3k">Até R$ 3.000</SelectItem>
                              <SelectItem value="3k_5k">R$ 3.000 - R$ 5.000</SelectItem>
                              <SelectItem value="5k_10k">R$ 5.000 - R$ 10.000</SelectItem>
                              <SelectItem value="10k_15k">R$ 10.000 - R$ 15.000</SelectItem>
                              <SelectItem value="15k_25k">R$ 15.000 - R$ 25.000</SelectItem>
                              <SelectItem value="acima_25k">Acima de R$ 25.000</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Trabalha?</Label>
                          <Select value={editForm.trabalha ? 'sim' : 'nao'} onValueChange={v => setEditForm({
                      ...editForm,
                      trabalha: v === 'sim'
                    })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nao">Não</SelectItem>
                              <SelectItem value="sim">Sim</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Profissão</Label>
                          <Input value={editForm.profissao} onChange={e => setEditForm({
                      ...editForm,
                      profissao: e.target.value
                    })} placeholder="Ex: Engenheiro, Médico..." />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Faixa do Imóvel</Label>
                          <Select value={editForm.faixa_valor_imovel || 'none'} onValueChange={v => setEditForm({
                      ...editForm,
                      faixa_valor_imovel: v === 'none' ? '' : v
                    })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Não informado</SelectItem>
                              <SelectItem value="ate_200k">Até R$ 200.000</SelectItem>
                              <SelectItem value="200k_400k">R$ 200.000 - R$ 400.000</SelectItem>
                              <SelectItem value="400k_600k">R$ 400.000 - R$ 600.000</SelectItem>
                              <SelectItem value="600k_1m">R$ 600.000 - R$ 1.000.000</SelectItem>
                              <SelectItem value="1m_2m">R$ 1.000.000 - R$ 2.000.000</SelectItem>
                              <SelectItem value="acima_2m">Acima de R$ 2.000.000</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Finalidade da Compra</Label>
                          <Input value={editForm.finalidade_compra} onChange={e => setEditForm({
                      ...editForm,
                      finalidade_compra: e.target.value
                    })} placeholder="Ex: Moradia, Investimento..." />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Procura Financiamento?</Label>
                          <Select value={editForm.procura_financiamento ? 'sim' : 'nao'} onValueChange={v => setEditForm({
                      ...editForm,
                      procura_financiamento: v === 'sim'
                    })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nao">Não</SelectItem>
                              <SelectItem value="sim">Sim</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </> : <>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/50">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Nome</p>
                        <p className="text-sm font-medium truncate">{lead.name}</p>
                      </div>
                    </div>
                    {lead.phone && <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/50">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Phone className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Telefone</p>
                          <p className="text-sm font-medium truncate">{formatPhoneForDisplay(lead.phone)}</p>
                        </div>
                      </div>}
                    {lead.email && <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/50">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm font-medium truncate">{lead.email}</p>
                        </div>
                      </div>}
                    {(lead.cargo || lead.empresa) && <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/50">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Briefcase className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Profissional</p>
                          <p className="text-sm font-medium truncate">
                            {[lead.cargo, lead.empresa].filter(Boolean).join(' • ')}
                          </p>
                        </div>
                      </div>}
                  </>}
              </div>

              {/* Address */}
              {isEditingContact ? <div className="rounded-xl bg-gradient-to-br from-card to-muted/30 border p-4 space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Endereço
                  </Label>
                  <div className="space-y-3">
                    <Input value={editForm.endereco} onChange={e => setEditForm({
                ...editForm,
                endereco: e.target.value
              })} placeholder="Endereço" />
                    <div className="grid grid-cols-3 gap-2">
                      <Input value={editForm.numero} onChange={e => setEditForm({
                  ...editForm,
                  numero: e.target.value
                })} placeholder="Nº" />
                      <Input value={editForm.complemento} onChange={e => setEditForm({
                  ...editForm,
                  complemento: e.target.value
                })} placeholder="Compl." className="col-span-2" />
                    </div>
                    <Input value={editForm.bairro} onChange={e => setEditForm({
                ...editForm,
                bairro: e.target.value
              })} placeholder="Bairro" />
                    <div className="grid grid-cols-3 gap-2">
                      <Input value={editForm.cidade} onChange={e => setEditForm({
                  ...editForm,
                  cidade: e.target.value
                })} placeholder="Cidade" className="col-span-2" />
                      <Input value={editForm.uf} onChange={e => setEditForm({
                  ...editForm,
                  uf: e.target.value
                })} placeholder="UF" maxLength={2} />
                    </div>
                    <Input value={editForm.cep} onChange={e => setEditForm({
                ...editForm,
                cep: e.target.value
              })} placeholder="CEP" />
                  </div>
                </div> : lead.endereco || lead.bairro || lead.cidade ? <div className="rounded-xl bg-gradient-to-br from-card to-muted/30 border p-4">
                  <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    Endereço
                  </Label>
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/50">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm">
                        {[lead.endereco, lead.numero && `nº ${lead.numero}`, lead.complemento].filter(Boolean).join(', ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[lead.bairro, lead.cidade, lead.uf].filter(Boolean).join(' - ')}
                        {lead.cep && ` • ${lead.cep}`}
                      </p>
                    </div>
                  </div>
                </div> : null}

              {/* Responsável */}
              <div className="rounded-xl bg-gradient-to-br from-card to-muted/30 border p-4">
                <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-primary" />
                  Responsável
                </Label>
                <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center gap-3 p-3 rounded-xl border hover:border-primary/30 hover:bg-accent/30 transition-all">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        {lead.assignee?.name ? <span className="text-sm font-semibold text-primary">
                            {lead.assignee.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                          </span> : <User className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium truncate">{lead.assignee?.name || 'Sem responsável'}</p>
                        {lead.assignee?.email && <p className="text-xs text-muted-foreground truncate">{lead.assignee.email}</p>}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      <button onClick={() => handleAssignUser(null)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-left text-sm">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                          <X className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="text-muted-foreground">Remover responsável</span>
                      </button>
                      {allUsers.map(user => <button key={user.id} onClick={() => handleAssignUser(user.id)} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-left text-sm", user.id === lead.assigned_user_id && "bg-primary/10")}>
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {user.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                            </span>
                          </div>
                          <span className="truncate">{user.name}</span>
                          {user.id === lead.assigned_user_id && <Check className="h-4 w-4 ml-auto text-primary shrink-0" />}
                        </button>)}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Origem */}
              <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Target className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <Label className="text-sm font-medium">{t.leads.origin.title}</Label>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between p-2 rounded-lg">
                    <span className="text-sm text-muted-foreground">{t.leads.origin.source}</span>
                    <div className="flex items-center gap-1.5">
                      <SourceIcon className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-medium">{sourceLabels[lead.source] || lead.source}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg">
                    <span className="text-sm text-muted-foreground">{t.leads.origin.createdAt}</span>
                    <span className="text-sm font-medium">
                      {lead.created_at ? format(new Date(lead.created_at), 'dd/MM/yy HH:mm', {
                    locale: dateLocale
                  }) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            )
          )}

          {/* Deal Tab */}
          {activeTab === 'deal' && <div className="space-y-4">
              {/* Deal Status Section */}
              <div className="rounded-xl bg-gradient-to-br from-card to-muted/30 border p-4 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Status do Negócio</Label>
                  <Select 
                    value={lead.deal_status || 'open'} 
                    onValueChange={async (value) => {
                      await updateLead.mutateAsync({
                        id: lead.id,
                        deal_status: value,
                        lost_reason: value === 'lost' ? '' : null
                      } as any);
                      refetchStages();
                    }}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecionar status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">
                        <span className="flex items-center gap-2">
                          <CircleDot className="h-4 w-4 text-muted-foreground" />
                          Aberto
                        </span>
                      </SelectItem>
                      <SelectItem value="won">
                        <span className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-emerald-600" />
                          Ganho
                        </span>
                      </SelectItem>
                      <SelectItem value="lost">
                        <span className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          Perdido
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Lost Reason - show only when status is lost */}
                {lead.deal_status === 'lost' && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Motivo da Perda</Label>
                    <Input 
                      value={lead.lost_reason || ''} 
                      onChange={async (e) => {
                        await updateLead.mutateAsync({
                          id: lead.id,
                          lost_reason: e.target.value
                        } as any);
                      }}
                      onBlur={() => refetchStages()}
                      placeholder="Ex: Preço alto, escolheu concorrente..."
                      className="rounded-xl"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-gradient-to-br from-card to-muted/30 border p-4 space-y-4">
                {/* For Telecom: show Plan selection */}
                {isTelecom ? (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Plano de interesse</Label>
                    <Select value={editForm.property_id || 'none'} onValueChange={value => {
                      const newValue = value === 'none' ? '' : value;
                      const selectedPlan = servicePlans.find((p: any) => p.id === value);
                      const planPrice = selectedPlan?.price || null;
                      setEditForm({
                        ...editForm,
                        property_id: newValue,
                        valor_interesse: planPrice ? planPrice.toString() : editForm.valor_interesse
                      });
                      const updateData: any = {
                        id: lead.id,
                        property_id: newValue || null
                      };
                      if (planPrice) {
                        updateData.valor_interesse = planPrice;
                      }
                      updateLead.mutateAsync(updateData).then(() => refetchStages());
                    }}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecionar plano" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {servicePlans.filter(p => p.is_active).map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.code} - {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Imóvel de interesse</Label>
                    <Select value={editForm.property_id || 'none'} onValueChange={value => {
                      const newValue = value === 'none' ? '' : value;
                      const selectedProperty = properties.find((p: any) => p.id === value);
                      const propertyPrice = selectedProperty?.preco || null;
                      setEditForm({
                        ...editForm,
                        property_id: newValue,
                        valor_interesse: propertyPrice ? propertyPrice.toString() : editForm.valor_interesse
                      });
                      const updateData: any = {
                        id: lead.id,
                        property_id: newValue || null
                      };
                      if (propertyPrice) {
                        updateData.valor_interesse = propertyPrice;
                      }
                      updateLead.mutateAsync(updateData).then(() => refetchStages());
                    }}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecionar imóvel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {properties.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.code} - {p.title || p.bairro || 'Sem título'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Valor de interesse</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="number" value={editForm.valor_interesse} onChange={e => setEditForm({
                      ...editForm,
                      valor_interesse: e.target.value
                    })} onBlur={() => {
                      if (editForm.valor_interesse !== (lead.valor_interesse?.toString() || '')) {
                        updateLead.mutateAsync({
                          id: lead.id,
                          valor_interesse: editForm.valor_interesse ? parseFloat(editForm.valor_interesse) : null
                        } as any);
                      }
                    }} placeholder="0,00" className="pl-9 rounded-xl" />
                  </div>
                </div>
              </div>

              {/* Deal Status Summary Card */}
              {lead.deal_status === 'won' && lead.valor_interesse > 0 && (
                <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 border border-emerald-200 dark:border-emerald-800 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                        R$ {lead.valor_interesse.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">Negócio Fechado!</p>
                    </div>
                  </div>
                </div>
              )}
              
              {lead.deal_status !== 'won' && lead.valor_interesse > 0 && (
                <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                        R$ {lead.valor_interesse.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-sm text-muted-foreground">Valor de interesse</p>
                    </div>
                  </div>
                </div>
              )}
            </div>}

          {/* History Tab */}

          {/* History Tab */}
          {activeTab === 'history' && <LeadHistory leadId={lead.id} />}
        </div>
      </div>
    </div>;

  // Desktop content - same as before but improved
  const DesktopContent = () => <div className="flex flex-col h-full max-h-[90vh]">
      {/* Premium Header */}
      <div className="relative p-6 border-b bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none">
          <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />
        </div>
        
        <DialogHeader className="mb-5 relative">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="text-xs font-normal bg-background/50 backdrop-blur-sm">
              {lead.stage?.name || 'Sem estágio'}
            </Badge>
            <span className="text-muted-foreground/50">•</span>
            <div className="flex items-center gap-1.5">
              <SourceIcon className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">{sourceLabels[lead.source] || lead.source}</span>
            </div>
            <span className="text-muted-foreground/50">•</span>
            {/* Deal Status Badge */}
            <Select 
              value={lead.deal_status || 'open'} 
              onValueChange={async (value) => {
                await updateLead.mutateAsync({
                  id: lead.id,
                  deal_status: value,
                  lost_reason: value === 'lost' ? '' : null
                } as any);
                refetchStages();
              }}
            >
              <SelectTrigger 
                className={cn(
                  "h-7 w-auto gap-1.5 rounded-full text-xs font-medium border-0 px-3",
                  lead.deal_status === 'won' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
                  lead.deal_status === 'lost' && "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
                  (!lead.deal_status || lead.deal_status === 'open') && "bg-muted text-muted-foreground"
                )}
              >
                {lead.deal_status === 'won' && <Trophy className="h-3 w-3" />}
                {lead.deal_status === 'lost' && <XCircle className="h-3 w-3" />}
                {(!lead.deal_status || lead.deal_status === 'open') && <CircleDot className="h-3 w-3" />}
                <span>
                  {lead.deal_status === 'won' ? 'Ganho' : lead.deal_status === 'lost' ? 'Perdido' : 'Aberto'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">
                  <span className="flex items-center gap-2">
                    <CircleDot className="h-4 w-4 text-muted-foreground" />
                    Aberto
                  </span>
                </SelectItem>
                <SelectItem value="won">
                  <span className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-emerald-600" />
                    Ganho
                  </span>
                </SelectItem>
                <SelectItem value="lost">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Perdido
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Premium Avatar with ring */}
            <div className="relative">
              
              <Avatar className="relative h-14 w-14 border-2 border-primary/20 shadow-lg">
                <AvatarImage src={lead.whatsapp_picture} alt={lead.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                  {lead.name?.[0]?.toUpperCase() || <User className="h-7 w-7" />}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold truncate">{lead.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                {lead.empresa && <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="truncate">{lead.empresa}</span>
                  </p>}
                {/* Assignee Selector */}
                <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent">
                      <User className="h-3.5 w-3.5" />
                      <span>{lead.assignee?.name || 'Sem responsável'}</span>
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-2" align="start">
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      <button
                        onClick={() => handleAssignUser(null)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent text-left text-sm transition-colors",
                          !lead.assigned_user_id && "bg-accent"
                        )}
                      >
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <span className="text-muted-foreground">Sem responsável</span>
                      </button>
                      {allUsers.map((user: any) => (
                        <button
                          key={user.id}
                          onClick={() => handleAssignUser(user.id)}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent text-left text-sm transition-colors",
                            lead.assigned_user_id === user.id && "bg-accent"
                          )}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.avatar_url} alt={user.name} />
                            <AvatarFallback className="text-xs">
                              {user.name?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.name}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {/* Quick Actions - Premium pills */}
            <div className="flex items-center gap-2 shrink-0">
              {lead.phone && <>
                  <Button variant="outline" size="sm" onClick={() => window.open(`tel:${lead.phone.replace(/\D/g, '')}`, '_blank')} className="h-9 w-9 p-0 rounded-full border-2 hover:border-primary/50 hover:bg-primary/5 transition-all hover:scale-105">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={() => openNewChat(lead.phone, lead.name)} className="h-9 px-4 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all hover:scale-105">
                    <MessageCircle className="h-4 w-4 mr-1.5" />
                    Chat
                  </Button>
                </>}
              {lead.email && <Button variant="outline" size="sm" onClick={() => {
              const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(lead.email)}`;
              window.open(gmailUrl, '_blank');
            }} className="h-9 w-9 p-0 rounded-full border-2 hover:border-primary/50 hover:bg-primary/5 transition-all hover:scale-105">
                  <Mail className="h-4 w-4" />
                </Button>}
            </div>
          </div>
        </DialogHeader>

        {/* First Response Badge - Premium */}
        {lead.first_response_seconds !== null && lead.first_response_seconds !== undefined && <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10 border border-yellow-500/20 shadow-sm mb-4">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-inner">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
              1ª resposta: {formatResponseTime(lead.first_response_seconds)}
            </span>
            {lead.first_response_is_automation && <Badge variant="secondary" className="h-5 text-[10px] font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-0">
                <Bot className="h-3 w-3 mr-1" />
                Auto
              </Badge>}
          </div>}

        {/* Tags - Premium */}
        <div className="flex flex-wrap items-center gap-2">
          {lead.tags?.map((tag: any) => <Badge key={tag.id} className="flex items-center gap-1.5 pr-1.5 py-1 rounded-full shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5" style={{
          backgroundColor: `${tag.color}15`,
          color: tag.color,
          borderColor: `${tag.color}30`
        }}>
              <div className="h-2 w-2 rounded-full shadow-sm" style={{
            backgroundColor: tag.color
          }} />
              {tag.name}
              <button onClick={() => handleRemoveTag(tag.id)} className="ml-0.5 hover:bg-black/10 rounded-full p-0.5 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </Badge>)}
          <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-3 rounded-full text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/30 hover:bg-primary/5 transition-all">
                <Plus className="h-3 w-3 mr-1" />
                Tag
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <TagSelectorPopoverContent
                availableTags={availableTags}
                onAddTag={handleAddTag}
                onClose={() => setTagPopoverOpen(false)}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Pipeline Timeline - Premium Stepper */}
        <div className="mt-4 overflow-hidden">
          <ScrollArea className="w-full" type="scroll">
            <div className="flex items-center gap-0 pb-2 pr-4">
              {stages.map((stage, idx) => {
              const isActive = stage.id === lead.stage_id;
              const isPast = idx < currentStageIndex;
              const isFirst = idx === 0;
              return <div key={stage.id} className="flex items-center shrink-0">
                    {!isFirst && <div className={cn("w-4 h-0.5 transition-colors", isPast ? "bg-primary" : isActive ? "bg-gradient-to-r from-primary to-border" : "bg-border/50")} />}
                    <button onClick={() => handleMoveToStage(stage.id)} className={cn("relative h-6 px-2.5 rounded-full text-[10px] font-medium transition-all whitespace-nowrap flex items-center gap-1", isActive ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground" : isPast ? "bg-primary/15 text-primary hover:bg-primary/25" : "text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent hover:border-border/50")}>
                      {isPast && <Check className="h-2.5 w-2.5" />}
                      {isActive && <div className="h-1 w-1 rounded-full bg-primary-foreground animate-pulse" />}
                      {stage.name}
                    </button>
                  </div>;
            })}
            </div>
            <ScrollBar orientation="horizontal" className="h-1.5" />
          </ScrollArea>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Premium Tabs */}
          <div className="border-b px-6 bg-muted">
            <TabsList className="h-12 bg-transparent justify-start gap-1 -mb-px p-0">
              {tabs.map(tab => {
              const Icon = tab.icon;
              return <TabsTrigger key={tab.id} value={tab.id} className="data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t-lg rounded-b-none px-4 h-11 gap-2 transition-all">
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    {tab.badge && <Badge variant="secondary" className="h-5 px-1.5 text-[10px] ml-1">
                        {tab.badge}
                      </Badge>}
                  </TabsTrigger>;
            })}
            </TabsList>
          </div>

          {/* Atividades Tab */}
          <TabsContent value="activities" className="p-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cadência - próximas atividades */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-card to-muted/30 border shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ListTodo className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold">Próximas atividades</h3>
                  </div>
                  {totalTasksCount > 0 && <Badge variant="outline" className="font-normal">
                      {completedTasksCount}/{totalTasksCount}
                    </Badge>}
                </div>
                
                {leadTasksLoading ? <div className="flex items-center justify-center py-12">
                    <div className="relative">
                      <div className="h-8 w-8 rounded-full border-2 border-primary/20" />
                      <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                  </div> : templateTasks.length > 0 ? <div className="space-y-2">
                    <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                      <CheckCircle className="h-3 w-3" />
                      Cadência: <span className="font-medium text-foreground">{stageTemplate?.name}</span>
                    </p>
                    {templateTasks.map((task: any) => {
                  const existingTask = leadTasksMap.get(`${task.title}-${task.day_offset}-${task.type}`);
                  const isDone = existingTask?.is_done || false;
                  const TaskIcon = activityTypeIcons[task.type] || Clock;
                  return <div key={task.id} className={cn("group flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all", isDone ? "bg-muted/50 border-border" : "hover:bg-accent/50 hover:border-primary/20 hover:shadow-sm hover:-translate-y-0.5", task.type === 'message' && task.recommended_message && !isDone && "border-primary/30 bg-primary/5")} onClick={() => handleCadenceTaskClick(task)}>
                          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", isDone ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-primary/80 to-primary")}>
                            {isDone ? <Check className="h-4 w-4 text-white" /> : <TaskIcon className="h-4 w-4 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-medium truncate", isDone && "line-through text-muted-foreground")}>
                              {task.title}
                            </p>
                            {task.observation && !isDone && <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                                <Lightbulb className="h-3 w-3" />
                                {task.observation}
                              </p>}
                            {task.recommended_message && !isDone && <p className="text-xs text-primary mt-0.5 flex items-center gap-1 font-medium">
                                <FileEdit className="h-3 w-3" />
                                Clique para enviar mensagem
                              </p>}
                            <p className="text-xs text-muted-foreground">
                              {taskTypeLabels[task.type]} • Dia {task.day_offset}
                            </p>
                          </div>
                          {!isDone && <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />}
                        </div>;
                })}
                  </div> : <div className="text-center py-10 border border-dashed rounded-xl bg-muted/20">
                    <div className="h-12 w-12 rounded-2xl bg-muted mx-auto mb-3 flex items-center justify-center">
                      <ListTodo className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-muted-foreground">Nenhuma cadência configurada</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Configure uma para este estágio</p>
                  </div>}
              </div>

              {/* Atividades recentes */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-card to-muted/30 border shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold">Atividades recentes</h3>
                </div>
                {activitiesLoading ? <div className="flex items-center justify-center py-12">
                    <div className="relative">
                      <div className="h-8 w-8 rounded-full border-2 border-primary/20" />
                      <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                  </div> : taskActivities.length > 0 ? <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[18px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary/20 via-border to-transparent" />
                    
                    <div className="space-y-3">
                      {taskActivities.slice(0, 5).map((activity: any, idx: number) => {
                    const ActivityIcon = activityTypeIcons[activity.type] || CheckCircle;
                    return <div key={activity.id} className="group relative flex items-start gap-3 p-3 rounded-xl hover:bg-accent/30 transition-all">
                            <div className="relative z-10 h-9 w-9 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <ActivityIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {activityTypeLabels[activity.type] || activity.type}
                              </p>
                              {activity.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{activity.content}</p>}
                              <p className="text-xs text-muted-foreground/70 mt-1.5 flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(activity.created_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                                {activity.user?.name && <>
                                    <span className="text-muted-foreground/30">•</span>
                                    {activity.user.name}
                                  </>}
                              </p>
                            </div>
                          </div>;
                  })}
                    </div>
                  </div> : <div className="text-center py-10 border border-dashed rounded-xl bg-muted/20">
                    <div className="h-12 w-12 rounded-2xl bg-muted mx-auto mb-3 flex items-center justify-center">
                      <Activity className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-muted-foreground">Nenhuma atividade registrada</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">As atividades aparecerão aqui</p>
                  </div>}
              </div>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="p-6 mt-0">
            <div className="space-y-4">
              <Button onClick={() => setScheduleFormOpen(true)} className="w-full rounded-xl h-11">
                <Plus className="h-4 w-4 mr-2" />
                Novo agendamento
              </Button>

              {scheduleFormOpen && <div className="rounded-xl border bg-card p-4">
                  <EventForm open={scheduleFormOpen} onOpenChange={open => !open && handleCloseScheduleForm()} leadId={lead.id} leadName={lead.name} event={editingScheduleEvent} />
                </div>}
              
              <EventsList events={scheduleEvents} onEditEvent={handleEditScheduleEvent} />
            </div>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="p-6 mt-0">
            {isTelecom ? (
              <TelecomCustomerTab lead={lead} onSaved={refetchStages} />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Contact className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <h3 className="font-medium text-sm">Dados do contato</h3>
                  </div>
                  {!isEditingContact ? <Button variant="ghost" size="sm" onClick={() => {
                    setActiveTab('contact');
                    setIsEditingContact(true);
                  }} className="h-8 px-3 rounded-full">
                    <FileEdit className="h-3.5 w-3.5 mr-1" />
                    Editar
                  </Button> : <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingContact(false)} className="h-8 px-3 rounded-full">
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveContact} className="h-8 px-3 rounded-full">
                      <Save className="h-3.5 w-3.5 mr-1" />
                      Salvar
                    </Button>
                  </div>}
                </div>

                <div className="rounded-xl bg-gradient-to-br from-card to-muted/30 border p-4 space-y-4">
                  {isEditingContact ? <>
                    {/* Informações Pessoais */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Informações Pessoais
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5 col-span-2">
                          <Label className="text-xs text-muted-foreground">Nome</Label>
                          <Input value={editForm.name} onChange={e => setEditForm({
                            ...editForm,
                            name: e.target.value
                          })} placeholder="Nome completo" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Telefone</Label>
                          <PhoneInput value={editForm.phone} onChange={value => setEditForm({
                            ...editForm,
                            phone: value
                          })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Email</Label>
                          <Input value={editForm.email} onChange={e => setEditForm({
                            ...editForm,
                            email: e.target.value
                          })} placeholder="email@exemplo.com" type="email" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Cargo</Label>
                          <Input value={editForm.cargo} onChange={e => setEditForm({
                            ...editForm,
                            cargo: e.target.value
                          })} placeholder="Cargo" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Empresa</Label>
                          <Input value={editForm.empresa} onChange={e => setEditForm({
                            ...editForm,
                            empresa: e.target.value
                          })} placeholder="Empresa" />
                        </div>
                      </div>
                    </div>

                    {/* Perfil Financeiro */}
                    <div className="space-y-3 pt-3 border-t">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Perfil Financeiro
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Renda Familiar</Label>
                          <Select value={editForm.renda_familiar || 'none'} onValueChange={v => setEditForm({
                            ...editForm,
                            renda_familiar: v === 'none' ? '' : v
                          })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Não informado</SelectItem>
                              <SelectItem value="ate_3k">Até R$ 3.000</SelectItem>
                              <SelectItem value="3k_5k">R$ 3.000 - R$ 5.000</SelectItem>
                              <SelectItem value="5k_10k">R$ 5.000 - R$ 10.000</SelectItem>
                              <SelectItem value="10k_15k">R$ 10.000 - R$ 15.000</SelectItem>
                              <SelectItem value="15k_25k">R$ 15.000 - R$ 25.000</SelectItem>
                              <SelectItem value="acima_25k">Acima de R$ 25.000</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Trabalha?</Label>
                          <Select value={editForm.trabalha ? 'sim' : 'nao'} onValueChange={v => setEditForm({
                            ...editForm,
                            trabalha: v === 'sim'
                          })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nao">Não</SelectItem>
                              <SelectItem value="sim">Sim</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Profissão</Label>
                          <Input value={editForm.profissao} onChange={e => setEditForm({
                            ...editForm,
                            profissao: e.target.value
                          })} placeholder="Ex: Engenheiro, Médico..." />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Faixa do Imóvel</Label>
                          <Select value={editForm.faixa_valor_imovel || 'none'} onValueChange={v => setEditForm({
                            ...editForm,
                            faixa_valor_imovel: v === 'none' ? '' : v
                          })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Não informado</SelectItem>
                              <SelectItem value="ate_200k">Até R$ 200.000</SelectItem>
                              <SelectItem value="200k_400k">R$ 200.000 - R$ 400.000</SelectItem>
                              <SelectItem value="400k_600k">R$ 400.000 - R$ 600.000</SelectItem>
                              <SelectItem value="600k_1m">R$ 600.000 - R$ 1.000.000</SelectItem>
                              <SelectItem value="1m_2m">R$ 1.000.000 - R$ 2.000.000</SelectItem>
                              <SelectItem value="acima_2m">Acima de R$ 2.000.000</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Finalidade da Compra</Label>
                          <Input value={editForm.finalidade_compra} onChange={e => setEditForm({
                            ...editForm,
                            finalidade_compra: e.target.value
                          })} placeholder="Ex: Moradia, Investimento..." />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Procura Financiamento?</Label>
                          <Select value={editForm.procura_financiamento ? 'sim' : 'nao'} onValueChange={v => setEditForm({
                            ...editForm,
                            procura_financiamento: v === 'sim'
                          })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nao">Não</SelectItem>
                              <SelectItem value="sim">Sim</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </> : <>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/50">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Nome</p>
                        <p className="text-sm font-medium truncate">{lead.name}</p>
                      </div>
                    </div>
                    {lead.phone && <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/50">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Telefone</p>
                        <p className="text-sm font-medium truncate">{formatPhoneForDisplay(lead.phone)}</p>
                      </div>
                    </div>}
                    {lead.email && <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/50">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium truncate">{lead.email}</p>
                      </div>
                    </div>}
                    {(lead.cargo || lead.empresa) && <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/50">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Briefcase className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Profissional</p>
                        <p className="text-sm font-medium truncate">
                          {[lead.cargo, lead.empresa].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                    </div>}
                  </>}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Deal Tab */}
          <TabsContent value="deal" className="p-6 mt-0">
            <div className="space-y-4">
              {/* Deal Status Section */}
              <div className="rounded-xl bg-gradient-to-br from-card to-muted/30 border p-4 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Status do Negócio</Label>
                  <Select 
                    value={lead.deal_status || 'open'} 
                    onValueChange={async (value) => {
                      await updateLead.mutateAsync({
                        id: lead.id,
                        deal_status: value,
                        lost_reason: value === 'lost' ? '' : null
                      } as any);
                      refetchStages();
                    }}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecionar status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">
                        <span className="flex items-center gap-2">
                          <CircleDot className="h-4 w-4 text-muted-foreground" />
                          Aberto
                        </span>
                      </SelectItem>
                      <SelectItem value="won">
                        <span className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-emerald-600" />
                          Ganho
                        </span>
                      </SelectItem>
                      <SelectItem value="lost">
                        <span className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          Perdido
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Lost Reason - show only when status is lost */}
                {lead.deal_status === 'lost' && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Motivo da Perda</Label>
                    <Input 
                      value={lead.lost_reason || ''} 
                      onChange={async (e) => {
                        await updateLead.mutateAsync({
                          id: lead.id,
                          lost_reason: e.target.value
                        } as any);
                      }}
                      onBlur={() => refetchStages()}
                      placeholder="Ex: Preço alto, escolheu concorrente..."
                      className="rounded-xl"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-gradient-to-br from-card to-muted/30 border p-4 space-y-4">
                {/* For Telecom: show Plan selection */}
                {isTelecom ? (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Plano de interesse</Label>
                    <Select value={editForm.property_id || 'none'} onValueChange={value => {
                      const newValue = value === 'none' ? '' : value;
                      const selectedPlan = servicePlans.find((p: any) => p.id === value);
                      const planPrice = selectedPlan?.price || null;
                      setEditForm({
                        ...editForm,
                        property_id: newValue,
                        valor_interesse: planPrice ? planPrice.toString() : editForm.valor_interesse
                      });
                      const updateData: any = {
                        id: lead.id,
                        property_id: newValue || null
                      };
                      if (planPrice) {
                        updateData.valor_interesse = planPrice;
                      }
                      updateLead.mutateAsync(updateData).then(() => refetchStages());
                    }}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecionar plano" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {servicePlans.filter(p => p.is_active).map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.code} - {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Imóvel de interesse</Label>
                    <Select value={editForm.property_id || 'none'} onValueChange={value => {
                      const newValue = value === 'none' ? '' : value;
                      const selectedProperty = properties.find((p: any) => p.id === value);
                      const propertyPrice = selectedProperty?.preco || null;
                      setEditForm({
                        ...editForm,
                        property_id: newValue,
                        valor_interesse: propertyPrice ? propertyPrice.toString() : editForm.valor_interesse
                      });
                      const updateData: any = {
                        id: lead.id,
                        property_id: newValue || null
                      };
                      if (propertyPrice) {
                        updateData.valor_interesse = propertyPrice;
                      }
                      updateLead.mutateAsync(updateData).then(() => refetchStages());
                    }}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecionar imóvel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {properties.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.code} - {p.title || p.bairro || 'Sem título'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Valor de interesse</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="number" value={editForm.valor_interesse} onChange={e => setEditForm({
                      ...editForm,
                      valor_interesse: e.target.value
                    })} onBlur={() => {
                      if (editForm.valor_interesse !== (lead.valor_interesse?.toString() || '')) {
                        updateLead.mutateAsync({
                          id: lead.id,
                          valor_interesse: editForm.valor_interesse ? parseFloat(editForm.valor_interesse) : null
                        } as any);
                      }
                    }} placeholder="0,00" className="pl-9 rounded-xl" />
                  </div>
                </div>
              </div>

              {/* Deal Status Summary Card */}
              {lead.deal_status === 'won' && lead.valor_interesse > 0 && (
                <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 border border-emerald-200 dark:border-emerald-800 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                        R$ {lead.valor_interesse.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">Negócio Fechado!</p>
                    </div>
                  </div>
                </div>
              )}
              
              {lead.deal_status !== 'won' && lead.valor_interesse > 0 && (
                <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                        R$ {lead.valor_interesse.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-sm text-muted-foreground">Valor de interesse</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* History Tab */}

          {/* History Tab */}
          <TabsContent value="history" className="p-6 mt-0">
            <LeadHistory leadId={lead.id} />
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>;

  // Roteiro Dialog
  const RoteiroDialog = () => <Dialog open={roteiroDialogOpen} onOpenChange={setRoteiroDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Lightbulb className="h-4 w-4 text-amber-600" />
            </div>
            {selectedTask?.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap leading-relaxed">
                {selectedTask?.observation}
              </p>
            </div>
          </div>
          
          {selectedTask?.recommended_message && <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
              <div className="flex items-start gap-3">
                <MessageCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-primary mb-1">Mensagem sugerida:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedTask.recommended_message.replace(/{nome}/gi, lead.name || '').replace(/{empresa}/gi, lead.empresa || '').replace(/{email}/gi, lead.email || '')}
                  </p>
                </div>
              </div>
            </div>}
          
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => handleRoteiroAction('complete')}>
              <Check className="h-4 w-4 mr-2" />
              Marcar como feito
            </Button>
            {selectedTask?.recommended_message && lead.phone && <Button variant="outline" className="flex-1" onClick={() => handleRoteiroAction('message')}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Enviar mensagem
              </Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>;

  // Render mobile or desktop version
  if (isMobile) {
    return <>
        <Drawer open={!!lead} onOpenChange={() => onClose()}>
          <DrawerContent className="h-[95vh] max-h-[95vh]">
            <MobileContent />
          </DrawerContent>
        </Drawer>
        <RoteiroDialog />
      </>;
  }
  return <>
      <Dialog open={!!lead} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0 overflow-hidden animate-scale-in">
          <DesktopContent />
        </DialogContent>
      </Dialog>
      <RoteiroDialog />
    </>;
}