import { Users, User, Globe, X, SlidersHorizontal, Calendar as CalendarIcon, Check, Facebook } from 'lucide-react';
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
  // Dynamic data props
  dynamicSources?: { value: string, label: string }[];
  campaigns?: { id: string, name: string }[];
  adSets?: { id: string, name: string }[];
  ads?: { id: string, name: string }[];
  isLoadingSources?: boolean;
  isLoadingCampaigns?: boolean;
  isLoadingAdSets?: boolean;
  isLoadingAds?: boolean;
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
  dynamicSources = [],
  campaigns = [],
  adSets = [],
  ads = [],
  isLoadingSources = false,
  isLoadingCampaigns = false,
  isLoadingAdSets = false,
  isLoadingAds = false,
}: DashboardFiltersProps) {
  const { profile } = useAuth();
  const { data: teams = [] } = useTeams();
  const { data: users = [] } = useOrganizationUsers();
  const isMobile = useIsMobile();
  const { hasPermission } = useUserPermissions();

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
        <SelectValue placeholder={isLoadingSources ? "Carregando..." : "Origem"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas origens</SelectItem>
        {dynamicSources.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const MetaFilters = () => (
    <div className="space-y-2">
      <div className="space-y-1">
        <Select
          value={campaignId || 'all'}
          onValueChange={(val) => {
            onCampaignChange(val === 'all' ? null : val);
          }}
        >
          <SelectTrigger className="h-8 text-xs bg-background/50 border-border/40">
            <SelectValue placeholder={isLoadingCampaigns ? "Carregando..." : "Todas campanhas"} />
          </SelectTrigger>
          <SelectContent className="z-[120]">
            <SelectItem value="all">Todas campanhas</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
            {!isLoadingCampaigns && campaigns.length === 0 && (
              <div className="p-2 text-[10px] text-center text-muted-foreground">Nenhuma campanha no período</div>
            )}
          </SelectContent>
        </Select>
      </div>

      {campaignId && (
        <div className="space-y-1">
          <Select
            value={adSetId || 'all'}
            onValueChange={(val) => {
              onAdSetChange(val === 'all' ? null : val);
            }}
          >
            <SelectTrigger className="h-8 text-xs bg-background/50 border-border/40 animate-in fade-in slide-in-from-top-1">
              <SelectValue placeholder={isLoadingAdSets ? "Carregando..." : "Todos conjuntos"} />
            </SelectTrigger>
            <SelectContent className="z-[120]">
              <SelectItem value="all">Todos conjuntos</SelectItem>
              {adSets.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {adSetId && (
        <div className="space-y-1">
          <Select
            value={adId || 'all'}
            onValueChange={(val) => onAdChange(val === 'all' ? null : val)}
          >
            <SelectTrigger className="h-8 text-xs bg-background/50 border-border/40 animate-in fade-in slide-in-from-top-1">
              <SelectValue placeholder={isLoadingAds ? "Carregando..." : "Todos criativos"} />
            </SelectTrigger>
            <SelectContent className="z-[120]">
              <SelectItem value="all">Todos criativos</SelectItem>
              {ads.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
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

              <div className="pb-3 border-b border-border">
                <div className="flex items-center gap-1.5 px-1 mb-2">
                  <Facebook className="h-3 w-3 text-[#1877F2]" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Campanhas Meta</span>
                </div>
                <MetaFilters />
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
    <div className="flex items-center justify-end gap-2 w-full">
      {/* Bloco 1: Período */}
      <div className="flex items-center">
        <DateFilterPopover
          datePreset={datePreset}
          onDatePresetChange={onDatePresetChange}
          customDateRange={customDateRange}
          onCustomDateRangeChange={onCustomDateRangeChange}
          triggerClassName={cn(
            "h-8 gap-2 text-[11px] font-semibold uppercase tracking-wider px-3 border-border/60 hover:border-primary/50 transition-colors",
            (datePreset !== 'last30days' || customDateRange) && "border-primary/50 bg-primary/5 text-primary"
          )}
          align="end"
        />
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
                  <MetaFilters />
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