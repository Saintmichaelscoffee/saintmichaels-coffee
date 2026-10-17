/* Cache only this public offline notice. Never cache shopping or account data. */
const CACHE = 'smc-coffee-offline-v1';
const OFFLINE = '/offline.html';
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE, { cache: 'reload' }))));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith('smc-coffee-offline-') && key !== CACHE)
    .map((key) => caches.delete(key)))));
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== self.location.origin) return;
  // Do not intercept APIs, purchases, payment callbacks or private account routes.
  if (/^\/(api|cart|checkout|checkouts|account|accounts|orders|admin|auth|login)(\/|\.|$)/i.test(url.pathname)) return;
  event.respondWith(fetch(request).catch(async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(OFFLINE)) || new Response('You’re offline. Reconnect to browse Saint Michaels Coffee.', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }));
});
