/* Service worker de LÉON ACADÉMIE : permet l'utilisation hors ligne. */
const VERSION = '__BUILD_VERSION__';
const CACHE = `leon-${VERSION}`;
// Remplacé à la compilation par la liste des fichiers de l'application.
const PRECACHE = self.__PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => (Array.isArray(PRECACHE) ? cache.addAll(PRECACHE) : undefined)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('leon-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Les appels API (IA, Supabase) ne sont jamais mis en cache.
  if (url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  if (req.mode === 'navigate') {
    // Réseau d'abord pour la page, cache en secours hors ligne.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./').then((r) => r || caches.match('./index.html'))),
    );
    return;
  }
  // Cache d'abord pour les fichiers statiques.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
