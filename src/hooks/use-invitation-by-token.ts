import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Interface for invitation data
interface InvitationByToken {
  id: string;
  email: string | null;
  organization_id: string;
  expires_at: string;
}

/**
 * Hook to fetch invitation by token
 * Returns null if token is invalid or expired
 */
export function useInvitationByToken(token: string | null) {
  return useQuery({
    queryKey: ['invitation-by-token', token],
    queryFn: async (): Promise<InvitationByToken | null> => {
      if (!token) return null;
      
      // Query invitation directly - RLS should handle security
      const { data, error } = await supabase
        .from('invitations')
        .select('id, email, organization_id, expires_at')
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching invitation:', error);
        return null;
      }
      
      return data as InvitationByToken | null;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Don't retry if failed (could be invalid token)
  });
}
