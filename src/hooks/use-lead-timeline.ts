import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Interface based on actual database schema
export interface LeadTimelineEvent {
  id: string;
  organization_id: string;
  lead_id: string;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, any> | null;
  user_id: string | null;
  created_at: string | null;
  actor?: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

export function useLeadTimeline(leadId: string | null) {
  return useQuery({
    queryKey: ['lead-timeline', leadId],
    queryFn: async (): Promise<LeadTimelineEvent[]> => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('lead_timeline_events')
        .select(`
          *,
          actor:users!lead_timeline_events_user_id_fkey(id, name, avatar_url)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      return (data || []) as LeadTimelineEvent[];
    },
    enabled: !!leadId
  });
}

// Helper function to format seconds to human-readable
export function formatResponseTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}
