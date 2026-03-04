const CACHE_NAME = 'adhd-trip-planner-v1.0.4';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './assets/Planner.svg',
    './assets/Planner.png'
];

// Install Event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Caching assets');
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate Event (Cache Invalidation)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch Event (Network First, then Cache)
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(res => {
                // Clone response to cache
                const resClone = res.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, resClone);
                });
                return res;
            })
            .catch(() => caches.match(event.request))
    );
});
