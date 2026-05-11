import { useState, useMemo, useCallback } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek, 
  parseISO,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  eachHourOfInterval,
  isSameHour,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  differenceInMinutes,
  addMinutes,
  setHours,
  setMinutes
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Phone, Mail, Calendar as CalendarIcon, CheckSquare, MessageSquare, MapPin, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScheduleEvent, EventType } from '@/hooks/use-schedule-events';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DndContext, 
  DragEndEvent, 
  useDraggable, 
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';

const eventTypeIcons: Record<EventType, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: CalendarIcon,
  task: CheckSquare,
  message: MessageSquare,
  visit: MapPin,
};

const eventTypeColors: Record<EventType, string> = {
  call: 'bg-blue-600 border-blue-700/50 text-white shadow-sm',
  email: 'bg-orange-500 border-orange-600/50 text-white shadow-sm',
  meeting: 'bg-purple-600 border-purple-700/50 text-white shadow-sm',
  task: 'bg-amber-500 border-amber-600/50 text-white shadow-sm',
  message: 'bg-emerald-600 border-emerald-700/50 text-white shadow-sm',
  visit: 'bg-pink-600 border-pink-700/50 text-white shadow-sm',
};

interface ActivityCardProps {
  event: ScheduleEvent;
  onEditEvent?: (event: ScheduleEvent) => void;
  isDragging?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

function ActivityCard({ event, onEditEvent, isDragging, style, className }: ActivityCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: event.id,
    data: event
  });

  const start = parseISO(event.start_time);
  const end = parseISO(event.end_time);
  const duration = differenceInMinutes(end, start);
  const Icon = eventTypeIcons[event.event_type as EventType] || CalendarIcon;
  
  // Compact mode for short activities (less than 45 mins)
  const isCompact = duration < 45;

  const dragStyle = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 100,
    opacity: 0.8,
  } : undefined;

  return (
    <div 
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onEditEvent?.(event);
      }}
      className={cn(
        "absolute left-1 right-1 rounded-[4px] border-2 overflow-hidden shadow-sm transition-shadow hover:shadow-md z-10 cursor-grab active:cursor-grabbing group",
        eventTypeColors[event.event_type as EventType],
        isDragging && "opacity-50 grayscale",
        className
      )}
      style={{ ...style, ...dragStyle }}
    >
      <div className={cn(
        "flex h-full",
        isCompact ? "flex-row items-center gap-2 px-2 py-1" : "flex-col p-2"
      )}>
        <div className={cn(
          "flex items-center gap-2",
          !isCompact && "mb-1.5"
        )}>
          <div className={cn(
            "rounded bg-white/20 text-white shrink-0",
            isCompact ? "p-0.5" : "p-1"
          )}>
            <Icon className={cn(isCompact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          </div>
          <span className={cn(
            "font-black truncate tracking-tight",
            isCompact ? "text-[10px]" : "text-[11px] leading-tight"
          )}>
            {event.title}
          </span>
        </div>

        <div className={cn(
          "flex items-center gap-2 text-[9px] font-bold opacity-80 tabular-nums shrink-0",
          isCompact ? "ml-auto" : "mt-auto"
        )}>
          <div className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            <span>{format(start, 'HH:mm')}{!isCompact && ` - ${format(end, 'HH:mm')}`}</span>
          </div>
          {!isCompact && event.lead && (
            <div className="flex items-center gap-1 max-w-[80px]">
              <User className="h-2.5 w-2.5" />
              <span className="truncate">{event.lead.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DroppableSlot({ 
  id, 
  onQuickCreate, 
  className, 
  children 
}: { 
  id: string; 
  onQuickCreate?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        className,
        isOver && "bg-primary/[0.05] ring-2 ring-primary/20 ring-inset z-0"
      )}
      onClick={onQuickCreate}
    >
      {children}
    </div>
  );
}

interface CalendarViewProps {
  events: ScheduleEvent[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  pivotDate: Date;
  onPivotChange: (date: Date) => void;
  viewMode: 'day' | 'week' | 'month' | 'year';
  onEditEvent?: (event: ScheduleEvent) => void;
  onEventUpdate?: (id: string, updates: Partial<ScheduleEvent>) => void;
  onQuickCreate?: (date: Date) => void;
}

export function CalendarView({
  events,
  selectedDate,
  onDateSelect,
  pivotDate,
  onPivotChange,
  viewMode,
  onEditEvent,
  onEventUpdate,
  onQuickCreate
}: CalendarViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  const [activeEvent, setActiveEvent] = useState<ScheduleEvent | null>(null);

  const handleDragStart = (event: any) => {
    setActiveEvent(event.active.data.current);
  };

  const calculateEventLayouts = useCallback((dayEvents: ScheduleEvent[]) => {
    if (dayEvents.length === 0) return [];

    // Sort events by start time, then duration
    const sorted = [...dayEvents].sort((a, b) => {
      const startA = new Date(a.start_time).getTime();
      const startB = new Date(b.start_time).getTime();
      if (startA !== startB) return startA - startB;
      
      const durA = new Date(a.end_time).getTime() - startA;
      const durB = new Date(b.end_time).getTime() - startB;
      return durB - durA;
    });

    const layouts: { event: ScheduleEvent; column: number; totalColumns: number }[] = [];
    let currentCluster: ScheduleEvent[] = [];
    let clusterMaxEnd = 0;

    const processCluster = (cluster: ScheduleEvent[]) => {
      if (cluster.length === 0) return;

      const columns: ScheduleEvent[][] = [];
      cluster.forEach(event => {
        let placed = false;
        const eventStart = new Date(event.start_time).getTime();

        for (let i = 0; i < columns.length; i++) {
          const lastEventInCol = columns[i][columns[i].length - 1];
          if (eventStart >= new Date(lastEventInCol.end_time).getTime()) {
            columns[i].push(event);
            layouts.push({ event, column: i, totalColumns: 0 });
            placed = true;
            break;
          }
        }

        if (!placed) {
          columns.push([event]);
          layouts.push({ event, column: columns.length - 1, totalColumns: 0 });
        }
      });

      // Update totalColumns for all events in this cluster
      cluster.forEach(event => {
        const layout = layouts.find(l => l.event.id === event.id);
        if (layout) layout.totalColumns = columns.length;
      });
    };

    sorted.forEach(event => {
      const eventStart = new Date(event.start_time).getTime();
      
      if (eventStart >= clusterMaxEnd && currentCluster.length > 0) {
        processCluster(currentCluster);
        currentCluster = [];
        clusterMaxEnd = 0;
      }

      currentCluster.push(event);
      const eventEnd = new Date(event.end_time).getTime();
      if (eventEnd > clusterMaxEnd) clusterMaxEnd = eventEnd;
    });

    processCluster(currentCluster);
    return layouts;
  }, []);

  const handleNavigate = (direction: 'prev' | 'next') => {
...
  const eventsByDate = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {};
    events.forEach(event => {
      const dateKey = format(parseISO(event.start_time), 'yyyy-MM-dd');
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(event);
    });
    return map;
  }, [events]);

  const renderHeader = () => {
    let label = '';
    switch (viewMode) {
      case 'day':
        label = format(pivotDate, "dd 'de' MMMM, yyyy", { locale: ptBR });
        break;
      case 'week':
        const weekStart = startOfWeek(pivotDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(pivotDate, { weekStartsOn: 0 });
        label = `${format(weekStart, 'dd')} - ${format(weekEnd, 'dd')} de ${format(weekEnd, 'MMMM, yyyy', { locale: ptBR })}`;
        break;
      case 'month':
        label = format(pivotDate, 'MMMM yyyy', { locale: ptBR });
        break;
      case 'year':
        label = format(pivotDate, 'yyyy');
        break;
    }

    return (
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleToday} className="font-black rounded-2xl h-10 px-6 border-border/60 hover:bg-accent transition-all text-xs uppercase tracking-widest">
            Hoje
          </Button>
          <div className="flex items-center bg-muted/30 border border-border/40 rounded-2xl p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-card hover:shadow-sm" onClick={() => handleNavigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-card hover:shadow-sm" onClick={() => handleNavigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-xl font-black capitalize ml-4 tracking-tight text-foreground/90">
            {label}
          </h2>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(pivotDate);
    const monthEnd = endOfMonth(pivotDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
      <div className="flex flex-col h-full overflow-hidden bg-transparent">
        <div className="grid grid-cols-7 border-b bg-card">
          {weekDays.map(day => (
            <div key={day} className="text-center text-[10px] font-black text-muted-foreground/60 py-2.5 uppercase tracking-[0.2em]">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-border/20 flex-1 overflow-hidden">
          {calendarDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate[dateKey] || [];
            const isCurrentMonth = isSameMonth(day, pivotDate);
            const isSelected = isSameDay(day, selectedDate);
            const isDayToday = isToday(day);

            return (
              <div 
                key={dateKey} 
                onClick={() => {
                  onDateSelect(day);
                  if (dayEvents.length === 0) {
                    onQuickCreate?.(day);
                  }
                }}
                className={cn(
                  "bg-card min-h-[120px] p-3 transition-all cursor-pointer hover:bg-muted/5 group relative",
                  !isCurrentMonth && "bg-muted/5 opacity-30",
                  isSelected && "bg-primary/[0.03] ring-1 ring-primary/10 ring-inset z-10"
                )}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className={cn(
                    "text-xs font-black h-8 w-8 flex items-center justify-center rounded-xl transition-all",
                    isDayToday ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-1.5 overflow-y-auto max-h-[85px] scrollbar-none pr-1">
                  {dayEvents.map(event => {
                    const Icon = eventTypeIcons[event.event_type as EventType] || CalendarIcon;
                    return (
                      <div 
                        key={event.id} 
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditEvent?.(event);
                        }}
                        className={cn(
                          "px-2 py-1.5 rounded-xl text-[10px] font-black border truncate flex items-center gap-2 shadow-sm transition-all hover:scale-[1.03] active:scale-95",
                          eventTypeColors[event.event_type as EventType] || "bg-muted border-muted"
                        )}
                      >
                        <Icon className="h-3 w-3 flex-shrink-0 opacity-80" />
                        <span className="truncate tracking-tight">{event.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = eachHourOfInterval({
      start: startOfDay(pivotDate),
      end: endOfDay(pivotDate)
    });

    const dayEvents = eventsByDate[format(pivotDate, 'yyyy-MM-dd')] || [];

    return (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <ScrollArea className="h-full border-0 bg-transparent">
          <div className="relative flex min-h-full">
            {/* Time axis */}
            <div className="w-16 border-r border-border/40 flex-shrink-0 bg-card/50">
              {hours.map(hour => (
                <div key={hour.toString()} className="h-14 border-b border-border/40 flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-tighter tabular-nums">
                    {format(hour, 'HH:mm')}
                  </span>
                </div>
              ))}
            </div>

            {/* Grid content */}
            <div className="flex-1 relative">
              {hours.map(hour => {
                const slotId = `${format(pivotDate, 'yyyy-MM-dd')}|${format(hour, 'HH:mm')}`;
                return (
                  <DroppableSlot 
                    key={slotId} 
                    id={slotId}
                    className="h-14 border-b border-border/40 w-full cursor-pointer hover:bg-primary/[0.02] transition-colors" 
                    onQuickCreate={() => {
                      const clickDate = new Date(pivotDate);
                      clickDate.setHours(hour.getHours(), 0, 0, 0);
                      onQuickCreate?.(clickDate);
                    }}
                  />
                );
              })}

              {/* Events */}
              {dayEvents.map(event => {
                const start = parseISO(event.start_time);
                const end = parseISO(event.end_time);
                const top = (start.getHours() * 60 + start.getMinutes()) * (56 / 60);
                const duration = Math.max((end.getTime() - start.getTime()) / (1000 * 60), 15);
                const height = duration * (56 / 60);

                return (
                  <ActivityCard
                    key={event.id}
                    event={event}
                    onEditEvent={onEditEvent}
                    style={{ top: `${top}px`, height: `${height}px`, minHeight: '32px' }}
                  />
                );
              })}
            </div>
          </div>
        </ScrollArea>
        <DragOverlay>
          {activeEvent ? (
            <ActivityCard 
              event={activeEvent} 
              className="w-[150px] relative left-0 right-0" 
              style={{ position: 'relative', top: 0, height: '56px' }} 
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(pivotDate, { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = eachHourOfInterval({
      start: startOfDay(new Date()),
      end: endOfDay(new Date())
    });

    return (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <ScrollArea className="h-full border-0 bg-transparent">
          <div className="relative flex flex-col min-w-[1000px] min-h-full">
            {/* Header */}
            <div className="flex border-b border-border/40 sticky top-0 bg-card z-20 shadow-sm">
              <div className="w-16 border-r border-border/40 flex-shrink-0 bg-card/50" />
              {weekDays.map(day => (
                <div key={day.toString()} className="flex-1 border-r border-border/40 last:border-r-0 py-2.5 text-center">
                  <span className="block text-[10px] text-muted-foreground/60 font-black uppercase tracking-[0.2em] mb-1">
                    {format(day, 'EEE', { locale: ptBR })}
                  </span>
                  <span className={cn(
                    "text-base font-black h-8 w-8 inline-flex items-center justify-center rounded-xl transition-all",
                    isToday(day) ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" : "text-foreground"
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex relative flex-1">
              {/* Time axis */}
              <div className="w-16 border-r border-border/40 flex-shrink-0 bg-card/50">
                {hours.map(hour => (
                  <div key={hour.toString()} className="h-14 border-b border-border/40 flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-tighter tabular-nums">
                      {format(hour, 'HH:mm')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Days columns */}
              {weekDays.map(day => (
                <div key={day.toString()} className="flex-1 border-r border-border/40 last:border-r-0 relative">
                  {hours.map(hour => {
                    const slotId = `${format(day, 'yyyy-MM-dd')}|${format(hour, 'HH:mm')}`;
                    return (
                      <DroppableSlot 
                        key={slotId}
                        id={slotId}
                        className="h-14 border-b border-border/40 cursor-pointer hover:bg-primary/[0.01] transition-colors" 
                        onQuickCreate={() => {
                          const clickDate = new Date(day);
                          clickDate.setHours(hour.getHours(), 0, 0, 0);
                          onQuickCreate?.(clickDate);
                        }}
                      />
                    );
                  })}

                  {/* Events for this day */}
                  {(eventsByDate[format(day, 'yyyy-MM-dd')] || []).map(event => {
                    const start = parseISO(event.start_time);
                    const end = parseISO(event.end_time);
                    const top = (start.getHours() * 60 + start.getMinutes()) * (56 / 60);
                    const duration = Math.max((end.getTime() - start.getTime()) / (1000 * 60), 15);
                    const height = duration * (56 / 60);

                    return (
                      <ActivityCard
                        key={event.id}
                        event={event}
                        onEditEvent={onEditEvent}
                        style={{ top: `${top}px`, height: `${height}px`, minHeight: '32px' }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
        <DragOverlay>
          {activeEvent ? (
            <ActivityCard 
              event={activeEvent} 
              className="w-[150px] relative left-0 right-0" 
              style={{ position: 'relative', top: 0, height: '56px' }} 
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  };

  const renderYearView = () => {
    const yearStart = startOfYear(pivotDate);
    const months = eachMonthOfInterval({
      start: yearStart,
      end: endOfYear(pivotDate)
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 p-6 h-full overflow-y-auto">
        {months.map(month => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
          const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
          const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
          const weekDaysShort = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

          return (
            <div key={month.toString()} className="space-y-4 bg-card border p-4 rounded-2xl shadow-sm">
              <h3 className="font-black text-sm capitalize text-primary tracking-wider text-center">
                {format(month, 'MMMM', { locale: ptBR })}
              </h3>
              <div className="grid grid-cols-7 gap-px">
                {weekDaysShort.map((d, i) => (
                  <div key={i} className="text-[9px] font-black text-muted-foreground text-center pb-2 uppercase opacity-50">
                    {d}
                  </div>
                ))}
                {calendarDays.map(day => {
                  const hasEvents = (eventsByDate[format(day, 'yyyy-MM-dd')] || []).length > 0;
                  const isCurrentMonth = isSameMonth(day, month);
                  const isDayToday = isToday(day);

                  return (
                    <div 
                      key={day.toString()} 
                      onClick={() => {
                        onDateSelect(day);
                        onPivotChange(day);
                      }}
                      className={cn(
                        "text-[10px] h-7 flex items-center justify-center rounded-lg cursor-pointer relative font-bold",
                        !isCurrentMonth && "opacity-10",
                        isDayToday && "bg-primary text-primary-foreground shadow-sm shadow-primary/20",
                        !isDayToday && isCurrentMonth && "hover:bg-accent",
                        hasEvents && !isDayToday && "text-primary ring-1 ring-primary/20"
                      )}
                    >
                      {format(day, 'd')}
                      {hasEvents && !isDayToday && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      {renderHeader()}
      
      <div className="flex-1 overflow-hidden">
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'year' && renderYearView()}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 px-6 py-4 border-t bg-muted/10">
        {Object.entries(eventTypeIcons).map(([type, Icon]) => (
          <div key={type} className="flex items-center gap-2 group cursor-default">
            <div className={cn("p-1.5 rounded-lg shadow-sm transition-transform group-hover:scale-110", eventTypeColors[type as EventType])}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
              {type === 'call' ? 'Ligação' : 
               type === 'email' ? 'E-mail' :
               type === 'meeting' ? 'Reunião' :
               type === 'task' ? 'Tarefa' :
               type === 'message' ? 'Mensagem' :
               type === 'visit' ? 'Visita' : type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
