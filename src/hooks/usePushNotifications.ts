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
      const registration = await navigator.serviceWorker.getRegistration();
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
    const { error } = await supabase
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
    
    if (result !== 'granted') throw new Error('Permission denied');

    // Wait for SW to be ready with a reasonable timeout
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout SW ready')), 10000))
    ]);

    console.log('[Push] SW ready, subscribing...');
    
    // Check if already subscribed
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
        await supabase
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
