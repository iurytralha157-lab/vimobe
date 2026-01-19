import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TelephonyCall {
  id: string;
  organization_id: string;
  lead_id: string | null;
  user_id: string | null;
  external_call_id: string | null;
  direction: 'inbound' | 'outbound';
  phone_from: string | null;
  phone_to: string | null;
  status: string;
  outcome: string | null;
  initiated_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  talk_time_seconds: number | null;
  recording_url: string | null;
  recording_status: string | null;
  recording_storage_path: string | null;
  recording_duration_sec: number | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  lead?: {
    id: string;
    name: string;
  };
}

export function useLeadCalls(leadId: string | null) {
  return useQuery({
    queryKey: ['telephony-calls', 'lead', leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from('telephony_calls')
        .select(`
          *,
          user:users!telephony_calls_user_id_fkey(id, name, avatar_url)
        `)
        .eq('lead_id', leadId)
        .order('initiated_at', { ascending: false });

      if (error) throw error;
      return data as TelephonyCall[];
    },
    enabled: !!leadId,
  });
}

export function useUserCalls(userId?: string, options?: { 
  startDate?: Date; 
  endDate?: Date;
  status?: string;
}) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['telephony-calls', 'user', targetUserId, options],
    queryFn: async () => {
      if (!targetUserId) return [];

      let query = supabase
        .from('telephony_calls')
        .select(`
          *,
          lead:leads!telephony_calls_lead_id_fkey(id, name)
        `)
        .eq('user_id', targetUserId)
        .order('initiated_at', { ascending: false });

      if (options?.startDate) {
        query = query.gte('initiated_at', options.startDate.toISOString());
      }
      if (options?.endDate) {
        query = query.lte('initiated_at', options.endDate.toISOString());
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TelephonyCall[];
    },
    enabled: !!targetUserId,
  });
}

