/* NexoryOS GameZone OS — minimal safe service worker */
const CACHE = "nexoryos-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // mutations: network only
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/webpack")) return; // always network, never cache

  // Documents & auth endpoints: network first, no cache writes, cache fallback on error
  if (req.destination === "document" || url.pathname.startsWith("/api/auth")) {
    event.respondWith(fetch(req).catch(() => caches.match(req).then((r) => r || Response.error())));
    return;
  }

  // Static assets only: /_next/static, /icons/, images, css, js chunks
  const isStatic =
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons/") ||
    /\.(png|jpg|jpeg|webp|gif|svg|ico|css|js|woff|woff2)$/.test(url.pathname);
  if (!isStatic) return;

  event.respondWith(
    (async () => {
      try {
        const hit = await caches.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      } catch {
        try {
          const hit = await caches.match(req);
          if (hit) return hit;
        } catch {}
        return new Response("", { status: 504, statusText: "Offline" });
      }
    })()
  );
});
