var CACHE_NAME = 'crm-v20261030storage377';
var URLS_TO_CACHE = [
  './vendor/lz-string-1.5.0.min.js',
  './customer-storage.js?v=20261030storage377',
  './buyer-helper-update.js?v=20261030storage377',
  './buyer-helper-update.css?v=20261030storage377',
  './reminder-engine.js?v=20261008prefs307',
  './schedule-reminders.js?v=20261030storage377',
  './schedule-reminders.css?v=20261008prefs307',
  './dashboard-actions.js?v=20261007actions286',
  './dashboard-actions.css?v=20261007menu287',
  './common-tools.js?v=20261007tools281',
  './common-tools.css?v=20261007instant283',
  './daily-search-notice.js?v=20261030storage377',
  './daily-search-notice.css?v=20261030storage377',
  './template-archive.js?v=20261007drag289',
  './template-archive.css?v=20261007drag289',
  './bulk-search.js?v=20261006nav261',
  './bulk-search.css?v=20261006nav261',
  './daily-search-report.js?v=20261006report274',
  './daily-search-report.css?v=20261006report274',
  './',
  './index.html','./customer-search.js?v=20261006search263',
  './seller-layout.js?v=20261030storage377',
  './inventory-market.css?v=20261030storage377',
  './inventory-market-engine.js?v=20261030storage377',
  './inventory-market.js?v=20261030storage377',
  './buyer-match.css?v=20261030storage377',
  './buyer-match-engine.js?v=20261030storage377',
  './buyer-demands.js?v=20261030storage377',
  './buyer-results.js?v=20261030storage377',
  './buyer-grouping.js?v=20261030storage377',
  './buyer-schedule.js?v=20261030storage377',
  './buyer-match.js?v=20261030storage377',
  './ui-foundation.css?v=20261005audit210',
  './responsive-layout.css?v=20261030storage377',
  './detail-properties.js?v=20261030storage377',
  './edit-layout.js?v=20261005audit210',
  './property-purpose.js?v=20261030storage377',
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
  './area-editor.js?v=20261030storage377',
  './area-editor.css?v=20261005audit210',
  './transcript-parser.js?v=20260917audit1',
  './transcript-import.js?v=20260927center1',
  './transcript-import.css?v=20260927center1'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE);
    }).catch(function(error) { console.warn('離線快取未完成；仍可連線使用新版', error); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async function(current) {
      var complete = (await Promise.all(URLS_TO_CACHE.map(function(url) { return current.match(url); }))).every(Boolean);
      if (!complete) return;
      return caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return /^crm-v/.test(n) && n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
      });
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
  // Large feeds, downloads and cache-busting responses must not fill app storage.
  if (!e.request.mode.includes('navigate') && !/\.(?:js|css|html|png|svg|ico|woff2?)$/.test(url.pathname)) return;
  if (url.pathname.includes('/downloads/') || url.pathname.includes('/data/')) return;
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
