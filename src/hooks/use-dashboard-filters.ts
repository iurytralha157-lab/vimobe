import { useState, useMemo, useEffect } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfQuarter, startOfYear, subMonths } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLeadVisibility, applyVisibilityFilter } from './use-lead-visibility';

export type DatePreset = 
  | 'today' 
  | 'yesterday' 
  | 'last7days' 
  | 'last30days' 
  | 'thisMonth' 
  | 'lastMonth' 
  | 'thisQuarter' 
  | 'thisYear'
  | 'custom';

export interface DashboardFilters {
  datePreset: DatePreset;
  dateRange: { from: Date; to: Date };
  teamId: string | null;
  userId: string | null;
  source: string | null;
  campaignId: string | null;
  adSetId: string | null;
  adId: string | null;
}

export interface DatePresetOption {
  value: DatePreset;
  label: string;
}

export const datePresetOptions: DatePresetOption[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last7days', label: 'Últimos 7 dias' },
  { value: 'last30days', label: 'Últimos 30 dias' },
  { value: 'thisMonth', label: 'Este mês' },
  { value: 'lastMonth', label: 'Mês anterior' },
  { value: 'thisQuarter', label: 'Este trimestre' },
  { value: 'thisYear', label: 'Este ano' },
  { value: 'custom', label: 'Personalizado' },
];

export const sourceLabels: Record<string, string> = {
  'meta': 'Meta Ads',
  'facebook': 'Meta Ads',
  'instagram': 'Meta Ads',
  'google': 'Google Ads',
  'google_ads': 'Google Ads',
  'site': 'Site',
  'website': 'Site',
  'landing_page': 'Landing Page',
  'whatsapp': 'WhatsApp',
  'manual': 'Manual',
  'webhook': 'API / Integração',
  'api': 'API',
  'indicacao': 'Indicação',
  'import': 'Importação',
};

export const sourceOptions = [
  { value: 'all', label: 'Todas origens' },
  { value: 'meta', label: 'Meta Ads' },
  { value: 'site', label: 'Site' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'manual', label: 'Manual' },
];

export function getDateRangeFromPreset(preset: DatePreset): { from: Date; to: Date } {
  const now = new Date();
  
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    case 'last7days':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case 'last30days':
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case 'thisMonth':
      return { from: startOfMonth(now), to: endOfDay(now) };
    case 'lastMonth':
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case 'thisQuarter':
      return { from: startOfQuarter(now), to: endOfDay(now) };
    case 'thisYear':
      return { from: startOfYear(now), to: endOfDay(now) };
    case 'custom':
    default:
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
  }
}

