import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  DatePreset, 
  datePresetOptions,
} from '@/hooks/use-dashboard-filters';

interface DateFilterPopoverProps {
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  customDateRange?: { from: Date; to: Date } | null;
  onCustomDateRangeChange?: (range: { from: Date; to: Date } | null) => void;
  triggerClassName?: string;
  align?: 'start' | 'center' | 'end';
  defaultPreset?: DatePreset;
  showCalendar?: boolean;
}

export function DateFilterPopover({
  datePreset,
  onDatePresetChange,
  customDateRange,
  onCustomDateRangeChange,
  triggerClassName,
  align = 'start',
  defaultPreset = 'last30days',
  showCalendar = true,
}: DateFilterPopoverProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<{ from?: Date; to?: Date }>({});

  const handleDatePresetChange = (preset: DatePreset) => {
    onDatePresetChange(preset);
    onCustomDateRangeChange?.(null);
    setDatePickerOpen(false);
  };

  const handleApplyCustomDate = () => {
    if (tempDateRange.from && tempDateRange.to) {
      onDatePresetChange('custom');
      onCustomDateRangeChange?.({
        from: tempDateRange.from,
        to: tempDateRange.to,
      });
      setDatePickerOpen(false);
      setTempDateRange({});
    }
  };

  const getDateLabel = () => {
    if (datePreset === 'custom' && customDateRange) {
      return `${format(customDateRange.from, 'dd/MM', { locale: ptBR })} - ${format(customDateRange.to, 'dd/MM', { locale: ptBR })}`;
    }
    const option = datePresetOptions.find(o => o.value === datePreset);
    return option?.label || 'Período';
  };

  const isActive = datePreset !== defaultPreset || !!customDateRange;

  return (
    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "h-9 gap-2 text-sm",
            isActive && "border-primary text-primary",
            triggerClassName
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          <span>{getDateLabel()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <div className="p-4 space-y-4">
          {/* Preset buttons in 2-column grid matching the design */}
          <div className="grid grid-cols-2 gap-2">
            {datePresetOptions.filter(o => o.value !== 'custom').map(option => (
              <Button
                key={option.value}
                variant={datePreset === option.value && !customDateRange ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-10 text-sm font-medium rounded-full transition-all",
                  datePreset === option.value && !customDateRange 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "hover:bg-muted"
                )}
                onClick={() => handleDatePresetChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {showCalendar && (
            <>
              {/* Divider with text */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-start">
                  <span className="bg-popover pr-2 text-xs text-muted-foreground">
                    Ou selecione um período:
                  </span>
                </div>
              </div>

              {/* Calendar for custom range */}
              <Calendar
                mode="range"
                selected={{ from: tempDateRange.from, to: tempDateRange.to }}
                onSelect={(range) => {
                  setTempDateRange({ from: range?.from, to: range?.to });
                }}
                numberOfMonths={1}
                locale={ptBR}
                className="pointer-events-auto rounded-md"
              />

              {/* Apply button */}
              <Button 
                size="sm" 
                className="w-full h-10 rounded-full font-medium"
                disabled={!tempDateRange.from || !tempDateRange.to}
                onClick={handleApplyCustomDate}
              >
                Aplicar
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Simple period filter for pages that only need preset options (no custom date range)
interface SimplePeriodFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  triggerClassName?: string;
  align?: 'start' | 'center' | 'end';
}

export function SimplePeriodFilter({
  value,
  onChange,
  options,
  triggerClassName,
  align = 'start',
}: SimplePeriodFilterProps) {
  const [open, setOpen] = useState(false);

  const currentLabel = options.find(o => o.value === value)?.label || 'Período';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "h-9 gap-2 text-sm",
            triggerClassName
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          <span>{currentLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2">
            {options.map(option => (
              <Button
                key={option.value}
                variant={value === option.value ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-10 text-sm font-medium rounded-full transition-all",
                  value === option.value 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "hover:bg-muted"
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
