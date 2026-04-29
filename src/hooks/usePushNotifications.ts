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
async function getActiveServiceWorkerRegistration(timeoutMs = 5000): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Navegador sem suporte a Service Worker.');
  }

  // 1. Check if already ready with a short timeout
  try {
    const readyReg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
    ]);
    if (readyReg) return readyReg;
  } catch (e) {
    console.warn('[Push] navigator.serviceWorker.ready timed out, falling back to registrations');
  }
  
  // 2. Fallback: Try to get any existing registration
  const regs = await navigator.serviceWorker.getRegistrations();
  if (regs.length > 0) {
    // Return active if available, otherwise just return the first one
    return regs.find(r => r.active) || regs[0];
  }

  // 3. Last resort: if nothing found, it might be a cold start or first visit
  throw new Error('Sistema de notificações ainda está sendo preparado. Por favor, tente novamente em alguns segundos.');
}

export const usePushNotifications = () => {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [swStatus, setSwStatus] = useState<SwStatus>('unknown');
  const [synced, setSynced] = useState<boolean>(false);
  const [isPreparing, setIsPreparing] = useState(false);

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
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length === 0) {
        setSwStatus('none');
        return;
      }
      
      const reg = regs.find(r => r.active) || regs[0];
      if (reg.active) setSwStatus('active');
      else if (reg.waiting) setSwStatus('waiting');
      else if (reg.installing) setSwStatus('installing');
      else setSwStatus('none');
    } catch (err) {
      console.warn('[Push] Error checking SW status:', err);
      setSwStatus('none');
    }
  }, []);

  const syncSubscriptionWithBackend = useCallback(async (sub: PushSubscription) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Use toJSON for reliable serialization
      const subJSON = sub.toJSON();
      const subStr = JSON.stringify(subJSON);
      
      const lastSub = localStorage.getItem('last_push_sub');
      if (lastSub === subStr && synced) {
        console.log('[Push] Subscription already synced, skipping...');
        return true;
      }

      console.log('[Push] Syncing subscription with backend...');
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          [
            {
              user_id: user.id,
              subscription: subJSON as any,
              device_info: {
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                platform: navigator.platform
              }
            }
          ],
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('[Push] Sync error:', error);
        setSynced(false);
        return false;
      }
      
      localStorage.setItem('last_push_sub', subStr);
      console.log('[Push] Sync success');
      setSynced(true);
      return true;
    } catch (err) {
      console.error('[Push] Sync exception:', err);
      setSynced(false);
      return false;
    }
  }, [synced]);

  const getSubscription = useCallback(async () => {
    if (!checkSupport()) return null;
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      const reg = regs.find(r => r.active) || regs[0];
      if (!reg) return null;
      
      const sub = await reg.pushManager.getSubscription();
      setSubscription(sub);
      if (sub && Notification.permission === 'granted') {
        await syncSubscriptionWithBackend(sub);
      }
      return sub;
    } catch (err) {
      console.warn('[Push] Error getting subscription:', err);
      return null;
    }
  }, [checkSupport, syncSubscriptionWithBackend]);

  useEffect(() => {
    if (checkSupport()) {
      refreshSwStatus();
      getSubscription();
      
      // Monitor permission changes if possible
      let permissionStatus: PermissionStatus | null = null;
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'notifications' as PermissionName }).then((status) => {
          permissionStatus = status;
          status.onchange = () => {
            setPermission(Notification.permission);
            if (Notification.permission === 'granted') {
              getSubscription();
            }
          };
        }).catch(err => console.log('[Push] Permissions query not supported', err));
      }

      // Listen for controller changes (new SW version active)
      const handleControllerChange = () => {
        console.log('[Push] Service worker controller changed.');
        refreshSwStatus();
        getSubscription();
      };
      
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      
      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        if (permissionStatus) {
          permissionStatus.onchange = null;
        }
      };
    }
  }, [checkSupport, getSubscription, refreshSwStatus]);

  const subscribeUser = async () => {
    if (!checkSupport()) throw new Error('Notificações não são suportadas.');

    try {
      setIsPreparing(true);
      console.log('[Push] Requesting permission...');
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        throw new Error('Permissão negada para notificações.');
      }

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

      const syncSuccess = await syncSubscriptionWithBackend(sub);
      if (!syncSuccess) {
        console.warn('[Push] Subscription achieved but sync failed.');
      }
      
      setSubscription(sub);
      return sub;
    } finally {
      setIsPreparing(false);
    }
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
    isPreparing,
    subscribeUser,
    unsubscribeUser,
    refreshSubscription: resyncSubscription,
  };
};
