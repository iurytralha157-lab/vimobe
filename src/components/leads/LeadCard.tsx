import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, MessageCircle, Clock, CheckCircle, User, Zap, Trophy, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatResponseTime } from '@/hooks/use-lead-timeline';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Draggable } from '@hello-pangea/dnd';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFloatingChat } from '@/contexts/FloatingChatContext';
import { formatPhoneForDisplay } from '@/lib/phone-utils';
import { SlaBadge } from './SlaBadge';

// Deal status labels and colors
const dealStatusConfig = {
  open: {
    label: 'Aberto',
    color: 'bg-muted text-muted-foreground',
    icon: null
  },
  won: {
    label: 'Ganho',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    icon: Trophy
  },
  lost: {
    label: 'Perdido',
    color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    icon: XCircle
  }
};
interface LeadCardProps {
  lead: any;
  onClick: () => void;
  index: number;
  onAssignNow?: (leadId: string) => void;
}

// Formata tempo sempre em horas (ex: "30min", "2h", "72h")
const formatShortTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHrs = Math.floor(diffMs / 3600000);
  if (diffHrs === 0) {
    const diffMins = Math.floor(diffMs / 60000);
    return `${diffMins}min`;
  }
  return `${diffHrs}h`;
};
export function LeadCard({
  lead,
  onClick,
  index,
  onAssignNow
}: LeadCardProps) {
  const {
    openNewChat
  } = useFloatingChat();
  const stageTime = lead.stage_entered_at ? formatShortTime(new Date(lead.stage_entered_at)) : '-';
  const pendingTasks = lead.tasks_count?.pending || 0;
  const completedTasks = lead.tasks_count?.completed || 0;
  const totalTasks = pendingTasks + completedTasks;
  const hasPhone = !!lead.phone;
  const hasEmail = !!lead.email;
  
  // Get interest value from: interest property, interest plan, legacy valor_interesse, or property
  const interestPropertyPrice = lead.interest_property?.preco;
  const interestPlanPrice = lead.interest_plan?.price;
  const valorInteresse = interestPropertyPrice || interestPlanPrice || lead.valor_interesse || lead.property?.preco;
  const interestLabel = lead.interest_property?.title || lead.interest_property?.code || 
                        lead.interest_plan?.name || lead.interest_plan?.code || 
                        lead.property?.title || null;

  // Verifica se o lead tem tags de prioridade alta
  const hasHighPriority = lead.tags?.some((tag: any) => tag.name?.toLowerCase().includes('urgente') || tag.name?.toLowerCase().includes('vip') || tag.name?.toLowerCase().includes('prioridade') || tag.name?.toLowerCase().includes('hot'));

  // Esquema de cores dinâmico baseado na prioridade
  const iconColors = hasHighPriority ? {
    phone: "bg-blue-200 text-blue-700 hover:bg-blue-300 dark:bg-blue-900 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700",
    whatsapp: "bg-orange-200 text-orange-700 hover:bg-orange-300 dark:bg-orange-900 dark:text-orange-300 ring-1 ring-orange-300 dark:ring-orange-700",
    email: "bg-purple-200 text-purple-700 hover:bg-purple-300 dark:bg-purple-900 dark:text-purple-300 ring-1 ring-purple-300 dark:ring-purple-700"
  } : {
    phone: "bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-400",
    whatsapp: "bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-400",
    email: "bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-400"
  };
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R$${(value / 1000).toFixed(0)}K`;
    }
    return `R$${value}`;
  };
  const handlePhoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.phone) {
      window.open(`tel:${lead.phone.replace(/\D/g, '')}`, '_blank');
    }
  };
  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.phone) {
      // Abre no chat flutuante interno em vez de wa.me
      openNewChat(lead.phone, lead.name);
    }
  };
  const handleEmailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.email) {
      // Abre Gmail com destinatário preenchido no campo "Para"
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(lead.email)}`;
      window.open(gmailUrl, '_blank');
    }
  };
  const isLost = lead.deal_status === 'lost';
  const isWon = lead.deal_status === 'won';
  return <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={cn("bg-card border-border rounded-lg p-3 cursor-pointer transition-all duration-200 group hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 hover:-translate-y-0.5 border-0", snapshot.isDragging && "shadow-xl rotate-1 scale-[1.02] border-primary", isLost && "bg-destructive/5 border-destructive/30 hover:bg-destructive/10", isWon && "bg-emerald-500/5 border-emerald-500/30")} onClick={onClick}>
          {/* Deal Status Badge + Tags */}
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            {/* Deal Status Badge */}
            {lead.deal_status && lead.deal_status !== 'open' && <span className={cn("text-[9px] px-1.5 py-0.5 font-medium flex items-center gap-0.5 rounded-full", dealStatusConfig[lead.deal_status as keyof typeof dealStatusConfig]?.color)}>
                {dealStatusConfig[lead.deal_status as keyof typeof dealStatusConfig]?.icon && (() => {
            const Icon = dealStatusConfig[lead.deal_status as keyof typeof dealStatusConfig].icon;
            return Icon ? <Icon className="h-2.5 w-2.5" /> : null;
          })()}
                {dealStatusConfig[lead.deal_status as keyof typeof dealStatusConfig]?.label}
              </span>}
            
            {/* Tags - primeira tag em destaque */}
            {lead.tags && lead.tags.length > 0 && <>
                <span className="text-[9px] px-1.5 py-0.5 font-medium rounded-full" style={{
            backgroundColor: `${lead.tags[0].color}20`,
            color: lead.tags[0].color,
            borderColor: lead.tags[0].color
          }}>
                  {lead.tags[0].name}
                </span>
                {lead.tags.length > 1 && <span className="text-[10px] text-muted-foreground">+{lead.tags.length - 1}</span>}
              </>}
          </div>



          {/* Nome do Lead + Avatar com foto do WhatsApp */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="relative shrink-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={lead.whatsapp_picture} alt={lead.name} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                    {lead.name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                {/* Indicador de mensagens não lidas */}
                {lead.unread_count > 0 && <span className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center px-1 text-[9px] font-bold bg-primary text-primary-foreground rounded-full ring-2 ring-card">
                    {lead.unread_count > 9 ? '9+' : lead.unread_count}
                  </span>}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate text-foreground">{lead.name}</h4>
                {lead.phone && <p className="text-[11px] text-muted-foreground truncate">{formatPhoneForDisplay(lead.phone)}</p>}
              </div>
            </div>
          </div>

          {/* Separador */}
          <div className="border-t border-border/50 my-2 -mx-3" />

          {/* Linha de ações rápidas e infos */}
          <TooltipProvider delayDuration={100}>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Avatar do responsável ou badge "Sem responsável" */}
              {lead.assignee ? <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-6 w-6 ring-2 ring-background shrink-0">
                      <AvatarImage src={lead.assignee.avatar_url} />
                      <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                        {lead.assignee.name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {lead.assignee.name}
                  </TooltipContent>
                </Tooltip> : <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0.5 cursor-pointer hover:bg-destructive/90 transition-colors" onClick={e => {
                e.stopPropagation();
                onAssignNow?.(lead.id);
              }}>
                      Sem responsável
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Clique para atribuir via round-robin
                  </TooltipContent>
                </Tooltip>}

              {/* Ícones de ação */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={handlePhoneClick} disabled={!hasPhone} className={cn("h-6 w-6 rounded-full flex items-center justify-center transition-colors", hasPhone ? iconColors.phone : "bg-muted text-muted-foreground/50 cursor-not-allowed")}>
                    <Phone className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {hasPhone ? `Ligar: ${formatPhoneForDisplay(lead.phone)}` : 'Sem telefone'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={handleWhatsAppClick} disabled={!hasPhone} className={cn("h-6 w-6 rounded-full flex items-center justify-center transition-colors", hasPhone ? iconColors.whatsapp : "bg-muted text-muted-foreground/50 cursor-not-allowed")}>
                    <MessageCircle className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {hasPhone ? 'Enviar WhatsApp' : 'Sem telefone'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={handleEmailClick} disabled={!hasEmail} className={cn("h-6 w-6 rounded-full flex items-center justify-center transition-colors", hasEmail ? iconColors.email : "bg-muted text-muted-foreground/50 cursor-not-allowed")}>
                    <Mail className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {hasEmail ? `Email: ${lead.email}` : 'Sem email'}
                </TooltipContent>
              </Tooltip>

              {/* Valor do imóvel/interesse */}
              {valorInteresse > 0 && <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                      interestPlanPrice 
                        ? "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950" 
                        : "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950"
                    )}>
                      {formatCurrency(valorInteresse)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {interestLabel ? (
                      <div className="space-y-0.5">
                        <div className="font-medium">{interestLabel}</div>
                        <div>R${valorInteresse.toLocaleString('pt-BR')}</div>
                      </div>
                    ) : (
                      <>Valor: R${valorInteresse.toLocaleString('pt-BR')}</>
                    )}
                  </TooltipContent>
                </Tooltip>}

              {/* Primeira Resposta Badge */}
              {lead.first_response_seconds !== null && lead.first_response_seconds !== undefined ? <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-[10px] font-medium text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/50 px-1.5 py-0.5 rounded">
                      <Zap className="h-3 w-3" />
                      <span>{formatResponseTime(lead.first_response_seconds)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    1ª resposta: {formatResponseTime(lead.first_response_seconds)}
                    {lead.first_response_is_automation && ' (automação)'}
                  </TooltipContent>
                </Tooltip> : lead.assigned_user_id ? <>
                  {/* SLA Badge - shows warning/overdue status */}
                  <SlaBadge slaStatus={lead.sla_status} slaSecondsElapsed={lead.sla_seconds_elapsed} firstResponseAt={lead.first_response_at} />
                  
                </> : null}

              {/* Progresso da cadência */}
              {totalTasks > 0 && <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                      <CheckCircle className="h-3 w-3" />
                      <span className="font-medium">{completedTasks}/{totalTasks}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {completedTasks} de {totalTasks} atividades concluídas
                  </TooltipContent>
                </Tooltip>}

              {/* Tempo no estágio */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                    <Clock className="h-3 w-3" />
                    {stageTime}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Tempo neste estágio
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>}
    </Draggable>;
}