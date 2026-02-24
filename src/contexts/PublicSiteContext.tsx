import React, { useState, useEffect, ReactNode } from 'react';
import { PublicSiteConfig } from '@/hooks/use-public-site';
import { PublicContext, PublicContextType } from '@/pages/public/usePublicContext';
import { supabase } from '@/integrations/supabase/client';

function mapSiteDataToConfig(data: any, orgName: string): PublicSiteConfig {
  return {
    id: data.id,
    is_active: data.is_active ?? true,
    subdomain: data.subdomain,
    custom_domain: data.custom_domain,
    site_title: data.site_title || 'Site Imobiliário',
    site_description: data.site_description,
    primary_color: data.primary_color || '#F97316',
    secondary_color: data.secondary_color || '#1E293B',
    accent_color: data.accent_color || '#F97316',
    logo_url: data.logo_url,
    favicon_url: data.favicon_url,
    email: data.email,
    phone: data.phone,
    whatsapp: data.whatsapp,
    address: data.address,
    city: data.city,
    state: data.state,
    facebook: data.facebook,
    instagram: data.instagram,
    linkedin: data.linkedin,
    youtube: data.youtube,
    about_title: data.about_title,
    about_text: data.about_text,
    about_image_url: data.about_image_url,
    seo_title: data.seo_title,
    seo_description: data.seo_description,
    seo_keywords: data.seo_keywords,
    google_analytics_id: data.google_analytics_id,
    hero_image_url: data.hero_image_url,
    hero_title: data.hero_title,
    hero_subtitle: data.hero_subtitle,
    page_banner_url: data.page_banner_url,
    logo_width: data.logo_width,
    logo_height: data.logo_height,
    watermark_enabled: data.watermark_enabled,
    watermark_opacity: data.watermark_opacity,
    watermark_logo_url: data.watermark_logo_url,
    watermark_size: data.watermark_size ?? 80,
    watermark_position: data.watermark_position ?? 'bottom-right',
    organization_name: orgName,
    site_theme: data.site_theme || 'dark',
    background_color: data.background_color || '#0D0D0D',
    text_color: data.text_color || '#FFFFFF',
    card_color: data.card_color || '#FFFFFF',
    meta_pixel_id: data.meta_pixel_id || null,
    gtm_id: data.gtm_id || null,
    google_ads_id: data.google_ads_id || null,
  };
}

export function PublicSiteProvider({ children }: { children: ReactNode }) {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [siteConfig, setSiteConfig] = useState<PublicSiteConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolveSite = async () => {
      try {
        const hostname = window.location.hostname;
        
        // Skip for localhost and main app domains
        if (
          hostname === 'localhost' ||
          hostname === 'vimobe.lovable.app' ||
          hostname.includes('lovable.app') ||
          hostname.includes('lovable.dev') ||
          hostname.includes('lovableproject.com')
        ) {
          setIsLoading(false);
          return;
        }

        // Step 1: Try resolve-site-domain
        const response = await fetch(
          'https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/resolve-site-domain',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain: hostname }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.found) {
            setOrganizationId(data.organization_id);
            setSiteConfig({
              ...data.site_config,
              site_theme: data.site_config.site_theme || 'dark',
              background_color: data.site_config.background_color || '#0D0D0D',
              text_color: data.site_config.text_color || '#FFFFFF',
              card_color: data.site_config.card_color || '#FFFFFF',
              watermark_size: data.site_config.watermark_size ?? 80,
              watermark_position: data.site_config.watermark_position ?? 'bottom-right',
            });
            return;
          }
        }

        // Step 2: Fallback - try get-worker-config
        console.log('resolve-site-domain failed, trying get-worker-config for:', hostname);
        const workerResponse = await fetch(
          'https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/get-worker-config',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain: hostname }),
          }
        );

        if (!workerResponse.ok) {
          setError('Site não encontrado');
          return;
        }

        const workerData = await workerResponse.json();
        if (!workerData.slug) {
          setError('Site não encontrado');
          return;
        }

        // Step 3: Load site config by subdomain
        console.log('Worker config found slug:', workerData.slug);
        const { data: siteData, error: siteError } = await supabase
          .from('organization_sites')
          .select('*, organizations(name)')
          .eq('subdomain', workerData.slug)
          .eq('is_active', true)
          .single();

        if (siteError || !siteData) {
          console.error('Error loading site by slug:', siteError);
          setError('Site não encontrado');
          return;
        }

        const orgName = (siteData.organizations as any)?.name || 'Imobiliária';
        setOrganizationId(siteData.organization_id);
        setSiteConfig(mapSiteDataToConfig(siteData, orgName));
      } catch (err) {
        console.error('Error resolving site:', err);
        setError('Erro ao carregar site');
      } finally {
        setIsLoading(false);
      }
    };

    resolveSite();
  }, []);

  const contextValue: PublicContextType = {
    organizationId,
    siteConfig,
    isLoading,
    error,
  };

  return (
    <PublicContext.Provider value={contextValue}>
      {children}
    </PublicContext.Provider>
  );
}

// Re-export usePublicContext for backward compatibility
export { usePublicContext as usePublicSiteContext } from '@/pages/public/usePublicContext';
