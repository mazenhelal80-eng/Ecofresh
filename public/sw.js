// EcoFresh ERP — Production Service Worker
// Designed strictly for static asset performance without caching sensitive business/financial data.

const STATIC_CACHE_NAME = 'ecofresh-static-v1';
const PRECACHE_ASSETS = [
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. NEVER cache POST/PUT/DELETE mutations or Server Action requests
  if (event.request.method !== 'GET') {
    return;
  }

  // 2. NEVER cache Supabase auth or API requests
  if (url.origin.includes('supabase.co') || url.pathname.startsWith('/api/')) {
    return;
  }

  // 3. Static Assets: Stale-while-revalidate for images, icons, and next static chunks
  const isStaticAsset =
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.css');

  if (isStaticAsset) {
    event.respondWith(
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 4. Default for ERP HTML/Data pages: Network First to always ensure fresh, secure database state
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
