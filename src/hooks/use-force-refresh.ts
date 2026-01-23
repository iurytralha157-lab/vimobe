import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CHANNEL_NAME = 'system-updates';

/**
 * Hook that listens for force refresh broadcasts and reloads the page
 * when received. Used by all users.
 */
export function useForceRefreshListener() {
  useEffect(() => {
    const channel = supabase.channel(CHANNEL_NAME);

    channel
      .on('broadcast', { event: 'force-refresh' }, (payload) => {
        console.log('[ForceRefresh] Received refresh signal:', payload);
        
        // Show a toast before refreshing
        toast.info('Atualizando sistema...', {
          duration: 1500,
        });

        // Clear all caches
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => {
              caches.delete(name);
            });
          });
        }

        // Clear localStorage cache items (not auth)
        const keysToKeep = ['sb-iemalzlfnbouobyjwlwi-auth-token', 'impersonate_session'];
        Object.keys(localStorage).forEach((key) => {
          if (!keysToKeep.some(k => key.includes(k))) {
            // Only clear cache-related items
            if (key.includes('cache') || key.includes('query')) {
              localStorage.removeItem(key);
            }
          }
        });

        // Delay slightly to show the toast, then reload
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      })
      .subscribe((status) => {
        console.log('[ForceRefresh] Channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

/**
 * Hook that provides a function to broadcast force refresh to all users.
 * Used by admins only.
 */
export function useForceRefreshBroadcast() {
  const broadcastRefresh = useCallback(async () => {
    const channel = supabase.channel(CHANNEL_NAME);
    
    // Subscribe first to be able to send
    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          resolve();
        }
      });
    });

    // Send the broadcast
    await channel.send({
      type: 'broadcast',
      event: 'force-refresh',
      payload: {
        timestamp: new Date().toISOString(),
        message: 'Admin triggered force refresh',
      },
    });

    console.log('[ForceRefresh] Broadcast sent');
    
    // Clean up
    await supabase.removeChannel(channel);

    return true;
  }, []);

  return { broadcastRefresh };
}
