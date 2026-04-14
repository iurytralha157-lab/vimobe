import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LeadJourney {
  session_id: string;
  path_sequence: string[];
  event_sequence: string[];
  first_event: string;
  last_event: string;
  total_events: number;
  converted: boolean;
}

export interface FunnelStep {
  event_type: string;
  total: number;
}

export interface TopPage {
  page_path: string;
  views: number;
}

export interface DailyView {
  date: string;
  views: number;
}

export interface DeviceBreakdown {
  device_type: string;
  total: number;
}

export interface LeadAnalyticsData {
  journeys: LeadJourney[];
  funnel: FunnelStep[];
  top_pages: TopPage[];
  daily_views: DailyView[];
  total_sessions: number;
  total_conversions: number;
  device_breakdown: DeviceBreakdown[];
}

function pickNumber(result: Record<string, any>, ...keys: string[]) {
  for (const key of keys) {
    const value = result[key];
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
  }
  return 0;
}

function pickArray<T>(result: Record<string, any>, ...keys: string[]): T[] {
  for (const key of keys) {
    const value = result[key];
    if (Array.isArray(value)) return value as T[];
  }
  return [];
}

export function useLeadAnalytics(dateFrom?: Date, dateTo?: Date) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['lead-analytics', organization?.id, dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: async (): Promise<LeadAnalyticsData> => {
      const { data, error } = await (supabase.rpc as any)('get_lead_journeys', {
        p_organization_id: organization!.id,
        p_date_from: (dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).toISOString(),
        p_date_to: (dateTo || new Date()).toISOString(),
        p_limit: 50,
      });

      if (error) {
        console.error('Lead analytics RPC error:', error);
        return {
          journeys: [], funnel: [], top_pages: [], daily_views: [],
          total_sessions: 0, total_conversions: 0, device_breakdown: [],
        };
      }

      const result = (data || {}) as Record<string, any>;
      return {
        journeys: pickArray<LeadJourney>(result, 'journeys'),
        funnel: pickArray<FunnelStep>(result, 'funnel'),
        top_pages: pickArray<TopPage>(result, 'top_pages', 'topPages'),
        daily_views: pickArray<DailyView>(result, 'daily_views', 'dailyViews'),
        total_sessions: pickNumber(result, 'total_sessions', 'totalSessions'),
        total_conversions: pickNumber(result, 'total_conversions', 'totalConversions'),
        device_breakdown: pickArray<DeviceBreakdown>(result, 'device_breakdown', 'deviceBreakdown'),
      };
    },
    enabled: !!organization?.id,
  });
}

export interface SiteAnalyticsSummary {
  totalViews: number;
  totalPages: number;
  uniquePages: number;
  uniqueSessions: number;
  avgDuration: number;
  desktopPct: number;
  mobilePct: number;
  tabletPct: number;
  directPct: number;
  searchPct: number;
  socialPct: number;
  campaignPct: number;
  conversions: number;
  prevViews: number;
  prevPages: number;
  prevUniquePages: number;
  prevAvgDuration: number;
  prevDesktopPct: number;
  prevMobilePct: number;
  prevConversions: number;
}

export interface SiteAnalyticsDetailed {
  topProperties: { property_id: string; title: string; code: string; views: number; favorites: number }[];
  topPages: { page_path: string; views: number }[];
  dailyViews: { date: string; views: number }[];
  conversionRate: number;
  totalSessions: number;
  totalConversions: number;
  siteLeads: number;
}

export function useSiteAnalytics(dateFrom?: Date, dateTo?: Date) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['site-analytics', organization?.id, dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: async (): Promise<SiteAnalyticsSummary> => {
      const { data, error } = await (supabase.rpc as any)('get_site_analytics_summary', {
        p_organization_id: organization!.id,
        p_date_from: (dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).toISOString(),
        p_date_to: (dateTo || new Date()).toISOString(),
      });

      if (error) {
        console.error('Site analytics RPC error:', error);
        return {
          totalViews: 0, totalPages: 0, uniquePages: 0, uniqueSessions: 0,
          avgDuration: 0, desktopPct: 0, mobilePct: 0, tabletPct: 0,
          directPct: 0, searchPct: 0, socialPct: 0, campaignPct: 0,
          conversions: 0, prevViews: 0, prevPages: 0, prevUniquePages: 0,
          prevAvgDuration: 0, prevDesktopPct: 0, prevMobilePct: 0, prevConversions: 0,
        };
      }

      const result = (data || {}) as Record<string, any>;
      return {
        totalViews: pickNumber(result, 'totalViews', 'total_views'),
        totalPages: pickNumber(result, 'totalPages', 'total_pages'),
        uniquePages: pickNumber(result, 'uniquePages', 'unique_pages'),
        uniqueSessions: pickNumber(result, 'uniqueSessions', 'unique_sessions', 'totalSessions', 'total_sessions'),
        avgDuration: pickNumber(result, 'avgDuration', 'avg_duration'),
        desktopPct: pickNumber(result, 'desktopPct', 'desktop_pct'),
        mobilePct: pickNumber(result, 'mobilePct', 'mobile_pct'),
        tabletPct: pickNumber(result, 'tabletPct', 'tablet_pct'),
        directPct: pickNumber(result, 'directPct', 'direct_pct'),
        searchPct: pickNumber(result, 'searchPct', 'search_pct'),
        socialPct: pickNumber(result, 'socialPct', 'social_pct'),
        campaignPct: pickNumber(result, 'campaignPct', 'campaign_pct'),
        conversions: pickNumber(result, 'conversions', 'totalConversions', 'total_conversions'),
        prevViews: pickNumber(result, 'prevViews', 'prev_views'),
        prevPages: pickNumber(result, 'prevPages', 'prev_pages'),
        prevUniquePages: pickNumber(result, 'prevUniquePages', 'prev_unique_pages'),
        prevAvgDuration: pickNumber(result, 'prevAvgDuration', 'prev_avg_duration'),
        prevDesktopPct: pickNumber(result, 'prevDesktopPct', 'prev_desktop_pct'),
        prevMobilePct: pickNumber(result, 'prevMobilePct', 'prev_mobile_pct'),
        prevConversions: pickNumber(result, 'prevConversions', 'prev_conversions'),
      };
    },
    enabled: !!organization?.id,
  });
}

export function useSiteAnalyticsDetailed(dateFrom?: Date, dateTo?: Date) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['site-analytics-detailed', organization?.id, dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: async (): Promise<SiteAnalyticsDetailed> => {
      const { data, error } = await (supabase.rpc as any)('get_site_analytics_detailed', {
        p_organization_id: organization!.id,
        p_date_from: (dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).toISOString(),
        p_date_to: (dateTo || new Date()).toISOString(),
      });

      if (error) {
        console.error('Site analytics detailed RPC error:', error);
        return {
          topProperties: [], topPages: [], dailyViews: [],
          conversionRate: 0, totalSessions: 0, totalConversions: 0, siteLeads: 0,
        };
      }

      const result = (data || {}) as Record<string, any>;
      return {
        topProperties: pickArray(result, 'topProperties', 'top_properties'),
        topPages: pickArray(result, 'topPages', 'top_pages'),
        dailyViews: pickArray(result, 'dailyViews', 'daily_views'),
        conversionRate: pickNumber(result, 'conversionRate', 'conversion_rate'),
        totalSessions: pickNumber(result, 'totalSessions', 'total_sessions'),
        totalConversions: pickNumber(result, 'totalConversions', 'total_conversions'),
        siteLeads: pickNumber(result, 'siteLeads', 'site_leads'),
      };
    },
    enabled: !!organization?.id,
  });
}
