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
async function waitForActiveServiceWorker(
  timeoutMs = 15000
): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Este navegador não suporta Service Worker.');
  }

  const start = Date.now();

  // Helper: wait for a registration to reach "activated" state
  const waitForActivation = (reg: ServiceWorkerRegistration) =>
    new Promise<ServiceWorkerRegistration>((resolve, reject) => {
      if (reg.active) return resolve(reg);
      const sw = reg.installing || reg.waiting;
      if (!sw) return reject(new Error('Service Worker presente, mas sem worker em estado válido.'));
      const onChange = () => {
        if (sw.state === 'activated' || reg.active) {
          sw.removeEventListener('statechange', onChange);
          resolve(reg);
        } else if (sw.state === 'redundant') {
          sw.removeEventListener('statechange', onChange);
          reject(new Error('Service Worker tornou-se redundante antes de ativar.'));
        }
      };
      sw.addEventListener('statechange', onChange);
    });

  while (Date.now() - start < timeoutMs) {
    // 1) Try existing registration
    let reg =
      (await navigator.serviceWorker.getRegistration()) ||
      (await navigator.serviceWorker.getRegistrations()).find(Boolean);

    if (reg) {
      if (reg.active) return reg;
      try {
        return await Promise.race([
          waitForActivation(reg),
          new Promise<ServiceWorkerRegistration>((_, rej) =>
            setTimeout(() => rej(new Error('timeout-activation')), 4000)
          ),
        ]);
      } catch {
        // fallthrough — try ready / loop
      }
    }

    // 2) Race with navigator.serviceWorker.ready
    try {
      const ready = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 2000)),
      ]);
      if (ready && ready.active) return ready;
    } catch {
      // ignore
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error(
    'Service Worker do app ainda não está ativo. Feche e reabra o app, ou desinstale e reinstale o atalho na tela inicial.'
  );
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    console.log('[Push] Syncing subscription with backend...');
    const { error } = await (supabase as any)
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          subscription: JSON.parse(JSON.stringify(sub)),
          updated_at: new Date().toISOString(),
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
  }, []);

  const getSubscription = useCallback(async () => {
    try {
      const reg =
        (await navigator.serviceWorker.getRegistration()) ||
        (await navigator.serviceWorker.getRegistrations()).find(Boolean);
      if (!reg) return null;
      const sub = await reg.pushManager.getSubscription();
      setSubscription(sub);
      if (sub) await syncSubscriptionWithBackend(sub);
      return sub;
    } catch (err) {
      console.error('[Push] Error getting subscription:', err);
      return null;
    }
  }, [syncSubscriptionWithBackend]);

  useEffect(() => {
    if (checkSupport()) {
      refreshSwStatus();
      getSubscription();
    }
  }, [checkSupport, getSubscription, refreshSwStatus]);

  const subscribeUser = async () => {
    if (!checkSupport()) throw new Error('Notificações não são suportadas neste navegador.');

    console.log('[Push] Requesting permission...');
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== 'granted') throw new Error('Permissão negada para notificações.');

    console.log('[Push] Waiting for active Service Worker...');
    const registration = await waitForActiveServiceWorker(15000);
    await refreshSwStatus();

    if (!registration.active) {
      throw new Error(
        'Service Worker não está ativo. Recarregue o app uma vez e tente novamente.'
      );
    }

    console.log('[Push] SW active, subscribing to push...');
    let sub = await registration.pushManager.getSubscription();
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
    if (!subscription) return;
    await subscription.unsubscribe();
    setSubscription(null);
    setSynced(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await (supabase as any)
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);
    }
  };

  const resyncSubscription = useCallback(async () => {
    await refreshSwStatus();
    const sub = await getSubscription();
    if (sub) await syncSubscriptionWithBackend(sub);
    return sub;
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
