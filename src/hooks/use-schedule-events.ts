import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type EventType = 'call' | 'email' | 'meeting' | 'task' | 'message' | 'visit';

export interface ScheduleEvent {
  id: string;
  organization_id: string;
  user_id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  event_type: EventType;
  start_at: string;
  end_at: string | null;
  duration_minutes: number | null;
  all_day: boolean;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  google_event_id: string | null;
  google_calendar_id: string | null;
  source: string;
  cadence_task_id: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  lead?: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
}

interface UseScheduleEventsOptions {
  userId?: string;
  leadId?: string;
  startDate?: Date;
  endDate?: Date;
}

export function useScheduleEvents(options: UseScheduleEventsOptions = {}) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['schedule-events', options],
    queryFn: async () => {
      let query = supabase
        .from('schedule_events')
        .select(`
          *,
          user:users!schedule_events_user_id_fkey(id, name, avatar_url),
          lead:leads(id, name, phone)
        `)
        .order('start_at', { ascending: true });

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options.leadId) {
        query = query.eq('lead_id', options.leadId);
      }

      if (options.startDate) {
        query = query.gte('start_at', options.startDate.toISOString());
      }

      if (options.endDate) {
        query = query.lte('start_at', options.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ScheduleEvent[];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useCreateScheduleEvent() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (event: {
      title: string;
      description?: string;
      event_type: EventType;
      start_at: string;
      end_at?: string;
      duration_minutes?: number;
      all_day?: boolean;
      user_id?: string;
      lead_id?: string;
      is_completed?: boolean;
    }) => {
      if (!profile?.organization_id) throw new Error('Organização não encontrada');

      const { data, error } = await supabase
        .from('schedule_events')
        .insert({
          organization_id: profile.organization_id,
          user_id: event.user_id || profile.id,
          lead_id: event.lead_id || null,
          title: event.title,
          description: event.description || null,
          event_type: event.event_type,
          start_at: event.start_at,
          end_at: event.end_at || null,
          duration_minutes: event.duration_minutes || 30,
          all_day: event.all_day || false,
          is_completed: event.is_completed || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-events'] });
      toast.success('Atividade criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating schedule event:', error);
      toast.error('Erro ao criar atividade');
    },
  });
}

export function useUpdateScheduleEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScheduleEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from('schedule_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-events'] });
      toast.success('Atividade atualizada!');
    },
    onError: (error) => {
      console.error('Error updating schedule event:', error);
      toast.error('Erro ao atualizar atividade');
    },
  });
}

export function useCompleteScheduleEvent() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { data, error } = await supabase
        .from('schedule_events')
        .update({
          is_completed,
          completed_at: is_completed ? new Date().toISOString() : null,
          completed_by: is_completed ? profile?.id : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-events'] });
      toast.success(data.is_completed ? 'Atividade concluída!' : 'Atividade reaberta');
    },
    onError: (error) => {
      console.error('Error completing schedule event:', error);
      toast.error('Erro ao atualizar atividade');
    },
  });
}

export function useDeleteScheduleEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('schedule_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-events'] });
      toast.success('Atividade removida!');
    },
    onError: (error) => {
      console.error('Error deleting schedule event:', error);
      toast.error('Erro ao remover atividade');
    },
  });
}
