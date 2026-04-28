import { useEffect } from 'react';
// @ts-ignore - virtual module handled by vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export function usePwaUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
      // Check for updates every 10 minutes
      if (r) {
        setInterval(() => {
          r.update();
        }, 10 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
    onNeedRefresh() {
      console.log('Update available! Showing toast...');
      toast('Nova atualização disponível!', {
        description: 'Clique para atualizar o app e garantir que todos os ícones e recursos estejam corretos.',
        action: {
          label: 'Atualizar Agora',
          onClick: () => {
            // Clear simple caches before reloading
            if ('caches' in window) {
              caches.keys().then(names => {
                for (let name of names) {
                  if (name.includes('supabase') || name.includes('images')) {
                    caches.delete(name);
                  }
                }
              });
            }
            updateServiceWorker(true);
          },
        },
        duration: Infinity,
      });
    },
    onOfflineReady() {
      console.log('App ready for offline use');
    },
  });

  useEffect(() => {
    if (needRefresh) {
      // In some cases we might want to force update if the user hasn't interacted
      // but showing a toast is safer to avoid losing state.
    }
  }, [needRefresh]);

  return { needRefresh, updateServiceWorker };
}
