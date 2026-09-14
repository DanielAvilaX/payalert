"use client";

import { useEffect } from "react";

/**
 * Registers the no-op service worker (see public/sw.js) that exists purely
 * so Chrome on Android considers PayAlert installable - its
 * "Add to Home Screen" prompt requires one, even an empty pass-through.
 * Does nothing useful on iOS Safari, which has no such requirement and no
 * `beforeinstallprompt` event at all - registering there is harmless but
 * pointless, so this still runs everywhere rather than branching on it.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Best-effort only: nothing in the app depends on this succeeding.
      });
    }
  }, []);

  return null;
}
