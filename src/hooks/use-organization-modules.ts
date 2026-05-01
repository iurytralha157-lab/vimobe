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
// Note: 'automations' is disabled by default and must be explicitly enabled by super admin
const DEFAULT_ENABLED_MODULES: ModuleName[] = [
  'crm',
  // 'financial' is now disabled by default as per request
  'properties',
  'whatsapp',
  'agenda',
  'cadences',
  'tags',
  'round_robin',
  'reports',
  'performance'
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
    
    // If no modules configured, use defaults (all enabled)
    if (!modules || modules.length === 0) {
      return DEFAULT_ENABLED_MODULES.includes(moduleName);
    }

    // Find the module in the list
    const moduleRecord = modules.find(m => m.module_name === moduleName);
    
    // If not found in list, check if it's enabled by default
    if (!moduleRecord) {
      if (moduleName === 'financial' || moduleName === 'gamification') return false;
      return DEFAULT_ENABLED_MODULES.includes(moduleName);
    }
    
    // Explicit exclusions that cannot be enabled without code logic
    if (moduleName === 'financial') return false;
    
    return moduleRecord.is_enabled;
  };

  // Get list of all enabled modules
  const enabledModules = (): ModuleName[] => {
    // Definimos a lista base considerando os estados desativados por padrão
    const baseList = DEFAULT_ENABLED_MODULES.filter(m => m !== 'financial' && m !== 'gamification');
    
    if (isSuperAdmin) return baseList;
    
    if (!modules || modules.length === 0) {
      return baseList;
    }

    // Retorna todos os módulos que não estão explicitamente marcados como is_enabled: false
    // E garante que módulos não listados em DEFAULT_ENABLED_MODULES mas ativados no DB apareçam
    const allPossible = Array.from(new Set([
      ...baseList, 
      ...(modules.filter(m => m.is_enabled && m.module_name !== 'financial' && m.module_name !== 'gamification').map(m => m.module_name as ModuleName))
    ]));

    return allPossible.filter(moduleName => {
      if (moduleName === 'financial') return false;
      const moduleRecord = modules.find(m => m.module_name === moduleName);
      return !moduleRecord || moduleRecord.is_enabled;
    });
  };


  return {
    modules,
    isLoading,
    hasModule,
    enabledModules,
  };
}
