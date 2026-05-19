import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ScheduleComment {
  id: string;
  event_id: string;
  user_id: string;
  organization_id: string;
  content: string;
  created_at: string;
  user?: {
    name: string;
    avatar_url?: string | null;
  };
}

export function useScheduleComments(eventId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["schedule_comments", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from("schedule_event_comments")
        .select("id, event_id, user_id, organization_id, content, created_at, user:profiles(name, avatar_url)")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as ScheduleComment[];
    },
    enabled: !!eventId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !eventId) throw new Error("Usuário ou evento não identificado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error("Organização não encontrada");

      // Inserir comentário
      const { data, error } = await supabase
        .from("schedule_event_comments")
        .insert({
          event_id: eventId,
          content,
          user_id: user.id,
          organization_id: profile.organization_id,
        })
        .select()
        .single();

      if (error) throw error;

      // Buscar detalhes do evento para notificação e histórico do lead
      const { data: eventData } = await supabase
        .from("schedule_events")
        .select("title, lead_id, assigned_to")
        .eq("id", eventId)
        .maybeSingle();

      if (eventData) {
        const anyEventData = eventData as any;
        if (anyEventData.lead_id) {
          // Inserir no histórico do lead
          await supabase.from("lead_history").insert({
            lead_id: anyEventData.lead_id,
            organization_id: profile.organization_id,
            user_id: user.id,
            type: "schedule_comment",
            content: `Comentário na tarefa "${anyEventData.title}": ${content}`,
          } as any);
        }

        // Notificação para o responsável (se não for o próprio autor)
        if (anyEventData.assigned_to && anyEventData.assigned_to !== user.id) {
          await supabase.from("notifications").insert({
            user_id: anyEventData.assigned_to,
            organization_id: profile.organization_id,
            type: "schedule_comment",
            title: "Novo comentário em tarefa",
            content: `Um novo comentário foi adicionado na tarefa: ${anyEventData.title}`,
            link: "/agenda",
          } as any);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule_comments", eventId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar comentário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    comments,
    isLoading,
    addComment: addCommentMutation.mutate,
    isAdding: addCommentMutation.isPending,
  };
}
