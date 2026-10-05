var CACHE_NAME = 'crm-v20261005audit194';
var URLS_TO_CACHE = [
  './',
  './index.html',
  './inventory-market.css?v=20261005audit194',
  './inventory-market-engine.js?v=20261005audit194',
  './inventory-market.js?v=20261005audit194',
  './buyer-match.css?v=20261005audit194',
  './buyer-match-engine.js?v=20261005audit194',
  './buyer-demands.js?v=20261005audit194',
  './buyer-results.js?v=20261005audit194',
  './buyer-grouping.js?v=20261005audit194',
  './buyer-schedule.js?v=20261005audit194',
  './buyer-match.js?v=20261005audit194',
  './ui-foundation.css?v=20261005audit194',
  './responsive-layout.css?v=20261005audit194',
  './detail-properties.js?v=20261005audit194',
  './edit-layout.js?v=20261005audit194',
  './property-purpose.js?v=20261005audit194',
  './schedule-property.js?v=20261005audit194',
  './sync-notice.js?v=20261005audit194',
  './image-storage.js?v=20260928sync1',
  './image-redaction.js?v=20260928sync1',
  './image-studio.js?v=20261005audit194',
  './image-layouts.js?v=20260928sync1',
  './brand-banner.js?v=20260928sync1',
  './portrait-matting.js?v=20260928sync1',
  './image-ai.js?v=20261005audit194',
  './image-ai-editor.js?v=20261005audit194',
  './image-ai-licenses.txt',
  './image-enhance.js?v=20261005audit194',
  './image-composer.js?v=20261005audit194',
  './image-composer.css?v=20261005audit194',
  './area-editor.js?v=20261005audit194',
  './area-editor.css?v=20261005audit194',
  './transcript-parser.js?v=20260917audit1',
  './transcript-import.js?v=20260927center1',
  './transcript-import.css?v=20260927center1'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME && n !== 'crm-model-matting-v1' && n !== 'crm-model-photo-ai-v1'; })
             .map(function(n) { return caches.delete(n); })
      );
    }).then(function() {
      return caches.open('crm-model-photo-ai-v1').then(function(cache) {
        return cache.keys().then(function(keys) {
          return Promise.all(keys.filter(function(key) { return new URL(key.url).pathname.endsWith('/realesrgan-x4.onnx'); }).map(function(key) { return cache.delete(key); }));
        });
      });
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Google Apps Script 請求不走快取
  if (e.request.url.includes('script.google.com') || e.request.url.includes('drive.google.com')) {
    return;
  }
  // 只快取 GET 且同源的請求
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function(resp) {
      // 只快取 2xx 且非 opaque 的回應
      if (resp && resp.ok && resp.type === 'basic') {
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
      }
      return resp;
    }).catch(function() {
      // 離線時用快取，找不到就回 503
      return caches.match(e.request).then(function(cached) {
        return cached || new Response('離線且無快取', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
