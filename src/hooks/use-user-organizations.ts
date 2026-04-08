import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserOrganization {
  organization_id: string;
  organization_name: string;
  organization_logo: string | null;
  member_role: string;
  is_active: boolean;
  joined_at: string;
}

export function useUserOrganizations(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-organizations', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Query organization_members joined with organizations
      const { data, error } = await supabase
        .from('organization_members' as any)
        .select(`
          organization_id,
          role,
          is_active,
          joined_at,
          organizations:organization_id (
            id,
            name,
            logo_url
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching user organizations:', error);
        // Fallback: return user's current org from profile
        const { data: profile } = await supabase
          .from('users')
          .select('organization_id, role')
          .eq('id', userId)
          .single();
        
        if (profile?.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('id, name, logo_url')
            .eq('id', profile.organization_id)
            .single();
          
          if (org) {
            return [{
              organization_id: org.id,
              organization_name: org.name,
              organization_logo: org.logo_url,
              member_role: profile.role || 'user',
              is_active: true,
              joined_at: new Date().toISOString(),
            }] as UserOrganization[];
          }
        }
        return [];
      }

      return (data || []).map((item: any) => ({
        organization_id: item.organization_id,
        organization_name: item.organizations?.name || '',
        organization_logo: item.organizations?.logo_url || null,
        member_role: item.role,
        is_active: item.is_active,
        joined_at: item.joined_at,
      })) as UserOrganization[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}
