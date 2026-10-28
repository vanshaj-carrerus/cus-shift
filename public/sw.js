// Service worker for the CUS Shift web app. It does two jobs only: show notifications
// (iOS requires them to come from a service worker) and receive the admin's push
// alerts. It deliberately caches nothing, so every open loads the newest version.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// An admin alert sent through Web Push (see cus-reporting/src/lib/pushNotify.ts).
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'CUS Shift', {
      body: payload.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'admin-alert',
      renotify: true,
      vibrate: [0, 400, 250, 400],
      data: payload.data || { type: 'admin-alert' },
    })
  );
});

// Tapping a notification opens the app; the alarm one goes straight to the alarm screen.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows[0];
      if (open) {
        await open.focus();
        open.postMessage({ type: 'notification-click', data });
        return;
      }
      await self.clients.openWindow(data.type === 'alarm' ? '/alarm' : '/');
    })()
  );
});
