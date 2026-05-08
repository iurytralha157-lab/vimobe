import { useState, useMemo } from 'react';
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
  eachMonthOfInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Phone, Mail, Calendar as CalendarIcon, CheckSquare, MessageSquare, MapPin, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScheduleEvent, EventType } from '@/hooks/use-schedule-events';
import { ScrollArea } from '@/components/ui/scroll-area';

const eventTypeIcons: Record<EventType, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: CalendarIcon,
  task: CheckSquare,
  message: MessageSquare,
  visit: MapPin,
};

const eventTypeColors: Record<EventType, string> = {
  call: 'bg-[#E3F2FD] border-[#90CAF9] text-[#1976D2] shadow-blue-500/5',
  email: 'bg-[#FFF3E0] border-[#FFCC80] text-[#E65100] shadow-orange-500/5',
  meeting: 'bg-[#F3E5F5] border-[#CE93D8] text-[#7B1FA2] shadow-purple-500/5',
  task: 'bg-[#FFF8E1] border-[#FFE082] text-[#F57F17] shadow-amber-500/5',
  message: 'bg-[#E0F2F1] border-[#80CBC4] text-[#00796B] shadow-teal-500/5',
  visit: 'bg-[#FCE4EC] border-[#F48FB1] text-[#C2185B] shadow-pink-500/5',
};

interface CalendarViewProps {
  events: ScheduleEvent[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  pivotDate: Date;
  onPivotChange: (date: Date) => void;
  viewMode: 'day' | 'week' | 'month' | 'year';
  onEditEvent?: (event: ScheduleEvent) => void;
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
  onQuickCreate
}: CalendarViewProps) {
  const handleNavigate = (direction: 'prev' | 'next') => {
    switch (viewMode) {
      case 'day':
        onPivotChange(direction === 'prev' ? subDays(pivotDate, 1) : addDays(pivotDate, 1));
        break;
      case 'week':
        onPivotChange(direction === 'prev' ? subWeeks(pivotDate, 1) : addWeeks(pivotDate, 1));
        break;
      case 'month':
        onPivotChange(direction === 'prev' ? subMonths(pivotDate, 1) : addMonths(pivotDate, 1));
        break;
      case 'year':
        onPivotChange(direction === 'prev' ? startOfYear(subDays(startOfYear(pivotDate), 1)) : startOfYear(addDays(endOfYear(pivotDate), 1)));
        break;
    }
  };

  const handleToday = () => {
    const today = new Date();
    onPivotChange(today);
    onDateSelect(today);
  };

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
      <div className="flex items-center justify-between px-6 py-5 border-b bg-card">
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
      <div className="flex flex-col h-full overflow-hidden bg-background">
        <div className="grid grid-cols-7 border-b bg-card">
          {weekDays.map(day => (
            <div key={day} className="text-center text-[10px] font-black text-muted-foreground/60 py-4 uppercase tracking-[0.2em]">
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
      <ScrollArea className="flex-1 border-0 bg-card">
        <div className="relative flex">
          {/* Time axis */}
          <div className="w-16 border-r flex-shrink-0">
            {hours.map(hour => (
              <div key={hour.toString()} className="h-20 border-b flex justify-center pt-2">
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter opacity-50">
                  {format(hour, 'HH:mm')}
                </span>
              </div>
            ))}
          </div>

          {/* Grid content */}
          <div className="flex-1 relative">
            {hours.map(hour => (
              <div 
                key={hour.toString()} 
                className="h-20 border-b w-full cursor-pointer hover:bg-muted/30 transition-colors" 
                onClick={() => {
                  const clickDate = new Date(pivotDate);
                  clickDate.setHours(hour.getHours(), 0, 0, 0);
                  onQuickCreate?.(clickDate);
                }}
              />
            ))}

            {/* Events */}
            {dayEvents.map(event => {
              const start = parseISO(event.start_time);
              const end = parseISO(event.end_time);
              const top = (start.getHours() * 60 + start.getMinutes()) * (80 / 60);
              const duration = (end.getTime() - start.getTime()) / (1000 * 60);
              const height = duration * (80 / 60);
              const Icon = eventTypeIcons[event.event_type as EventType] || CalendarIcon;

              return (
                <div 
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditEvent?.(event);
                  }}
                  className={cn(
                    "absolute left-2 right-2 rounded-xl border p-2.5 overflow-hidden shadow-md transition-all hover:scale-[1.01] hover:z-20 z-10 group cursor-pointer",
                    eventTypeColors[event.event_type as EventType]
                  )}
                  style={{ top: `${top}px`, height: `${height}px`, minHeight: '40px' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-xs font-black truncate tracking-tight">{event.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold opacity-90">
                    <Clock className="h-3 w-3" />
                    <span>{format(start, 'HH:mm')} - {format(end, 'HH:mm')}</span>
                  </div>
                  {event.lead && (
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold opacity-90">
                      <User className="h-3 w-3" />
                      <span className="truncate">{event.lead.name}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
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
      <ScrollArea className="flex-1 border-0 bg-card">
        <div className="relative flex flex-col min-w-[800px]">
          {/* Header */}
          <div className="flex border-b sticky top-0 bg-card z-20">
            <div className="w-16 border-r flex-shrink-0" />
            {weekDays.map(day => (
              <div key={day.toString()} className="flex-1 border-r last:border-r-0 py-3 text-center">
                <span className="block text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span className={cn(
                  "text-lg font-black h-9 w-9 inline-flex items-center justify-center rounded-xl mt-1 transition-all",
                  isToday(day) ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-foreground"
                )}>
                  {format(day, 'd')}
                </span>
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex relative">
            {/* Time axis */}
            <div className="w-16 border-r flex-shrink-0">
              {hours.map(hour => (
                <div key={hour.toString()} className="h-20 border-b flex justify-center pt-2">
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter opacity-50">
                    {format(hour, 'HH:mm')}
                  </span>
                </div>
              ))}
            </div>

            {/* Days columns */}
            {weekDays.map(day => (
              <div key={day.toString()} className="flex-1 border-r last:border-r-0 relative">
                {hours.map(hour => (
                  <div 
                    key={hour.toString()} 
                    className="h-20 border-b cursor-pointer hover:bg-muted/30 transition-colors" 
                    onClick={() => {
                      const clickDate = new Date(day);
                      clickDate.setHours(hour.getHours(), 0, 0, 0);
                      onQuickCreate?.(clickDate);
                    }}
                  />
                ))}

                {/* Events for this day */}
                {(eventsByDate[format(day, 'yyyy-MM-dd')] || []).map(event => {
                  const start = parseISO(event.start_time);
                  const end = parseISO(event.end_time);
                  const top = (start.getHours() * 60 + start.getMinutes()) * (80 / 60);
                  const duration = (end.getTime() - start.getTime()) / (1000 * 60);
                  const height = duration * (80 / 60);
                  const Icon = eventTypeIcons[event.event_type as EventType] || CalendarIcon;

                  return (
                    <div 
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditEvent?.(event);
                      }}
                      className={cn(
                        "absolute left-1 right-1 rounded-lg border p-1.5 overflow-hidden shadow-md transition-all hover:scale-[1.05] hover:z-20 z-10 cursor-pointer",
                        eventTypeColors[event.event_type as EventType]
                      )}
                      style={{ top: `${top}px`, height: `${height}px`, minHeight: '30px' }}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon className="h-3 w-3 flex-shrink-0" />
                        <span className="text-[10px] font-black truncate leading-tight tracking-tighter">{event.title}</span>
                      </div>
                      <span className="text-[8px] font-bold opacity-90 block leading-tight">
                        {format(start, 'HH:mm')}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
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
