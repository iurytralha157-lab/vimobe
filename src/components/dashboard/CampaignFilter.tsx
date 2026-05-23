import { useEffect, useMemo } from "react";
import { Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLeadMetaFilters } from "@/hooks/use-stages";
import { useFilters } from "@/contexts/FilterContext";

interface CampaignFilterProps {
  campaignId: string | null;
  onCampaignChange: (id: string | null) => void;
  adSetId: string | null;
  onAdSetChange: (id: string | null) => void;
  adId: string | null;
  onAdChange: (id: string | null) => void;
  fullWidth?: boolean;
  hideTitles?: boolean;
}

export function CampaignFilter({
  campaignId,
  onCampaignChange,
  adSetId,
  onAdSetChange,
  adId,
  onAdChange,
  fullWidth = false,
  hideTitles = false,
}: CampaignFilterProps) {
  const { activeDateRange: dateRange } = useFilters();

  // Busca as campanhas, conjuntos e anúncios baseado no período ativo
  const { data: metaData, isLoading } = useLeadMetaFilters(dateRange);
  const campaigns = metaData?.campaigns || [];
  const adSets = metaData?.adsets || [];
  const ads = metaData?.ads || [];

  // CORREÇÃO 1: Ajuste nas dependências do useEffect para evitar loops e resets infinitos
  useEffect(() => {
    if (!isLoading && campaignId && campaigns.length > 0 && campaignId !== "all") {
      const campaignExists = campaigns.some((c) => c.id === campaignId);
      if (!campaignExists) {
        console.log("[CampaignFilter] Campanha não encontrada no período atual, limpando filtros:", campaignId);
        onCampaignChange(null);
        onAdSetChange(null);
        onAdChange(null);
      }
    }
    // Removemos as funções de alteração (onCampaignChange, etc) daqui para não resetar o estado cruzado do pai
  }, [campaigns, isLoading, campaignId]);

  // Filtragem local de conjuntos e criativos baseados na seleção
  const filteredAdSets = useMemo(() => {
    if (!campaignId || campaignId === "all") return [];
    return adSets.filter((s) => s.campaignId === campaignId);
  }, [adSets, campaignId]);

  const filteredAds = useMemo(() => {
    if (!campaignId || campaignId === "all") return [];

    let filtered = ads.filter((a) => a.campaignId === campaignId);
    if (adSetId && adSetId !== "all") {
      filtered = filtered.filter((a) => a.adsetId === adSetId);
    }

    return filtered;
  }, [ads, campaignId, adSetId]);

  // Logs de auditoria para Debug
  useEffect(() => {
    if (campaignId && campaignId !== "all") {
      console.log("[Campaign Audit] Campanha Selecionada:", {
        selectedCampaign: campaignId,
        totalAdSetsForCampaign: filteredAdSets.length,
        totalCreativesForCampaign: filteredAds.length,
      });
    }
  }, [campaignId, filteredAdSets, filteredAds]);

  const activeCount = [campaignId, adSetId, adId].filter(Boolean).length;
  const hasActiveFilters = activeCount > 0;

  const content = (
    <div className="space-y-2">
      {!hideTitles && (
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-[10px] uppercase tracking-widest flex items-center gap-1.5 text-muted-foreground">
            <Facebook className="h-3 w-3 text-[#1877F2]" />
            Campanhas Meta
          </h4>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[9px] font-bold uppercase text-primary hover:bg-primary/10"
              onClick={() => {
                onCampaignChange(null);
                onAdSetChange(null);
                onAdChange(null);
              }}
            >
              Limpar
            </Button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {/* SELECT DE CAMPANHAS */}
        <div className="space-y-1">
          <Select
            value={campaignId || "all"}
            onValueChange={(val) => {
              onCampaignChange(val === "all" ? null : val);
              onAdSetChange(null);
              onAdChange(null);
            }}
          >
            <SelectTrigger className="h-8 text-xs bg-background/50 border-border/40">
              <SelectValue placeholder="Todas campanhas" />
            </SelectTrigger>
            <SelectContent className="z-[120]">
              <SelectItem value="all">Todas campanhas</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* SELECT DE CONJUNTOS */}
        {campaignId && campaignId !== "all" && (
          <>
            <div className="space-y-1">
              <Select
                value={adSetId || "all"}
                onValueChange={(val) => {
                  onAdSetChange(val === "all" ? null : val);
                  onAdChange(null);
                }}
              >
                <SelectTrigger className="h-8 text-xs bg-background/50 border-border/40 animate-in fade-in slide-in-from-top-1 duration-200">
                  <SelectValue placeholder="Todos conjuntos" />
                </SelectTrigger>
                <SelectContent className="z-[120]">
                  <SelectItem value="all">Todos conjuntos</SelectItem>
                  {filteredAdSets.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SELECT DE CRIATIVOS / ANÚNCIOS */}
            <div className="space-y-1">
              <Select value={adId || "all"} onValueChange={(val) => onAdChange(val === "all" ? null : val)}>
                <SelectTrigger className="h-8 text-xs bg-background/50 border-border/40 animate-in fade-in slide-in-from-top-1 duration-200">
                  <SelectValue placeholder="Todos criativos" />
                </SelectTrigger>
                <SelectContent className="z-[120]">
                  <SelectItem value="all">Todos criativos</SelectItem>
                  {filteredAds.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (fullWidth) {
    return content;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 px-2 text-xs gap-1.5",
            hasActiveFilters && "border-[#1877F2] text-[#1877F2] hover:text-[#1877F2] hover:bg-[#1877F2]/10",
          )}
        >
          <Facebook className={cn("h-3.5 w-3.5", hasActiveFilters ? "fill-[#1877F2]" : "text-muted-foreground")} />
          <span className="hidden sm:inline">Meta Ads</span>
          {hasActiveFilters && (
            <Badge
              variant="default"
              className="h-4 min-w-4 p-0 px-1 flex items-center justify-center text-[10px] ml-0.5 bg-[#1877F2]"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        {content}
      </PopoverContent>
    </Popover>
  );
}
