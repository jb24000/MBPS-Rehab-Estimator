// MBPS Rehab Estimator - Service Worker
const CACHE_NAME = 'mbps-rehab-estimator-v1';

// Add any additional assets you want cached here
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './sw.js',
  // Tailwind CDN script (will cache after first hit)
  'https://cdn.tailwindcss.com'
  // Add icon paths if served from same origin:
  // './icons/mbps-rehab-192.png',
  // './icons/mbps-rehab-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        // Ignore some failures (e.g., CDN issues) so install doesn't blow up
        console.warn('[SW] Asset cache error:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Basic offline-first strategy for same-origin requests
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET and same-origin
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // For navigation requests (HTML pages), try network first, fallback to cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Optionally update cache
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match('./index.html').then((cached) => cached || Response.error())
        )
    );
    return;
  }

  // For other same-origin assets: cache-first, then network
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => cached); // last resort
    })
  );
});
