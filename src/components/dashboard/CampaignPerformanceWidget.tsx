import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  useCampaignInsights,
  useSyncCampaignInsights,
  type CampaignAggregated,
  type AdsetAggregated,
  type AdAggregated,
} from "@/hooks/use-campaign-insights";
import type { DashboardFilters } from "@/hooks/use-dashboard-filters";
import {
  DollarSign,
  Target,
  Users,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Play,
  Image as ImageIcon,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  filters: DashboardFilters;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("pt-BR");
}

// KPI mini card
function KpiCard({ icon: Icon, label, value, iconColor }: { icon: any; label: string; value: string; iconColor: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
        <Icon className="h-4 w-4 text-primary-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

// Creative preview
function CreativePreview({ url, videoUrl }: { url: string | null; videoUrl: string | null }) {
  if (videoUrl) {
    return (
      <div className="relative h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
        <video src={videoUrl} className="h-full w-full object-cover" muted />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Play className="h-3 w-3 text-white" />
        </div>
      </div>
    );
  }
  if (url) {
    return (
      <div className="h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
        <img src={url} alt="Criativo" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
      <ImageIcon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

// Ad row
function AdRow({ ad }: { ad: AdAggregated }) {
  return (
    <div className="flex items-center gap-3 py-2 pl-12 pr-3 text-xs border-t border-border/30">
      <CreativePreview url={ad.creative_url} videoUrl={ad.creative_video_url} />
      <span className="flex-1 truncate text-muted-foreground">{ad.ad_name}</span>
      <span className="w-16 text-right font-medium">{ad.leads_count_crm}</span>
      <span className="w-20 text-right">{formatCurrency(ad.spend)}</span>
      <span className="w-20 text-right">{ad.cpl > 0 ? formatCurrency(ad.cpl) : "—"}</span>
    </div>
  );
}

// Adset row (expandable)
function AdsetRow({ adset }: { adset: AdsetAggregated }) {
  const [open, setOpen] = useState(false);
  const hasAds = adset.ads.length > 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-3 py-2 pl-8 pr-3 text-xs border-t border-border/30 cursor-pointer hover:bg-muted/30 transition-colors">
          {hasAds ? (
            open ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : (
            <span className="w-3 shrink-0" />
          )}
          <span className="flex-1 truncate text-muted-foreground">{adset.adset_name}</span>
          <span className="w-16 text-right font-medium">{adset.leads_count_crm}</span>
          <span className="w-20 text-right">{formatCurrency(adset.spend)}</span>
          <span className="w-20 text-right">{adset.cpl > 0 ? formatCurrency(adset.cpl) : "—"}</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {adset.ads.map((ad) => (
          <AdRow key={ad.ad_id} ad={ad} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Campaign row (expandable)
function CampaignRow({ campaign }: { campaign: CampaignAggregated }) {
  const [open, setOpen] = useState(false);
  const hasAdsets = campaign.adsets.length > 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-3 py-3 px-3 text-sm border-t border-border cursor-pointer hover:bg-muted/50 transition-colors">
          {hasAdsets ? (
            open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <span className="flex-1 truncate font-medium text-foreground">{campaign.campaign_name}</span>
          <span className="w-16 text-right font-semibold text-foreground">{campaign.leads_count_crm}</span>
          <span className="w-20 text-right text-foreground">{formatCurrency(campaign.spend)}</span>
          <span className="w-20 text-right text-foreground">{campaign.cpl > 0 ? formatCurrency(campaign.cpl) : "—"}</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {campaign.adsets.map((adset) => (
          <AdsetRow key={adset.adset_id} adset={adset} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CampaignPerformanceWidget({ filters }: Props) {
  const { data, isLoading } = useCampaignInsights(filters);
  const syncMutation = useSyncCampaignInsights();

  const handleSync = () => {
    const dateStart = filters.dateRange.from.toISOString().split("T")[0];
    const dateStop = filters.dateRange.to.toISOString().split("T")[0];
    syncMutation.mutate({ dateStart, dateStop });
  };

  // Don't show widget if no data and not loading
  if (!isLoading && (!data || data.campaigns.length === 0) && !data?.lastSync) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Performance de Campanhas</CardTitle>
          </div>
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncMutation.isPending}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            Sincronizar Meta Ads
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum dado de campanha encontrado. Clique em "Sincronizar" para buscar dados do Meta Ads.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance de Campanhas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  const summary = data?.summary;
  const campaigns = data?.campaigns || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Performance de Campanhas</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {data?.lastSync && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Sincronizado {formatDistanceToNow(new Date(data.lastSync), { addSuffix: true, locale: ptBR })}
            </span>
          )}
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncMutation.isPending}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sincronizar</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            icon={DollarSign}
            label="Investimento"
            value={formatCurrency(summary?.totalSpend || 0)}
            iconColor="bg-primary"
          />
          <KpiCard
            icon={Target}
            label="CPL Médio"
            value={summary?.avgCpl ? formatCurrency(summary.avgCpl) : "—"}
            iconColor="bg-chart-2"
          />
          <KpiCard
            icon={Users}
            label="Leads (CRM)"
            value={formatNumber(summary?.totalLeadsCrm || 0)}
            iconColor="bg-chart-3"
          />
          <KpiCard
            icon={Eye}
            label="Impressões"
            value={formatNumber(summary?.totalImpressions || 0)}
            iconColor="bg-chart-4"
          />
        </div>

        {/* Table header */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="flex items-center gap-3 py-2 px-3 text-xs font-medium text-muted-foreground bg-muted/50">
            <span className="w-4 shrink-0" />
            <span className="flex-1">Campanha</span>
            <span className="w-16 text-right">Leads</span>
            <span className="w-20 text-right">Gasto</span>
            <span className="w-20 text-right">CPL</span>
          </div>

          {campaigns.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma campanha encontrada no período
            </div>
          ) : (
            campaigns.map((campaign) => (
              <CampaignRow key={campaign.campaign_id} campaign={campaign} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
