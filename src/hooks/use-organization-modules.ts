import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ModuleName = 
  | 'crm' 
  | 'financial' 
  | 'properties' 
  | 'plans'        // Telecom: Planos de Serviço
  | 'coverage'     // Telecom: Áreas de Cobertura
  | 'telecom'      // Telecom: Clientes
  | 'whatsapp' 
  | 'agenda' 
  | 'cadences'
  | 'tags'
  | 'round_robin'
  | 'reports'
  | 'automations'  // Automações
  | 'performance'  // Performance de Corretores
  | 'gamification'   // Gamificação
  | 'webhooks'     // Webhooks
  | 'site'         // Site Integrado
  | 'ai_agent'    // Agente de IA
  | 'api';         // API Pública

// Default modules that are enabled if no explicit record exists
const DEFAULT_ENABLED_MODULES: ModuleName[] = [
  'crm',
  'properties',
  'whatsapp',
  'agenda',
  'cadences',
  'tags',
  'round_robin',
  'reports'
];

export function useOrganizationModules() {
  const { organization, isSuperAdmin, loading: authLoading } = useAuth();

  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ['organization-modules', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('organization_modules')
        .select('*')
        .eq('organization_id', organization.id);

      if (error) {
        console.error('Error fetching organization modules:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!organization?.id,
  });

  // Consider loading if auth is still loading OR if we have an org but modules aren't loaded yet
  const isLoading = authLoading || (!!organization?.id && modulesLoading);

  // Check if a specific module is enabled
  const hasModule = (moduleName: ModuleName): boolean => {
    // Super admin always has access to all modules when impersonating
    if (isSuperAdmin && organization?.id) return true;
    
    // If still loading, assume module is available to prevent flicker
    if (isLoading) return true;
    
    // If no organization, no modules available
    if (!organization?.id) return false;
    
    // Find the module in the list
    const moduleRecord = modules?.find(m => m.module_name === moduleName);
    
    // If found in list, use its value
    if (moduleRecord) {
      return moduleRecord.is_enabled;
    }

    // If not found in list, check defaults
    return DEFAULT_ENABLED_MODULES.includes(moduleName);
  };

  // Get list of all enabled modules
  const enabledModules = (): ModuleName[] => {
    if (isSuperAdmin && organization?.id) {
      // Return all modules for super admin
      return [
        ...DEFAULT_ENABLED_MODULES,
        'financial', 'plans', 'coverage', 'telecom', 'automations', 
        'performance', 'gamification', 'webhooks', 'site', 'ai_agent', 'api'
      ];
    }
    
    if (!organization?.id) return [];

    // Start with default list
    let list = [...DEFAULT_ENABLED_MODULES];

    // Apply database settings
    if (modules && modules.length > 0) {
      modules.forEach(m => {
        const name = m.module_name as ModuleName;
        if (m.is_enabled) {
          if (!list.includes(name)) list.push(name);
        } else {
          list = list.filter(item => item !== name);
        }
      });
    }

    return list;
  };

  return {
    modules,
    isLoading,
    hasModule,
    enabledModules,
  };
}
