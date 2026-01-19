import { DateFilterPopover } from '@/components/ui/date-filter-popover';
import { DatePreset } from '@/hooks/use-dashboard-filters';

interface PipelineDateFilterProps {
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  customDateRange: { from: Date; to: Date } | null;
  onCustomDateRangeChange: (range: { from: Date; to: Date } | null) => void;
}

export function PipelineDateFilter({
  datePreset,
  onDatePresetChange,
  customDateRange,
  onCustomDateRangeChange,
}: PipelineDateFilterProps) {
  return (
    <DateFilterPopover
      datePreset={datePreset}
      onDatePresetChange={onDatePresetChange}
      customDateRange={customDateRange}
      onCustomDateRangeChange={onCustomDateRangeChange}
    />
  );
}
