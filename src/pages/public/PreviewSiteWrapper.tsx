import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSearchParams, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicSiteConfig } from '@/hooks/use-public-site';
import PublicSiteLayout from './PublicSiteLayout';
import PublicHome from './PublicHome';
import PublicProperties from './PublicProperties';
import PublicPropertyDetail from './PublicPropertyDetail';
import PublicAbout from './PublicAbout';
import PublicContact from './PublicContact';

interface PreviewSiteContextType {
  organizationId: string | null;
  siteConfig: PublicSiteConfig | null;
  isLoading: boolean;
  error: string | null;
}

const PreviewSiteContext = createContext<PreviewSiteContextType | undefined>(undefined);

export function usePreviewSiteContext() {
  const context = useContext(PreviewSiteContext);
  if (context === undefined) {
    throw new Error('usePreviewSiteContext must be used within a PreviewSiteProvider');
  }
  return context;
}

// Re-export as usePublicSiteContext for compatibility with public components
export { usePreviewSiteContext as usePublicSiteContext };

function PreviewSiteProvider({ children, organizationId }: { children: ReactNode; organizationId: string }) {
  const [siteConfig, setSiteConfig] = useState<PublicSiteConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSiteConfig = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('organization_sites')
          .select('*, organizations(name)')
          .eq('organization_id', organizationId)
          .single();

        if (fetchError) {
          console.error('Error loading site config:', fetchError);
          setError('Erro ao carregar configuração do site');
          setIsLoading(false);
          return;
        }

        if (data) {
          setSiteConfig({
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
            organization_name: (data.organizations as any)?.name || 'Imobiliária',
          });
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Erro ao carregar site');
      } finally {
        setIsLoading(false);
      }
    };

    loadSiteConfig();
  }, [organizationId]);

  return (
    <PreviewSiteContext.Provider value={{ organizationId, siteConfig, isLoading, error }}>
      {children}
    </PreviewSiteContext.Provider>
  );
}

export default function PreviewSiteWrapper() {
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get('org');

  if (!orgId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Preview do Site Público</h1>
          <p className="text-gray-600 mb-6">
            Para visualizar o site, adicione o parâmetro <code className="bg-gray-100 px-2 py-1 rounded">?org=ID_DA_ORGANIZACAO</code> na URL.
          </p>
          <p className="text-sm text-gray-500">
            Você pode encontrar o ID da organização nas configurações do CRM.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PreviewSiteProvider organizationId={orgId}>
      <PreviewSiteRoutes />
    </PreviewSiteProvider>
  );
}

function PreviewSiteRoutes() {
  const { organizationId, isLoading, error } = usePreviewSiteContext();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando preview...</div>
      </div>
    );
  }

  if (error || !organizationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Erro no Preview</h1>
          <p className="text-muted-foreground">{error || 'Organização não encontrada.'}</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<PublicSiteLayout />}>
        <Route index element={<PublicHome />} />
        <Route path="imoveis" element={<PublicProperties />} />
        <Route path="imoveis/:code" element={<PublicPropertyDetail />} />
        <Route path="sobre" element={<PublicAbout />} />
        <Route path="contato" element={<PublicContact />} />
      </Route>
      <Route path="*" element={<Navigate to="/preview-site" replace />} />
    </Routes>
  );
}
