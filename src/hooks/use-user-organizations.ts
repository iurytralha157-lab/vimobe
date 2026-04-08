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

      const { data, error } = await supabase.rpc('get_user_organizations', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error fetching user organizations:', error);
        return [];
      }

      return (data || []) as UserOrganization[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}
