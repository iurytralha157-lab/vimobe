import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BJBVpyQSbQSpeAQQs-lEf2BKa6L6vlUcXxD3F2KNML9iJW4h2Al2hhgB9KbDW9C73PCnow8ZpXIJxrUNMWxU6vA';

export const usePushNotifications = () => {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  const checkSupport = useCallback(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
    return supported;
  }, []);

  const getSubscription = useCallback(async () => {
    try {
      let registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length > 0) registration = registrations[0];
      }

      if (registration) {
        const sub = await registration.pushManager.getSubscription();
        setSubscription(sub);
        return sub;
      }
    } catch (err) {
      console.error('[Push] Error getting subscription:', err);
    }
    return null;
  }, []);

  useEffect(() => {
    if (checkSupport()) {
      getSubscription();
    }
  }, [checkSupport, getSubscription]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const syncSubscriptionWithBackend = async (sub: PushSubscription) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    console.log('[Push] Syncing with backend...');
    // @ts-ignore
    const { error } = await (supabase as any)
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        subscription: JSON.parse(JSON.stringify(sub)),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) console.error('[Push] Sync error:', error);
    else console.log('[Push] Sync success');
  };

  const subscribeUser = async () => {
    if (!checkSupport()) throw new Error('Push not supported');

    console.log('[Push] Requesting permission...');
    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result !== 'granted') throw new Error('Permissão negada');

    // Wait for SW to be ready with a more robust check
    console.log('[Push] Waiting for service worker to be ready...');
    let registration: ServiceWorkerRegistration | undefined;
    
    try {
      // First try the standard 'ready' promise
      registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 5000))
      ]);

      if (!registration) {
        console.log('[Push] navigator.serviceWorker.ready timed out, checking all registrations...');
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length > 0) {
          registration = registrations[0];
          console.log('[Push] Found registration via getRegistrations');
        }
      }

      if (!registration) {
        // Last resort: try to register manually if we are in a state where it's missing
        console.log('[Push] No registration found, attempting manual registration...');
        registration = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
        
        // Wait for it to be active
        let retryCount = 0;
        while (registration.installing || registration.waiting) {
          if (retryCount > 10) break;
          await new Promise(r => setTimeout(r, 500));
          retryCount++;
        }
      }
    } catch (err) {
      console.error('[Push] SW Ready error:', err);
    }

    if (!registration) {
      throw new Error('Não foi possível encontrar um Service Worker ativo. Tente recarregar a página.');
    }

    console.log('[Push] SW ready, subscribing...');
    
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      await syncSubscriptionWithBackend(existingSub);
      setSubscription(existingSub);
      return existingSub;
    }

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    await syncSubscriptionWithBackend(sub);
    setSubscription(sub);
    return sub;
  };

  const unsubscribeUser = async () => {
    if (subscription) {
      await subscription.unsubscribe();
      setSubscription(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // @ts-ignore
        await (supabase as any)
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id);
      }
    }
  };

  return {
    isSupported,
    permission,
    subscription,
    subscribeUser,
    unsubscribeUser,
    refreshSubscription: getSubscription
  };
};

