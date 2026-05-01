import { Users, User, Globe, X, SlidersHorizontal } from 'lucide-react';
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
} from '@/hooks/use-dashboard-filters';
import { DateFilterPopover } from '@/components/ui/date-filter-popover';
import { CampaignFilter } from './CampaignFilter';

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
          triggerClassName="h-8 flex-1 sm:flex-none sm:min-w-[130px] text-xs justify-start"
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

  // Desktop layout - All filters inline, but hidden on smaller screens
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {/* Date Filter */}
      <DateFilterPopover
        datePreset={datePreset}
        onDatePresetChange={onDatePresetChange}
        customDateRange={customDateRange}
        onCustomDateRangeChange={onCustomDateRangeChange}
        triggerClassName="h-8 w-auto min-w-[140px] text-xs justify-start"
      />

      {/* Desktop Filters Popover for ALL filters when screen is not large enough */}
      <div className="flex xl:hidden">
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
              Filtros
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-3 max-h-[80vh] overflow-y-auto">
            <div className="space-y-3">
              <div className="pb-3 border-b border-border">
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
              <TeamFilter />
              <UserFilter />
              <SourceFilter />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Show individual filters only on extra large screens */}
      <div className="hidden xl:flex items-center gap-2">
        {/* Team Filter - Only for admin/team leader */}
        {availableTeams.length > 0 && (
          <Select
            value={teamId || 'all'}
            onValueChange={(value) => {
              onTeamChange(value === 'all' ? null : value);
              onUserChange(null);
            }}
          >
            <SelectTrigger className={cn(
              "h-8 w-auto min-w-[120px] text-xs",
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
        )}

        {/* User Filter */}
        {showUserFilter && (
          <Select
            value={userId || 'all'}
            onValueChange={(value) => onUserChange(value === 'all' ? null : value)}
          >
            <SelectTrigger className={cn(
              "h-8 w-auto min-w-[110px] text-xs",
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
        )}

        {/* Source Filter */}
        <Select
          value={source || 'all'}
          onValueChange={(value) => onSourceChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className={cn(
            "h-8 w-auto min-w-[110px] text-xs",
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
        
        {/* Desktop Filters Popover for Meta Ads */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "h-8 px-2.5 text-xs gap-1.5",
                (campaignId || adSetId || adId) && "border-[#1877F2] text-[#1877F2] hover:text-[#1877F2] hover:bg-[#1877F2]/10"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Campanhas
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-3">
            <CampaignFilter 
              campaignId={campaignId}
              onCampaignChange={onCampaignChange}
              adSetId={adSetId}
              onAdSetChange={onAdSetChange}
              adId={adId}
              onAdChange={onAdChange}
              fullWidth
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground hover:text-foreground text-xs"
          onClick={onClear}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}