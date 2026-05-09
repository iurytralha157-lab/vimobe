import { useState, useMemo, useEffect } from 'react';
import { 
  format, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, isWithinInterval,
  startOfMonth, endOfMonth, startOfYear, endOfYear
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Calendar as CalendarIcon, List, LayoutGrid, ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { CalendarView } from '@/components/schedule/CalendarView';
import { EventsList } from '@/components/schedule/EventsList';
import { EventForm } from '@/components/schedule/EventForm';
import { UserFilter } from '@/components/schedule/UserFilter';
import { useScheduleEvents, ScheduleEvent, useUpdateScheduleEvent } from '@/hooks/use-schedule-events';
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
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'year' | 'list'>(() => {
    const savedMode = localStorage.getItem('agendaViewMode');
    return (savedMode as any) || 'week';
  });

  // Salva a preferência de visualização
  useEffect(() => {
    localStorage.setItem('agendaViewMode', viewMode);
  }, [viewMode]);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const updateEventMutation = useUpdateScheduleEvent();

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
  } = useScheduleEvents({
    userId: selectedUserId || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });

  // Filter events for the selected day
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

  const handleEventUpdate = (id: string, updates: Partial<ScheduleEvent>) => {
    updateEventMutation.mutate({ id, ...updates });
  };

  // Check if user is admin or team leader
  const canFilterUsers = profile?.role === 'admin' || isTeamLeader;

  return (
    <AppLayout title="Agenda" disableMainScroll={true}>
      <div className="flex h-full overflow-hidden bg-card rounded-2xl border shadow-sm">
        {/* Main Content Area - Left */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-r border-border/40">
          <div className="flex-1 overflow-hidden">
            {viewMode !== 'list' ? (
              <CalendarView 
                events={events} 
                selectedDate={selectedDate} 
                onDateSelect={setSelectedDate}
                pivotDate={pivotDate}
                onPivotChange={setPivotDate}
                viewMode={viewMode as any}
                onEditEvent={handleEditEvent}
                onEventUpdate={handleEventUpdate}
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

        <div className="w-[320px] flex-shrink-0 flex flex-col bg-muted/20 border-l border-border/40 overflow-hidden backdrop-blur-sm">
          <ScrollArea className="flex-1">
            <div className="p-5 space-y-6">
              {/* 1. Primary Action */}
              <Button 
                variant="default" 
                size="lg"
                onClick={() => setEventFormOpen(true)}
                className="w-full rounded-2xl h-12 shadow-lg shadow-primary/20 gap-2 font-bold text-sm uppercase tracking-wider group"
              >
                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                Novo agendamento
              </Button>

              <Separator className="bg-border/40" />

              {/* 2. Filters & View */}
              <div className="space-y-5">
                {canFilterUsers && (
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      Filtro por Equipe
                    </label>
                    <UserFilter 
                      users={users} 
                      selectedUserId={selectedUserId} 
                      onUserSelect={setSelectedUserId} 
                    />
                  </div>
                )}

                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
                    <div className="h-1 w-1 rounded-full bg-primary" />
                    Visualização
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'day', label: 'Dia', icon: Clock },
                      { value: 'week', label: 'Semana', icon: LayoutGrid },
                      { value: 'month', label: 'Mês', icon: CalendarIcon },
                      { value: 'list', label: 'Lista', icon: List }
                    ].map((mode) => (
                      <Button
                        key={mode.value}
                        variant={viewMode === mode.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode(mode.value as any)}
                        className={cn(
                          "rounded-xl h-9 text-xs font-semibold transition-all gap-2",
                          viewMode === mode.value 
                            ? "shadow-sm shadow-primary/20" 
                            : "bg-card border-border/40 hover:bg-accent"
                        )}
                      >
                        <mode.icon className={cn("h-3.5 w-3.5", viewMode === mode.value ? "text-primary-foreground" : "text-primary")} />
                        {mode.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <Separator className="bg-border/40" />

              {/* 3. Weekly Summary */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  Resumo da Semana
                </label>
                
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-card/50 border border-border/40 p-3.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-2xl font-black text-amber-500">{weekStats.pending}</div>
                      <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                    </div>
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Pendentes</div>
                  </div>
                  <div className="bg-card/50 border border-border/40 p-3.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-2xl font-black text-emerald-500">{weekStats.completed}</div>
                      <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                    </div>
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Concluídos</div>
                  </div>
                </div>

                <div className="bg-card/50 border border-border/40 p-3 rounded-2xl shadow-sm space-y-2.5">
                  {[
                    { label: 'Reuniões', value: weekStats.meetings, color: 'bg-purple-500' },
                    { label: 'Visitas', value: weekStats.visits, color: 'bg-pink-500' },
                    { label: 'Tarefas', value: weekStats.tasks, color: 'bg-blue-500' }
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between text-[11px] font-bold">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <div className={cn("h-1.5 w-1.5 rounded-full", stat.color)} />
                        {stat.label}
                      </span>
                      <span className="text-foreground/80">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Selected Day Activities */}
              <div className="space-y-4 pb-4">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary" />
                    {startOfDay(selectedDate).getTime() === startOfDay(new Date()).getTime() ? 'Hoje' : format(selectedDate, 'dd/MM')}
                  </label>
                  <span className="text-[9px] font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full uppercase tracking-tighter">
                    {selectedDayEvents.length} atividades
                  </span>
                </div>
                
                <div className="space-y-2.5">
                  {selectedDayEvents.length > 0 ? (
                    selectedDayEvents.map(event => (
                      <div 
                        key={event.id} 
                        className="group bg-card/80 border border-border/40 p-3.5 rounded-2xl hover:border-primary/40 hover:bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden"
                        onClick={() => handleEditEvent(event)}
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/10 group-hover:bg-primary transition-colors" />
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center pt-0.5">
                            <span className="text-[10px] font-black text-foreground/80 leading-none">
                              {format(new Date(event.start_time), 'HH:mm')}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-black truncate leading-tight mb-1 group-hover:text-primary transition-colors">
                              {event.title}
                            </h4>
                            <div className="flex flex-col gap-0.5">
                              {event.lead && (
                                <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5">
                                  <span className="h-1 w-1 rounded-full bg-primary/40" />
                                  {event.lead.name}
                                </p>
                              )}
                              {event.user && (
                                <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5">
                                  <span className="h-1 w-1 rounded-full bg-emerald-500/40" />
                                  {event.user.name}
                                </p>
                              )}
                            </div>
                          </div>
                          {event.status === 'completed' && (
                            <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-card/30 border border-dashed border-border/60 p-8 rounded-2xl text-center">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                        Nenhuma atividade
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
