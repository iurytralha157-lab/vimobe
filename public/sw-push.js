self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[Service Worker] Push Received:', data);
      
      const options = {
        body: data.body,
        icon: data.icon || '/icons/icon-192x192.png',
        badge: data.badge || '/icons/icon-192x192.png',
        data: {
          url: data.data?.url || '/',
          ...data.data
        },
        tag: data.tag || 'vimob-push-notification',
        renotify: true,
        vibrate: [100, 50, 100],
        actions: data.actions || []
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'Nova Notificação', options)
      );
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
      // Fallback for non-JSON or malformed data
      event.waitUntil(
        self.registration.showNotification('Nova Mensagem', {
          body: event.data.text(),
          icon: '/icons/icon-192x192.png'
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  console.log('[Service Worker] Notification Clicked:', event.notification.data);

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(clients.claim());
});
