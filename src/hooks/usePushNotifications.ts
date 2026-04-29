import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BJBVpyQSbQSpeAQQs-lEf2BKa6L6vlUcXxD3F2KNML9iJW4h2Al2hhgB9KbDW9C73PCnow8ZpXIJxrUNMWxU6vA';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
};

/**
 * Robust Service Worker registration for iOS/Android PWA.
 */
async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Sem suporte a Service Worker neste navegador.');
  }

  console.log('[Push] Iniciando registro do Service Worker...');
  
  // Register the SW. Vite PWA usually handles this, but we do it manually for maximum reliability.
  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/'
  });
  
  // Force an update to ensure we have the latest version
  try {
    await registration.update();
  } catch (e) {
    console.warn('[Push] Registration update failed (normal on some browsers):', e);
  }

  // Use the native .ready promise which is the fastest way to get an active registration
  // but also implement the user's requested wait loop as a fallback.
  const readyRegistration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<ServiceWorkerRegistration>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout aguardando Service Worker Ready')), 5000)
    )
  ]).catch(async () => {
    // Fallback wait loop requested by user
    console.log('[Push] ready promise timed out, using fallback wait loop...');
    let reg = await navigator.serviceWorker.getRegistration();
    const start = Date.now();
    while (!reg?.active && Date.now() - start < 5000) {
      await new Promise(r => setTimeout(r, 300));
      reg = await navigator.serviceWorker.getRegistration();
    }
    if (!reg?.active) throw new Error('Service Worker não ativou a tempo (5s)');
    return reg;
  });

  console.log('[Push] Service Worker está pronto e ativo.');
  return readyRegistration;
}

export const usePushNotifications = () => {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
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

  const syncSubscriptionWithBackend = useCallback(async (sub: PushSubscription) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const subJSON = sub.toJSON();
      const subStr = JSON.stringify(subJSON);
      
      const lastSub = localStorage.getItem('last_push_sub');
      if (lastSub === subStr && synced) {
        console.log('[Push] Já sincronizado.');
        return true;
      }

      console.log('[Push] Sincronizando com o banco...');
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          [
            {
              user_id: user.id,
              subscription: subJSON as any,
              // REMOVED device_info as it's not in the table schema yet
              // and was causing sync failures.
            }
          ],
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('[Push] Erro no sync:', error);
        setSynced(false);
        return false;
      }
      
      localStorage.setItem('last_push_sub', subStr);
      console.log('[Push] Sync concluído com sucesso.');
      setSynced(true);
      return true;
    } catch (err) {
      console.error('[Push] Exceção no sync:', err);
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
      
      // Auto-sync if we have a subscription and permission
      if (sub && Notification.permission === 'granted') {
        await syncSubscriptionWithBackend(sub);
      }
      return sub;
    } catch (err) {
      console.warn('[Push] Erro ao obter sub:', err);
      return null;
    }
  }, [checkSupport, syncSubscriptionWithBackend]);

  // Initial check and auto-sync
  useEffect(() => {
    if (checkSupport()) {
      getSubscription();

      // Clear badge
      if ('clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge().catch(() => {});
      }

      // Detect controller changes
      const handleController = () => getSubscription();
      navigator.serviceWorker.addEventListener('controllerchange', handleController);
      return () => navigator.serviceWorker.removeEventListener('controllerchange', handleController);
    }
  }, [checkSupport, getSubscription]);

  const subscribeUser = async () => {
    if (!checkSupport()) throw new Error('Seu navegador não suporta notificações.');

    try {
      setIsPreparing(true);
      
      // 1. Request Permission
      console.log('[Push] Solicitando permissão...');
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        throw new Error('Permissão negada. Ative nas configurações do dispositivo.');
      }

      // 2. Ensure SW is active (Fast)
      const registration = await ensureServiceWorker();

      // 3. Subscribe
      console.log('[Push] Criando inscrição nativa...');
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      
      let sub = await registration.pushManager.getSubscription();
      
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      // 4. Sync
      await syncSubscriptionWithBackend(sub);
      setSubscription(sub);
      return sub;
    } catch (err: any) {
      console.error('[Push] Erro na ativação:', err);
      throw err;
    } finally {
      setIsPreparing(false);
    }
  };

  const unsubscribeUser = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
      }
      setSubscription(null);
      setSynced(false);
      localStorage.removeItem('last_push_sub');

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
      }
    } catch (err) {
      console.error('[Push] Erro ao desativar:', err);
    }
  };

  return {
    isSupported,
    permission,
    subscription,
    synced,
    isPreparing,
    subscribeUser,
    unsubscribeUser,
    refreshSubscription: getSubscription,
  };
};