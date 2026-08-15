const CACHE = "navalha-app-v2";
const OFFLINE = "/offline";
const SHELL = [OFFLINE, "/instalar", "/icons/navalha.svg", "/icons/navalha-maskable.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => {
    const network = fetch(event.request).then((response) => {
      if (response.ok && ["style", "script", "image", "font"].includes(event.request.destination)) {
        caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
      }
      return response;
    });
    return cached || network;
  }));
});
