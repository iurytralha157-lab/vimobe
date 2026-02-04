import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// VAPID public key - chave pública para Web Push
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// Converte base64 URL-safe para Uint8Array (necessário para applicationServerKey)
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

interface WebPushState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | null;
  error: string | null;
}

export function useWebPush() {
  const { user } = useAuth();
  const [state, setState] = useState<WebPushState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permission: null,
    error: null,
  });

  // Verifica suporte a Web Push
  const checkSupport = useCallback(() => {
    const isSupported = 
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      !!VAPID_PUBLIC_KEY;

    return isSupported;
  }, []);

  // Verifica se já está inscrito
  const checkSubscription = useCallback(async (): Promise<PushSubscription | null> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return subscription;
    } catch (error) {
      console.error('[WebPush] Erro ao verificar subscription:', error);
      return null;
    }
  }, []);

  // Salva subscription no Supabase
  const saveSubscription = useCallback(async (subscription: PushSubscription) => {
    if (!user?.id) return;

    try {
      // Busca o organization_id do usuário
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!userData?.organization_id) {
        console.error('[WebPush] Usuário sem organization_id');
        return;
      }

      // Serializa a subscription como JSON string
      const subscriptionJson = JSON.stringify(subscription.toJSON());

      // Verifica se já existe um token web para este usuário
      const { data: existing } = await supabase
        .from('push_tokens')
        .select('id, token')
        .eq('user_id', user.id)
        .eq('platform', 'web')
        .maybeSingle();

      if (existing) {
        // Atualiza se o token mudou
        if (existing.token !== subscriptionJson) {
          await supabase
            .from('push_tokens')
            .update({ 
              token: subscriptionJson, 
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
          console.log('[WebPush] Subscription atualizada');
        }
      } else {
        // Cria nova entrada
        await supabase
          .from('push_tokens')
          .insert({
            user_id: user.id,
            organization_id: userData.organization_id,
            token: subscriptionJson,
            platform: 'web',
            is_active: true,
          });
        console.log('[WebPush] Subscription salva');
      }
    } catch (error) {
      console.error('[WebPush] Erro ao salvar subscription:', error);
      throw error;
    }
  }, [user?.id]);

  // Remove subscription do Supabase
  const removeSubscription = useCallback(async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('platform', 'web');
      
      console.log('[WebPush] Subscription desativada');
    } catch (error) {
      console.error('[WebPush] Erro ao remover subscription:', error);
    }
  }, [user?.id]);

  // Solicita permissão e cria subscription
  const subscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Solicita permissão
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: 'Permissão negada para notificações' 
        }));
        return false;
      }

      // Aguarda o Service Worker estar pronto
      const registration = await navigator.serviceWorker.ready;

      // Cria subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      console.log('[WebPush] Subscription criada:', subscription.endpoint);

      // Salva no banco
      await saveSubscription(subscription);

      setState(prev => ({ 
        ...prev, 
        isSubscribed: true, 
        isLoading: false,
        error: null 
      }));

      return true;
    } catch (error) {
      console.error('[WebPush] Erro ao inscrever:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Erro ao ativar notificações' 
      }));
      return false;
    }
  }, [saveSubscription]);

  // Cancela subscription
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const subscription = await checkSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      await removeSubscription();

      setState(prev => ({ 
        ...prev, 
        isSubscribed: false, 
        isLoading: false 
      }));

      return true;
    } catch (error) {
      console.error('[WebPush] Erro ao desinscrever:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro ao desativar notificações'
      }));
      return false;
    }
  }, [checkSubscription, removeSubscription]);

  // Inicialização
  useEffect(() => {
    const init = async () => {
      const isSupported = checkSupport();
      
      if (!isSupported) {
        setState(prev => ({ 
          ...prev, 
          isSupported: false, 
          isLoading: false 
        }));
        return;
      }

      const permission = Notification.permission;
      const subscription = await checkSubscription();

      setState({
        isSupported: true,
        isSubscribed: !!subscription,
        isLoading: false,
        permission,
        error: null,
      });
    };

    if (user?.id) {
      init();
    }
  }, [user?.id, checkSupport, checkSubscription]);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}
