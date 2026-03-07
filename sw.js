const CACHE_NAME = 'pnl-biobio-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/shared.js',
    '/supabase-config.js',
    '/assets/images/logos/pnl-del-biobio01.png'
];

// --- INSTALACIÓN ---
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

// --- ACTIVACIÓN (limpiar cachés antiguas) ---
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// --- FETCH (network-first con fallback a caché) ---
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});

// --- PUSH NOTIFICATIONS ---
self.addEventListener('push', (event) => {
    let data = {
        title: 'PNL Biobío',
        body: 'Tienes una nueva notificación',
        icon: '/assets/images/logos/pnl-del-biobio01.png',
        badge: '/assets/images/logos/favicon-100x100.jpg',
        url: '/index.html'
    };

    // Intentar parsear el payload del push
    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        vibrate: [100, 50, 100],
        data: { url: data.url || '/index.html' },
        actions: [
            { action: 'open', title: 'Abrir' },
            { action: 'close', title: 'Cerrar' }
        ],
        tag: data.tag || 'pnl-notification',
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// --- CLIC EN NOTIFICACIÓN ---
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    const urlToOpen = event.notification.data?.url || '/index.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Si ya hay una ventana abierta, enfocarla
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // Si no hay ventana abierta, abrir una nueva
                return clients.openWindow(urlToOpen);
            })
    );
});
