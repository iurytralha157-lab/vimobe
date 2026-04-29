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
 * Instant Service Worker registration for iOS/Android PWA.
 */
async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Sem suporte a Service Worker neste navegador.');
  }

  // 1. Pega o registro existente ou registra um novo
  let registration = await navigator.serviceWorker.getRegistration();
  
  if (!registration) {
    console.log('[Push] Registrando novo Service Worker...');
    registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }

  // 2. RETORNO IMEDIATO. Se estiver pronto, ótimo. Se estiver ativando, o PushManager vai lidar.
  // Removido qualquer timeout ou loop de espera.
  return registration;
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
      if (lastSub === subStr) {
        setSynced(true);
        return true;
      }

      console.log('[Push] Sincronizando token...');
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: user.id,
            subscription: subJSON as any,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('[Push] Erro no sync:', error);
        return false;
      }
      
      localStorage.setItem('last_push_sub', subStr);
      setSynced(true);
      return true;
    } catch (err) {
      console.error('[Push] Exceção no sync:', err);
      return false;
    }
  }, []);

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
      
      // 1. Solicita Permissão (iOS só deixa se for interação do usuário)
      console.log('[Push] Solicitando permissão...');
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        throw new Error('Permissão negada. Ative nas configurações do dispositivo.');
      }

      // 2. Garante SW Ativo (Instantâneo se já estiver rodando)
      const registration = await ensureServiceWorker();

      // 3. Cria Inscrição
      console.log('[Push] Criando inscrição...');
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // 4. Sincroniza em Background (Não trava a UI)
      syncSubscriptionWithBackend(sub).catch(err => console.error('[Push] Sync background error:', err));
      
      setSubscription(sub);
      setSynced(true); // Assume sucesso para UI instantânea
      
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