var CACHE_NAME = 'crm-v20261010presale337';
var URLS_TO_CACHE = [
  './reminder-engine.js?v=20261008prefs307',
  './schedule-reminders.js?v=20261008time313',
  './schedule-reminders.css?v=20261008prefs307',
  './dashboard-actions.js?v=20261007actions286',
  './dashboard-actions.css?v=20261007menu287',
  './common-tools.js?v=20261007tools281',
  './common-tools.css?v=20261007instant283',
  './daily-search-notice.js?v=20261010presale337',
  './daily-search-notice.css?v=20261010presale337',
  './template-archive.js?v=20261007drag289',
  './template-archive.css?v=20261007drag289',
  './bulk-search.js?v=20261006nav261',
  './bulk-search.css?v=20261006nav261',
  './daily-search-report.js?v=20261006report274',
  './daily-search-report.css?v=20261006report274',
  './',
  './index.html','./customer-search.js?v=20261006search263',
  './seller-layout.js?v=20261010presale337',
  './inventory-market.css?v=20261010presale337',
  './inventory-market-engine.js?v=20261010presale337',
  './inventory-market.js?v=20261010presale337',
  './buyer-match.css?v=20261010presale337',
  './buyer-match-engine.js?v=20261010presale337',
  './buyer-demands.js?v=20261010presale337',
  './buyer-results.js?v=20261005sources243',
  './buyer-grouping.js?v=20261005status220',
  './buyer-schedule.js?v=20261010presale337',
  './buyer-match.js?v=20261010presale337',
  './ui-foundation.css?v=20261005audit210',
  './responsive-layout.css?v=20261010presale337',
  './detail-properties.js?v=20261010presale337',
  './edit-layout.js?v=20261005audit210',
  './property-purpose.js?v=20261005audit210',
  './schedule-property.js?v=20261005audit210',
  './sync-notice.js?v=20261005audit210',
  './image-storage.js?v=20260928sync1',
  './image-redaction.js?v=20260928sync1',
  './image-studio.js?v=20261005audit210',
  './image-layouts.js?v=20260928sync1',
  './brand-banner.js?v=20260928sync1',
  './portrait-matting.js?v=20260928sync1',
  './image-ai.js?v=20261005audit210',
  './image-ai-editor.js?v=20261005audit210',
  './image-ai-licenses.txt',
  './image-enhance.js?v=20261005audit210',
  './image-composer.js?v=20261005audit210',
  './image-composer.css?v=20261005audit210',
  './area-editor.js?v=20261005audit210',
  './area-editor.css?v=20261005audit210',
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
  var url = new URL(e.request.url);
  if (!/^https?:$/.test(url.protocol) || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then(function(resp) {
      // 只快取 2xx 且非 opaque 的回應
      if (resp && resp.ok && resp.type === 'basic') {
        var clone = resp.clone();
        e.waitUntil(caches.open(CACHE_NAME).then(function(cache) { return cache.put(e.request, clone); }).catch(function(error) { console.warn('離線快取未寫入', error); }));
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