export function useDashboardFilters() {
  const { user, organization } = useAuth();
  const { data: visibility } = useLeadVisibility(user?.id);
  
  const { 
    datePreset, 
    setDatePreset, 
    customDateRange, 
    setCustomDateRange, 
    activeDateRange: dateRange 
  } = useFilters();

  const [teamId, setTeamId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [adSetId, setAdSetId] = useState<string | null>(null);
  const [adId, setAdId] = useState<string | null>(null);

  // Dynamic Sources
  const { data: dynamicSources = [], isLoading: isLoadingSources } = useQuery({
    queryKey: ['dashboard-source-options', organization?.id, dateRange, visibility, userId, teamId],
    enabled: !!organization?.id && !!visibility,
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('source')
        .eq('organization_id', organization?.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .not('source', 'is', null);
      
      query = applyVisibilityFilter(query, visibility!, 'assigned_user_id', userId);
      
      if (teamId) {
        const { data: teamMembers } = await supabase.from('team_members').select('user_id').eq('team_id', teamId);
        if (teamMembers?.length) {
          query = query.in('assigned_user_id', teamMembers.map(m => m.user_id));
        }
      }

      const { data } = await query;
      const distinctSources = [...new Set(data?.map(l => l.source))].filter(Boolean);
      
      const sourceLabels: Record<string, string> = {
        'meta': 'Meta Ads',
        'facebook': 'Meta Ads',
        'instagram': 'Meta Ads',
        'google': 'Google Ads',
        'google_ads': 'Google Ads',
        'site': 'Site',
        'website': 'Site',
        'landing_page': 'Landing Page',
        'whatsapp': 'WhatsApp',
        'manual': 'Manual',
        'webhook': 'API / Integração',
        'indicacao': 'Indicação',
      };

      return distinctSources.map(s => ({
        value: s as string,
        label: sourceLabels[s as string] || (s as string).charAt(0).toUpperCase() + (s as string).slice(1)
      }));
    }
  });

  // Dynamic Campaigns
  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['dashboard-campaigns', organization?.id, dateRange, visibility, userId, teamId],
    enabled: !!organization?.id && !!visibility,
    queryFn: async () => {
      let query = supabase
        .from('lead_meta')
        .select('campaign_id, campaign_name, leads!inner(organization_id, created_at, assigned_user_id)')
        .eq('leads.organization_id', organization?.id)
        .gte('leads.created_at', dateRange.from.toISOString())
        .lte('leads.created_at', dateRange.to.toISOString())
        .not('campaign_id', 'is', null);
      
      query = applyVisibilityFilter(query, visibility!, 'leads.assigned_user_id', userId);
      
      if (teamId) {
        const { data: teamMembers } = await supabase.from('team_members').select('user_id').eq('team_id', teamId);
        if (teamMembers?.length) {
          query = query.in('leads.assigned_user_id', teamMembers.map(m => m.user_id));
        }
      }

      const { data } = await query;
      const unique = new Map();
      data?.forEach(item => {
        if (item.campaign_id) {
          unique.set(item.campaign_id, item.campaign_name || item.campaign_id);
        }
      });
      
      return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
    }
  });

  // Dynamic AdSets
  const { data: adSets = [], isLoading: isLoadingAdSets } = useQuery({
    queryKey: ['dashboard-adsets', organization?.id, dateRange, campaignId, visibility, userId, teamId],
    enabled: !!campaignId && !!organization?.id && !!visibility,
    queryFn: async () => {
      let query = supabase
        .from('lead_meta')
        .select('adset_id, adset_name, leads!inner(organization_id, created_at, assigned_user_id)')
        .eq('leads.organization_id', organization?.id)
        .eq('campaign_id', campaignId)
        .gte('leads.created_at', dateRange.from.toISOString())
        .lte('leads.created_at', dateRange.to.toISOString())
        .not('adset_id', 'is', null);

      query = applyVisibilityFilter(query, visibility!, 'leads.assigned_user_id', userId);
      
      if (teamId) {
        const { data: teamMembers } = await supabase.from('team_members').select('user_id').eq('team_id', teamId);
        if (teamMembers?.length) {
          query = query.in('leads.assigned_user_id', teamMembers.map(m => m.user_id));
        }
      }

      const { data } = await query;
      const unique = new Map();
      data?.forEach(item => {
        if (item.adset_id) {
          unique.set(item.adset_id, item.adset_name || item.adset_id);
        }
      });
      return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
    }
  });

  // Dynamic Ads
  const { data: ads = [], isLoading: isLoadingAds } = useQuery({
    queryKey: ['dashboard-ads', organization?.id, dateRange, adSetId, visibility, userId, teamId],
    enabled: !!adSetId && !!organization?.id && !!visibility,
    queryFn: async () => {
      let query = supabase
        .from('lead_meta')
        .select('ad_id, ad_name, leads!inner(organization_id, created_at, assigned_user_id)')
        .eq('leads.organization_id', organization?.id)
        .eq('adset_id', adSetId)
        .gte('leads.created_at', dateRange.from.toISOString())
        .lte('leads.created_at', dateRange.to.toISOString())
        .not('ad_id', 'is', null);

      query = applyVisibilityFilter(query, visibility!, 'leads.assigned_user_id', userId);
      
      if (teamId) {
        const { data: teamMembers } = await supabase.from('team_members').select('user_id').eq('team_id', teamId);
        if (teamMembers?.length) {
          query = query.in('leads.assigned_user_id', teamMembers.map(m => m.user_id));
        }
      }

      const { data } = await query;
      const unique = new Map();
      data?.forEach(item => {
        if (item.ad_id) {
          unique.set(item.ad_id, item.ad_name || item.ad_id);
        }
      });
      return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
    }
  });

  // Cascading resets
  useEffect(() => {
    setCampaignId(null);
    setAdSetId(null);
    setAdId(null);
  }, [dateRange]);

  useEffect(() => {
    setAdSetId(null);
    setAdId(null);
  }, [campaignId]);

  useEffect(() => {
    setAdId(null);
  }, [adSetId]);

  // Auto-selection
  useEffect(() => {
    if (!isLoadingAdSets && adSets.length === 1 && campaignId) {
      setAdSetId(adSets[0].id);
    }
  }, [adSets, isLoadingAdSets, campaignId]);

  useEffect(() => {
    if (!isLoadingAds && ads.length === 1 && adSetId) {
      setAdId(ads[0].id);
    }
  }, [ads, isLoadingAds, adSetId]);

  const filters: DashboardFilters = useMemo(() => ({
    datePreset,
    dateRange,
    teamId,
    userId,
    source,
    campaignId,
    adSetId,
    adId,
  }), [datePreset, dateRange, teamId, userId, source, campaignId, adSetId, adId]);

  const clearFilters = () => {
    setDatePreset('last30days');
    setCustomDateRange(null);
    setTeamId(null);
    setUserId(null);
    setSource(null);
    setCampaignId(null);
    setAdSetId(null);
    setAdId(null);
  };

  const hasActiveFilters = 
    teamId !== null || 
    userId !== null || 
    source !== null || 
    campaignId !== null || 
    adSetId !== null || 
    adId !== null || 
    datePreset !== 'last30days';

  return {
    filters,
    datePreset,
    setDatePreset,
    customDateRange,
    setCustomDateRange,
    teamId,
    setTeamId,
    userId,
    setUserId,
    source,
    setSource,
    campaignId,
    setCampaignId,
    adSetId,
    setAdSetId,
    adId,
    setAdId,
    clearFilters,
    hasActiveFilters,
    // Dynamic data
    dynamicSources,
    campaigns,
    adSets,
    ads,
    isLoadingSources,
    isLoadingCampaigns,
    isLoadingAdSets,
    isLoadingAds
  };
}
