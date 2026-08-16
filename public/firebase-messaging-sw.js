/* Firebase Messaging service worker — must stay at site root.
 * Loads web config from /fcm-firebase-config.json (Vite plugin / build output).
 */
/* eslint-disable no-undef */
importScripts(
  'https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js',
);
importScripts(
  'https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js',
);

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw =
    event.notification?.data?.FCM_MSG?.data?.clickUrl ||
    event.notification?.data?.clickUrl ||
    event.notification?.data?.FCM_MSG?.data?.clickPath ||
    '/';
  const url = typeof raw === 'string' ? raw : '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && url.startsWith('http')) {
            return client.navigate(url);
          }
          return undefined;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url.startsWith('http') ? url : self.location.origin + url);
      }
      return undefined;
    }),
  );
});

fetch('/fcm-firebase-config.json')
  .then((r) => {
    if (!r.ok) throw new Error('fcm config missing');
    return r.json();
  })
  .then((firebaseConfig) => {
    firebase.initializeApp(firebaseConfig);
    firebase.messaging();
  })
  .catch((err) => {
    console.warn('[fcm-sw] init skipped:', err);
  });
