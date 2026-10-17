// Service worker of Thám tử Toán học Tí hon. vite.config.ts fills in the version and the file list at build time
// and writes the result to dist/sw.js. It keeps the whole app (code, pictures, fonts, voice clips) in one cache,
// so the app opens with no network. A new build has a new version: the old cache is dropped when it takes over.
const CACHE = "ttth-__VERSION__";
const PRECACHE = __PRECACHE__;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // one missing file must not stop the rest from being kept
    await Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith("ttth-") && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const response = await fetch(request);
      // only real files are kept: a missing voice clip (404) must stay missing so the app falls back to the browser voice
      if (response.ok) cache.put(request, response.clone());
      return response;
    } catch (error) {
      if (request.mode === "navigate") {
        const page = (await cache.match("./")) ?? (await cache.match("./index.html"));
        if (page) return page;
      }
      throw error;
    }
  })());
});
