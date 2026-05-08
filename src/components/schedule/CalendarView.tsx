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

const eventTypeLightColors: Record<EventType, string> = {
  call: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
  email: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300',
  meeting: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300',
  task: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300',
  message: 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-300',
  visit: 'bg-pink-50 border-pink-200 text-pink-700 dark:bg-pink-900/20 dark:border-pink-800 dark:text-pink-300',
};

interface CalendarViewProps {
  events: ScheduleEvent[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  pivotDate: Date;
  onPivotChange: (date: Date) => void;
  viewMode: 'day' | 'week' | 'month' | 'year';
}

export function CalendarView({
  events,
  selectedDate,
  onDateSelect,
  pivotDate,
  onPivotChange,
  viewMode
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleToday} className="font-medium rounded-lg">
            Hoje
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleNavigate('prev')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleNavigate('next')}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <h2 className="text-xl font-semibold capitalize ml-2">
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
      <div className="flex flex-col h-full">
        <div className="grid grid-cols-7 mb-2 border-b">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-3">
              {day.toUpperCase()}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-muted flex-1 overflow-hidden rounded-b-xl border">
          {calendarDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate[dateKey] || [];
            const isCurrentMonth = isSameMonth(day, pivotDate);
            const isSelected = isSameDay(day, selectedDate);
            const isDayToday = isToday(day);

            return (
              <div 
                key={dateKey} 
                onClick={() => onDateSelect(day)}
                className={cn(
                  "bg-card min-h-[120px] p-2 transition-colors cursor-pointer hover:bg-accent/50",
                  !isCurrentMonth && "bg-muted/30 text-muted-foreground/50",
                  isSelected && "ring-2 ring-primary ring-inset z-10"
                )}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={cn(
                    "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
                    isDayToday && "bg-primary text-primary-foreground"
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-none">
                  {dayEvents.map(event => {
                    const Icon = eventTypeIcons[event.event_type as EventType] || CalendarIcon;
                    return (
                      <div 
                        key={event.id} 
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] border truncate flex items-center gap-1",
                          eventTypeLightColors[event.event_type as EventType] || "bg-muted border-muted"
                        )}
                      >
                        <Icon className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate">{event.title}</span>
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
      <ScrollArea className="h-[600px] border rounded-xl bg-card">
        <div className="relative flex">
          {/* Time axis */}
          <div className="w-16 border-r flex-shrink-0">
            {hours.map(hour => (
              <div key={hour.toString()} className="h-20 border-b flex justify-center pt-2">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {format(hour, 'HH:mm')}
                </span>
              </div>
            ))}
          </div>

          {/* Grid content */}
          <div className="flex-1 relative">
            {hours.map(hour => (
              <div key={hour.toString()} className="h-20 border-b w-full" />
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
                  className={cn(
                    "absolute left-2 right-2 rounded-lg border p-2 overflow-hidden shadow-sm transition-transform hover:scale-[1.01] z-10",
                    eventTypeLightColors[event.event_type as EventType]
                  )}
                  style={{ top: `${top}px`, height: `${height}px`, minHeight: '30px' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-xs font-bold truncate">{event.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] opacity-80">
                    <Clock className="h-3 w-3" />
                    <span>{format(start, 'HH:mm')} - {format(end, 'HH:mm')}</span>
                  </div>
                  {event.lead && (
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] opacity-80">
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
      <ScrollArea className="h-[600px] border rounded-xl bg-card">
        <div className="relative flex flex-col">
          {/* Header */}
          <div className="flex border-b sticky top-0 bg-card z-20">
            <div className="w-16 border-r flex-shrink-0" />
            {weekDays.map(day => (
              <div key={day.toString()} className="flex-1 border-r last:border-r-0 py-3 text-center">
                <span className="block text-[10px] text-muted-foreground font-semibold uppercase">
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span className={cn(
                  "text-lg font-bold h-9 w-9 inline-flex items-center justify-center rounded-full mt-1",
                  isToday(day) && "bg-primary text-primary-foreground"
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
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {format(hour, 'HH:mm')}
                  </span>
                </div>
              ))}
            </div>

            {/* Days columns */}
            {weekDays.map(day => (
              <div key={day.toString()} className="flex-1 border-r last:border-r-0 relative">
                {hours.map(hour => (
                  <div key={hour.toString()} className="h-20 border-b" />
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
                      className={cn(
                        "absolute left-1 right-1 rounded border p-1.5 overflow-hidden shadow-sm transition-transform hover:scale-[1.02] z-10",
                        eventTypeLightColors[event.event_type as EventType]
                      )}
                      style={{ top: `${top}px`, height: `${height}px`, minHeight: '25px' }}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon className="h-3 w-3 flex-shrink-0" />
                        <span className="text-[10px] font-bold truncate leading-tight">{event.title}</span>
                      </div>
                      <span className="text-[8px] opacity-80 block leading-tight">
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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 p-4">
        {months.map(month => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
          const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
          const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
          const weekDaysShort = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

          return (
            <div key={month.toString()} className="space-y-3">
              <h3 className="font-bold text-sm capitalize text-primary">
                {format(month, 'MMMM', { locale: ptBR })}
              </h3>
              <div className="grid grid-cols-7 gap-px">
                {weekDaysShort.map((d, i) => (
                  <div key={i} className="text-[8px] font-bold text-muted-foreground text-center pb-1">
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
                        "text-[10px] h-6 flex items-center justify-center rounded-full cursor-pointer relative",
                        !isCurrentMonth && "text-muted-foreground/30",
                        isDayToday && "bg-primary text-primary-foreground font-bold",
                        !isDayToday && isCurrentMonth && "hover:bg-accent",
                        hasEvents && !isDayToday && "font-bold text-foreground"
                      )}
                    >
                      {format(day, 'd')}
                      {hasEvents && !isDayToday && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
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
    <div className="bg-card rounded-xl p-6 border shadow-sm">
      {renderHeader()}
      
      <div className="flex-1">
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'year' && renderYearView()}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t text-xs text-muted-foreground font-medium">
        {Object.entries(eventTypeIcons).map(([type, Icon]) => (
          <div key={type} className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", eventTypeLightColors[type as EventType])}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="capitalize">
              {type === 'call' ? 'Ligação' : 
               type === 'email' ? 'E-mail' :
               type === 'meeting' ? 'Reunião' :
               type === 'task' ? 'Tarefa' :
               type === 'message' ? 'Mensagem' : 'Visita'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}