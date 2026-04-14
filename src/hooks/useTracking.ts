import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function getSessionId(): string {
  let id = localStorage.getItem('vimob_session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('vimob_session_id', id);
  }
  return id;
}

function getUTMs() {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get('utm_source') || null,
    utm_medium: p.get('utm_medium') || null,
    utm_campaign: p.get('utm_campaign') || null,
  };
}

function getDeviceInfo() {
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

  return {
    device_type: deviceType,
    browser,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
  };
}

export interface TrackEventParams {
  organizationId: string;
  eventType: string;
  pagePath?: string;
  pageTitle?: string;
  propertyId?: string;
  metadata?: Record<string, unknown>;
}

export async function trackEvent(params: TrackEventParams) {
  const sessionId = getSessionId();

  const payload = {
    session_id: sessionId,
    event_type: params.eventType,
    page_path: params.pagePath || window.location.pathname,
    page_title: params.pageTitle || document.title,
    referrer: document.referrer || null,
    organization_id: params.organizationId,
    property_id: params.propertyId || null,
    metadata: params.metadata || null,
    ...getUTMs(),
    ...getDeviceInfo(),
  };

  console.log('[Tracking] Sending event:', params.eventType, 'org:', params.organizationId, 'path:', payload.page_path);

  try {
    const { error } = await (supabase as any).from('lead_events').insert(payload);
    if (error) {
      console.error('[Tracking] Insert error:', error.message, error.details, error.hint);

      const response = await fetch(`${SUPABASE_URL}/rest/v1/lead_events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const fallbackError = await response.text();
        console.error('[Tracking] REST fallback failed:', response.status, fallbackError);
        return;
      }
    }

    console.log('[Tracking] Event recorded successfully:', params.eventType);
  } catch (e) {
    console.error('[Tracking] Failed:', e);
  }
}

// Convenience functions
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
  await trackEvent({
    organizationId: params.organizationId,
    eventType: 'pageview',
    pagePath: params.pagePath,
    pageTitle: params.pageTitle,
    propertyId: params.propertyId,
  });
}

export async function trackFavorite(organizationId: string, propertyId: string) {
  await trackEvent({
    organizationId,
    eventType: 'favorite',
    propertyId,
  });
}

export async function trackConversion(organizationId: string) {
  await trackEvent({
    organizationId,
    eventType: 'form_submit',
  });
}

export async function trackWhatsAppClick(organizationId: string, metadata?: Record<string, unknown>) {
  await trackEvent({
    organizationId,
    eventType: 'whatsapp_click',
    metadata,
  });
}

export async function trackCtaClick(organizationId: string, metadata?: Record<string, unknown>) {
  await trackEvent({
    organizationId,
    eventType: 'cta_click',
    metadata,
  });
}

// Hook for use in components
export function useTracking(organizationId?: string) {
  const track = useCallback(
    async (eventType: string, metadata?: Record<string, unknown>, propertyId?: string) => {
      if (!organizationId) return;
      await trackEvent({
        organizationId,
        eventType,
        propertyId,
        metadata,
      });
    },
    [organizationId]
  );

  return { track };
}
