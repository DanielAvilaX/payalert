// The fetch handler is deliberately empty.
//
// It exists because Chrome has historically wanted a registered service
// worker with a fetch handler before offering to install a site to the home
// screen. It does NOT call event.respondWith(), which is the important part:
// not responding leaves the request to the browser's own network stack, so
// this costs nothing.
//
// The previous version did `event.respondWith(fetch(event.request))` - a
// pass-through that looks harmless and isn't. Every request on the page,
// including the streaming HTML document, was re-issued through the service
// worker's single thread, which doubled the request count and put a proxy in
// front of the one response whose latency the user actually feels. It bought
// nothing: nothing here is cached, so the network did the same work either
// way.
self.addEventListener("fetch", () => {
  // Intentionally empty - see above.
});

// Take over from the previous (pass-through) worker on the next load rather
// than waiting for every tab to be closed first, so the fix above reaches
// browsers that already installed it.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
