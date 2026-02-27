const CACHE_NAME = "pdf-trim-cache-v18";

// Static files required for the core layout and styling
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./app.js",
  "./processor.py",
  "./favicon.ico",
  "./icon-192.png",
  "./icon-512.png",
  "./frame.png",
  "https://pyscript.net/releases/2024.1.1/core.js",
  "https://pyscript.net/releases/2024.1.1/core.css",
];

// Domains we want to cache dynamically (CDN dependencies)
const CACHEABLE_ORIGINS = [
  "pyscript.net",
  "cdn.jsdelivr.net",
  "pypi.org",
  "files.pythonhosted.org",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ServiceWorker] Caching App Shell");
      return cache.addAll(CORE_ASSETS);
    }),
  );
});

self.addEventListener("activate", (event) => {
  const activationTasks = [
    self.clients.claim(),
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[ServiceWorker] Pruning old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  ];
  event.waitUntil(Promise.all(activationTasks));
});

// Handle messages from the client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_CACHE") {
    console.log("[ServiceWorker] Manual cache reset requested.");
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName)),
        );
      }),
    );
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isCacheableOrigin = CACHEABLE_ORIGINS.some((origin) =>
    url.hostname.includes(origin),
  );

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      let fetchPromise = cachedResponse
        ? Promise.resolve(cachedResponse)
        : fetch(event.request)
            .then((networkResponse) => {
              // Cache successful responses from our app or allowed origins
              if (
                networkResponse &&
                networkResponse.status === 200 &&
                (url.origin === self.location.origin || isCacheableOrigin) &&
                networkResponse.type !== "opaque"
              ) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              }
              return networkResponse;
            })
            .catch((error) => {
              console.error("[ServiceWorker] Fetch failed:", error);
              if (event.request.mode === "navigate") {
                return caches.match("./index.html");
              }
              return new Response("Offline Content Unavailable", {
                status: 503,
                statusText: "Service Unavailable",
                headers: new Headers({ "Content-Type": "text/plain" }),
              });
            });

      // Post-process the response to inject SharedArrayBuffer Cross-Origin Security Headers
      return fetchPromise.then((response) => {
        if (!response || response.type === "opaque") return response;

        const newHeaders = new Headers(response.headers);
        newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
        newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      });
    }),
  );
});
