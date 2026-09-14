// Minimal service worker whose only job is to exist: Chrome's installability
// criteria for "Add to Home Screen" require a registered service worker with
// a fetch handler before it will ever fire `beforeinstallprompt`, even though
// this one does no caching - every request just passes straight through to
// the network. PayAlert's dashboard is all live, per-user data behind auth;
// caching any of it here would risk serving one signed-in user's page to
// whoever opens the app next on a shared device.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
