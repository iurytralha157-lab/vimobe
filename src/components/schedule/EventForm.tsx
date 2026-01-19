import { useState } from 'react';
import { format } from 'date-fns';
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
  User
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
import { cn } from '@/lib/utils';
import { useUsers } from '@/hooks/use-users';

export type EventType = 'call' | 'email' | 'meeting' | 'task' | 'message' | 'visit';

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

interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  event_type: EventType;
  start_time: string;
  duration_minutes?: number;
  user_id: string;
  lead_id?: string;
  is_completed?: boolean;
}

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: ScheduleEvent | null;
  leadId?: string;
  leadName?: string;
  defaultUserId?: string;
  defaultDate?: Date;
  onSave?: (data: Partial<ScheduleEvent>) => Promise<void>;
}

export function EventForm({ 
  open, 
  onOpenChange, 
  event, 
  leadId, 
  leadName, 
  defaultUserId, 
  defaultDate,
  onSave 
}: EventFormProps) {
  const { data: users = [] } = useUsers();

  const [selectedType, setSelectedType] = useState<EventType>(event?.event_type || 'call');
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [selectedUserId, setSelectedUserId] = useState(event?.user_id || defaultUserId || '');
  const [date, setDate] = useState<Date | undefined>(
    event?.start_time ? new Date(event.start_time) : defaultDate || new Date()
  );
  const [time, setTime] = useState(
    event?.start_time ? format(new Date(event.start_time), 'HH:mm') : format(new Date(), 'HH:mm')
  );
  const [duration, setDuration] = useState(event?.duration_minutes || 30);
  const [isCompleted, setIsCompleted] = useState(event?.is_completed || false);
  const [isLoading, setIsLoading] = useState(false);

  const maxDescriptionLength = 280;
  const remainingChars = maxDescriptionLength - description.length;

  const handleSubmit = async () => {
    if (!title.trim() || !date || !selectedUserId || !onSave) return;

    const [hours, minutes] = time.split(':').map(Number);
    const startAt = new Date(date);
    startAt.setHours(hours, minutes, 0, 0);

    setIsLoading(true);
    try {
      await onSave({
        id: event?.id,
        title: title.trim(),
        description: description.trim() || undefined,
        event_type: selectedType,
        start_time: startAt.toISOString(),
        duration_minutes: duration,
        user_id: selectedUserId,
        lead_id: leadId,
        is_completed: isCompleted,
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {event ? 'Editar atividade' : 'Nova atividade'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {leadName && (
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg text-sm">
              <User className="h-4 w-4 text-primary" />
              <span>Lead: <strong>{leadName}</strong></span>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-accent/50 rounded-lg text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>As atividades serão sincronizadas com o Google Calendar quando conectado.</span>
          </div>

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
              <Label>Duração</Label>
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

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || !title.trim() || !selectedUserId}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
