import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  Mail, 
  MessageCircle,
  Clock,
  CheckCircle,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPhoneForDisplay } from '@/lib/phone-utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SlaBadge } from './SlaBadge';

interface LeadCardProps {
  lead: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    stage_entered_at?: string | null;
    assigned_user_id?: string | null;
    assignee?: { name: string; avatar_url?: string } | null;
    tags?: Array<{ id: string; name: string; color: string }>;
    property?: { preco?: number } | null;
    valor_interesse?: number | null;
    tasks_count?: { pending: number; completed: number } | null;
    sla_status?: string | null;
    sla_seconds_elapsed?: number | null;
    first_response_at?: string | null;
    first_response_seconds?: number | null;
    unread_count?: number;
    whatsapp_picture?: string | null;
  };
  onClick: () => void;
  onAssignNow?: (leadId: string) => void;
  className?: string;
}

// Format time in short format (e.g., "30min", "2h", "72h")
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

// Format response time
const formatResponseTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
};

export function LeadCard({ lead, onClick, onAssignNow, className }: LeadCardProps) {
  const stageTime = lead.stage_entered_at 
    ? formatShortTime(new Date(lead.stage_entered_at))
    : '-';

  const pendingTasks = lead.tasks_count?.pending || 0;
  const completedTasks = lead.tasks_count?.completed || 0;
  const totalTasks = pendingTasks + completedTasks;
  const hasPhone = !!lead.phone;
  const hasEmail = !!lead.email;
  const valorInteresse = lead.valor_interesse || lead.property?.preco;

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
      const phone = lead.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}`, '_blank');
    }
  };

  const handleEmailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.email) {
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(lead.email)}`;
      window.open(gmailUrl, '_blank');
    }
  };

  return (
    <div 
      className={cn(
        "lead-card group",
        className
      )}
      onClick={onClick}
    >
      {/* Tags - first tag highlighted */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="flex items-center gap-1 mb-2">
          <Badge 
            variant="secondary" 
            className="text-[9px] px-1.5 py-0 font-medium"
            style={{ backgroundColor: `${lead.tags[0].color}20`, color: lead.tags[0].color, borderColor: lead.tags[0].color }}
          >
            {lead.tags[0].name}
          </Badge>
          {lead.tags.length > 1 && (
            <span className="text-[10px] text-muted-foreground">+{lead.tags.length - 1}</span>
          )}
        </div>
      )}

      {/* Lead Name + Avatar */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={lead.whatsapp_picture || undefined} alt={lead.name} />
              <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                {lead.name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            {/* Unread messages indicator */}
            {(lead.unread_count ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center px-1 text-[9px] font-bold bg-primary text-primary-foreground rounded-full ring-2 ring-card">
                {(lead.unread_count ?? 0) > 9 ? '9+' : lead.unread_count}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate text-foreground">{lead.name}</h4>
            {lead.phone && (
              <p className="text-[11px] text-muted-foreground truncate">{formatPhoneForDisplay(lead.phone)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-border/50 my-2 -mx-3" />

      {/* Quick actions and info row */}
      <TooltipProvider delayDuration={100}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Assignee avatar or "No assignee" badge */}
          {lead.assignee ? (
            <Tooltip>
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
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="destructive" 
                  className="text-[9px] px-1.5 py-0.5 cursor-pointer hover:bg-destructive/90 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssignNow?.(lead.id);
                  }}
                >
                  Sem responsável
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Clique para atribuir via round-robin
              </TooltipContent>
            </Tooltip>
          )}

          {/* Action icons */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handlePhoneClick}
                disabled={!hasPhone}
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center transition-colors",
                  hasPhone 
                    ? "bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-400" 
                    : "bg-muted text-muted-foreground/50 cursor-not-allowed"
                )}
              >
                <Phone className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {hasPhone ? `Ligar: ${formatPhoneForDisplay(lead.phone)}` : 'Sem telefone'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleWhatsAppClick}
                disabled={!hasPhone}
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center transition-colors",
                  hasPhone 
                    ? "bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-400" 
                    : "bg-muted text-muted-foreground/50 cursor-not-allowed"
                )}
              >
                <MessageCircle className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {hasPhone ? 'Enviar WhatsApp' : 'Sem telefone'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleEmailClick}
                disabled={!hasEmail}
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center transition-colors",
                  hasEmail 
                    ? "bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-400" 
                    : "bg-muted text-muted-foreground/50 cursor-not-allowed"
                )}
              >
                <Mail className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {hasEmail ? `Email: ${lead.email}` : 'Sem email'}
            </TooltipContent>
          </Tooltip>

          {/* Property value */}
          {valorInteresse && valorInteresse > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950 px-1.5 py-0.5 rounded">
                  {formatCurrency(valorInteresse)}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Valor: R${valorInteresse.toLocaleString('pt-BR')}
              </TooltipContent>
            </Tooltip>
          )}

          {/* First Response Badge */}
          {lead.first_response_seconds !== null && lead.first_response_seconds !== undefined ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-[10px] font-medium text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/50 px-1.5 py-0.5 rounded">
                  <span>{formatResponseTime(lead.first_response_seconds)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                1ª resposta: {formatResponseTime(lead.first_response_seconds)}
              </TooltipContent>
            </Tooltip>
          ) : lead.assigned_user_id ? (
            <SlaBadge
              slaStatus={lead.sla_status ?? null}
              slaSecondsElapsed={lead.sla_seconds_elapsed ?? null}
              firstResponseAt={lead.first_response_at ?? null}
            />
          ) : null}

          {/* Cadence progress */}
          {totalTasks > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                  <CheckCircle className="h-3 w-3" />
                  <span className="font-medium">{completedTasks}/{totalTasks}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {completedTasks} de {totalTasks} atividades concluídas
              </TooltipContent>
            </Tooltip>
          )}

          {/* Time in stage */}
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
    </div>
  );
}
