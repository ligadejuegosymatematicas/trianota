const CACHE_NAME = 'trianota-pwa-v19.78-player-stats-min';
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

function cacheableLocalRequest(request){
  const requestUrl = new URL(request.url);
  return requestUrl.origin === self.location.origin && request.method === 'GET';
}

function putInCache(request, response){
  if(!response || response.status !== 200 || response.type !== 'basic') return response;
  const copy = response.clone();
  caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
  return response;
}

function networkFirst(request){
  return fetch(request)
    .then(response => putInCache(request, response))
    .catch(() => caches.match(request));
}

function cacheFirst(request){
  return caches.match(request).then(cached => cached || fetch(request).then(response => putInCache(request, response)));
}

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
  if(!cacheableLocalRequest(event.request)) return;
  const requestUrl = new URL(event.request.url);
  const path = requestUrl.pathname;
  const freshAsset = event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    path.endsWith('.html') ||
    path.endsWith('.js') ||
    path.endsWith('.css');

  event.respondWith(freshAsset ? networkFirst(event.request) : cacheFirst(event.request));
});
