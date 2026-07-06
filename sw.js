// === MEUFINANCAS SERVICE WORKER v3.0 ===
// v3.0: Network first (nunca serve JS quebrado do cache), limpa tudo na ativacao
// v2.0: Cache com fallback
// v1.0: Original

const CACHE_NAME = 'meufinancas-v3.0';
const ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// INSTALL: pre-cacheia so os assets estaticos seguros (NAO o app.js)
self.addEventListener('install', e => {
  console.log('[SW v3.0] Instalando...');
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS).catch(err => console.warn('[SW] Alguns assets:', err)))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE: apaga TODOS os caches antigos
self.addEventListener('activate', e => {
  console.log('[SW v3.0] Ativando e limpando caches antigos...');
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW v3.0] Removendo cache:', k);
        return caches.delete(k);
      })
    )).then(() => self.clients.claim())
  );
});

// FETCH: Network-first pro app.js (nunca serve versao quebrada do cache)
//        Cache-first pra assets estaticos
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isAppJs = url.pathname.endsWith('/app.js') || url.pathname.endsWith('app.js');

  if (isAppJs) {
    // Network first: SEMPRE busca a versao mais nova do app.js
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(c => c || new Response('// offline', {status: 503})))
    );
    return;
  }

  // Pra outros assets: cache first com network em background
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        fetch(e.request).then(res => {
          if (res.ok && url.origin === self.location.origin) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(e.request).then(res => {
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('./dashboard.html');
      });
    })
  );
});
