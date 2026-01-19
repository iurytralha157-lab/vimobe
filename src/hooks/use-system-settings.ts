import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

interface SystemSettingsValue {
  logo_url_light?: string | null;
  logo_url_dark?: string | null;
  default_whatsapp?: string | null;
  logo_width?: number | null;
  logo_height?: number | null;
}

interface SystemSettings {
  id: string;
  key: string;
  value: Json;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Convenience accessors from value
  logo_url_light?: string | null;
  logo_url_dark?: string | null;
  default_whatsapp?: string | null;
  logo_width?: number | null;
  logo_height?: number | null;
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      // Parse value JSON and spread into result
      const value = (data.value as SystemSettingsValue) || {};
      return {
        ...data,
        logo_url_light: value.logo_url_light || null,
        logo_url_dark: value.logo_url_dark || null,
        default_whatsapp: value.default_whatsapp || null,
        logo_width: value.logo_width || null,
        logo_height: value.logo_height || null,
      } as SystemSettings;
    },
    staleTime: 1000 * 60 * 5,
  });
}