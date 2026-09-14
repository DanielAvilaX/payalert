import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // manifest.webmanifest and sw.js excluded too: both have to be reachable
    // unauthenticated. "Add to Home Screen" from the (signed-out) login
    // screen would otherwise fetch a redirect to /login instead of the real
    // manifest, and iOS falls back to a plain bookmark - browser chrome and
    // all - instead of installing a standalone app icon. A redirected
    // response for a service worker script fails registration outright, so
    // Android's own install prompt would never become eligible either.
    "/((?!_next/static|_next/image|favicon.ico|api/telegram/webhook|api/cron|manifest\\.webmanifest|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
