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
async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Navegador sem suporte a Service Worker.');
  }

  console.log('[Push] Manually registering/updating Service Worker...');
  // 1. Register manually
  const registration = await navigator.serviceWorker.register('/sw.js');
  
  // 2. Force update to ensure we have the latest version
  await registration.update();

  // 3. Get the registration directly
  const reg = await navigator.serviceWorker.getRegistration();

  // 4. Ensure it exists and is active
  if (!reg || !reg.active) {
    console.warn('[Push] Service Worker found but NOT active. State:', 
      reg?.installing ? 'installing' : (reg?.waiting ? 'waiting' : 'unknown')
    );
    throw new Error('Service Worker não está ativo. Por favor, aguarde um momento ou recarregue a página.');
  }

  return reg;
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
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        setSwStatus('none');
        return;
      }
      
      if (reg.active) {
        setSwStatus('active');
      } else if (reg.installing) {
        setSwStatus('installing');
      } else if (reg.waiting) {
        setSwStatus('waiting');
      } else {
        setSwStatus('none');
      }
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
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg || !reg.active) return null;
      
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

      // Clear badge on load
      if ('clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge().catch(() => {});
      }

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
      
      // 1. Solicitar permissão primeiro (conforme solicitado pelo usuário)
      console.log('[Push] Requesting permission...');
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        throw new Error('Permissão negada para notificações.');
      }

      // 2. Garantir Service Worker (Registro manual, update, etc)
      console.log('[Push] Ensuring Service Worker...');
      const registration = await ensureServiceWorker();
      await refreshSwStatus();

      // 3. Fazer subscribe diretamente
      console.log('[Push] Subscribing to push directly...');
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      
      // Tenta obter sub existente ou cria uma nova
      let sub = await registration.pushManager.getSubscription();
      
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      console.log('[Push] Syncing subscription with backend...');
      const syncSuccess = await syncSubscriptionWithBackend(sub);
      if (!syncSuccess) {
        console.warn('[Push] Subscription achieved but sync failed.');
      }
      
      setSubscription(sub);
      return sub;
    } catch (err: any) {
      console.error('[Push] Subscribe error:', err);
      throw err;
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
