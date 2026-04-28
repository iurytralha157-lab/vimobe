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
      
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(sub => {
          setSubscription(sub);
        });
      });
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

      console.log('Starting subscription process...');
      
      // On some mobile devices (especially iOS PWA), Notification.requestPermission() 
      // must be triggered directly by a user gesture. We are inside handleToggle which is a user gesture.
      
      let result = Notification.permission;
      if (result === 'default') {
        console.log('Requesting notification permission...');
        result = await Notification.requestPermission();
      }
      
      console.log('Permission result:', result);
      setPermission(result);

      if (result !== 'granted') {
        console.warn('Permission not granted for notifications:', result);
        return;
      }

      // Check for Service Worker Registration explicitly
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length === 0) {
        console.warn('No service worker registered. Registering /sw.js...');
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }

      const registration = await navigator.serviceWorker.ready;
      console.log('Service worker ready for subscription');
      
      // Before subscribing, check if there is an existing one
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        console.log('Found existing subscription, using it.');
        setSubscription(existingSub);
        return existingSub;
      }

      console.log('Creating new subscription...');
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      console.log('Subscription successful:', sub);
      setSubscription(sub);

      // Save to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            subscription: JSON.parse(JSON.stringify(sub)),
          }, { onConflict: 'user_id' });

        if (error) console.error('Error saving subscription to Supabase:', error);
      }

      return sub;
    } catch (err: any) {
      console.error('Failed to subscribe the user: ', err);
      // Detailed error for debugging
      if (err.name === 'NotAllowedError') {
        console.error('Permission denied or interaction required');
      }
      throw err; // Re-throw to be caught by the component UI
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
