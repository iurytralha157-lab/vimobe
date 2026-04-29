import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BJBVpyQSbQSpeAQQs-lEf2BKa6L6vlUcXxD3F2KNML9iJW4h2Al2hhgB9KbDW9C73PCnow8ZpXIJxrUNMWxU6vA';

export const usePushNotifications = () => {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // Let VitePWA handle the service worker registration
      // We just wait for it to be ready
      // Wait for registration instead of just ready, especially for iOS
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          registration.pushManager.getSubscription().then(sub => {
            setSubscription(sub);
          }).catch(err => {
            console.error('Error getting push subscription:', err);
          });
        }
      });
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    try {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }

      // If the key is in SPKI/DER format (91 bytes), extract the raw 65-byte key
      if (outputArray.length === 91) {
        console.log('SPKI format detected, extracting raw key');
        return outputArray.slice(26);
      }

      return outputArray;
    } catch (e) {
      console.error('Error converting VAPID key:', e);
      return new Uint8Array();
    }
  };

  const subscribeUser = async () => {
    try {
      if (!isSupported) {
        throw new Error('Push notifications are not supported in this browser.');
      }

      console.log('Starting subscription process...');
      
      let result = Notification.permission;
      if (result === 'default') {
        console.log('Requesting notification permission...');
        result = await Notification.requestPermission();
      }
      
      setPermission(result);
      if (result !== 'granted') {
        throw new Error(`Permission ${result}`);
      }

      // iOS Safari can be tricky with .ready, try to get current registration first
      let registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        console.log('No active registration found, waiting for ready...');
        const registrationPromise = navigator.serviceWorker.ready;
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout waiting for Service Worker')), 15000)
        );
        registration = await Promise.race([registrationPromise, timeoutPromise]) as ServiceWorkerRegistration;
      }
      
      console.log('Service worker registration active');
      
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        console.log('Found existing subscription');
        // Still upsert to database to be sure it's synced
        await syncSubscriptionWithBackend(existingSub);
        setSubscription(existingSub);
        return existingSub;
      }

      console.log('Creating new subscription...');
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      console.log('Subscription successful');
      await syncSubscriptionWithBackend(sub);
      setSubscription(sub);

      return sub;
    } catch (err: any) {
      console.error('Failed to subscribe the user: ', err);
      throw err;
    }
  };

  const syncSubscriptionWithBackend = async (sub: PushSubscription) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    console.log('Syncing subscription with backend...');
    const { error } = await (supabase as any)
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        subscription: JSON.parse(JSON.stringify(sub)),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Error saving subscription to Supabase:', error);
    } else {
      console.log('Subscription synced successfully');
    }
  };

  const unsubscribeUser = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        setSubscription(null);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await (supabase as any)
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id);
        }
      }
    } catch (err) {
      console.error('Error unsubscribing', err);
      throw err;
    }
  };

  return {
    isSupported,
    permission,
    subscription,
    subscribeUser,
    unsubscribeUser
  };
};
