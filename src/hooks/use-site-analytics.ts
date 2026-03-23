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
        throw error;
      }
      return data as SiteAnalyticsSummary;
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
}) {
  // Generate or retrieve session ID
  let sessionId = sessionStorage.getItem('_vimobe_sid');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('_vimobe_sid', sessionId);
  }

  // Detect device type
  const width = window.innerWidth;
  let deviceType = 'desktop';
  if (width <= 768) deviceType = 'mobile';
  else if (width <= 1024) deviceType = 'tablet';

  // Get browser name
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
    });
  } catch (e) {
    // Silent fail - don't break the site
    console.warn('Analytics tracking failed:', e);
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
