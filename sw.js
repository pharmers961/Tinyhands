/* Tiny Hands service worker — makes the app work fully offline once installed. */
var CACHE = 'tinyhands-v3';
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS).catch(function () {}); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        try {
          // Same-origin only: the app makes no third-party requests and none are cached.
          var url = new URL(req.url);
          if (url.origin === self.location.origin && res && res.status === 200) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
          }
        } catch (_) {}
        return res;
      }).catch(function () {
        // offline and uncached: fall back to the app shell for navigations
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504 });
      });
    })
  );
});
