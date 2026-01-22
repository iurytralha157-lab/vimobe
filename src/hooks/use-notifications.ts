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

    // Auto close after 10 seconds
    setTimeout(() => notification.close(), 10000);
  }
}

// Audio manager for notifications
class NotificationAudioManager {
  private notificationSound: HTMLAudioElement | null = null;
  private newLeadSound: HTMLAudioElement | null = null;
  private isUnlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.notificationSound = new Audio('/sounds/notification.mp3');
      this.newLeadSound = new Audio('/sounds/new-lead.mp3');
      this.notificationSound.volume = 0.5;
      this.newLeadSound.volume = 0.7;
      
      // Preload audio files
      this.notificationSound.load();
      this.newLeadSound.load();
    }
  }

  unlock() {
    if (this.isUnlocked) return;
    
    // Play and immediately pause to unlock audio on user interaction
    const unlockSound = (audio: HTMLAudioElement | null) => {
      if (!audio) return;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {});
    };

    unlockSound(this.notificationSound);
    unlockSound(this.newLeadSound);
    this.isUnlocked = true;
    console.log('Audio unlocked for notifications');
  }

  playNotification() {
    if (this.notificationSound) {
      this.notificationSound.currentTime = 0;
      this.notificationSound.play().catch((err) => {
        console.log('Could not play notification sound:', err);
      });
    }
  }

  playNewLead() {
    if (this.newLeadSound) {
      this.newLeadSound.currentTime = 0;
      this.newLeadSound.play().catch((err) => {
        console.log('Could not play new lead sound:', err);
      });
    }
  }
}

// Singleton audio manager
const audioManager = new NotificationAudioManager();

export function useNotifications() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Request notification permission and unlock audio on first interaction
  useEffect(() => {
    requestNotificationPermission();
    
    // Unlock audio on first user interaction
    const handleInteraction = () => {
      audioManager.unlock();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };

    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('keydown', handleInteraction, { once: true });
    document.addEventListener('touchstart', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // Subscribe to realtime notifications with sound and push
  useEffect(() => {
    if (!profile?.id) return;

    const setupChannel = () => {
      // Remove existing channel if any
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
            
            // Play different sound based on notification type
            if (newNotification.type === 'lead') {
              audioManager.playNewLead();
              
              // Show toast for new lead
              toast.success('🆕 Novo Lead!', {
                description: newNotification.content || newNotification.title,
                duration: 10000,
              });
            } else {
              audioManager.playNotification();
              
              // Show toast for other notifications
              toast(newNotification.title, {
                description: newNotification.content || undefined,
                duration: 5000,
              });
            }

            // Send browser push notification
            sendBrowserNotification(newNotification.title, {
              body: newNotification.content || undefined,
              data: { lead_id: newNotification.lead_id },
            });

            // Invalidate notification queries
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
            
            // Also invalidate leads/stages for immediate update on Pipelines page
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
            console.log('⚠️ Channel error, will retry in 3 seconds...');
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
    refetchInterval: 30000, // Polling backup every 30 seconds
  });
}

export function useUnreadNotificationsCount() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  // Subscribe to realtime for count updates
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
    refetchInterval: 30000, // Polling backup
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