export function useOrganizationCalls(options?: {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  teamId?: string;
  pipelineId?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['telephony-calls', 'organization', options],
    queryFn: async () => {
      let query = supabase
        .from('telephony_calls')
        .select(`
          *,
          user:users!telephony_calls_user_id_fkey(id, name, avatar_url),
          lead:leads!telephony_calls_lead_id_fkey(id, name, pipeline_id)
        `)
        .order('initiated_at', { ascending: false });

      if (options?.startDate) {
        query = query.gte('initiated_at', options.startDate.toISOString());
      }
      if (options?.endDate) {
        query = query.lte('initiated_at', options.endDate.toISOString());
      }
      if (options?.userId) {
        query = query.eq('user_id', options.userId);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by pipeline if needed (post-query since it's nested)
      let results = data as TelephonyCall[];
      if (options?.pipelineId) {
        results = results.filter(c => (c.lead as any)?.pipeline_id === options.pipelineId);
      }

      return results;
    },
  });
}

export interface TelephonyMetrics {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  outboundCalls: number;
  inboundCalls: number;
  talkTimeTotal: number;
  talkTimeAvg: number;
  durationTotal: number;
  durationAvg: number;
  answerRate: number;
}

export function useTelephonyMetrics(options?: {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  teamId?: string;
}) {
  return useQuery({
    queryKey: ['telephony-metrics', options],
    queryFn: async () => {
      let query = supabase
        .from('telephony_calls')
        .select('*');

      if (options?.startDate) {
        query = query.gte('initiated_at', options.startDate.toISOString());
      }
      if (options?.endDate) {
        query = query.lte('initiated_at', options.endDate.toISOString());
      }
      if (options?.userId) {
        query = query.eq('user_id', options.userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const calls = data || [];
      const answered = calls.filter(c => c.status === 'answered' || c.status === 'ended');
      const missed = calls.filter(c => c.status === 'missed' || c.status === 'no_answer');
      const outbound = calls.filter(c => c.direction === 'outbound');
      const inbound = calls.filter(c => c.direction === 'inbound');

      const talkTimeTotal = calls.reduce((sum, c) => sum + (c.talk_time_seconds || 0), 0);
      const durationTotal = calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);

      const metrics: TelephonyMetrics = {
        totalCalls: calls.length,
        answeredCalls: answered.length,
        missedCalls: missed.length,
        outboundCalls: outbound.length,
        inboundCalls: inbound.length,
        talkTimeTotal,
        talkTimeAvg: answered.length > 0 ? Math.round(talkTimeTotal / answered.length) : 0,
        durationTotal,
        durationAvg: calls.length > 0 ? Math.round(durationTotal / calls.length) : 0,
        answerRate: calls.length > 0 ? Math.round((answered.length / calls.length) * 100) : 0,
      };

      return metrics;
    },
  });
}

export interface BrokerTelephonyRanking {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  totalCalls: number;
  answeredCalls: number;
  talkTimeTotal: number;
  talkTimeAvg: number;
  answerRate: number;
}

export function useTelephonyRanking(options?: {
  startDate?: Date;
  endDate?: Date;
  teamId?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['telephony-ranking', options],
    queryFn: async () => {
      let query = supabase
        .from('telephony_calls')
        .select(`
          user_id,
          status,
          talk_time_seconds,
          duration_seconds,
          user:users!telephony_calls_user_id_fkey(id, name, avatar_url)
        `);

      if (options?.startDate) {
        query = query.gte('initiated_at', options.startDate.toISOString());
      }
      if (options?.endDate) {
        query = query.lte('initiated_at', options.endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by user
      const userMap = new Map<string, {
        user: any;
        calls: any[];
      }>();

      for (const call of data || []) {
        if (!call.user_id) continue;
        
        if (!userMap.has(call.user_id)) {
          userMap.set(call.user_id, {
            user: call.user,
            calls: [],
          });
        }
        userMap.get(call.user_id)!.calls.push(call);
      }

      const ranking: BrokerTelephonyRanking[] = [];

      for (const [userId, data] of userMap) {
        const answered = data.calls.filter(c => c.status === 'answered' || c.status === 'ended');
        const talkTimeTotal = data.calls.reduce((sum, c) => sum + (c.talk_time_seconds || 0), 0);

        ranking.push({
          userId,
          userName: data.user?.name || 'Unknown',
          avatarUrl: data.user?.avatar_url,
          totalCalls: data.calls.length,
          answeredCalls: answered.length,
          talkTimeTotal,
          talkTimeAvg: answered.length > 0 ? Math.round(talkTimeTotal / answered.length) : 0,
          answerRate: data.calls.length > 0 ? Math.round((answered.length / data.calls.length) * 100) : 0,
        });
      }

      // Sort by total calls descending
      ranking.sort((a, b) => b.totalCalls - a.totalCalls);

      return options?.limit ? ranking.slice(0, options.limit) : ranking;
    },
  });
}

export function useRecordingUrl() {
  return useMutation({
    mutationFn: async (callId: string) => {
      const { data, error } = await supabase.functions.invoke('telephony-recording-proxy', {
        body: null,
        headers: {},
      });

      // Use query params approach
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telephony-recording-proxy?call_id=${callId}&action=signed_url`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get recording URL');
      }

      return response.json() as Promise<{ url: string; expires_in?: number; warning?: string }>;
    },
  });
}

export function useCreateCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      lead_id?: string;
      phone_to: string;
      direction?: 'inbound' | 'outbound';
      notes?: string;
    }) => {
      const { data: call, error } = await supabase
        .from('telephony_calls')
        .insert({
          phone_to: data.phone_to,
          phone_from: null,
          direction: data.direction || 'outbound',
          status: 'initiated',
          initiated_at: new Date().toISOString(),
          notes: data.notes,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return call;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['telephony-calls'] });
      if (variables.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['telephony-calls', 'lead', variables.lead_id] });
      }
    },
  });
}

export function useUpdateCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<TelephonyCall> & { id: string }) => {
      const { data: call, error } = await supabase
        .from('telephony_calls')
        .update(data as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return call;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telephony-calls'] });
    },
  });
}

// Helper to format duration
export function formatCallDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Helper to format total time (for metrics)
export function formatTotalTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
