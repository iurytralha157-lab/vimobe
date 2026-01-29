import React, { useState, useEffect, ReactNode } from 'react';
import { PublicSiteConfig } from '@/hooks/use-public-site';
import { PublicContext, PublicContextType } from '@/pages/public/usePublicContext';

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
          hostname.includes('lovable.app') ||
          hostname.includes('lovable.dev') ||
          hostname.includes('lovableproject.com')
        ) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(
          'https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/resolve-site-domain',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain: hostname }),
          }
        );

        if (!response.ok) {
          setError('Site não encontrado');
          setIsLoading(false);
          return;
        }

        const data = await response.json();

        if (data.found) {
          setOrganizationId(data.organization_id);
          setSiteConfig(data.site_config);
        } else {
          setError('Site não encontrado');
        }
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
