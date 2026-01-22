import { Users, User, Globe, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTeams } from '@/hooks/use-teams';
import { useOrganizationUsers } from '@/hooks/use-users';
import { useAuth } from '@/contexts/AuthContext';
import { 
  DatePreset, 
  sourceOptions,
} from '@/hooks/use-dashboard-filters';
import { DateFilterPopover } from '@/components/ui/date-filter-popover';

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
  onClear,
  hasActiveFilters,
}: DashboardFiltersProps) {
  const { profile } = useAuth();
  const { data: teams = [] } = useTeams();
  const { data: users = [] } = useOrganizationUsers();

  // Filter teams based on user role
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  
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
