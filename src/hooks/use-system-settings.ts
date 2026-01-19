import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SystemSettings {
  logo_url_light: string | null;
  logo_url_dark: string | null;
  logo_width: number;
  logo_height: number;
  app_name: string;
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value");

      if (error) throw error;

      const settings: SystemSettings = {
        logo_url_light: null,
        logo_url_dark: null,
        logo_width: 140,
        logo_height: 40,
        app_name: "Vimob",
      };

      data?.forEach((row) => {
        const value = row.value as any;
        switch (row.key) {
          case "logo_url_light":
            settings.logo_url_light = typeof value === "string" ? value : null;
            break;
          case "logo_url_dark":
            settings.logo_url_dark = typeof value === "string" ? value : null;
            break;
          case "logo_width":
            settings.logo_width = typeof value === "number" ? value : 140;
            break;
          case "logo_height":
            settings.logo_height = typeof value === "number" ? value : 40;
            break;
          case "app_name":
            settings.app_name = typeof value === "string" ? value : "Vimob";
            break;
        }
      });

      return settings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
