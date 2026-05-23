import { Users, User, Globe, X, SlidersHorizontal, Calendar as CalendarIcon, Check, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTeams } from "@/hooks/use-teams";
import { useOrganizationUsers } from "@/hooks/use-users";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { DatePreset, sourceOptions, datePresetOptions } from "@/hooks/use-dashboard-filters";
import { DateFilterPopover } from "@/components/ui/date-filter-popover";
import { CampaignFilter } from "./CampaignFilter";
import { useState } from "react";

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
  dynamicSources?: { value: string; label: string }[];
  campaigns?: { id: string; name: string }[];
  adSets?: { id: string; name: string }[];
  ads?: { id: string; name: string }[];
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
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  // Check if user can view all leads (admin, super_admin, or has lead_view_all permission)
  const canViewAllLeads = isAdmin || hasPermission("lead_view_all");

  // Check if user is a team leader
  const isTeamLeader = teams.some((team) => team.members?.some((m) => m.user_id === profile?.id && m.is_leader));

  // Show user filter only for those with full visibility or team leaders
  const showUserFilter = canViewAllLeads || isTeamLeader;

  // Get available teams (admin sees all, team leader sees their teams, user sees nothing)
  const availableTeams = isAdmin
    ? teams
    : teams.filter((team) => team.members?.some((m) => m.user_id === profile?.id && m.is_leader));

  // Get available users based on selected team
  const availableUsers = teamId
    ? users.filter((user) => {
        const team = teams.find((t) => t.id === teamId);
        return team?.members?.some((m) => m.user_id === user.id);
      })
    : users;

  // Check if any extra filters are active (excluding date)
  const hasExtraFilters =
    teamId !== null || userId !== null || source !== null || campaignId !== null || adSetId !== null || adId !== null;

  // Shared filter components
  const TeamFilter = () =>
    availableTeams.length > 0 ? (
      <Select
        value={teamId || "all"}
        onValueChange={(value) => {
          onTeamChange(value === "all" ? null : value);
          onUserChange(null);
        }}
      >
        <SelectTrigger
          className={cn(
            "h-9 w-full text-xs bg-muted/40 border-border/40 hover:bg-muted/60 hover:border-border/60 transition-colors rounded-lg",
            teamId && "border-primary/40 bg-primary/5 text-primary hover:border-primary/60",
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Users className={cn("h-3.5 w-3.5 flex-shrink-0", teamId ? "text-primary" : "text-muted-foreground/70")} />
            <SelectValue placeholder="Equipe" />
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-lg shadow-xl border-border/40">
          <SelectItem value="all" className="text-xs">
            Todas equipes
          </SelectItem>
          {availableTeams.map((team) => (
            <SelectItem key={team.id} value={team.id} className="text-xs">
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : null;

  const UserFilter = () => (
    <Select value={userId || "all"} onValueChange={(value) => onUserChange(value === "all" ? null : value)}>
      <SelectTrigger
        className={cn(
          "h-9 w-full text-xs bg-muted/40 border-border/40 hover:bg-muted/60 hover:border-border/60 transition-colors rounded-lg",
          userId && "border-primary/40 bg-primary/5 text-primary hover:border-primary/60",
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <User className={cn("h-3.5 w-3.5 flex-shrink-0", userId ? "text-primary" : "text-muted-foreground/70")} />
          <SelectValue placeholder="Corretor" />
        </div>
      </SelectTrigger>
      <SelectContent className="rounded-lg shadow-xl border-border/40">
        <SelectItem value="all" className="text-xs">
          Todos
        </SelectItem>
        {availableUsers.map((user) => (
          <SelectItem key={user.id} value={user.id} className="text-xs">
            {user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const SourceFilter = () => (
    <Select value={source || "all"} onValueChange={(value) => onSourceChange(value === "all" ? null : value)}>
      <SelectTrigger
        className={cn(
          "h-9 w-full text-xs bg-muted/40 border-border/40 hover:bg-muted/60 hover:border-border/60 transition-colors rounded-lg",
          source && "border-primary/40 bg-primary/5 text-primary hover:border-primary/60",
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <Globe className={cn("h-3.5 w-3.5 flex-shrink-0", source ? "text-primary" : "text-muted-foreground/70")} />
          <SelectValue placeholder={isLoadingSources ? "Carregando..." : "Origem"} />
        </div>
      </SelectTrigger>
      <SelectContent className="rounded-lg shadow-xl border-border/40">
        <SelectItem value="all" className="text-xs">
          Todas origens
        </SelectItem>
        {dynamicSources.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-xs">
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
          value={campaignId || "all"}
          onValueChange={(val) => {
            onCampaignChange(val === "all" ? null : val);
          }}
        >
          <SelectTrigger className="h-9 text-xs bg-muted/40 border-border/40 hover:bg-muted/60 hover:border-border/60 transition-colors rounded-lg">
            <SelectValue placeholder={isLoadingCampaigns ? "Carregando..." : "Todas campanhas"} />
          </SelectTrigger>
          <SelectContent className="z-[120] rounded-lg shadow-xl border-border/40">
            <SelectItem value="all" className="text-xs">
              Todas campanhas
            </SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
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
            value={adSetId || "all"}
            onValueChange={(val) => {
              onAdSetChange(val === "all" ? null : val);
            }}
          >
            <SelectTrigger className="h-9 text-xs bg-muted/40 border-border/40 hover:bg-muted/60 hover:border-border/60 transition-colors rounded-lg animate-in fade-in slide-in-from-top-1">
              <SelectValue placeholder={isLoadingAdSets ? "Carregando..." : "Todos conjuntos"} />
            </SelectTrigger>
            <SelectContent className="z-[120] rounded-lg shadow-xl border-border/40">
              <SelectItem value="all" className="text-xs">
                Todos conjuntos
              </SelectItem>
              {adSets.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {adSetId && (
        <div className="space-y-1">
          <Select value={adId || "all"} onValueChange={(val) => onAdChange(val === "all" ? null : val)}>
            <SelectTrigger className="h-9 text-xs bg-muted/40 border-border/40 hover:bg-muted/60 hover:border-border/60 transition-colors rounded-lg animate-in fade-in slide-in-from-top-1">
              <SelectValue placeholder={isLoadingAds ? "Carregando..." : "Todos criativos"} />
            </SelectTrigger>
            <SelectContent className="z-[120] rounded-lg shadow-xl border-border/40">
              <SelectItem value="all" className="text-xs">
                Todos criativos
              </SelectItem>
              {ads.map((a) => (
                <SelectItem key={a.id} value={a.id} className="text-xs">
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
                "h-8 px-3 text-xs gap-1.5 border-border/40 hover:bg-muted/50 hover:border-border/80 transition-all font-bold uppercase tracking-wider",
                hasExtraFilters &&
                  "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/60",
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Filtros</span>
              {hasExtraFilters && (
                <Badge
                  variant="default"
                  className="h-4 min-w-[16px] px-1 flex items-center justify-center text-[9px] font-bold text-primary-foreground shadow-sm rounded-full ml-0.5"
                >
                  !
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={6}
            className="w-[290px] p-4 max-h-[80vh] overflow-y-auto border border-border/40 bg-popover/95 backdrop-blur-sm shadow-xl rounded-xl scrollbar-thin animate-in fade-in-50 zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                  Filtros Avançados
                </span>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClear}
                    className="h-5 px-1.5 text-[9px] uppercase font-bold text-primary hover:bg-primary/10 transition-colors rounded"
                  >
                    Limpar
                  </Button>
                )}
              </div>

              {/* Team */}
              {availableTeams.length > 0 && (
                <div className="space-y-1">
                  <TeamFilter />
                </div>
              )}

              {/* User */}
              {showUserFilter && (
                <div className="space-y-1">
                  <UserFilter />
                </div>
              )}

              {/* Source */}
              <div className="space-y-1">
                <SourceFilter />
              </div>

              {/* Campanhas Meta Ads */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center gap-1.5 px-1 mb-0.5">
                  <Facebook className="h-3 w-3 text-[#1877F2] opacity-90 flex-shrink-0" />
                  <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest">
                    Campanhas Meta
                  </span>
                </div>
                <MetaFilters />
              </div>

              {/* Clear button inside popover for mobile */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-9 text-xs text-muted-foreground hover:text-foreground mt-2 border border-dashed border-border/60 hover:bg-muted/50 rounded-lg transition-colors"
                  onClick={onClear}
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Limpar todos os filtros
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  {
    /* Desktop layout - Split into Period and Filters */
  }
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
            "h-8 gap-2 text-[11px] font-bold uppercase tracking-wider px-3 border-border/40 hover:bg-muted/50 hover:border-border/80 transition-all rounded-md",
            (datePreset !== "last30days" || customDateRange) &&
              "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/60",
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
                "h-8 gap-2 text-[11px] font-bold uppercase tracking-wider px-3 border-border/40 hover:bg-muted/50 hover:border-border/80 transition-all rounded-md",
                hasExtraFilters &&
                  "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/60",
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filtros</span>
              {hasExtraFilters && (
                <Badge
                  variant="default"
                  className="ml-1 h-4 min-w-[16px] px-1 text-[9px] font-bold bg-primary text-primary-foreground shadow-sm rounded-full flex items-center justify-center"
                >
                  !
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={6}
            className="w-72 p-4 border border-border/40 bg-popover/95 backdrop-blur-sm shadow-xl rounded-xl animate-in fade-in-50 zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                  Filtros Avançados
                </span>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClear}
                    className="h-5 px-1.5 text-[9px] uppercase font-bold text-primary hover:bg-primary/10 transition-colors rounded"
                  >
                    Limpar
                  </Button>
                )}
              </div>

              <div className="grid gap-3">
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
                  <div className="flex items-center gap-1.5 px-1 mb-0.5">
                    <Facebook className="h-3 w-3 text-[#1877F2] opacity-90 flex-shrink-0" />
                    <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest">
                      Campanhas Meta
                    </span>
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
            className="h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-md transition-colors"
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
