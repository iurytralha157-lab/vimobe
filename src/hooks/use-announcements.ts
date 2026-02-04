import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Announcement {
  id: string;
  message: string;
  button_text: string | null;
  button_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Hook para buscar o comunicado ativo (para todos os usuários)
export function useActiveAnnouncement() {
  return useQuery({
    queryKey: ['active-announcement'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as Announcement | null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10,
  });
}

// Hook para gerenciar comunicados (para super admins)
export function useAnnouncements() {
  const queryClient = useQueryClient();

  const publishMutation = useMutation({
    mutationFn: async ({
      message,
      buttonText,
      buttonUrl,
    }: {
      message: string;
      buttonText?: string;
      buttonUrl?: string;
    }) => {
      // 1. Desativar comunicados anteriores
      await supabase
        .from('announcements')
        .update({ is_active: false })
        .eq('is_active', true);

      // 2. Criar novo comunicado
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: announcement, error } = await supabase
        .from('announcements')
        .insert({
          message,
          button_text: buttonText || null,
          button_url: buttonUrl || null,
          is_active: true,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // 3. Buscar todos os usuários ativos
      const { data: users } = await supabase
        .from('users')
        .select('id, organization_id')
        .eq('is_active', true);

      // 4. Criar notificações em lote
      if (users && users.length > 0) {
        const notifications = users.map(user => ({
          user_id: user.id,
          organization_id: user.organization_id,
          title: '📢 Comunicado',
          content: message,
          type: 'system',
        }));

        await supabase.from('notifications').insert(notifications);
      }

      return announcement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-announcement'] });
      toast.success('Comunicado publicado e notificações enviadas!');
    },
    onError: (error: any) => {
      toast.error('Erro ao publicar: ' + error.message);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: false })
        .eq('is_active', true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-announcement'] });
      toast.success('Comunicado desativado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao desativar: ' + error.message);
    },
  });

  return {
    publish: publishMutation.mutateAsync,
    deactivate: deactivateMutation.mutateAsync,
    isPublishing: publishMutation.isPending,
    isDeactivating: deactivateMutation.isPending,
  };
}
