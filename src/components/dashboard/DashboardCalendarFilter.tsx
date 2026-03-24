import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DatePreset } from '@/hooks/use-dashboard-filters';
import { DateRange } from 'react-day-picker';

interface DashboardCalendarFilterProps {
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  customDateRange: { from: Date; to: Date } | null;
  onCustomDateRangeChange: (range: { from: Date; to: Date } | null) => void;
}

export function DashboardCalendarFilter({
  datePreset,
  onDatePresetChange,
  customDateRange,
  onCustomDateRangeChange,
}: DashboardCalendarFilterProps) {
  const today = new Date();

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      onDatePresetChange('custom');
      onCustomDateRangeChange({
        from: range.from,
        to: range.to || range.from,
      });
    }
  };

  const selected: DateRange | undefined = customDateRange && datePreset === 'custom'
    ? { from: customDateRange.from, to: customDateRange.to }
    : undefined;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          {format(today, "MMMM, yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center p-0 pb-2">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          locale={ptBR}
          today={today}
          className="mx-auto"
        />
      </CardContent>
    </Card>
  );
}
