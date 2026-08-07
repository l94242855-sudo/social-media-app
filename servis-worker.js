const CACHE_NAME = 'social-app-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/manifest.json'
];

// ============================================
// SERVICE WORKER INSTALL & ACTIVATE
// ============================================
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Caching assets...');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => {
                return Promise.all(
                    keys.filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key))
                );
            })
            .then(() => self.clients.claim())
    );
});

// ============================================
// FETCH - Offline Support
// ============================================
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then((response) => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    })
                    .catch(() => {
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});

// ============================================
// ===== NEW: PUSH NOTIFICATIONS =====
// ============================================

// Push event - Show notification
self.addEventListener('push', (event) => {
    console.log('📨 Push event received:', event);
    
    let data = {
        title: 'Social App',
        body: 'You have a new notification!',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge.png',
        vibrate: [200, 100, 200],
        data: {
            url: '/'
        }
    };
    
    // Parse notification data
    if (event.data) {
        try {
            const parsed = event.data.json();
            data = { ...data, ...parsed };
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    console.log('📨 Showing notification:', data);
    
    const options = {
        body: data.body,
        icon: data.icon || '/icons/icon-192.png',
        badge: data.badge || '/icons/badge.png',
        vibrate: data.vibrate || [200, 100, 200],
        data: data.data || { url: '/' },
        actions: data.actions || [
            { action: 'open', title: 'Open' },
            { action: 'dismiss', title: 'Dismiss' }
        ],
        tag: data.tag || 'social-app-notification',
        renotify: true,
        requireInteraction: true
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Social App', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('📨 Notification clicked:', event);
    event.notification.close();
    
    const url = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if there's already a window open
                for (const client of clientList) {
                    if (client.url === url && 'focus' in client) {
                        return client.focus();
                    }
                }
                // If no window is open, open a new one
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});
