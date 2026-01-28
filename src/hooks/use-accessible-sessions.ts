import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { WhatsAppSession } from "./use-whatsapp-sessions";

/**
 * Hook to get only WhatsApp sessions that the current user can access conversations for.
 * 
 * - Admins see all sessions in their organization
 * - Non-admins see only:
 *   - Sessions they own (owner_user_id)
 *   - Sessions they have explicit access to via whatsapp_session_access
 */
export function useAccessibleSessions() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["accessible-sessions", profile?.id, profile?.organization_id, profile?.role],
    queryFn: async (): Promise<WhatsAppSession[]> => {
      if (!profile?.id || !profile?.organization_id) return [];

      // Admins see all sessions in their organization
      if (profile.role === 'admin') {
        const { data, error } = await supabase
          .from("whatsapp_sessions")
          .select("*")
          .eq("organization_id", profile.organization_id)
          .order("created_at", { ascending: false });
        
        if (error) {
          console.error("Error fetching sessions for admin:", error);
          return [];
        }
        return data as WhatsAppSession[];
      }

      // Non-admins: fetch owned sessions + sessions with explicit access
      const [ownedResult, accessResult] = await Promise.all([
        supabase
          .from("whatsapp_sessions")
          .select("*")
          .eq("organization_id", profile.organization_id)
          .eq("owner_user_id", profile.id),
        supabase
          .from("whatsapp_session_access")
          .select("session:whatsapp_sessions!whatsapp_session_access_session_id_fkey(*)")
          .eq("user_id", profile.id)
          .eq("can_view", true)
      ]);

      if (ownedResult.error) {
        console.error("Error fetching owned sessions:", ownedResult.error);
      }
      if (accessResult.error) {
        console.error("Error fetching session access:", accessResult.error);
      }

      const ownedSessions = (ownedResult.data || []) as WhatsAppSession[];
      const accessSessions = (accessResult.data || [])
        .map((grant: any) => grant.session)
        .filter((session: any): session is WhatsAppSession => 
          session !== null && session.organization_id === profile.organization_id
        );

      // Combine and deduplicate by session ID
      const allSessions = [...ownedSessions, ...accessSessions];
      const uniqueSessions = [...new Map(allSessions.map(s => [s.id, s])).values()];
      
      return uniqueSessions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!profile?.id && !!profile?.organization_id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
