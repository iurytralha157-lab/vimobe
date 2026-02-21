import { useState, useEffect } from 'react';
import { format, addMinutes, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Phone, 
  Mail, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  MessageSquare, 
  MapPin,
  X,
  Info,
  Trash2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn, getCurrentTimeForInput, getBrasiliaTime } from '@/lib/utils';
import { User } from 'lucide-react';
import { useCreateScheduleEvent, useUpdateScheduleEvent, useDeleteScheduleEvent, EventType, ScheduleEvent } from '@/hooks/use-schedule-events';
import { useUsers } from '@/hooks/use-users';

const eventTypes: { type: EventType; label: string; icon: React.ElementType }[] = [
  { type: 'call', label: 'Ligar', icon: Phone },
  { type: 'email', label: 'E-mail', icon: Mail },
  { type: 'meeting', label: 'Reunião', icon: CalendarIcon },
  { type: 'task', label: 'Tarefa', icon: CheckSquare },
  { type: 'message', label: 'Mensagem', icon: MessageSquare },
  { type: 'visit', label: 'Visita', icon: MapPin },
];

const durationOptions = [
  { value: 15, label: '15 min.' },
  { value: 20, label: '20 min.' },
  { value: 30, label: '30 min.' },
  { value: 45, label: '45 min.' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 horas' },
];

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: ScheduleEvent | null;
  leadId?: string;
  leadName?: string;
  defaultUserId?: string;
  defaultDate?: Date;
}

export function EventForm({ open, onOpenChange, event, leadId, leadName, defaultUserId, defaultDate }: EventFormProps) {
  const { data: users = [] } = useUsers();
  const createEvent = useCreateScheduleEvent();
  const updateEvent = useUpdateScheduleEvent();
  const deleteEvent = useDeleteScheduleEvent();

  const [selectedType, setSelectedType] = useState<EventType>('call');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [isCompleted, setIsCompleted] = useState(false);

  // Reset form when event changes or dialog opens
  useEffect(() => {
    if (open) {
      if (event) {
        // Editing existing event
        setSelectedType((event.event_type as EventType) || 'call');
        setTitle(event.title || '');
        setDescription(event.description || '');
        setSelectedUserId(event.user_id || defaultUserId || '');
        setDate(event.start_time ? new Date(event.start_time) : getBrasiliaTime());
        setTime(event.start_time ? format(new Date(event.start_time), 'HH:mm') : getCurrentTimeForInput());
        // Calculate duration from start and end time
        if (event.start_time && event.end_time) {
          const calculatedDuration = differenceInMinutes(new Date(event.end_time), new Date(event.start_time));
          setDuration(calculatedDuration > 0 ? calculatedDuration : 30);
        } else {
          setDuration(30);
        }
        setIsCompleted(event.status === 'completed');
      } else {
        // Creating new event
        setSelectedType('call');
        setTitle('');
        setDescription('');
        setSelectedUserId(defaultUserId || '');
        setDate(defaultDate || getBrasiliaTime());
        setTime(getCurrentTimeForInput());
        setDuration(30);
        setIsCompleted(false);
      }
    }
  }, [open, event, defaultUserId, defaultDate]);

  const maxDescriptionLength = 280;
  const remainingChars = maxDescriptionLength - description.length;

  const handleSubmit = async () => {
    if (!title.trim() || !date || !selectedUserId) return;

    const [hours, minutes] = time.split(':').map(Number);
    const startTime = new Date(date);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = addMinutes(startTime, duration);

    const eventData = {
      title: title.trim(),
      description: description.trim() || undefined,
      event_type: selectedType,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      is_all_day: false,
      user_id: selectedUserId,
      lead_id: leadId,
    };

    if (event) {
      await updateEvent.mutateAsync({ id: event.id, ...eventData, status: isCompleted ? 'completed' : 'scheduled' });
    } else {
      await createEvent.mutateAsync(eventData);
    }

    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!event) return;
    await deleteEvent.mutateAsync({ id: event.id, google_event_id: event.google_event_id });
    onOpenChange(false);
  };

  const isLoading = createEvent.isPending || updateEvent.isPending || deleteEvent.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90%] sm:max-w-[500px] sm:w-full rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {event ? 'Editar atividade' : 'Nova atividade'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Lead info if present */}
          {leadName && (
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg text-sm">
              <User className="h-4 w-4 text-primary" />
              <span>Lead: <strong>{leadName}</strong></span>
            </div>
          )}

          {/* Info banner */}
          <div className="flex items-start gap-2 p-3 bg-accent/50 rounded-lg text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>As atividades serão sincronizadas com o Google Calendar quando conectado.</span>
          </div>

          {/* Event type selector */}
          <div className="flex flex-wrap gap-2">
            {eventTypes.map(({ type, label, icon: Icon }) => (
              <Button
                key={type}
                type="button"
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => setSelectedType(type)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>

          {/* Title and User */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Assunto</Label>
              <Input
                id="title"
                placeholder="Ex: Ligar para cliente"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user">Atribuído a *</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date, Time, Duration */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora *</Label>
              <div className="relative">
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
                {time && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setTime('')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duração (min)</Label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Adicione uma descrição..."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, maxDescriptionLength))}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {remainingChars} caracteres restantes
            </p>
          </div>

          {/* Mark as completed */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="completed"
              checked={isCompleted}
              onCheckedChange={(checked) => setIsCompleted(checked as boolean)}
            />
            <Label htmlFor="completed" className="font-normal cursor-pointer">
              Marcar como concluída
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-2">
            {event ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isLoading}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. A atividade será removida permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="w-[40%] rounded-xl" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button className="w-[60%] rounded-xl" onClick={handleSubmit} disabled={isLoading || !title.trim() || !selectedUserId}>
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}