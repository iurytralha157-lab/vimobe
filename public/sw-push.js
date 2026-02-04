// Web Push Service Worker
// Este arquivo é importado pelo Workbox SW para lidar com notificações push

// Listener para evento 'push' - recebe notificações do servidor
self.addEventListener('push', function(event) {
  console.log('[SW Push] Notificação push recebida:', event);

  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error('[SW Push] Erro ao parsear dados:', e);
      data = {
        title: 'Nova Notificação',
        body: event.data.text() || ''
      };
    }
  }

  const title = data.title || 'Vimob';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    image: data.image || undefined,
    data: {
      url: data.url || data.data?.url || '/',
      ...data.data
    },
    vibrate: [200, 100, 200],
    tag: data.tag || `notification-${Date.now()}`,
    renotify: true,
    requireInteraction: data.priority === 'high',
    actions: data.actions || []
  };

  console.log('[SW Push] Mostrando notificação:', title, options);

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Listener para clique na notificação
self.addEventListener('notificationclick', function(event) {
  console.log('[SW Push] Notificação clicada:', event);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  // Tenta focar uma janela existente ou abre uma nova
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Procura uma janela existente do app
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Se não encontrou, abre nova janela
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Listener para fechamento da notificação (swipe/dismiss)
self.addEventListener('notificationclose', function(event) {
  console.log('[SW Push] Notificação fechada:', event);
});

// Listener para mudança de subscription
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('[SW Push] Subscription mudou:', event);
  
  // Tenta reinscrever automaticamente
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey
    })
    .then(function(subscription) {
      console.log('[SW Push] Nova subscription:', subscription);
      // Aqui idealmente notificaria o servidor sobre a nova subscription
      // Mas isso requer comunicação com o client, que é complexo
    })
    .catch(function(error) {
      console.error('[SW Push] Erro ao reinscrever:', error);
    })
  );
});
