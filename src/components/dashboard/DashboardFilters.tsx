import { Users, User, Globe, X, SlidersHorizontal, Calendar as CalendarIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTeams } from '@/hooks/use-teams';
import { useOrganizationUsers } from '@/hooks/use-users';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { 
  DatePreset, 
  sourceOptions,
  datePresetOptions,
} from '@/hooks/use-dashboard-filters';
import { DateFilterPopover } from '@/components/ui/date-filter-popover';
import { CampaignFilter } from './CampaignFilter';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

interface DashboardFiltersProps {
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  customDateRange: { from: Date; to: Date } | null;
  onCustomDateRangeChange: (range: { from: Date; to: Date } | null) => void;
  teamId: string | null;
  onTeamChange: (teamId: string | null) => void;
  userId: string | null;
  onUserChange: (userId: string | null) => void;
  source: string | null;
  onSourceChange: (source: string | null) => void;
  campaignId: string | null;
  onCampaignChange: (id: string | null) => void;
  adSetId: string | null;
  onAdSetChange: (id: string | null) => void;
  adId: string | null;
  onAdChange: (id: string | null) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function DashboardFilters({
  datePreset,
  onDatePresetChange,
  customDateRange,
  onCustomDateRangeChange,
  teamId,
  onTeamChange,
  userId,
  onUserChange,
  source,
  onSourceChange,
  campaignId,
  onCampaignChange,
  adSetId,
  onAdSetChange,
  adId,
  onAdChange,
  onClear,
  hasActiveFilters,
}: DashboardFiltersProps) {
  const { profile } = useAuth();
  const { data: teams = [] } = useTeams();
  const { data: users = [] } = useOrganizationUsers();
  const isMobile = useIsMobile();
  const { hasPermission } = useUserPermissions();
  const [tempDateRange, setTempDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [periodPopoverOpen, setPeriodPopoverOpen] = useState(false);

  // Filter teams based on user role
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  
  // Check if user can view all leads (admin, super_admin, or has lead_view_all permission)
  const canViewAllLeads = isAdmin || hasPermission('lead_view_all');
  
  // Check if user is a team leader
  const isTeamLeader = teams.some(team => 
    team.members?.some(m => m.user_id === profile?.id && m.is_leader)
  );
  
  // Show user filter only for those with full visibility or team leaders
  const showUserFilter = canViewAllLeads || isTeamLeader;
  
  // Get available teams (admin sees all, team leader sees their teams, user sees nothing)
  const availableTeams = isAdmin 
    ? teams 
    : teams.filter(team => 
        team.members?.some(m => m.user_id === profile?.id && m.is_leader)
      );

  // Get available users based on selected team
  const availableUsers = teamId 
    ? users.filter(user => {
        const team = teams.find(t => t.id === teamId);
        return team?.members?.some(m => m.user_id === user.id);
      })
    : users;

  // Check if any extra filters are active (excluding date)
  const hasExtraFilters = teamId !== null || userId !== null || source !== null || campaignId !== null || adSetId !== null || adId !== null;

  const handleApplyCustomDate = () => {
    if (tempDateRange.from && tempDateRange.to) {
      onDatePresetChange('custom');
      onCustomDateRangeChange({
        from: startOfDay(tempDateRange.from),
        to: endOfDay(tempDateRange.to),
      });
      setPeriodPopoverOpen(false);
      setTempDateRange({});
    }
  };

  const handleClearCustomDate = () => {
    setTempDateRange({});
  };

  const currentPeriodLabel = () => {
    if (datePreset === 'custom' && customDateRange) {
      return `${format(customDateRange.from, 'dd/MM/yy', { locale: ptBR })} - ${format(customDateRange.to, 'dd/MM/yy', { locale: ptBR })}`;
    }
    return datePresetOptions.find(o => o.value === datePreset)?.label || 'Período';
  };

  // Shared filter components
  const TeamFilter = () => availableTeams.length > 0 ? (
    <Select
      value={teamId || 'all'}
      onValueChange={(value) => {
        onTeamChange(value === 'all' ? null : value);
        onUserChange(null);
      }}
    >
      <SelectTrigger className={cn(
        "h-9 w-full text-xs",
        teamId && "border-primary text-primary"
      )}>
        <Users className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
        <SelectValue placeholder="Equipe" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas equipes</SelectItem>
        {availableTeams.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : null;

  const UserFilter = () => (
    <Select
      value={userId || 'all'}
      onValueChange={(value) => onUserChange(value === 'all' ? null : value)}
    >
      <SelectTrigger className={cn(
        "h-9 w-full text-xs",
        userId && "border-primary text-primary"
      )}>
        <User className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
        <SelectValue placeholder="Corretor" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        {availableUsers.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const SourceFilter = () => (
    <Select
      value={source || 'all'}
      onValueChange={(value) => onSourceChange(value === 'all' ? null : value)}
    >
      <SelectTrigger className={cn(
        "h-9 w-full text-xs",
        source && "border-primary text-primary"
      )}>
        <Globe className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
        <SelectValue placeholder="Origem" />
      </SelectTrigger>
      <SelectContent>
        {sourceOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  // Consolidate filters for smaller screens (mobile and small desktops/tablets)
  if (isMobile) {
    return (
      <div className="flex items-center justify-end gap-2 w-full">
        {/* Date Filter - always visible */}
        <DateFilterPopover
          datePreset={datePreset}
          onDatePresetChange={onDatePresetChange}
          customDateRange={customDateRange}
          onCustomDateRangeChange={onCustomDateRangeChange}
          triggerClassName="h-8 sm:min-w-[130px] text-xs justify-start"
        />

        {/* Filters Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "h-8 px-2.5 text-xs gap-1.5",
                (hasExtraFilters) && "border-primary text-primary"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Filtros</span>
              {(hasExtraFilters) && (
                <Badge 
                  variant="default" 
                  className="h-4 w-4 p-0 flex items-center justify-center text-[10px] ml-0.5"
                >
                  •
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[280px] p-3 max-h-[80vh] overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <span className="text-sm font-semibold">Filtros</span>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={onClear} className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground">
                    Limpar tudo
                  </Button>
                )}
              </div>

              {/* Meta Campaign Filter */}
              <div className="pb-3 border-b border-border">
                <CampaignFilter 
                  campaignId={campaignId}
                  onCampaignChange={onCampaignChange}
                  adSetId={adSetId}
                  onAdSetChange={onAdSetChange}
                  adId={adId}
                  onAdChange={onAdChange}
                  fullWidth
                  hideTitles // New prop to hide internal labels
                />
              </div>

              {/* Team */}
              {availableTeams.length > 0 && (
                <div className="space-y-1.5">
                  <TeamFilter />
                </div>
              )}

              {/* User */}
              {showUserFilter && (
                <div className="space-y-1.5">
                  <UserFilter />
                </div>
              )}

              {/* Source */}
              <div className="space-y-1.5">
                <SourceFilter />
              </div>

              {/* Clear button inside popover for mobile */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-9 text-xs text-muted-foreground hover:text-foreground mt-2 border border-dashed"
                  onClick={onClear}
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Desktop layout - Split into Period and Filters
  return (
    <div className="flex items-center justify-end gap-2 w-full bg-background/50 backdrop-blur-sm border border-border/50 rounded-lg p-1.5 shadow-sm">
      {/* Bloco 1: Período */}
      <div className="flex items-center">
        <Popover open={periodPopoverOpen} onOpenChange={setPeriodPopoverOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "h-8 gap-2 text-[11px] font-semibold uppercase tracking-wider px-3 border-border/60 hover:border-primary/50 transition-colors",
                (datePreset !== 'last30days' || customDateRange) && "border-primary/50 bg-primary/5 text-primary"
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>{currentPeriodLabel()}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0 border-border/40 shadow-xl overflow-hidden">
            <div className="flex bg-background">
              {/* Botões Rápidos (Esquerda) */}
              <div className="w-[180px] p-2 bg-muted/30 border-r border-border/40 space-y-1">
                <p className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Atalhos</p>
                {datePresetOptions.filter(o => o.value !== 'custom').map((option) => (
                  <Button
                    key={option.value}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-xs h-8 font-medium hover:bg-primary/10 hover:text-primary transition-colors",
                      datePreset === option.value && !customDateRange ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    )}
                    onClick={() => {
                      onDatePresetChange(option.value);
                      onCustomDateRangeChange(null);
                      setPeriodPopoverOpen(false);
                    }}
                  >
                    {option.label}
                    {datePreset === option.value && !customDateRange && <Check className="ml-auto h-3 w-3" />}
                  </Button>
                ))}
              </div>

              {/* Seletor Personalizado (Direita) */}
              <div className="p-3">
                <p className="px-1 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Personalizado</p>
                <Calendar
                  mode="range"
                  selected={{ from: tempDateRange.from, to: tempDateRange.to }}
                  onSelect={(range) => setTempDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={1}
                  locale={ptBR}
                  className="rounded-md border border-border/40 p-2"
                />
                
                {/* Botões Limpar e Aplicar (Abaixo do calendário) */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs font-bold uppercase tracking-tight"
                    onClick={handleClearCustomDate}
                  >
                    Limpar
                  </Button>
                  <Button 
                    size="sm" 
                    className="h-8 text-xs font-bold uppercase tracking-tight bg-primary hover:bg-primary/90"
                    disabled={!tempDateRange.from || !tempDateRange.to}
                    onClick={handleApplyCustomDate}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Bloco 2: Filtros */}
      <div className="flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "h-8 gap-2 text-[11px] font-semibold uppercase tracking-wider px-3 border-border/60 hover:border-primary/50 transition-colors",
                hasExtraFilters && "border-primary/50 bg-primary/5 text-primary"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filtros</span>
              {hasExtraFilters && (
                <Badge variant="default" className="ml-1 h-4 min-w-[16px] px-1 text-[9px] bg-primary flex items-center justify-center">
                  !
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-3 border-border/40 shadow-2xl">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Filtros Avançados</span>
                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onClear} 
                    className="h-5 px-1.5 text-[9px] uppercase font-bold text-primary hover:bg-primary/10"
                  >
                    Limpar
                  </Button>
                )}
              </div>

              <div className="grid gap-2">
                {/* Equipe */}
                {availableTeams.length > 0 && (
                  <div className="space-y-1">
                    <TeamFilter />
                  </div>
                )}

                {/* Corretor */}
                {showUserFilter && (
                  <div className="space-y-1">
                    <UserFilter />
                  </div>
                )}

                {/* Origem */}
                <div className="space-y-1">
                  <SourceFilter />
                </div>

                {/* Campanhas Meta Ads */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1.5 px-1 mb-1">
                    <Facebook className="h-3 w-3 text-[#1877F2]" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Campanhas Meta</span>
                  </div>
                  <CampaignFilter 
                    campaignId={campaignId}
                    onCampaignChange={onCampaignChange}
                    adSetId={adSetId}
                    onAdSetChange={onAdSetChange}
                    adId={adId}
                    onAdChange={onAdChange}
                    fullWidth
                    hideTitles
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Botão rápido de limpar se houver filtros ativos */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-destructive transition-colors"
            onClick={onClear}
            title="Limpar todos os filtros"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}