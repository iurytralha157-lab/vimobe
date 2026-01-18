import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ScheduleEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  event_type: string | null;
  location: string | null;
  lead_id: string | null;
  property_id: string | null;
  user_id: string;
  organization_id: string;
  status: string | null;
  is_all_day: boolean | null;
  reminder_minutes: number | null;
  google_event_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useScheduleEvents(startDate?: Date, endDate?: Date) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["schedule-events", profile?.organization_id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      let query = supabase
        .from("schedule_events")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("start_time", { ascending: true });

      if (startDate) {
        query = query.gte("start_time", startDate.toISOString());
      }
      if (endDate) {
        query = query.lte("start_time", endDate.toISOString());
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
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (event: Partial<ScheduleEvent>) => {
      if (!profile?.organization_id || !user?.id) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("schedule_events")
        .insert({
          title: event.title || "",
          start_time: event.start_time || new Date().toISOString(),
          end_time: event.end_time || new Date().toISOString(),
          description: event.description,
          event_type: event.event_type,
          location: event.location,
          lead_id: event.lead_id,
          property_id: event.property_id,
          organization_id: profile.organization_id,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-events"] });
      toast.success("Evento criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar evento: " + error.message);
    },
  });
}

export function useDeleteScheduleEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedule_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-events"] });
      toast.success("Evento excluído!");
    },
  });
}
