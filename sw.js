const CACHE_NAME = 'pnl-biobio-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/shared.js',
    '/supabase-config.js',
    '/wp-content/uploads/2026/pnl-del-biobio01.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
