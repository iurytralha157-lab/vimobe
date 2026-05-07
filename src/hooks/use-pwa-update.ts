import { useEffect } from 'react';
// @ts-ignore - virtual module handled by vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export function usePwaUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered:', r);
      if (!r) return;

      // Check for updates every 2 minutes
      setInterval(() => {
        r.update().catch(() => {});
      }, 2 * 60 * 1000);

      // Also check whenever the tab becomes visible / focused
      const checkUpdate = () => {
        if (document.visibilityState === 'visible') {
          r.update().catch(() => {});
        }
      };
      document.addEventListener('visibilitychange', checkUpdate);
      window.addEventListener('focus', checkUpdate);
    },
    onRegisterError(error: unknown) {
      console.error('SW registration error', error);
    },
    onNeedRefresh() {
      console.log('Update available! Auto-applying...');
      toast.info('Atualizando para a nova versão...', { duration: 2000 });

      // Limpa caches do runtime para garantir conteúdo fresco
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        }).catch(() => {});
      }

      // Aplica o novo SW e recarrega
      try {
        updateServiceWorker(true);
      } catch (e) {
        console.error('updateServiceWorker failed', e);
      }
      setTimeout(() => window.location.reload(), 800);
    },
    onOfflineReady() {
      console.log('App ready for offline use');
    },
  });

  useEffect(() => {
    // No-op: refresh é automático em onNeedRefresh
  }, [needRefresh]);

  return { needRefresh, updateServiceWorker };
}
