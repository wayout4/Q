const CACHE_NAME = "quantum-os-shell-v6";
const CACHE_PREFIX = "quantum-os-";
const SHELL = ["./", "./index.html", "./styles.css", "./immersive.css", "./app.js", "./sw.js", "./manifest.webmanifest", "./icon.svg", "./quantum-config.js", "./quantum-sim/simulator.js"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    try {
      const response = await fetch(event.request);
      if (response.ok && response.type === "basic") {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
      }
      return response;
    } catch {
      if (event.request.mode === "navigate") {
        const fallback = await caches.match("./index.html");
        if (fallback) return fallback;
        return new Response(
          "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Quantum OS offline</title><body style=\"font:16px system-ui;padding:2rem;background:#10131d;color:#f2f4ff\"><h1>Quantum OS is offline</h1><p>The app shell is not cached yet. Reconnect and reload to restore it.</p><button onclick=\"location.reload()\">Retry</button></body></html>",
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
      return new Response("Offline and resource not cached. Reconnect and reload Quantum OS.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  })());
});
