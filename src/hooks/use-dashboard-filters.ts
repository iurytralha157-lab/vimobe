import { useState, useMemo } from 'react';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';

export type DatePreset = 'today' | '7days' | '30days' | 'this_month' | 'last_month' | '90days' | 'this_year' | 'custom';

export interface DashboardFilters {
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
  { value: '7days', label: 'Últimos 7 dias' },
  { value: '30days', label: 'Últimos 30 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
  { value: '90days', label: 'Últimos 90 dias' },
  { value: 'this_year', label: 'Este ano' },
  { value: 'custom', label: 'Personalizado' },
];

export const sourceOptions = [
  { value: 'all', label: 'Todas as origens' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google', label: 'Google' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'site', label: 'Site' },
  { value: 'outros', label: 'Outros' },
];

function getDateRangeFromPreset(preset: DatePreset): { from: Date; to: Date } {
  const now = new Date();
  
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case '7days':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case '30days':
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case 'this_month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'last_month':
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case '90days':
      return { from: startOfDay(subDays(now, 89)), to: endOfDay(now) };
    case 'this_year':
      return { from: startOfYear(now), to: endOfDay(now) };
    default:
      return { from: startOfMonth(now), to: endOfDay(now) };
  }
}

export function useDashboardFilters() {
  const [datePreset, setDatePreset] = useState<DatePreset>('30days');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const filters = useMemo<DashboardFilters>(() => {
    const dateRange = datePreset === 'custom' && customDateRange 
      ? customDateRange 
      : getDateRangeFromPreset(datePreset);

    return {
      dateRange,
      teamId,
      userId,
      source: source === 'all' ? null : source,
    };
  }, [datePreset, customDateRange, teamId, userId, source]);

  const hasActiveFilters = useMemo(() => {
    return datePreset !== '30days' || teamId !== null || userId !== null || (source !== null && source !== 'all');
  }, [datePreset, teamId, userId, source]);

  const clearFilters = () => {
    setDatePreset('30days');
    setCustomDateRange(null);
    setTeamId(null);
    setUserId(null);
    setSource(null);
  };

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
