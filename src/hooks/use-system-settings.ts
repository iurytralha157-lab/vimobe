import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SystemSettings {
  id: string;
  logo_url_light: string | null;
  logo_url_dark: string | null;
  default_whatsapp: string | null;
  logo_width: number | null;
  logo_height: number | null;
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as SystemSettings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
