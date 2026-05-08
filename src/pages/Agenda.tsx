import { useState, useMemo } from 'react';
import { 
  format, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, isWithinInterval,
  startOfMonth, endOfMonth, startOfYear, endOfYear
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Calendar as CalendarIcon, List, LayoutGrid, ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarView } from '@/components/schedule/CalendarView';
import { EventsList } from '@/components/schedule/EventsList';
import { EventForm } from '@/components/schedule/EventForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { UserFilter } from '@/components/schedule/UserFilter';
import { useScheduleEvents, ScheduleEvent } from '@/hooks/use-schedule-events';
import { useUsers } from '@/hooks/use-users';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function Agenda() {
  const {
    profile
  } = useAuth();
  
  // Check if user is team leader via RPC
  const { data: isTeamLeader = false } = useQuery({
    queryKey: ['is-team-leader', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return false;
      const { data } = await supabase.rpc('is_team_leader', { check_user_id: profile.id });
      return data || false;
    },
    enabled: !!profile?.id,
  });
  const {
    data: users = []
  } = useUsers();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pivotDate, setPivotDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'year' | 'list'>('month');
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);

  // Determine date range based on view
  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return { startDate: startOfDay(pivotDate), endDate: endOfDay(pivotDate) };
      case 'week':
        return { startDate: startOfWeek(pivotDate, { weekStartsOn: 0 }), endDate: endOfWeek(pivotDate, { weekStartsOn: 0 }) };
      case 'month':
        return { 
          startDate: startOfWeek(startOfMonth(pivotDate), { weekStartsOn: 0 }), 
          endDate: endOfWeek(endOfMonth(pivotDate), { weekStartsOn: 0 }) 
        };
      case 'year':
        return { startDate: startOfYear(pivotDate), endDate: endOfYear(pivotDate) };
      case 'list':
      default:
        return { startDate: startOfDay(new Date()), endDate: addDays(new Date(), 30) };
    }
  }, [pivotDate, viewMode]);
  const {
    data: events = [],
    isLoading
  } = useScheduleEvents({
    userId: selectedUserId || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });

  // Filter events for the selected day (for list view)
  const selectedDayEvents = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= dayStart && eventDate <= dayEnd;
    });
  }, [events, selectedDate]);

  // Statistics for the current week
  const weekStats = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
    
    const weekEvents = events.filter(e => {
      const eventDate = new Date(e.start_time);
      return isWithinInterval(eventDate, { start: weekStart, end: weekEnd });
    });

    return {
      pending: weekEvents.filter(e => e.status !== 'completed').length,
      completed: weekEvents.filter(e => e.status === 'completed').length,
      meetings: weekEvents.filter(e => e.event_type === 'meeting').length,
      visits: weekEvents.filter(e => e.event_type === 'visit').length,
      tasks: weekEvents.filter(e => e.event_type === 'task').length
    };
  }, [events]);

  // Upcoming events for today and next 7 days
  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());
    const nextWeek = addDays(today, 7);
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= today && eventDate <= nextWeek && event.status !== 'completed';
    }).slice(0, 10);
  }, [events]);

  const handleEditEvent = (event: ScheduleEvent) => {
    setEditingEvent(event);
    setEventFormOpen(true);
  };

  const handleCloseEventForm = () => {
    setEventFormOpen(false);
    setEditingEvent(null);
  };

  // Check if user is admin or team leader
  const canFilterUsers = profile?.role === 'admin' || isTeamLeader;
  return (
    <AppLayout title="Agenda" disableMainScroll={true}>
      <div className="flex h-full overflow-hidden bg-background -m-4 md:-m-6">
        {/* Main Content Area - Left */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-r">
          <div className="flex-1 overflow-hidden">
            {viewMode !== 'list' ? (
              <CalendarView 
                events={events} 
                selectedDate={selectedDate} 
                onDateSelect={setSelectedDate}
                pivotDate={pivotDate}
                onPivotChange={setPivotDate}
                viewMode={viewMode}
                onEditEvent={handleEditEvent}
                onQuickCreate={(date) => {
                  setSelectedDate(date);
                  setEventFormOpen(true);
                }}
              />
            ) : (
              <div className="h-full p-6 overflow-y-auto">
                <div className="bg-card rounded-2xl border shadow-sm p-6">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <List className="h-5 w-5 text-primary" />
                    Próximas atividades
                  </h3>
                  <EventsList events={upcomingEvents} onEditEvent={handleEditEvent} showUser={canFilterUsers} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Right */}
        <div className="w-[320px] flex-shrink-0 flex flex-col bg-muted/10 overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-5 space-y-6">
              {/* Button: Novo Agendamento */}
              <Button 
                variant="default" 
                size="lg"
                onClick={() => setEventFormOpen(true)}
                className="w-full rounded-2xl h-12 shadow-lg shadow-primary/20 gap-2 font-bold"
              >
                <Plus className="h-5 w-5" />
                Novo agendamento
              </Button>

              <Separator className="bg-border/40" />

              {/* Navigation Calendar (Datepicker style) */}
              <div className="bg-card rounded-2xl border border-border/40 p-1 shadow-sm overflow-hidden">
                <Calendar
                  mode="single"
                  selected={pivotDate}
                  onSelect={(date) => date && setPivotDate(date)}
                  locale={ptBR}
                  className="w-full"
                  classNames={{
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                    head_cell: "text-muted-foreground font-normal text-[0.8rem] w-9",
                    cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                    day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-xl hover:bg-accent transition-colors",
                  }}
                />
              </div>

              {/* User Filter (Selector) */}
              {canFilterUsers && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                    Filtrar por Usuário
                  </label>
                  <UserFilter 
                    users={users} 
                    selectedUserId={selectedUserId} 
                    onUserSelect={setSelectedUserId} 
                  />
                </div>
              )}

              {/* View Selector (dia, semana, mês, etc) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                  Visualização
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'day', label: 'Dia' },
                    { value: 'week', label: 'Semana' },
                    { value: 'month', label: 'Mês' },
                    { value: 'list', label: 'Lista' }
                  ].map((mode) => (
                    <Button
                      key={mode.value}
                      variant={viewMode === mode.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode(mode.value as any)}
                      className={cn(
                        "rounded-xl h-9 font-medium transition-all",
                        viewMode === mode.value ? "shadow-md shadow-primary/10" : "bg-card hover:bg-accent"
                      )}
                    >
                      {mode.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Weekly Summary (Resumo da Semana) */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                  Resumo da Semana
                </label>
                {(() => {
                  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
                  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
                  const weekEvents = events.filter(e => {
                    const eventDate = new Date(e.start_time);
                    return isWithinInterval(eventDate, { start: weekStart, end: weekEnd });
                  });
                  const pendingCount = weekEvents.filter(e => e.status !== 'completed').length;
                  const completedCount = weekEvents.filter(e => e.status === 'completed').length;

                  return (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-card border border-border/40 p-3 rounded-2xl shadow-sm text-center">
                        <div className="text-2xl font-black text-amber-500">{pendingCount}</div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Pendentes</div>
                      </div>
                      <div className="bg-card border border-border/40 p-3 rounded-2xl shadow-sm text-center">
                        <div className="text-2xl font-black text-emerald-500">{completedCount}</div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Concluídos</div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Daily Activities (Atividades do Dia Selecionado) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {startOfDay(selectedDate).getTime() === startOfDay(new Date()).getTime() ? 'Atividades de Hoje' : 'Atividades do Dia'}
                  </label>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {selectedDayEvents.length}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {selectedDayEvents.length > 0 ? (
                    selectedDayEvents.map(event => (
                      <div 
                        key={event.id} 
                        className="group bg-card border border-border/40 p-3 rounded-2xl hover:border-primary/50 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                        onClick={() => handleEditEvent(event)}
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-black text-foreground leading-none">
                              {format(new Date(event.start_time), 'HH:mm')}
                            </span>
                            <Clock className="h-3 w-3 text-muted-foreground mt-1" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold truncate leading-tight mb-0.5">
                              {event.title}
                            </h4>
                            {event.lead && (
                              <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                <span className="h-1 w-1 rounded-full bg-primary/50" />
                                {event.lead.name}
                              </p>
                            )}
                          </div>
                          {event.status === 'completed' && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-card border border-dashed border-border/60 p-6 rounded-2xl text-center">
                      <p className="text-xs text-muted-foreground font-medium">
                        Nenhuma atividade para este dia
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Event form dialog */}
      <EventForm 
        open={eventFormOpen} 
        onOpenChange={handleCloseEventForm} 
        event={editingEvent} 
        defaultUserId={selectedUserId || profile?.id} 
        defaultDate={selectedDate} 
      />
    </AppLayout>
  );
}