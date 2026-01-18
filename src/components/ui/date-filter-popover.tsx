import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePreset, datePresetOptions } from '@/hooks/use-dashboard-filters';
import { useIsMobile } from '@/hooks/use-mobile';

interface DateFilterPopoverProps {
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  customDateRange: { from: Date; to: Date } | null;
  onCustomDateRangeChange: (range: { from: Date; to: Date } | null) => void;
  triggerClassName?: string;
}

export function DateFilterPopover({ 
  datePreset,
  onDatePresetChange,
  customDateRange, 
  onCustomDateRangeChange,
  triggerClassName 
}: DateFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(
    customDateRange ? { from: customDateRange.from, to: customDateRange.to } : undefined
  );
  const isMobile = useIsMobile();

  const handlePresetSelect = (preset: DatePreset) => {
    if (preset === 'custom') {
      setShowCalendar(true);
    } else {
      onDatePresetChange(preset);
      setOpen(false);
      setShowCalendar(false);
    }
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setTempRange(range);
  };

  const handleApply = () => {
    if (tempRange?.from && tempRange?.to) {
      onCustomDateRangeChange({ from: tempRange.from, to: tempRange.to });
      onDatePresetChange('custom');
    }
    setOpen(false);
    setShowCalendar(false);
  };

  const handleClear = () => {
    setTempRange(undefined);
    onCustomDateRangeChange(null);
    onDatePresetChange('30days');
    setOpen(false);
    setShowCalendar(false);
  };

  const getDisplayLabel = () => {
    if (datePreset === 'custom' && customDateRange?.from && customDateRange?.to) {
      return `${format(customDateRange.from, "dd/MM/yy", { locale: ptBR })} - ${format(customDateRange.to, "dd/MM/yy", { locale: ptBR })}`;
    }
    return datePresetOptions.find(o => o.value === datePreset)?.label || 'Período';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "font-normal gap-2",
            triggerClassName
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          <span className="truncate">{getDisplayLabel()}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {!showCalendar ? (
          <div className="p-2 space-y-1">
            {datePresetOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handlePresetSelect(option.value)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors",
                  datePreset === option.value && "bg-accent font-medium"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : (
          <>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={tempRange?.from}
              selected={tempRange}
              onSelect={handleCalendarSelect}
              numberOfMonths={isMobile ? 1 : 2}
              locale={ptBR}
              className="pointer-events-auto"
            />
            <div className="flex items-center justify-between gap-2 p-3 border-t">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowCalendar(false)}
              >
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  Limpar
                </Button>
                <Button size="sm" onClick={handleApply} disabled={!tempRange?.from || !tempRange?.to}>
                  Aplicar
                </Button>
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
