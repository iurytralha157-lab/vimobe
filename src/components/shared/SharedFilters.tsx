import { useState, useEffect, useCallback, memo } from "react";
import { Users, User, Globe, X, SlidersHorizontal, Facebook, Search, Tag as TagIcon, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTeams } from "@/hooks/use-teams";
import { useOrganizationUsers } from "@/hooks/use-users";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { DatePreset } from "@/hooks/use-dashboard-filters";
import { DateFilterPopover } from "@/components/ui/date-filter-popover";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface DateFilters {
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  customDateRange: { from: Date; to: Date } | null;
  onCustomDateRangeChange: (range: { from: Date; to: Date } | null) => void;
}

export interface TeamUserFilters {
  teamId: string | null;
  onTeamChange: (teamId: string | null) => void;
  userId: string | null;
  onUserChange: (userId: string | null) => void;
}

export interface SourceFilters {
  source: string | null;
  onSourceChange: (source: string | null) => void;
  dynamicSources?: { value: string; label: string }[];
  isLoadingSources?: boolean;
}

export interface MetaAdsFilters {
  campaignId: string | null;
  onCampaignChange: (id: string | null) => void;
  adSetId: string | null;
  onAdSetChange: (id: string | null) => void;
  adId: string | null;
  onAdChange: (id: string | null) => void;
  campaigns?: { id: string; name: string }[];
  adSets?: { id: string; name: string }[];
  ads?: { id: string; name: string }[];
  isLoadingCampaigns?: boolean;
  isLoadingAdSets?: boolean;
  isLoadingAds?: boolean;
}

export interface TagFilters {
  tagId: string | null;
  onTagChange: (tagId: string | null) => void;
  tags?: { id: string; name: string; color: string }[];
}

export interface DealFilters {
  dealStatus: string | null;
  onDealStatusChange: (status: string | null) => void;
}

export interface SharedFiltersProps
  extends DateFilters, TeamUserFilters, SourceFilters, MetaAdsFilters, TagFilters, DealFilters {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

// ─── Sub-componentes (fora do componente pai) ─────────────────────────────────

interface SelectFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
  icon: React.ReactNode;
  options: { value: string; label: React.ReactNode }[];
  allLabel: string;
  disabled?: boolean;
}

