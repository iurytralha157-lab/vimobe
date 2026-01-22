import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  title: string;
  content: string | null;
  type: string;
  is_read: boolean;
  lead_id: string | null;
  created_at: string;
}

// Request browser notification permission
async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Send browser push notification
function sendBrowserNotification(title: string, options?: NotificationOptions) {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/logo.png',
      badge: '/logo.png',
      tag: 'crm-notification',
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    setTimeout(() => notification.close(), 10000);
  }
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const audioUnlockedRef = useRef(false);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  const newLeadSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio elements
  useEffect(() => {
    notificationSoundRef.current = new Audio('/sounds/notification.mp3');
    newLeadSoundRef.current = new Audio('/sounds/new-lead.mp3');
    notificationSoundRef.current.volume = 0.5;
    newLeadSoundRef.current.volume = 0.7;
    
    // Preload
    notificationSoundRef.current.load();
    newLeadSoundRef.current.load();
  }, []);

  // Request notification permission and unlock audio on first interaction
  useEffect(() => {
    requestNotificationPermission();
    
    const handleInteraction = () => {
      if (audioUnlockedRef.current) return;
      
      // Mark as unlocked FIRST to prevent multiple attempts
      audioUnlockedRef.current = true;
      
      // Unlock audio by playing silent (volume 0) and pausing immediately
      const unlockSound = (audio: HTMLAudioElement | null) => {
        if (!audio) return;
        const originalVolume = audio.volume;
        audio.volume = 0; // Silent unlock
        audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = originalVolume; // Restore volume
        }).catch(() => {
          audio.volume = originalVolume;
        });
      };

      unlockSound(notificationSoundRef.current);
      unlockSound(newLeadSoundRef.current);
      console.log('Audio unlocked for notifications');
      
      // Remove listeners after unlock
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };

    document.addEventListener('click', handleInteraction, { once: false });
    document.addEventListener('keydown', handleInteraction, { once: false });
    document.addEventListener('touchstart', handleInteraction, { once: false });

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!profile?.id) return;

    const setupChannel = () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel('notifications-realtime-v2')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${profile.id}`,
          },
          (payload) => {
            console.log('🔔 New notification received:', payload);
            
            const newNotification = payload.new as Notification;
            
            // Play sound based on type - only for important notifications
            // Skip WhatsApp message notifications (type: 'whatsapp' or 'message')
            const isWhatsAppNotification = newNotification.type === 'whatsapp' || newNotification.type === 'message';
            
            if (isWhatsAppNotification) {
              // Silent notification for WhatsApp - no sound, just update queries
              console.log('WhatsApp notification received (silent):', newNotification.title);
            } else if (newNotification.type === 'lead') {
              // New lead - play cha-ching sound
              if (newLeadSoundRef.current) {
                newLeadSoundRef.current.currentTime = 0;
                newLeadSoundRef.current.play().catch(console.log);
              }
              
              toast.success('🆕 Novo Lead!', {
                description: newNotification.content || newNotification.title,
                duration: 10000,
              });
            } else {
              // Other important notifications (financial, system, etc.)
              if (notificationSoundRef.current) {
                notificationSoundRef.current.currentTime = 0;
                notificationSoundRef.current.play().catch(console.log);
              }
              
              toast(newNotification.title, {
                description: newNotification.content || undefined,
                duration: 5000,
              });
            }

            sendBrowserNotification(newNotification.title, {
              body: newNotification.content || undefined,
              data: { lead_id: newNotification.lead_id },
            });

            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
            
            if (newNotification.type === 'lead') {
              queryClient.invalidateQueries({ queryKey: ['leads'] });
              queryClient.invalidateQueries({ queryKey: ['stages-with-leads'] });
              queryClient.invalidateQueries({ queryKey: ['pipelines'] });
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Notifications channel status:', status);
          if (status === 'CHANNEL_ERROR') {
            setTimeout(() => setupChannel(), 3000);
          }
        });

      channelRef.current = channel;
    };

    setupChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profile?.id, queryClient]);

  return useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!profile?.id,
    refetchInterval: 30000,
  });
}

export function useUnreadNotificationsCount() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('notifications-count-realtime-v2')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  return useQuery({
    queryKey: ['unread-notifications-count', profile?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile!.id)
        .eq('is_read', false);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile?.id,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.user.id)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notification: {
      user_id: string;
      organization_id: string;
      title: string;
      content?: string;
      type?: string;
      lead_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.user_id,
          organization_id: notification.organization_id,
          title: notification.title,
          content: notification.content || null,
          type: notification.type || 'info',
          lead_id: notification.lead_id || null,
          is_read: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });
}
