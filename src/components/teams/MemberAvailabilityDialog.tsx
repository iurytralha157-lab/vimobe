import { useState, useEffect } from 'react';
import { Clock, Loader2, CalendarDays } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMemberAvailability, useBulkUpdateMemberAvailability, getDayName, MemberAvailability } from '@/hooks/use-member-availability';

interface MemberAvailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMemberId: string;
  memberName: string;
  memberAvatar?: string | null;
}

interface DaySchedule {
  day_of_week: number;
  is_active: boolean;
  is_all_day: boolean;
  start_time: string;
  end_time: string;
}

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30',
];

const DEFAULT_START = '08:00';
const DEFAULT_END = '18:00';

export function MemberAvailabilityDialog({
  open,
  onOpenChange,
  teamMemberId,
  memberName,
  memberAvatar,
}: MemberAvailabilityDialogProps) {
  const { data: existingAvailability = [], isLoading } = useMemberAvailability(teamMemberId);
  const bulkUpdate = useBulkUpdateMemberAvailability();
  
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [globalAllDay, setGlobalAllDay] = useState(false);

  // Initialize schedules when data loads
  useEffect(() => {
    if (open) {
      const initialSchedules: DaySchedule[] = [];
      
      for (let day = 0; day < 7; day++) {
        const existing = existingAvailability.find(a => a.day_of_week === day);
        initialSchedules.push({
          day_of_week: day,
          is_active: existing?.is_active ?? (day >= 1 && day <= 5), // Default: Mon-Fri
          is_all_day: existing?.is_all_day ?? false,
          start_time: existing?.start_time?.slice(0, 5) || DEFAULT_START,
          end_time: existing?.end_time?.slice(0, 5) || DEFAULT_END,
        });
      }
      
      setSchedules(initialSchedules);
      setGlobalAllDay(initialSchedules.every(s => s.is_all_day || !s.is_active));
    }
  }, [existingAvailability, open]);

  const toggleDay = (dayOfWeek: number) => {
    setSchedules(prev => prev.map(s => 
      s.day_of_week === dayOfWeek ? { ...s, is_active: !s.is_active } : s
    ));
  };

  const updateDayTime = (dayOfWeek: number, field: 'start_time' | 'end_time', value: string) => {
    setSchedules(prev => prev.map(s => 
      s.day_of_week === dayOfWeek ? { ...s, [field]: value } : s
    ));
  };

  const toggleGlobalAllDay = (checked: boolean) => {
    setGlobalAllDay(checked);
    setSchedules(prev => prev.map(s => ({ ...s, is_all_day: checked })));
  };

  const handleSave = async () => {
    await bulkUpdate.mutateAsync({
      teamMemberId,
      availability: schedules.map(s => ({
        day_of_week: s.day_of_week,
        start_time: s.is_all_day ? null : `${s.start_time}:00`,
        end_time: s.is_all_day ? null : `${s.end_time}:00`,
        is_all_day: s.is_all_day,
        is_active: s.is_active,
      })),
    });
    onOpenChange(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const activeDays = schedules.filter(s => s.is_active).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90%] sm:max-w-lg sm:w-full rounded-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={memberAvatar || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(memberName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-left">Disponibilidade</DialogTitle>
              <p className="text-sm text-muted-foreground">{memberName}</p>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Global 24h toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Disponível 24 horas</span>
              </div>
              <Switch 
                checked={globalAllDay} 
                onCheckedChange={toggleGlobalAllDay}
              />
            </div>

            {/* Days grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Dias da semana</Label>
                <Badge variant="outline" className="text-xs">
                  {activeDays} {activeDays === 1 ? 'dia' : 'dias'} ativos
                </Badge>
              </div>
              
              <div className="space-y-2">
                {schedules.map((schedule) => (
                  <div 
                    key={schedule.day_of_week}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      schedule.is_active 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'bg-muted/30 border-transparent opacity-60'
                    }`}
                  >
                    {/* Day toggle */}
                    <Switch
                      checked={schedule.is_active}
                      onCheckedChange={() => toggleDay(schedule.day_of_week)}
                    />
                    
                    {/* Day name */}
                    <span className={`w-16 text-sm font-medium ${
                      schedule.is_active ? '' : 'text-muted-foreground'
                    }`}>
                      {getDayName(schedule.day_of_week, true)}
                    </span>

                    {/* Time selectors */}
                    {schedule.is_active && !globalAllDay && (
                      <div className="flex items-center gap-2 flex-1">
                        <Select
                          value={schedule.start_time}
                          onValueChange={(v) => updateDayTime(schedule.day_of_week, 'start_time', v)}
                        >
                          <SelectTrigger className="h-8 text-xs w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map(time => (
                              <SelectItem key={time} value={time} className="text-xs">
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">até</span>
                        <Select
                          value={schedule.end_time}
                          onValueChange={(v) => updateDayTime(schedule.day_of_week, 'end_time', v)}
                        >
                          <SelectTrigger className="h-8 text-xs w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map(time => (
                              <SelectItem key={time} value={time} className="text-xs">
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {schedule.is_active && globalAllDay && (
                      <Badge variant="secondary" className="text-xs">
                        24 horas
                      </Badge>
                    )}

                    {!schedule.is_active && (
                      <span className="text-xs text-muted-foreground">
                        Não recebe leads
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="w-[40%] rounded-xl" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="w-[60%] rounded-xl" onClick={handleSave} disabled={bulkUpdate.isPending}>
            {bulkUpdate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