const SelectFilter = memo(({ value, onChange, placeholder, icon, options, allLabel, disabled }: SelectFilterProps) => (
  <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? null : v)} disabled={disabled}>
    <SelectTrigger className={cn("h-9 w-full text-xs", value && "border-primary text-primary")}>
      {icon}
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">{allLabel}</SelectItem>
      {options.map((opt, i) => (
        <SelectItem key={i} value={opt.value}>
          {opt.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
));
SelectFilter.displayName = "SelectFilter";

// ─── MetaFilters ──────────────────────────────────────────────────────────────

const MetaFilters = memo(
  ({
    campaignId,
    onCampaignChange,
    adSetId,
    onAdSetChange,
    adId,
    onAdChange,
    campaigns = [],
    adSets = [],
    ads = [],
    isLoadingCampaigns,
    isLoadingAdSets,
    isLoadingAds,
  }: MetaAdsFilters) => (
    <div className="space-y-2 pt-2 border-t border-border/40">
      <div className="flex items-center gap-1.5 px-1 mb-1">
        <Facebook className="h-3 w-3 text-[#1877F2]" />
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Campanhas Meta</span>
      </div>

      <Select value={campaignId || "all"} onValueChange={(v) => onCampaignChange(v === "all" ? null : v)}>
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

      {campaignId && (
        <Select value={adSetId || "all"} onValueChange={(v) => onAdSetChange(v === "all" ? null : v)}>
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
      )}

      {adSetId && (
        <Select value={adId || "all"} onValueChange={(v) => onAdChange(v === "all" ? null : v)}>
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
      )}
    </div>
  ),
);
MetaFilters.displayName = "MetaFilters";

// ─── FilterContent ────────────────────────────────────────────────────────────

interface FilterContentProps {
  localSearch: string;
  onLocalSearchChange: (v: string) => void;
  showUserFilter: boolean;
  availableTeams: { id: string; name: string }[];
  availableUsers: { id: string; name: string }[];
  hasActiveFilters: boolean;
  onClear: () => void;
  teamUserFilters: TeamUserFilters;
  sourceFilters: SourceFilters;
  tagFilters: TagFilters;
  dealFilters: DealFilters;
  metaFilters: MetaAdsFilters;
}

const FilterContent = memo(
  ({
    localSearch,
    onLocalSearchChange,
    showUserFilter,
    availableTeams,
    availableUsers,
    hasActiveFilters,
    onClear,
    teamUserFilters,
    sourceFilters,
    tagFilters,
    dealFilters,
    metaFilters,
  }: FilterContentProps) => (
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
        {/* Busca */}
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary" />
          <Input
            placeholder="Buscar..."
            value={localSearch}
            onChange={(e) => onLocalSearchChange(e.target.value)}
            className="h-9 pl-8 text-xs bg-muted/30 border-border/50 focus:bg-background"
          />
        </div>

        {/* Equipe */}
        {availableTeams.length > 0 && (
          <SelectFilter
            value={teamUserFilters.teamId}
            onChange={(v) => {
              teamUserFilters.onTeamChange(v);
              teamUserFilters.onUserChange(null);
            }}
            placeholder="Equipe"
            icon={<Users className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />}
            allLabel="Todas equipes"
            options={availableTeams.map((t) => ({ value: t.id, label: t.name }))}
          />
        )}

        {/* Corretor */}
        {showUserFilter && (
          <SelectFilter
            value={teamUserFilters.userId}
            onChange={teamUserFilters.onUserChange}
            placeholder="Corretor"
            icon={<User className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />}
            allLabel="Todos"
            options={availableUsers.map((u) => ({ value: u.id, label: u.name }))}
          />
        )}

        {/* Origem */}
        <SelectFilter
          value={sourceFilters.source}
          onChange={sourceFilters.onSourceChange}
          placeholder={sourceFilters.isLoadingSources ? "Carregando..." : "Origem"}
          icon={<Globe className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />}
          allLabel="Todas origens"
          options={(sourceFilters.dynamicSources ?? []).map((s) => ({ value: s.value, label: s.label }))}
        />

        {/* Tag */}
        <SelectFilter
          value={tagFilters.tagId}
          onChange={tagFilters.onTagChange}
          placeholder="Tag"
          icon={<TagIcon className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />}
          allLabel="Todas tags"
          options={(tagFilters.tags ?? []).map((t) => ({
            value: t.id,
            label: (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                {t.name}
              </div>
            ),
          }))}
        />

        {/* Status */}
        <SelectFilter
          value={dealFilters.dealStatus}
          onChange={dealFilters.onDealStatusChange}
          placeholder="Status"
          icon={<CircleDot className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />}
          allLabel="Todos status"
          options={[
            { value: "open", label: "Aberto" },
            { value: "won", label: "Ganho" },
            { value: "lost", label: "Perdido" },
          ]}
        />

        {/* Meta Ads */}
        <MetaFilters {...metaFilters} />
      </div>
    </div>
  ),
);
FilterContent.displayName = "FilterContent";

// ─── SharedFilters (componente principal) ─────────────────────────────────────

export function SharedFilters({
  // Date
  datePreset,
  onDatePresetChange,
  customDateRange,
  onCustomDateRangeChange,
  // Team/User
  teamId,
  onTeamChange,
  userId,
  onUserChange,
  // Source
  source,
  onSourceChange,
  dynamicSources = [],
  isLoadingSources = false,
  // Meta
  campaignId,
  onCampaignChange,
  adSetId,
  onAdSetChange,
  adId,
  onAdChange,
  campaigns = [],
  adSets = [],
  ads = [],
  isLoadingCampaigns = false,
  isLoadingAdSets = false,
  isLoadingAds = false,
  // Tag
  tagId,
  onTagChange,
  tags = [],
  // Deal
  dealStatus,
  onDealStatusChange,
  // Search/Control
  searchQuery,
  onSearchChange,
  onClear,
  hasActiveFilters,
}: SharedFiltersProps) {
  const { user } = useAuth();
  const { data: teams = [] } = useTeams();
  const { data: users = [] } = useOrganizationUsers();
  const isMobile = useIsMobile();
  const { hasPermission } = useUserPermissions();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(localSearch), 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  // Sincroniza busca externa → local
  useEffect(() => {
    if (searchQuery !== localSearch) setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Permissões
  const userRole = (user as { role?: string })?.role;
  const isAdmin = userRole === "admin" || userRole === "super_admin";
  const canViewAllLeads = isAdmin || hasPermission("lead_view_all");
  const isTeamLeader = teams.some((team) => team.members?.some((m) => m.user_id === user?.id && m.is_leader));
  const showUserFilter = canViewAllLeads || isTeamLeader;

  const availableTeams = isAdmin
    ? teams
    : teams.filter((team) => team.members?.some((m) => m.user_id === user?.id && m.is_leader));

  const availableUsers = teamId
    ? users.filter((u) => {
        const team = teams.find((t) => t.id === teamId);
        return team?.members?.some((m) => m.user_id === u.id);
      })
    : users;

  const hasExtraFilters =
    teamId !== null ||
    userId !== null ||
    source !== null ||
    campaignId !== null ||
    adSetId !== null ||
    adId !== null ||
    tagId !== null ||
    dealStatus !== null ||
    searchQuery !== "";

  const handleLocalSearchChange = useCallback((v: string) => setLocalSearch(v), []);

  return (
    <div className="flex items-center justify-end gap-2 w-full">
      {/* Filtro de data */}
      <DateFilterPopover
        datePreset={datePreset}
        onDatePresetChange={onDatePresetChange}
        customDateRange={customDateRange}
        onCustomDateRangeChange={onCustomDateRangeChange}
        triggerClassName={cn(
          "h-8 gap-2 text-[11px] font-semibold uppercase tracking-wider px-3 border-border/60 hover:border-primary/50 transition-colors",
          isMobile && "px-2 text-xs font-medium normal-case tracking-normal",
          (datePreset !== "last30days" || customDateRange) && "border-primary/50 bg-primary/5 text-primary",
        )}
        align="end"
      />

      {/* Filtros avançados */}
      <div className="flex items-center gap-1">
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen} modal>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-2 text-[11px] font-semibold uppercase tracking-wider px-3 border-border/60 hover:border-primary/50 transition-colors",
                isMobile && "px-2.5 text-xs font-medium normal-case tracking-normal",
                hasExtraFilters && "border-primary/50 bg-primary/5 text-primary",
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className={isMobile ? "hidden xs:inline" : ""}>Filtros</span>
              {hasExtraFilters && (
                <Badge
                  variant="default"
                  className={cn(
                    "ml-1 h-4 min-w-[16px] px-1 text-[9px] bg-primary flex items-center justify-center",
                    isMobile && "h-4 w-4 p-0 text-[10px] ml-0.5",
                  )}
                >
                  {isMobile ? "•" : "!"}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className={cn("w-72 p-3 border-border/40 shadow-2xl", isMobile && "w-[280px] max-h-[80vh] overflow-y-auto")}
          >
            <FilterContent
              localSearch={localSearch}
              onLocalSearchChange={handleLocalSearchChange}
              showUserFilter={showUserFilter}
              availableTeams={availableTeams}
              availableUsers={availableUsers}
              hasActiveFilters={hasActiveFilters}
              onClear={onClear}
              teamUserFilters={{ teamId, onTeamChange, userId, onUserChange }}
              sourceFilters={{ source, onSourceChange, dynamicSources, isLoadingSources }}
              tagFilters={{ tagId, onTagChange, tags }}
              dealFilters={{ dealStatus, onDealStatusChange }}
              metaFilters={{
                campaignId,
                onCampaignChange,
                adSetId,
                onAdSetChange,
                adId,
                onAdChange,
                campaigns,
                adSets,
                ads,
                isLoadingCampaigns,
                isLoadingAdSets,
                isLoadingAds,
              }}
            />
          </PopoverContent>
        </Popover>

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
