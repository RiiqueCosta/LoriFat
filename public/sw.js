/* Service worker do Lori Faturamento.
 * - Páginas: rede primeiro (sempre a versão mais nova), cópia em cache para abrir offline.
 * - Arquivos /assets/* (nomes com hash): cache primeiro.
 * - Firebase, fontes e outras origens: não são interceptados.
 */
const CACHE = 'lorifat-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png'])).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || Response.error())),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })),
    );
  }
});

// --- Notificações push (Firebase Cloud Messaging) -------------------------
// O servidor manda mensagens só com "data": { title, body, url, tag }.
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) { payload = { data: { body: event.data ? event.data.text() : '' } }; }
  const d = payload.data || payload.notification || {};
  const options = {
    body: d.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: d.url || '/' },
  };
  if (d.tag) { options.tag = d.tag; options.renotify = true; }
  event.waitUntil(self.registration.showNotification(d.title || 'Lori Faturamento', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const win = list.find((c) => c.url.startsWith(self.location.origin));
      if (win) {
        return win.focus().then((c) => (c && 'navigate' in c ? c.navigate(url) : undefined)).catch(() => undefined);
      }
      return self.clients.openWindow(url);
    }),
  );
});
