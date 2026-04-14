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

      const result = data || {};
      return {
        journeys: result.journeys ?? [],
        funnel: result.funnel ?? [],
        top_pages: result.top_pages ?? [],
        daily_views: result.daily_views ?? [],
        total_sessions: result.total_sessions ?? 0,
        total_conversions: result.total_conversions ?? 0,
        device_breakdown: result.device_breakdown ?? [],
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
      
      const result = data || {};
      return {
        totalViews: result.totalViews ?? 0,
        totalPages: result.totalPages ?? 0,
        uniquePages: result.uniquePages ?? 0,
        uniqueSessions: result.uniqueSessions ?? 0,
        avgDuration: result.avgDuration ?? 0,
        desktopPct: result.desktopPct ?? 0,
        mobilePct: result.mobilePct ?? 0,
        tabletPct: result.tabletPct ?? 0,
        directPct: result.directPct ?? 0,
        searchPct: result.searchPct ?? 0,
        socialPct: result.socialPct ?? 0,
        campaignPct: result.campaignPct ?? 0,
        conversions: result.conversions ?? 0,
        prevViews: result.prevViews ?? 0,
        prevPages: result.prevPages ?? 0,
        prevUniquePages: result.prevUniquePages ?? 0,
        prevAvgDuration: result.prevAvgDuration ?? 0,
        prevDesktopPct: result.prevDesktopPct ?? 0,
        prevMobilePct: result.prevMobilePct ?? 0,
        prevConversions: result.prevConversions ?? 0,
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

      const result = data || {};
      return {
        topProperties: result.topProperties ?? [],
        topPages: result.topPages ?? [],
        dailyViews: result.dailyViews ?? [],
        conversionRate: result.conversionRate ?? 0,
        totalSessions: result.totalSessions ?? 0,
        totalConversions: result.totalConversions ?? 0,
        siteLeads: result.siteLeads ?? 0,
      };
    },
    enabled: !!organization?.id,
  });
}
