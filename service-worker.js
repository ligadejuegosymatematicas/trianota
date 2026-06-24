const CACHE_NAME = 'trianota-pwa-v19.67';
const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './assets/trianota_logo.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './js/assets.js',
  './js/audio.js',
  './js/campaign.js',
  './js/campaign_levels.js',
  './js/data_provider.js',
  './js/firebase_provider.js',
  './js/goal.js',
  './js/history.js',
  './js/main.js',
  './js/metrics.js',
  './js/records.js',
  './js/ui.js',
  './js/ui_records.js',
  './js/zones.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(LOCAL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  if(requestUrl.origin !== self.location.origin || event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request, {ignoreSearch:true}).then(cached => {
      if(cached) return cached;
      return fetch(event.request).then(response => {
        if(!response || response.status !== 200 || response.type !== 'basic') return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      });
    })
  );
});