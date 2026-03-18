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
 *
 * NOTE: The whatsapp_session_access RLS has a circular dependency with whatsapp_sessions.
 * To work around this, we use two separate queries for regular users:
 * 1. Fetch owned sessions (bypasses access grant check)
 * 2. Fetch session_ids from access grants using only user_id filter
 * 3. Fetch those sessions by ID
 */
export function useAccessibleSessions() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["accessible-sessions", profile?.id, profile?.organization_id, profile?.role],
    queryFn: async (): Promise<WhatsAppSession[]> => {
      if (!profile?.id || !profile?.organization_id) return [];

      // Admins see ALL sessions in the organization
      if (profile.role === 'admin' || profile.role === 'super_admin') {
        const { data, error } = await supabase
          .from("whatsapp_sessions")
          .select("*")
          .eq("organization_id", profile.organization_id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching all org sessions for admin:", error);
          return [];
        }
        return (data || []) as WhatsAppSession[];
      }

      // Regular users: fetch owned sessions first
      const { data: ownedSessions, error: ownedError } = await supabase
        .from("whatsapp_sessions")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .eq("owner_user_id", profile.id);

      if (ownedError) {
        console.error("Error fetching owned sessions:", ownedError);
      }

      // Separately fetch access grants filtered only by user_id.
      // This avoids the circular RLS: the policy on whatsapp_session_access checks
      // session_id IN (SELECT id FROM whatsapp_sessions WITH RLS), which itself checks
      // whatsapp_session_access again — causing a circular loop that returns nothing.
      // By querying just session_id from the grants and then fetching sessions by ID,
      // we break the cycle.
      const { data: accessGrants, error: accessError } = await supabase
        .from("whatsapp_session_access")
        .select("session_id")
        .eq("user_id", profile.id)
        .eq("can_view", true);

      if (accessError) {
        console.error("Error fetching session access grants:", accessError);
      }

      // Fetch the actual session data for granted session IDs
      let accessSessions: WhatsAppSession[] = [];
      if (accessGrants && accessGrants.length > 0) {
        const grantedSessionIds = accessGrants.map((g: any) => g.session_id).filter(Boolean);
        if (grantedSessionIds.length > 0) {
          const { data: grantedSessions, error: gsError } = await supabase
            .from("whatsapp_sessions")
            .select("*")
            .in("id", grantedSessionIds)
            .eq("organization_id", profile.organization_id);

          if (gsError) {
            console.error("Error fetching granted sessions:", gsError);
          } else {
            accessSessions = (grantedSessions || []) as WhatsAppSession[];
          }
        }
      }

      // Combine and deduplicate by session ID
      const ownedList = (ownedSessions || []) as WhatsAppSession[];
      const allSessions = [...ownedList, ...accessSessions];
      const uniqueSessions = [...new Map(allSessions.map(s => [s.id, s])).values()];
      
      return uniqueSessions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!profile?.id && !!profile?.organization_id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
