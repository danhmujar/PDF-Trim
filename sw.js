const CACHE_NAME = "pdf-trim-cache-v29";

// Static files required for the core layout and styling
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./favicon.ico",
  "./icon-192.png",
  "./icon-512.png",
  "./app.js",
  "./processor.py",
  "https://pyscript.net/releases/2024.1.1/core.js",
  "https://pyscript.net/releases/2024.1.1/core.css",
];

self.addEventListener("install", (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      if (
        self.location.hostname === "localhost" ||
        self.location.hostname === "127.0.0.1"
      ) {
        console.log(
          "[ServiceWorker] Caching Core App Shell and PyScript Foundation (Busting HTTP Cache)",
        );
      }

      // Bypass the browser HTTP cache during installation to ensure fresh assets
      const cacheRequests = CORE_ASSETS.map((url) => {
        return fetch(new Request(url, { cache: "reload" }))
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Failed to fetch ${url} during SW install.`);
            }
            return cache.put(url, response);
          })
          .catch((err) => {
            if (
              self.location.hostname === "localhost" ||
              self.location.hostname === "127.0.0.1"
            ) {
              console.warn(
                `[ServiceWorker] Cache-bust fetch failed for ${url}:`,
                err,
              );
            }
          });
      });

      return Promise.all(cacheRequests);
    }),
  );
});

self.addEventListener("activate", (event) => {
  // Prune old caches and claim clients simultaneously
  const activationTasks = [
    self.clients.claim(),
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            if (
              self.location.hostname === "localhost" ||
              self.location.hostname === "127.0.0.1"
            ) {
              console.log(
                "[ServiceWorker] Removing old cache constraint",
                cacheName,
              );
            }
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  ];

  event.waitUntil(Promise.all(activationTasks));
});

// Cache First Strategy with Dynamic Network Fallback & Cross-Origin Isolation
self.addEventListener("fetch", (event) => {
  // We only care about GET requests. We're not doing any POSTing.
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Determine our primary fetch response source
      let fetchPromise = cachedResponse
        ? Promise.resolve(cachedResponse)
        : fetch(event.request)
            .then((networkResponse) => {
              // Ignore invalid responses for caching
              if (
                !networkResponse ||
                networkResponse.status !== 200 ||
                (networkResponse.type !== "basic" &&
                  networkResponse.type !== "cors")
              ) {
                return networkResponse;
              }

              // Clone the response as it can only be consumed once
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });

              return networkResponse;
            })
            .catch((error) => {
              if (
                self.location.hostname === "localhost" ||
                self.location.hostname === "127.0.0.1"
              ) {
                console.warn(
                  "[ServiceWorker] Fetch failed, connection offline mode activated for un-cached asset.",
                  error,
                );
              }
              // Return a basic error response to prevent complete failure
              return new Response(
                '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Offline</title></head><body style="text-align:center;padding:2rem;font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;"><h1>Offline</h1><p>This resource is not available offline.<br>Please reconnect and try again.</p></body></html>',
                { status: 408, headers: { "Content-Type": "text/html" } }
              );
            });

      // Post-process the response to inject SharedArrayBuffer Cross-Origin Security Headers
      return fetchPromise.then((response) => {
        // If it's an opaque response (like standard CORS without preflight), we cannot modify headers safely.
        if (response.type === "opaque") return response;

        // Create a new headers object based on the original response
        const newHeaders = new Headers(response.headers);

        // CRITICAL: Inject the required Cross-Origin headers for SharedArrayBuffer
        // This satisfies the Chrome requirement for Pyodide WebAssembly high-resolution timers
        newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
        newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");

        // Return a reconstructed response with the new isolated headers appended
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      });
    }),
  );
});
