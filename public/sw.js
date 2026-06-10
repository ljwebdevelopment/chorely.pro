const CACHE = "chorely-shell-v3";
const CORE = [
  "/",
  "/pricing",
  "/features",
  "/offline",
  "/favicon.svg",
  "/app-icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/manifest.webmanifest"
];
const CORE_URLS = new Set(CORE);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isCoreAsset = isSameOrigin && CORE_URLS.has(url.pathname);
  const isStaticAsset = isSameOrigin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/_next/image/"));

  if (!isCoreAsset && !isStaticAsset) {
    if (event.request.mode === "navigate") {
      event.respondWith(fetch(event.request).catch(() => caches.match("/offline")));
    }
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request))
      .then((response) => {
        if (response.ok && isSameOrigin) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        return cached || caches.match("/offline");
      })
  );
});
