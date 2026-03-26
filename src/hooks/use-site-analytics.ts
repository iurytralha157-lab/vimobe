import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

// Track a pageview from the public site
export async function trackPageView(params: {
  organizationId: string;
  pagePath: string;
  pageTitle?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  propertyId?: string;
}) {
  let sessionId = sessionStorage.getItem('_vimobe_sid');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('_vimobe_sid', sessionId);
  }

  const width = window.innerWidth;
  let deviceType = 'desktop';
  if (width <= 768) deviceType = 'mobile';
  else if (width <= 1024) deviceType = 'tablet';

  const ua = navigator.userAgent;
  let browser = 'other';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'chrome';
  else if (ua.includes('Firefox')) browser = 'firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'safari';
  else if (ua.includes('Edg')) browser = 'edge';

  try {
    await (supabase.from('site_analytics_events') as any).insert({
      organization_id: params.organizationId,
      session_id: sessionId,
      event_type: 'pageview',
      page_path: params.pagePath,
      page_title: params.pageTitle || document.title,
      referrer: params.referrer || document.referrer || null,
      utm_source: params.utmSource || null,
      utm_medium: params.utmMedium || null,
      utm_campaign: params.utmCampaign || null,
      device_type: deviceType,
      browser,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      property_id: params.propertyId || null,
    });
  } catch (e) {
    console.warn('Analytics tracking failed:', e);
  }
}

export async function trackFavorite(organizationId: string, propertyId: string) {
  let sessionId = sessionStorage.getItem('_vimobe_sid') || crypto.randomUUID();

  const width = window.innerWidth;
  let deviceType = 'desktop';
  if (width <= 768) deviceType = 'mobile';
  else if (width <= 1024) deviceType = 'tablet';

  try {
    await (supabase.from('site_analytics_events') as any).insert({
      organization_id: organizationId,
      session_id: sessionId,
      event_type: 'favorite',
      page_path: window.location.pathname,
      page_title: document.title,
      device_type: deviceType,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      property_id: propertyId,
    });
  } catch (e) {
    console.warn('Analytics favorite tracking failed:', e);
  }
}

export async function trackConversion(organizationId: string) {
  let sessionId = sessionStorage.getItem('_vimobe_sid') || crypto.randomUUID();

  const width = window.innerWidth;
  let deviceType = 'desktop';
  if (width <= 768) deviceType = 'mobile';
  else if (width <= 1024) deviceType = 'tablet';

  try {
    await (supabase.from('site_analytics_events') as any).insert({
      organization_id: organizationId,
      session_id: sessionId,
      event_type: 'conversion',
      page_path: window.location.pathname,
      page_title: document.title,
      device_type: deviceType,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
    });
  } catch (e) {
    console.warn('Analytics conversion tracking failed:', e);
  }
}
