import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Loader2, 
  ArrowRight, 
  UserPlus, 
  UserCheck, 
  MessageCircle, 
  Phone, 
  Tag,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface HistoryEvent {
  id: string;
  type: string;
  label: string;
  content?: string | null;
  timestamp: string;
  actor?: {
    name: string;
    avatar_url?: string | null;
  } | null;
  metadata?: Record<string, unknown> | null;
  isAutomation?: boolean;
  channel?: string | null;
}

interface LeadHistoryProps {
  leadId: string;
  events?: HistoryEvent[];
  isLoading?: boolean;
}

const eventIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  lead_created: UserPlus,
  lead_assigned: UserCheck,
  first_response: Clock,
  whatsapp_message_sent: MessageCircle,
  whatsapp_message_received: MessageCircle,
  call_initiated: Phone,
  stage_changed: ArrowRight,
  note_created: FileText,
  tag_added: Tag,
  tag_removed: Tag,
  sla_warning: AlertTriangle,
  sla_overdue: AlertTriangle,
  stage_change: ArrowRight,
  note: MessageCircle,
  call: Phone,
  email: Mail,
  message: MessageCircle,
  task_completed: CheckCircle,
};

const eventColors: Record<string, { text: string; bg: string }> = {
  lead_created: { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/50' },
  lead_assigned: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/50' },
  first_response: { text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/50' },
  whatsapp_message_sent: { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/50' },
  whatsapp_message_received: { text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/50' },
  call_initiated: { text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/50' },
  stage_changed: { text: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
  note_created: { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/50' },
  tag_added: { text: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-100 dark:bg-pink-900/50' },
  tag_removed: { text: 'text-gray-500 dark:text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
  sla_warning: { text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/50' },
  sla_overdue: { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/50' },
  stage_change: { text: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
  note: { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/50' },
  call: { text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/50' },
  email: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/50' },
  message: { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/50' },
  task_completed: { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/50' },
};

const defaultColor = { text: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' };

export function LeadHistory({ leadId, events = [], isLoading = false }: LeadHistoryProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhum histórico disponível
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />
      
      <div className="space-y-3">
        {events.map((event, index) => {
          const Icon = eventIcons[event.type] || Clock;
          const colors = eventColors[event.type] || defaultColor;
          const isFirstResponse = event.type === 'first_response';
          const isFirst = index === 0;
          
          return (
            <div key={event.id} className="relative flex gap-3 pl-9">
              {/* Icon */}
              <div 
                className={cn(
                  "absolute left-0 w-7 h-7 rounded-full flex items-center justify-center",
                  colors.bg,
                  isFirst && "ring-2 ring-primary/30",
                  isFirstResponse && "ring-2 ring-yellow-400 dark:ring-yellow-600"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", colors.text)} />
              </div>
              
              {/* Content */}
              <div className={cn(
                "flex-1 pb-3 border-b border-border/50 last:border-0",
                isFirstResponse && "bg-yellow-50/50 dark:bg-yellow-900/10 -mx-2 px-2 py-2 rounded-lg border-0"
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn(
                        "text-sm font-medium",
                        isFirstResponse && "text-yellow-700 dark:text-yellow-300"
                      )}>
                        {event.label}
                      </p>
                      
                      {event.isAutomation && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                          Auto
                        </Badge>
                      )}
                      
                      {event.channel && event.type !== 'first_response' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {event.channel}
                        </Badge>
                      )}
                    </div>
                    
                    {event.content && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.content}
                      </p>
                    )}
                    
                    {/* Show metadata details for stage changes */}
                    {event.metadata && typeof event.metadata === 'object' && !event.content && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {(event.metadata as Record<string, string>).from_stage && (event.metadata as Record<string, string>).to_stage && (
                          <span className="flex items-center gap-1">
                            {(event.metadata as Record<string, string>).from_stage} 
                            <ArrowRight className="h-3 w-3" /> 
                            {(event.metadata as Record<string, string>).to_stage}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: ptBR })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(event.timestamp), 'dd/MM HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>
                
                {/* Actor info */}
                {event.actor && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={event.actor.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {event.actor.name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-muted-foreground">
                      {event.actor.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
