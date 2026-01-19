import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeadTimelineEvent {
  id: string;
  organization_id: string;
  lead_id: string;
  event_type: string;
  event_at: string;
  actor_user_id: string | null;
  channel: string | null;
  is_automation: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
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
      
      // Map fields for compatibility
      return (data || []).map((event: any) => ({
        ...event,
        event_at: event.created_at,
        actor_user_id: event.user_id,
        channel: null,
        is_automation: false,
      })) as LeadTimelineEvent[];
    },
    enabled: !!leadId
  });
}

export interface FirstResponseMetrics {
  average: number;
  median: number;
  count: number;
  withinSla: number;
  slaPercentage: number;
}

export interface FirstResponseFilters {
  userId?: string;
  pipelineId?: string;
  dateFrom?: string;
  dateTo?: string;
  slaSeconds?: number; // Default 600 (10 minutes)
}

// Placeholder for first response metrics - columns don't exist yet
export function useFirstResponseMetrics(filters: FirstResponseFilters = {}) {
  return useQuery({
    queryKey: ['first-response-metrics', filters],
    queryFn: async (): Promise<FirstResponseMetrics> => {
      // Return empty metrics until first_response_* columns are added to leads table
      return { average: 0, median: 0, count: 0, withinSla: 0, slaPercentage: 0 };
    }
  });
}

export interface UserFirstResponseRanking {
  userId: string;
  userName: string;
  userAvatar: string | null;
  average: number;
  median: number;
  count: number;
  slaPercentage: number;
}

// Placeholder for first response ranking - columns don't exist yet
export function useFirstResponseRanking(filters: Omit<FirstResponseFilters, 'userId'> = {}) {
  return useQuery({
    queryKey: ['first-response-ranking', filters],
    queryFn: async (): Promise<UserFirstResponseRanking[]> => {
      // Return empty rankings until first_response_* columns are added to leads table
      return [];
    }
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
