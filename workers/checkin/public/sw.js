// Check-in service worker: shows reminders and messages as notifications, opens the right screen on tap,
// and keeps the app shell available offline. No client data is cached (the API is never cached).
const SHELL = 'checkin-shell-v1';
const FILES = ['/', '/app.css', '/app.js', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/badge-96.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/r/')) return;
  // Network first, so updates show straight away; the cached shell is only for when there's no signal.
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok && FILES.includes(url.pathname)) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(url.pathname, copy)); }
    return res;
  }).catch(() => caches.match(url.pathname).then((r) => r || caches.match('/'))));
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  const title = d.title || 'Check-in';
  e.waitUntil((async () => {
    await self.registration.showNotification(title, {
      body: d.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: d.tag || undefined,
      renotify: !!d.tag,
      data: { url: d.url || '/#today', deliveryId: d.deliveryId || null },
    });
    // If the app is open, refresh what it shows.
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    wins.forEach((w) => w.postMessage({ type: 'push', data: d }));
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const data = e.notification.data || {};
  const target = new URL(data.url || '/#today', self.location.origin).href;
  e.waitUntil((async () => {
    if (data.deliveryId) {
      fetch(`/api/deliveries/${data.deliveryId}/opened`, { method: 'POST', credentials: 'same-origin', headers: { 'x-checkin': '1' } }).catch(() => {});
    }
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (new URL(w.url).origin === self.location.origin) {
        await w.focus();
        w.postMessage({ type: 'open', url: target });
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
