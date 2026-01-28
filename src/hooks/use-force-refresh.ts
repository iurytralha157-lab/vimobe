import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CHANNEL_NAME = 'system-updates';

/**
 * Performs a complete cache clear including Service Worker and all browser caches
 */
async function performFullCacheClear(): Promise<void> {
  console.log('[ForceRefresh] Starting full cache clear...');

  // 1. Unregister all Service Workers
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`[ForceRefresh] Found ${registrations.length} service workers to unregister`);
      
      for (const registration of registrations) {
        const success = await registration.unregister();
        console.log(`[ForceRefresh] Service worker unregistered: ${success}`);
      }
    } catch (err) {
      console.error('[ForceRefresh] Error unregistering service workers:', err);
    }
  }

  // 2. Clear all Cache Storage (PWA caches)
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      console.log(`[ForceRefresh] Found ${cacheNames.length} caches to clear:`, cacheNames);
      
      await Promise.all(
        cacheNames.map(async (cacheName) => {
          const deleted = await caches.delete(cacheName);
          console.log(`[ForceRefresh] Cache "${cacheName}" deleted: ${deleted}`);
        })
      );
    } catch (err) {
      console.error('[ForceRefresh] Error clearing caches:', err);
    }
  }

  // 3. Clear localStorage (except auth tokens)
  const authKeysToKeep = ['sb-iemalzlfnbouobyjwlwi-auth-token', 'impersonate_session'];
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !authKeysToKeep.some(authKey => key.includes(authKey))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`[ForceRefresh] Removed localStorage key: ${key}`);
  });

  // 4. Clear sessionStorage (except auth tokens)
  const sessionKeysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && !authKeysToKeep.some(authKey => key.includes(authKey))) {
      sessionKeysToRemove.push(key);
    }
  }
  
  sessionKeysToRemove.forEach(key => {
    sessionStorage.removeItem(key);
    console.log(`[ForceRefresh] Removed sessionStorage key: ${key}`);
  });

  console.log('[ForceRefresh] Full cache clear completed');
}

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

        // Perform full cache clear
        await performFullCacheClear();

        // Wait a moment to ensure caches are cleared, then hard reload
        setTimeout(() => {
          // Use cache-busting query param and force reload
          const url = new URL(window.location.href);
          url.searchParams.set('_refresh', Date.now().toString());
          
          // Force a hard reload bypassing cache
          window.location.replace(url.toString());
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
