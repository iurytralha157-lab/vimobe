import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface GoogleCalendarToken {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  calendar_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useGoogleCalendarStatus() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['google-calendar-status', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as GoogleCalendarToken | null;
    },
    enabled: !!profile?.id,
  });
}

export function useConnectGoogleCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // This will trigger the OAuth flow via edge function
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'connect' },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.authUrl) {
        // Open Google OAuth in new window
        window.open(data.authUrl, '_blank', 'width=500,height=600');
      }
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
    },
    onError: (error) => {
      console.error('Error connecting Google Calendar:', error);
      toast.error('Erro ao conectar Google Calendar');
    },
  });
}

export function useDisconnectGoogleCalendar() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Usuário não encontrado');

      const { error } = await supabase
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', profile.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
      toast.success('Google Calendar desconectado');
    },
    onError: (error) => {
      console.error('Error disconnecting Google Calendar:', error);
      toast.error('Erro ao desconectar Google Calendar');
    },
  });
}

export function useToggleGoogleCalendarSync() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (is_sync_enabled: boolean) => {
      if (!profile?.id) throw new Error('Usuário não encontrado');

      // Note: is_sync_enabled column may not exist - this is a placeholder
      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .update({ calendar_id: is_sync_enabled ? 'primary' : null })
        .eq('user_id', profile.id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, is_sync_enabled };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
      toast.success(data.is_sync_enabled ? 'Sincronização ativada' : 'Sincronização desativada');
    },
    onError: (error) => {
      console.error('Error toggling sync:', error);
      toast.error('Erro ao alterar sincronização');
    },
  });
}
