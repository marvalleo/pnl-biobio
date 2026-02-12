const CACHE_NAME = 'pnl-biobio-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/shared.js',
    '/supabase-config.js',
    '/wp-content/uploads/2026/pnl-del-biobio01.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
