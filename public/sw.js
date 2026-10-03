/* Deliberate allowlist: never cache pages, API traffic or Supabase requests. */
const VERSION = "jn-static-v3";
const SAFE = ["/offline.html", "/branding/jayant-logo.jpg"];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SAFE))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/offline.html")),
    );
    return;
  }
  if (SAFE.includes(url.pathname) && !url.search) {
    event.respondWith(
      caches.match(event.request).then((hit) => hit || fetch(event.request)),
    );
  }
});
