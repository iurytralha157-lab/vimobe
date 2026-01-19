import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Phone, 
  Mail, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  MessageSquare, 
  MapPin,
  Check,
  MoreHorizontal,
  Trash2,
  Edit2,
  Clock,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScheduleEvent, useCompleteScheduleEvent, useDeleteScheduleEvent, EventType } from '@/hooks/use-schedule-events';

const eventTypeIcons: Record<EventType, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: CalendarIcon,
  task: CheckSquare,
  message: MessageSquare,
  visit: MapPin,
};

const eventTypeLabels: Record<EventType, string> = {
  call: 'Ligação',
  email: 'E-mail',
  meeting: 'Reunião',
  task: 'Tarefa',
  message: 'Mensagem',
  visit: 'Visita',
};

const eventTypeColors: Record<EventType, string> = {
  call: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  email: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  meeting: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  task: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  message: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  visit: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30',
};

interface EventsListProps {
  events: ScheduleEvent[];
  onEditEvent?: (event: ScheduleEvent) => void;
  showUser?: boolean;
  showLead?: boolean;
}

export function EventsList({ events, onEditEvent, showUser = true, showLead = true }: EventsListProps) {
  const completeEvent = useCompleteScheduleEvent();
  const deleteEvent = useDeleteScheduleEvent();

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
  };

  const groupEventsByDate = (events: ScheduleEvent[]) => {
    const groups: Record<string, ScheduleEvent[]> = {};
    
    events.forEach((event) => {
      const dateKey = format(new Date(event.start_at), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  };

  const groupedEvents = groupEventsByDate(events);

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nenhuma atividade encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedEvents.map(([dateKey, dayEvents]) => (
        <div key={dateKey}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 capitalize">
            {getDateLabel(dayEvents[0].start_at)}
          </h3>
          <div className="space-y-2">
            {dayEvents.map((event) => {
              const Icon = eventTypeIcons[event.event_type as EventType];
              const isOverdue = !event.is_completed && isPast(new Date(event.start_at));
              
              return (
                <div
                  key={event.id}
                  className={cn(
                    "group flex items-start gap-3 p-3 rounded-lg border bg-card transition-all",
                    event.is_completed && "opacity-60",
                    isOverdue && "border-destructive/50 bg-destructive/5"
                  )}
                >
                  <Checkbox
                    checked={event.is_completed}
                    onCheckedChange={(checked) => {
                      completeEvent.mutate({ id: event.id, is_completed: checked as boolean });
                    }}
                    className="mt-1"
                  />

                  <div
                    className={cn(
                      "flex-shrink-0 p-2 rounded-lg",
                      eventTypeColors[event.event_type as EventType]
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={cn(
                          "font-medium",
                          event.is_completed && "line-through"
                        )}>
                          {event.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {format(new Date(event.start_at), 'HH:mm')}
                            {event.duration_minutes && ` (${event.duration_minutes} min)`}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                            {eventTypeLabels[event.event_type as EventType]}
                          </span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEditEvent?.(event)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteEvent.mutate(event.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2">
                      {showUser && event.user && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={event.user.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {event.user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate max-w-[100px]">{event.user.name}</span>
                        </div>
                      )}

                      {showLead && event.lead && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[120px]">{event.lead.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
