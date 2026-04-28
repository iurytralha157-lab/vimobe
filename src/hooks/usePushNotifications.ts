import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BAag7UTmqxehuk8_3B64CZzRKUc732au_PeDATZo9R2KSXx9hvIzwZs78J8L9o--mhqKaLSBKy1Gb_0mxE_xS7o';

export const usePushNotifications = () => {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      const checkRegistration = async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const sub = await registration.pushManager.getSubscription();
            setSubscription(sub);
          }
        } catch (err) {
          console.error('Error checking registration:', err);
        }
      };

      checkRegistration();
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeUser = async () => {
    try {
      if (!isSupported) {
        console.warn('Push notifications not supported');
        return;
      }

      console.log('Requesting notification permission...');
      const result = await Notification.requestPermission();
      console.log('Permission result:', result);
      setPermission(result);

      if (result !== 'granted') {
        throw new Error('Permission not granted for notifications');
      }

      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        console.log('No registration found, registering sw.js...');
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      
      console.log('Service worker registration:', registration);
      
      // Wait for SW to be active if it's installing/waiting
      if (registration.installing) {
        await new Promise<void>((resolve) => {
          registration!.installing!.addEventListener('statechange', (e: any) => {
            if (e.target.state === 'activated') resolve();
          });
        });
      }

      console.log('Service worker is active, subscribing...');
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      console.log('Subscription successful:', sub);
      setSubscription(sub);

      // Save to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await (supabase as any)
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            subscription: sub.toJSON(),
          }, { onConflict: 'user_id' });

        if (error) console.error('Error saving subscription to Supabase:', error);
      }

      return sub;
    } catch (err) {
      console.error('Failed to subscribe the user: ', err);
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
