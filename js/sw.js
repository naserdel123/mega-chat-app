const CACHE_NAME = 'megachat-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/profile.html',
  '/settings.html',
  '/css/main.css',
  '/css/components.css',
  '/css/animations.css',
  '/css/themes.css',
  '/css/responsive.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/chat.js',
  '/js/ui.js',
  '/js/storage.js',
  '/js/notifications.js',
  '/js/voice.js',
  '/js/fileSharing.js',
  '/js/emoji.js',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.error('Cache failed:', err);
      })
  );
  self.skipWaiting();
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// استراتيجية الجلب: الشبكة أولاً مع احتياطي الكاش
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // تجاهل طلبات API
  if (request.url.includes('/api/')) {
    return;
  }

  // تجاهل طلبات Chrome الإضافية
  if (request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // نسخة للكاش
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // الرجوع للكاش عند فشل الشبكة
        return caches.match(request).then((response) => {
          if (response) {
            return response;
          }
          // صفحة offline للملفات HTML
          if (request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// استقبال الإشعارات الدفعية
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    tag: data.tag,
    requireInteraction: true,
    actions: data.actions || [],
    data: data.data
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action, notification } = event;
  const data = notification.data;

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // فتح نافذة موجودة أو إنشاء جديدة
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          client.postMessage({
            type: 'notification-click',
            action,
            data
          });
          return client.focus();
        }
      }
      
      if (clients.openWindow) {
        return clients.openWindow(`/?chat=${data.chatId}`);
      }
    })
  );
});

// مزامنة في الخلفية
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  // مزامنة الرسائل المعلقة
  const db = await openDB('MegaChatDB', 1);
  const pendingMessages = await db.getAll('pendingMessages');
  
  for (const msg of pendingMessages) {
    try {
      await fetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify(msg),
        headers: { 'Content-Type': 'application/json' }
      });
      await db.delete('pendingMessages', msg.id);
    } catch (err) {
      console.error('Sync failed for message:', msg.id);
    }
  }
}

// تبادل الرسائل مع الصفحة
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
