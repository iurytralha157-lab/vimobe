import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicSiteConfig {
  id: string;
  is_active: boolean;
  subdomain: string | null;
  custom_domain: string | null;
  site_title: string;
  site_description: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  linkedin: string | null;
  about_title: string | null;
  about_text: string | null;
  about_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  google_analytics_id: string | null;
  // Hero fields
  hero_image_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  page_banner_url: string | null;
  // Logo size fields
  logo_width: number | null;
  logo_height: number | null;
  organization_name: string;
}

export interface PublicProperty {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  tipo_imovel: string | null;
  valor_venda: number | null;
  valor_aluguel: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  area_total: number | null;
  area_construida: number | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  imagem_principal: string | null;
  fotos: string[] | null;
  destaque: boolean;
  status: string;
}

export function usePublicSiteConfig(organizationId: string | null) {
  return useQuery({
    queryKey: ['public-site-config', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      const { data, error } = await supabase.functions.invoke('resolve-site-domain', {
        body: { domain: window.location.hostname }
      });

      if (error || !data?.found) return null;
      return data.site_config as PublicSiteConfig;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function usePublicProperties(organizationId: string | null, filters?: {
  page?: number;
  limit?: number;
  search?: string;
  tipo?: string;
  minPrice?: number;
  maxPrice?: number;
  quartos?: number;
  cidade?: string;
}) {
  return useQuery({
    queryKey: ['public-properties', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return { properties: [], total: 0, page: 1, limit: 12, totalPages: 0 };

      const params = new URLSearchParams({
        organization_id: organizationId,
        endpoint: 'properties',
        page: String(filters?.page || 1),
        limit: String(filters?.limit || 12),
      });

      if (filters?.search) params.append('search', filters.search);
      if (filters?.tipo) params.append('tipo', filters.tipo);
      if (filters?.minPrice) params.append('min_price', String(filters.minPrice));
      if (filters?.maxPrice) params.append('max_price', String(filters.maxPrice));
      if (filters?.quartos) params.append('quartos', String(filters.quartos));
      if (filters?.cidade) params.append('cidade', filters.cidade);

      const { data, error } = await supabase.functions.invoke('public-site-data', {
        body: null,
        method: 'GET',
      });

      // Fallback to fetch since invoke doesn't support GET params well
      const response = await fetch(
        `https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/public-site-data?${params.toString()}`
      );

      if (!response.ok) throw new Error('Failed to fetch properties');
      return await response.json();
    },
    enabled: !!organizationId,
  });
}

export function usePublicProperty(organizationId: string | null, propertyCode: string | null) {
  return useQuery({
    queryKey: ['public-property', organizationId, propertyCode],
    queryFn: async () => {
      if (!organizationId || !propertyCode) return null;

      const params = new URLSearchParams({
        organization_id: organizationId,
        endpoint: 'property',
        property_code: propertyCode,
      });

      const response = await fetch(
        `https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/public-site-data?${params.toString()}`
      );

      if (!response.ok) return null;
      const data = await response.json();
      return data.property as PublicProperty;
    },
    enabled: !!organizationId && !!propertyCode,
  });
}

export function useFeaturedProperties(organizationId: string | null) {
  return useQuery({
    queryKey: ['public-featured-properties', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const params = new URLSearchParams({
        organization_id: organizationId,
        endpoint: 'featured',
      });

      const response = await fetch(
        `https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/public-site-data?${params.toString()}`
      );

      if (!response.ok) return [];
      const data = await response.json();
      return data.properties as PublicProperty[];
    },
    enabled: !!organizationId,
  });
}

export function usePropertyTypes(organizationId: string | null) {
  return useQuery({
    queryKey: ['public-property-types', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const params = new URLSearchParams({
        organization_id: organizationId,
        endpoint: 'property-types',
      });

      const response = await fetch(
        `https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/public-site-data?${params.toString()}`
      );

      if (!response.ok) return [];
      const data = await response.json();
      return data.types as string[];
    },
    enabled: !!organizationId,
  });
}

export function usePublicCities(organizationId: string | null) {
  return useQuery({
    queryKey: ['public-cities', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const params = new URLSearchParams({
        organization_id: organizationId,
        endpoint: 'cities',
      });

      const response = await fetch(
        `https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/public-site-data?${params.toString()}`
      );

      if (!response.ok) return [];
      const data = await response.json();
      return data.cities as string[];
    },
    enabled: !!organizationId,
  });
}

export async function submitContactForm(data: {
  organization_id: string;
  name: string;
  email?: string;
  phone: string;
  message?: string;
  property_id?: string;
  property_code?: string;
}) {
  const response = await fetch(
    'https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/public-site-contact',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit contact form');
  }

  return await response.json();
}
