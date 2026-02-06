import { useState, useMemo } from 'react';
import { subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfQuarter, startOfYear, subMonths } from 'date-fns';

export type DatePreset = 
  | 'today' 
  | 'yesterday' 
  | 'last7days' 
  | 'last30days' 
  | 'thisMonth' 
  | 'lastMonth' 
  | 'thisQuarter' 
  | 'thisYear'
  | 'custom';

export interface DashboardFilters {
  datePreset: DatePreset;
  dateRange: { from: Date; to: Date };
  teamId: string | null;
  userId: string | null;
  source: string | null;
}

export interface DatePresetOption {
  value: DatePreset;
  label: string;
}

export const datePresetOptions: DatePresetOption[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last7days', label: 'Últimos 7 dias' },
  { value: 'last30days', label: 'Últimos 30 dias' },
  { value: 'thisMonth', label: 'Este mês' },
  { value: 'lastMonth', label: 'Mês anterior' },
  { value: 'thisQuarter', label: 'Este trimestre' },
  { value: 'thisYear', label: 'Este ano' },
  { value: 'custom', label: 'Personalizado' },
];

export const sourceOptions = [
  { value: 'all', label: 'Todas origens' },
  { value: 'meta', label: 'Meta Ads' },
  { value: 'site', label: 'Site' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'manual', label: 'Manual' },
];

export function getDateRangeFromPreset(preset: DatePreset): { from: Date; to: Date } {
  const now = new Date();
  
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    case 'last7days':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case 'last30days':
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case 'thisMonth':
      return { from: startOfMonth(now), to: endOfDay(now) };
    case 'lastMonth':
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case 'thisQuarter':
      return { from: startOfQuarter(now), to: endOfDay(now) };
    case 'thisYear':
      return { from: startOfYear(now), to: endOfDay(now) };
    case 'custom':
    default:
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
  }
}

export function useDashboardFilters() {
  const [datePreset, setDatePreset] = useState<DatePreset>('last30days');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const dateRange = useMemo(() => {
    if (datePreset === 'custom' && customDateRange) {
      return customDateRange;
    }
    return getDateRangeFromPreset(datePreset);
  }, [datePreset, customDateRange]);

  const filters: DashboardFilters = useMemo(() => ({
    datePreset,
    dateRange,
    teamId,
    userId,
    source,
  }), [datePreset, dateRange, teamId, userId, source]);

  const clearFilters = () => {
    setDatePreset('last30days');
    setCustomDateRange(null);
    setTeamId(null);
    setUserId(null);
    setSource(null);
  };

  const hasActiveFilters = teamId !== null || userId !== null || source !== null || datePreset !== 'last30days';

  return {
    filters,
    datePreset,
    setDatePreset,
    customDateRange,
    setCustomDateRange,
    teamId,
    setTeamId,
    userId,
    setUserId,
    source,
    setSource,
    clearFilters,
    hasActiveFilters,
  };
}
