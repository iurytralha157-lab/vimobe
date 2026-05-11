import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { performFullCacheClear } from '@/lib/cache-utils';

const CHANNEL_NAME = 'system-updates-v4'; // Bumped version to v4

/**
 * Hook that listens for force refresh broadcasts and reloads the page
 * when received. Used by all users.
 */
export function useForceRefreshListener() {
  useEffect(() => {
    const channel = supabase.channel(CHANNEL_NAME);

    channel
      .on('broadcast', { event: 'force-refresh' }, async (payload) => {
        console.log('[ForceRefresh] Received refresh signal:', payload);
        
        // Show a toast before refreshing
        toast.info('Atualizando sistema... Por favor aguarde.', {
          duration: 3000,
        });

        // Perform full cache clear without removing auth, then reload
        await performFullCacheClear({ 
          clearAuth: false, 
          reload: true 
        });
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
