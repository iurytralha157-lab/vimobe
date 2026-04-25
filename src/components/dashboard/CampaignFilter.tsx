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

interface CampaignFilterProps {
  campaignId: string | null;
  onCampaignChange: (id: string | null) => void;
  adSetId: string | null;
  onAdSetChange: (id: string | null) => void;
  adId: string | null;
  onAdChange: (id: string | null) => void;
}

export function CampaignFilter({
  campaignId,
  onCampaignChange,
  adSetId,
  onAdSetChange,
  adId,
  onAdChange,
}: CampaignFilterProps) {
  const { organization } = useAuth();

  // Fetch unique campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ['filter-campaigns', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      // Get leads for this org to join with lead_meta
      const { data: leads } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', organization.id);
      
      if (!leads || leads.length === 0) return [];
      const leadIds = leads.map(l => l.id);

      const { data, error } = await supabase
        .from('lead_meta')
        .select('campaign_id, campaign_name')
        .in('lead_id', leadIds)
        .not('campaign_id', 'is', null)
        .order('campaign_name');
      
      if (error) throw error;
      
      const uniqueMap = new Map();
      data.forEach(item => {
        if (item.campaign_id) {
          uniqueMap.set(item.campaign_id, item.campaign_name || 'Sem nome');
        }
      });
      
      return Array.from(uniqueMap.entries()).map(([id, name]) => ({ id, name }));
    },
    enabled: !!organization?.id,
  });

  // Fetch unique ad sets
  const { data: adSets = [] } = useQuery({
    queryKey: ['filter-adsets', organization?.id, campaignId],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data: leads } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', organization.id);
      
      if (!leads || leads.length === 0) return [];
      const leadIds = leads.map(l => l.id);

      let query = supabase
        .from('lead_meta')
        .select('adset_id, adset_name')
        .in('lead_id', leadIds)
        .not('adset_id', 'is', null)
        .order('adset_name');
      
      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      const uniqueMap = new Map();
      data.forEach(item => {
        if (item.adset_id) {
          uniqueMap.set(item.adset_id, item.adset_name || 'Sem nome');
        }
      });
      
      return Array.from(uniqueMap.entries()).map(([id, name]) => ({ id, name }));
    },
    enabled: !!organization?.id,
  });

  // Fetch unique ads
  const { data: ads = [] } = useQuery({
    queryKey: ['filter-ads', organization?.id, adSetId, campaignId],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data: leads } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', organization.id);
      
      if (!leads || leads.length === 0) return [];
      const leadIds = leads.map(l => l.id);

      let query = supabase
        .from('lead_meta')
        .select('ad_id, ad_name')
        .in('lead_id', leadIds)
        .not('ad_id', 'is', null)
        .order('ad_name');
      
      if (adSetId) {
        query = query.eq('adset_id', adSetId);
      } else if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      const uniqueMap = new Map();
      data.forEach(item => {
        if (item.ad_id) {
          uniqueMap.set(item.ad_id, item.ad_name || 'Sem nome');
        }
      });
      
      return Array.from(uniqueMap.entries()).map(([id, name]) => ({ id, name }));
    },
    enabled: !!organization?.id,
  });

  const activeCount = [campaignId, adSetId, adId].filter(Boolean).length;
  const hasActiveFilters = activeCount > 0;

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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Facebook className="h-4 w-4 text-[#1877F2]" />
              Filtros Meta Ads
            </h4>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
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

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase">Campanha</label>
              <Select
                value={campaignId || 'all'}
                onValueChange={(val) => {
                  onCampaignChange(val === 'all' ? null : val);
                  onAdSetChange(null);
                  onAdChange(null);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todas campanhas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas campanhas</SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase">Conjunto de Anúncios</label>
              <Select
                value={adSetId || 'all'}
                onValueChange={(val) => {
                  onAdSetChange(val === 'all' ? null : val);
                  onAdChange(null);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todos conjuntos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos conjuntos</SelectItem>
                  {adSets.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase">Criativo</label>
              <Select
                value={adId || 'all'}
                onValueChange={(val) => onAdChange(val === 'all' ? null : val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todos criativos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos criativos</SelectItem>
                  {ads.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
