import { useMemo } from "react";
import { Calendar, Filter, Users, X, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Importações dos seus filtros específicos
import { DashboardCalendarFilter } from "./DashboardCalendarFilter";
import { CampaignFilter } from "./CampaignFilter";

interface DashboardFiltersProps {
  datePreset: string;
  onDatePresetChange: (preset: string) => void;
  customDateRange: { from: Date; to: Date } | undefined;
  onCustomDateRangeChange: (range: { from: Date; to: Date } | undefined) => void;
  teamId: string | null;
  onTeamChange: (id: string | null) => void;
  userId: string | null;
  onUserChange: (id: string | null) => void;
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
  dynamicSources: Array<string | { value: string; label: string }>;
  campaigns: any[];
  adSets: any[];
  ads: any[];
  isLoadingSources: boolean;
  isLoadingCampaigns: boolean;
  isLoadingAdSets: boolean;
  isLoadingAds: boolean;
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
  isLoadingSources,
}: DashboardFiltersProps) {
  // Conta quantos filtros avançados (exceto data) estão ativos para exibir na Badge do botão
  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0;
    if (teamId && teamId !== "all") count++;
    if (userId && userId !== "all") count++;
    if (source && source !== "all") count++;
    if (campaignId && campaignId !== "all") count++;
    if (adSetId && adSetId !== "all") count++;
    if (adId && adId !== "all") count++;
    return count;
  }, [teamId, userId, source, campaignId, adSetId, adId]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-card border border-border/60 rounded-xl shadow-sm">
      {/* SELETOR DE DATA PRINCIPAL */}
      <div className="flex items-center gap-2">
        <DashboardCalendarFilter
          datePreset={datePreset}
          onDatePresetChange={onDatePresetChange}
          customDateRange={customDateRange}
          onCustomDateRangeChange={onCustomDateRangeChange}
        />
      </div>

      {/* BLOCO DE FILTROS AVANÇADOS (POPOVER) */}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 px-3 text-xs gap-1.5 font-medium transition-colors",
                activeAdvancedFiltersCount > 0
                  ? "border-primary text-primary bg-primary/5 hover:bg-primary/10"
                  : "bg-background/50",
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filtros Avançados</span>
              {activeAdvancedFiltersCount > 0 && (
                <Badge
                  variant="default"
                  className="h-4 min-w-4 p-0 px-1 flex items-center justify-center text-[10px] ml-0.5 bg-primary"
                >
                  {activeAdvancedFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-72 p-4 space-y-4 z-[100]" align="end">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Filtros Avançados
              </h3>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClear}
                  className="h-6 px-2 text-[10px] font-bold uppercase text-destructive hover:bg-destructive/10"
                >
                  Limpar
                </Button>
              )}
            </div>

            {/* FILTRO DE EQUIPE */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Equipe
              </label>
              <Select value={teamId || "all"} onValueChange={(val) => onTeamChange(val === "all" ? null : val)}>
                <SelectTrigger className="h-8 text-xs bg-background/50">
                  <SelectValue placeholder="Todas equipes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas equipes</SelectItem>
                  {/* Mapeie suas equipes dinâmicas aqui se necessário */}
                </SelectContent>
              </Select>
            </div>

            {/* FILTRO DE CORRETOR / USUÁRIO */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Corretor / Integrante
              </label>
              <Select value={userId || "all"} onValueChange={(val) => onUserChange(val === "all" ? null : val)}>
                <SelectTrigger className="h-8 text-xs bg-background/50">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {/* Mapeie seus usuários dinâmicos aqui se necessário */}
                </SelectContent>
              </Select>
            </div>

            {/* FILTRO DE ORIGEM DOS LEADS */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Origem do Lead
              </label>
              <Select value={source || "all"} onValueChange={(val) => onSourceChange(val === "all" ? null : val)}>
                <SelectTrigger className="h-8 text-xs bg-background/50">
                  <SelectValue placeholder={isLoadingSources ? "A carregar..." : "Todas origens"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas origens</SelectItem>
                  {dynamicSources.map((src: any) => {
                    const value = typeof src === "string" ? src : src.value;
                    const label = typeof src === "string" ? src : src.label;
                    return (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* SEPARADOR PARA COMPONENTES DE CAMPANHA */}
            <div className="border-t border-border/40 pt-3">
              <CampaignFilter
                campaignId={campaignId}
                onCampaignChange={onCampaignChange}
                adSetId={adSetId}
                onAdSetChange={onAdSetChange}
                adId={adId}
                onAdChange={onAdChange}
                fullWidth={true} // Força o componente a renderizar expandido dentro do Popover pai
                hideTitles={false}
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* BOTÃO RÁPIDO PARA LIMPAR FILTROS (FORA DO POPOVER) */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive gap-1 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Limpar Filtros</span>
          </Button>
        )}
      </div>
    </div>
  );
}
