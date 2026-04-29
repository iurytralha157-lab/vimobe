import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

interface SystemSettingsValue {
  logo_url_light?: string | null;
  logo_url_dark?: string | null;
  favicon_url_light?: string | null;
  favicon_url_dark?: string | null;
  pwa_icon_url?: string | null;
  login_bg_url?: string | null;
  default_whatsapp?: string | null;
  contact_whatsapp?: string | null;
  logo_width?: number | null;
  logo_height?: number | null;
  maintenance_mode?: boolean | null;
  maintenance_message?: string | null;
  feature_flags?: Record<string, boolean> | null;
  notification_instance_name?: string | null;
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
  favicon_url_light?: string | null;
  favicon_url_dark?: string | null;
  pwa_icon_url?: string | null;
  login_bg_url?: string | null;
  default_whatsapp?: string | null;
  contact_whatsapp?: string | null;
  logo_width?: number | null;
  logo_height?: number | null;
  maintenance_mode?: boolean;
  maintenance_message?: string;
  feature_flags?: Record<string, boolean>;
  notification_instance_name?: string | null;
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      try {
        console.log("Fetching system settings...");
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .eq('key', 'global') // Explicit key for global settings
          .maybeSingle();

        if (error) {
          console.error('Error in useSystemSettings:', error);
          // Return default object to avoid breaking the UI
          return {
            logo_url_light: null,
            feature_flags: {},
          } as any;
        }

        if (!data) {
          console.warn('System settings not found for key "global"');
          return null;
        }
        
        const value = (data.value as SystemSettingsValue) || {};
        return {
          ...data,
          logo_url_light: value.logo_url_light || null,
          logo_url_dark: value.logo_url_dark || null,
          favicon_url_light: value.favicon_url_light || null,
          favicon_url_dark: value.favicon_url_dark || null,
          pwa_icon_url: value.pwa_icon_url || null,
          login_bg_url: value.login_bg_url || null,
          default_whatsapp: value.default_whatsapp || null,
          contact_whatsapp: value.contact_whatsapp || value.default_whatsapp || null,
          logo_width: value.logo_width || null,
          logo_height: value.logo_height || null,
          maintenance_mode: value.maintenance_mode || false,
          maintenance_message: value.maintenance_message || '',
          feature_flags: (value.feature_flags as Record<string, boolean>) || {},
          notification_instance_name: value.notification_instance_name || null,
        } as SystemSettings;
      } catch (err) {
        console.error('Unexpected error in useSystemSettings:', err);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: 2, // Retry to avoid transient network issues
  });
}
