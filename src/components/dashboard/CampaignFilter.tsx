import { useEffect, useMemo } from 'react';
import { Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLeadMetaFilters } from '@/hooks/use-stages';
import { useFilters } from '@/contexts/FilterContext';

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
  const { organization } = useAuth();
  const { activeDateRange: dateRange } = useFilters();

  // Use the central hook for campaigns, adsets and ads
  const { data: metaData, isLoading } = useLeadMetaFilters(dateRange);
  const campaigns = metaData?.campaigns || [];
  const adSets = metaData?.adsets || [];
  const ads = metaData?.ads || [];

  // Limpeza automática se a campanha selecionada não existir no novo período
  useEffect(() => {
    if (!isLoading && campaignId && campaigns.length > 0) {
      const campaignExists = campaigns.some(c => c.id === campaignId);
      if (!campaignExists) {
        console.log('[CampaignFilter] Campaign not in current period, clearing filters:', campaignId);
        onCampaignChange(null);
        onAdSetChange(null);
        onAdChange(null);
      }
    }
  }, [campaigns, isLoading, campaignId, onCampaignChange, onAdSetChange, onAdChange]);

  // Filter adSets and ads if campaignId or adSetId is selected
  const filteredAdSets = useMemo(() => {
    if (!campaignId || campaignId === 'all') return [];
    return adSets.filter(s => s.campaignId === campaignId);
  }, [adSets, campaignId]);

  const filteredAds = useMemo(() => {
    if (!campaignId || campaignId === 'all') return [];
    
    // Filter by campaign and optionally by adset
    let filtered = ads.filter(a => a.campaignId === campaignId);
    if (adSetId && adSetId !== 'all') {
      filtered = filtered.filter(a => a.adsetId === adSetId);
    }
    
    return filtered;
  }, [ads, campaignId, adSetId]);

  // Specific audit logs requested
  useEffect(() => {
    if (campaignId && campaignId !== 'all') {
      console.log('[Campaign Audit] Selected Campaign:', {
        selectedCampaign: campaignId,
        totalAdSetsForCampaign: filteredAdSets.length,
        totalCreativesForCampaign: filteredAds.length,
        first10AdSets: filteredAdSets.slice(0, 10),
        first10Creatives: filteredAds.slice(0, 10)
      });
    }
  }, [campaignId, filteredAdSets, filteredAds]);

  useEffect(() => {
    if (adSetId && adSetId !== 'all') {
      console.log('[Campaign Audit] Selected AdSet:', {
        selectedAdSet: adSetId,
        totalCreativesForAdSet: filteredAds.length
      });
    }
  }, [adSetId, filteredAds]);

  useEffect(() => {
    console.log('Campaign dropdown debug:', {
      period: dateRange ? { from: dateRange.from.toISOString(), to: dateRange.to.toISOString() } : 'All time',
      totalCampaignsFromHook: campaigns.length,
      selectedCampaign: campaignId,
      isLoading
    });
  }, [campaigns, isLoading, dateRange, campaignId]);

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
        <div className="space-y-1">
          <Select
            value={campaignId || 'all'}
            onValueChange={(val) => {
              onCampaignChange(val === 'all' ? null : val);
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

        {campaignId && (
          <>
            <div className="space-y-1">
              <Select
                value={adSetId || 'all'}
                onValueChange={(val) => {
                  onAdSetChange(val === 'all' ? null : val);
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

            <div className="space-y-1">
              <Select
                value={adId || 'all'}
                onValueChange={(val) => onAdChange(val === 'all' ? null : val)}
              >
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
            hasActiveFilters && "border-[#1877F2] text-[#1877F2] hover:text-[#1877F2] hover:bg-[#1877F2]/10"
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