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
          actor:users!lead_timeline_events_actor_user_id_fkey(id, name, avatar_url)
        `)
        .eq('lead_id', leadId)
        .order('event_at', { ascending: true });
        
      if (error) throw error;
      return (data || []) as LeadTimelineEvent[];
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

export function useFirstResponseMetrics(filters: FirstResponseFilters = {}) {
  return useQuery({
    queryKey: ['first-response-metrics', filters],
    queryFn: async (): Promise<FirstResponseMetrics> => {
      let query = supabase
        .from('leads')
        .select('first_response_seconds, first_response_actor_user_id, first_response_at')
        .not('first_response_at', 'is', null);
      
      if (filters.userId) {
        query = query.eq('first_response_actor_user_id', filters.userId);
      }
      
      if (filters.pipelineId) {
        query = query.eq('pipeline_id', filters.pipelineId);
      }
      
      if (filters.dateFrom) {
        query = query.gte('first_response_at', filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query = query.lte('first_response_at', filters.dateTo);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      const times = data
        ?.map(d => d.first_response_seconds)
        .filter((t): t is number => t !== null && t !== undefined) || [];
      
      if (times.length === 0) {
        return { average: 0, median: 0, count: 0, withinSla: 0, slaPercentage: 0 };
      }
      
      const sum = times.reduce((a, b) => a + b, 0);
      const average = Math.round(sum / times.length);
      
      const sorted = [...times].sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0
        ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
        : sorted[middle];
      
      const slaSeconds = filters.slaSeconds || 600; // Default 10 minutes
      const withinSla = times.filter(t => t <= slaSeconds).length;
      const slaPercentage = Math.round((withinSla / times.length) * 100);

      return { 
        average, 
        median, 
        count: times.length, 
        withinSla,
        slaPercentage
      };
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

export function useFirstResponseRanking(filters: Omit<FirstResponseFilters, 'userId'> = {}) {
  return useQuery({
    queryKey: ['first-response-ranking', filters],
    queryFn: async (): Promise<UserFirstResponseRanking[]> => {
      let query = supabase
        .from('leads')
        .select(`
          first_response_seconds,
          first_response_actor_user_id,
          first_response_at,
          actor:users!leads_first_response_actor_user_id_fkey(id, name, avatar_url)
        `)
        .not('first_response_at', 'is', null)
        .not('first_response_actor_user_id', 'is', null);
      
      if (filters.pipelineId) {
        query = query.eq('pipeline_id', filters.pipelineId);
      }
      
      if (filters.dateFrom) {
        query = query.gte('first_response_at', filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query = query.lte('first_response_at', filters.dateTo);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Group by user
      const userMap = new Map<string, {
        userId: string;
        userName: string;
        userAvatar: string | null;
        times: number[];
      }>();
      
      const slaSeconds = filters.slaSeconds || 600;
      
      for (const lead of data || []) {
        if (!lead.first_response_actor_user_id || lead.first_response_seconds === null) continue;
        
        const userId = lead.first_response_actor_user_id;
        const actor = lead.actor as { id: string; name: string; avatar_url: string | null } | null;
        
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            userId,
            userName: actor?.name || 'Desconhecido',
            userAvatar: actor?.avatar_url || null,
            times: []
          });
        }
        
        userMap.get(userId)!.times.push(lead.first_response_seconds);
      }
      
      // Calculate metrics for each user
      const rankings: UserFirstResponseRanking[] = [];
      
      for (const [_, userData] of userMap) {
        const times = userData.times;
        const sum = times.reduce((a, b) => a + b, 0);
        const average = Math.round(sum / times.length);
        
        const sorted = [...times].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 === 0
          ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
          : sorted[middle];
        
        const withinSla = times.filter(t => t <= slaSeconds).length;
        const slaPercentage = Math.round((withinSla / times.length) * 100);
        
        rankings.push({
          userId: userData.userId,
          userName: userData.userName,
          userAvatar: userData.userAvatar,
          average,
          median,
          count: times.length,
          slaPercentage
        });
      }
      
      // Sort by average (fastest first)
      return rankings.sort((a, b) => a.average - b.average);
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
