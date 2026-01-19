import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ModuleName = 
  | "financial"
  | "contracts"
  | "commissions"
  | "properties"
  | "telephony"
  | "whatsapp"
  | "automations";

export function useOrganizationModules() {
  const { profile } = useAuth();

  const { data: modules, isLoading } = useQuery({
    queryKey: ["organization-modules", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from("organization_modules")
        .select("*")
        .eq("organization_id", profile.organization_id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  const hasModule = (moduleName: ModuleName): boolean => {
    if (!modules) return true; // Default to true if no modules configured
    const module = modules.find((m) => m.module_name === moduleName);
    return module?.is_enabled ?? true;
  };

  return { modules, hasModule, isLoading };
}
