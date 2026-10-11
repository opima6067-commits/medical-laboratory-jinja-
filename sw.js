/* ==========================================================================
   sw.js - Service Worker for MLS Portal Standalone Progressive Web App
   Enables offline operation, asset caching, and standalone installation.
   ========================================================================== */
var CACHE = 'mls-portal-v6-admin-prize-payments';
var FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'favicon.svg',
  'assets/css/style.css',
  'assets/css/layout.css',
  'assets/css/components.css',
  'assets/js/demo-data.js',
  'assets/js/store.js',
  'assets/js/ui.js',
  'assets/js/auth-demo.js',
  'assets/js/app.js',
  'assets/js/shared-views.js',
  'assets/js/student.js',
  'assets/js/tutor.js',
  'assets/js/registrar.js',
  'assets/js/import-results.js',
  'assets/js/quiz-leaderboard.js',
  'assets/js/pwa.js',
  'assets/images/institution-logo-placeholder.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
  'assets/icons/apple-touch-icon.png',
  'assets/templates/results-import-template.xlsx',
  'assets/templates/results-import-sample-with-errors.xlsx'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Network-first for dynamic freshness, falling back to cache when offline
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then(function (res) {
        if (res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      })
      .catch(function () {
        // Try exact match first
        return caches.match(e.request).then(function (matched) {
          if (matched) return matched;
          // Try match without query string
          var cleanUrl = url.pathname;
          return caches.match(cleanUrl).then(function (cleanMatched) {
            if (cleanMatched) return cleanMatched;
            // For page navigations, return index.html
            if (e.request.mode === 'navigate') {
              return caches.match('index.html') || caches.match('./');
            }
            return undefined;
          });
        });
      })
  );
});
