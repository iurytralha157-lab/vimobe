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
  property_id: string | null;
  title: string;
  description: string | null;
  event_type: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean | null;
  location: string | null;
  status: string | null;
  reminder_minutes: number | null;
  google_event_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  user?: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
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
      let query = (supabase as any)
        .from('schedule_events')
        .select(`
          *,
          user:users!schedule_events_user_id_fkey(id, name, avatar_url),
          lead:leads(id, name, phone)
        `)
        .order('start_time', { ascending: true });

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options.leadId) {
        query = query.eq('lead_id', options.leadId);
      }

      if (options.startDate) {
        query = query.gte('start_time', options.startDate.toISOString());
      }

      if (options.endDate) {
        query = query.lte('start_time', options.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ScheduleEvent[];
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
      event_type?: EventType;
      start_time: string;
      end_time: string;
      is_all_day?: boolean;
      user_id?: string;
      lead_id?: string;
      location?: string;
    }) => {
      if (!profile?.organization_id) throw new Error('Organização não encontrada');

      const { data, error } = await (supabase as any)
        .from('schedule_events')
        .insert({
          organization_id: profile.organization_id,
          user_id: event.user_id || profile.id,
          lead_id: event.lead_id || null,
          title: event.title,
          description: event.description || null,
          event_type: event.event_type || 'task',
          start_time: event.start_time,
          end_time: event.end_time,
          is_all_day: event.is_all_day || false,
          location: event.location || null,
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
    onError: (error: Error) => {
      console.error('Error creating schedule event:', error);
      toast.error('Erro ao criar atividade');
    },
  });
}

export function useUpdateScheduleEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScheduleEvent> & { id: string }) => {
      const { data, error } = await (supabase as any)
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
    onError: (error: Error) => {
      console.error('Error updating schedule event:', error);
      toast.error('Erro ao atualizar atividade');
    },
  });
}

export function useCompleteScheduleEvent() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await (supabase as any)
        .from('schedule_events')
        .update({
          status,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-events'] });
      toast.success(data.status === 'completed' ? 'Atividade concluída!' : 'Atividade reaberta');
    },
    onError: (error: Error) => {
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
    onError: (error: Error) => {
      console.error('Error deleting schedule event:', error);
      toast.error('Erro ao remover atividade');
    },
  });
}
