import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BJBVpyQSbQSpeAQQs-lEf2BKa6L6vlUcXxD3F2KNML9iJW4h2Al2hhgB9KbDW9C73PCnow8ZpXIJxrUNMWxU6vA';

type SwStatus = 'unknown' | 'none' | 'installing' | 'waiting' | 'active';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
};

/**
 * Waits until there is a Service Worker registration with `active` worker.
 * Does NOT register a custom worker — relies on the PWA worker generated
 * by vite-plugin-pwa (which imports `/sw-push.js` for push events).
 */
async function getActiveServiceWorkerRegistration(timeoutMs = 15000): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Navegador sem suporte a Service Worker.');
  }

  console.log('[Push] Waiting for active service worker...');

  // 1. Check if already ready with a shorter race
  const readyReg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000))
  ]);
  
  if (readyReg && readyReg.active) {
    console.log('[Push] Service worker is ready and active.');
    return readyReg;
  }

  // 2. Try to get any existing registration and see its status
  const regs = await navigator.serviceWorker.getRegistrations();
  console.log(`[Push] Found ${regs.length} registrations.`);
  
  const activeReg = regs.find(r => r.active);
  if (activeReg) return activeReg;

  // 3. If we have a waiting worker, it might be the new one from vite-plugin-pwa
  const waitingReg = regs.find(r => r.waiting);
  if (waitingReg && waitingReg.waiting) {
    console.log('[Push] Found waiting worker, skipping waiting...');
    waitingReg.waiting.postMessage({ type: 'SKIP_WAITING' });
    // Give it a moment to activate
    await new Promise(r => setTimeout(r, 1000));
  }

  // 4. Poll for active status with a long timeout
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(async () => {
      const currentRegs = await navigator.serviceWorker.getRegistrations();
      const active = currentRegs.find(r => r.active);
      
      if (active) {
        clearInterval(interval);
        console.log('[Push] Service worker finally active.');
        resolve(active);
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        
        // Final attempt: maybe try to register manually if absolutely nothing is found
        if (currentRegs.length === 0) {
          console.warn('[Push] No registrations found after timeout. Attempting manual registration...');
          try {
            const newReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            // Wait a bit more for this new one
            setTimeout(() => {
              if (newReg.active) resolve(newReg);
              else reject(new Error('Falha ao ativar o Service Worker após tentativa de registro manual.'));
            }, 3000);
          } catch (e) {
            reject(new Error('Timeout aguardando Service Worker. Verifique se o app está instalado corretamente.'));
          }
        } else {
          reject(new Error('O Service Worker está demorando muito para ativar. Tente atualizar a página.'));
        }
      }
    }, 1000);
  });
}

export const usePushNotifications = () => {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [swStatus, setSwStatus] = useState<SwStatus>('unknown');
  const [synced, setSynced] = useState<boolean>(false);

  const checkSupport = useCallback(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    setIsSupported(supported);
    if (supported) setPermission(Notification.permission);
    return supported;
  }, []);

  const refreshSwStatus = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      setSwStatus('none');
      return;
    }
    const reg =
      (await navigator.serviceWorker.getRegistration()) ||
      (await navigator.serviceWorker.getRegistrations()).find(Boolean);
    if (!reg) return setSwStatus('none');
    if (reg.active) return setSwStatus('active');
    if (reg.waiting) return setSwStatus('waiting');
    if (reg.installing) return setSwStatus('installing');
    setSwStatus('none');
  }, []);

  const syncSubscriptionWithBackend = useCallback(async (sub: PushSubscription) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      console.log('[Push] Syncing subscription with backend...');
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: user.id,
            subscription: JSON.parse(JSON.stringify(sub)),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('[Push] Sync error:', error);
        setSynced(false);
        return false;
      }
      
      console.log('[Push] Sync success');
      setSynced(true);
      return true;
    } catch (err) {
      console.error('[Push] Sync exception:', err);
      setSynced(false);
      return false;
    }
  }, []);

  const getSubscription = useCallback(async () => {
    if (!checkSupport()) return null;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return null;
      const sub = await reg.pushManager.getSubscription();
      setSubscription(sub);
      if (sub) {
        // Only sync if permission is granted
        if (Notification.permission === 'granted') {
          await syncSubscriptionWithBackend(sub);
        }
      }
      return sub;
    } catch (err) {
      console.error('[Push] Error getting subscription:', err);
      return null;
    }
  }, [checkSupport, syncSubscriptionWithBackend]);

  useEffect(() => {
    if (checkSupport()) {
      refreshSwStatus();
      getSubscription();
      
      // Monitor permission changes if possible
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'notifications' as PermissionName }).then((status) => {
          status.onchange = () => {
            setPermission(Notification.permission);
            if (Notification.permission === 'granted') {
              getSubscription();
            }
          };
        });
      }
    }
  }, [checkSupport, getSubscription, refreshSwStatus]);

  const subscribeUser = async () => {
    if (!checkSupport()) throw new Error('Notificações não são suportadas.');

    console.log('[Push] Requesting permission...');
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== 'granted') throw new Error('Permissão negada.');

    console.log('[Push] Getting Service Worker...');
    const registration = await getActiveServiceWorkerRegistration();
    await refreshSwStatus();

    console.log('[Push] Subscribing to push...');
    let sub = await registration.pushManager.getSubscription();
    
    // Always try to subscribe if no sub exists or if we want to ensure latest
    if (!sub) {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    await syncSubscriptionWithBackend(sub);
    setSubscription(sub);
    return sub;
  };

  const unsubscribeUser = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
      }
      setSubscription(null);
      setSynced(false);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id);
      }
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err);
    }
  };

  const resyncSubscription = useCallback(async () => {
    await refreshSwStatus();
    const sub = await getSubscription();
    if (sub) {
      return await syncSubscriptionWithBackend(sub);
    }
    return false;
  }, [getSubscription, refreshSwStatus, syncSubscriptionWithBackend]);

  return {
    isSupported,
    permission,
    subscription,
    swStatus,
    synced,
    subscribeUser,
    unsubscribeUser,
    refreshSubscription: resyncSubscription,
  };
};
