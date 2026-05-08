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
                viewMode={viewMode as any}
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
        <div className="w-[340px] flex-shrink-0 flex flex-col bg-muted/5 overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
              {/* 1. User Filter (Selector) */}
              {canFilterUsers && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                    Equipe
                  </label>
                  <UserFilter 
                    users={users} 
                    selectedUserId={selectedUserId} 
                    onUserSelect={setSelectedUserId} 
                  />
                </div>
              )}

              {/* 2. View Selector (dia, semana, mês, etc) */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
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
                        "rounded-2xl h-10 font-bold transition-all gap-2",
                        viewMode === mode.value ? "shadow-md shadow-primary/20" : "bg-card hover:bg-accent border-border/40"
                      )}
                    >
                      <mode.icon className="h-3.5 w-3.5" />
                      {mode.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 3. Button: Novo Agendamento */}
              <Button 
                variant="default" 
                size="lg"
                onClick={() => setEventFormOpen(true)}
                className="w-full rounded-2xl h-14 shadow-xl shadow-primary/10 gap-3 font-black text-base uppercase tracking-tight"
              >
                <Plus className="h-6 w-6" />
                Novo agendamento
              </Button>

              <Separator className="bg-border/40" />

              {/* 4. Weekly Summary (Resumo da Semana) */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                  Resumo da Semana
                </label>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card border border-border/40 p-4 rounded-3xl shadow-sm">
                    <div className="text-3xl font-black text-amber-500 mb-1">{weekStats.pending}</div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Pendentes</div>
                  </div>
                  <div className="bg-card border border-border/40 p-4 rounded-3xl shadow-sm">
                    <div className="text-3xl font-black text-emerald-500 mb-1">{weekStats.completed}</div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Concluídos</div>
                  </div>
                </div>

                <div className="bg-card border border-border/40 p-4 rounded-3xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-purple-500" />
                      Reuniões
                    </span>
                    <span className="text-foreground">{weekStats.meetings}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-pink-500" />
                      Visitas
                    </span>
                    <span className="text-foreground">{weekStats.visits}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      Tarefas
                    </span>
                    <span className="text-foreground">{weekStats.tasks}</span>
                  </div>
                </div>
              </div>

              {/* 5. Daily Activities (Atividades do Dia Selecionado) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    {startOfDay(selectedDate).getTime() === startOfDay(new Date()).getTime() ? 'Atividades de Hoje' : 'Atividades do Dia'}
                  </label>
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase">
                    {selectedDayEvents.length} atividades
                  </span>
                </div>
                
                <div className="space-y-3">
                  {selectedDayEvents.length > 0 ? (
                    selectedDayEvents.map(event => (
                      <div 
                        key={event.id} 
                        className="group bg-card border border-border/40 p-4 rounded-3xl hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                        onClick={() => handleEditEvent(event)}
                      >
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/10 group-hover:bg-primary transition-colors" />
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-black text-foreground leading-none">
                              {format(new Date(event.start_time), 'HH:mm')}
                            </span>
                            <Clock className="h-4 w-4 text-muted-foreground mt-2 opacity-50" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black truncate leading-tight mb-1.5 group-hover:text-primary transition-colors">
                              {event.title}
                            </h4>
                            <div className="flex flex-col gap-1">
                              {event.lead && (
                                <p className="text-[11px] text-muted-foreground font-bold flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-primary/30" />
                                  Lead: {event.lead.name}
                                </p>
                              )}
                              {event.user && (
                                <p className="text-[11px] text-muted-foreground font-bold flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500/30" />
                                  Responsável: {event.user.name}
                                </p>
                              )}
                            </div>
                          </div>
                          {event.status === 'completed' && (
                            <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-card border border-dashed border-border/60 p-10 rounded-[2.5rem] text-center">
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                        Sem atividades
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
