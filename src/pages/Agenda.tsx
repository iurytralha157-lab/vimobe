import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Calendar as CalendarIcon, List, LayoutGrid } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarView } from '@/components/schedule/CalendarView';
import { EventsList } from '@/components/schedule/EventsList';
import { EventForm } from '@/components/schedule/EventForm';
import { GoogleCalendarConnect } from '@/components/schedule/GoogleCalendarConnect';
import { UserFilter } from '@/components/schedule/UserFilter';
import { useScheduleEvents, ScheduleEvent } from '@/hooks/use-schedule-events';
import { useUsers } from '@/hooks/use-users';
import { useAuth } from '@/contexts/AuthContext';

export default function Agenda() {
  const { profile } = useAuth();
  const { data: users = [] } = useUsers();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);

  // Determine date range based on view
  const dateRange = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
    return {
      startDate: addDays(weekStart, -35), // Include previous month
      endDate: addDays(weekEnd, 35), // Include next month
    };
  }, [selectedDate]);

  const { data: events = [], isLoading } = useScheduleEvents({
    userId: selectedUserId || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  // Filter events for the selected day (for list view)
  const selectedDayEvents = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);
    
    return events.filter((event) => {
      const eventDate = new Date(event.start_time);
      return eventDate >= dayStart && eventDate <= dayEnd;
    });
  }, [events, selectedDate]);

  // Upcoming events for today and next 7 days
  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());
    const nextWeek = addDays(today, 7);
    
    return events
      .filter((event) => {
        const eventDate = new Date(event.start_time);
        return eventDate >= today && eventDate <= nextWeek && event.status !== 'completed';
      })
      .slice(0, 10);
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
  const canFilterUsers = profile?.role === 'admin';

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Agenda</h1>
            <p className="text-muted-foreground">
              Gerencie suas atividades e compromissos
            </p>
          </div>

          <div className="flex items-center gap-3">
            {canFilterUsers && (
              <UserFilter
                users={users}
                selectedUserId={selectedUserId}
                onUserSelect={setSelectedUserId}
              />
            )}

            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={() => setEventFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova atividade
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-[1fr,350px] gap-6">
          {/* Calendar / List view */}
          <div>
            {viewMode === 'calendar' ? (
              <CalendarView
                events={events}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
            ) : (
              <div className="bg-card rounded-xl border p-4">
                <h3 className="font-semibold mb-4">
                  Próximas atividades
                </h3>
                <EventsList
                  events={upcomingEvents}
                  onEditEvent={handleEditEvent}
                  showUser={canFilterUsers}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Google Calendar Connect */}
            <GoogleCalendarConnect />

            {/* Quick stats */}
            <div className="bg-card rounded-xl border p-4 space-y-4">
              <h3 className="font-semibold">Resumo da semana</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-accent/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {events.filter(e => e.status !== 'completed').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
                <div className="text-center p-3 bg-success/10 rounded-lg">
                  <p className="text-2xl font-bold text-success">
                    {events.filter(e => e.status === 'completed').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Concluídas</p>
                </div>
              </div>
            </div>

            {/* Atividades do dia selecionado */}
            <div className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold mb-3">
                {startOfDay(selectedDate).getTime() === startOfDay(new Date()).getTime()
                  ? 'Hoje'
                  : format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                {selectedDayEvents.length > 0 ? (
                  selectedDayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => handleEditEvent(event)}
                    >
                      <div className="text-sm font-medium text-muted-foreground w-12">
                        {format(new Date(event.start_time), 'HH:mm')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        {event.lead && (
                          <p className="text-xs text-muted-foreground truncate">
                            {event.lead.name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma atividade para este dia
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Event form dialog */}
        <EventForm
          open={eventFormOpen}
          onOpenChange={handleCloseEventForm}
          event={editingEvent}
          defaultUserId={profile?.id}
          defaultDate={selectedDate}
        />
      </div>
    </AppLayout>
  );
}