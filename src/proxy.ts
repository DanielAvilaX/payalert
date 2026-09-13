import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // manifest.webmanifest excluded too: it has to be reachable
    // unauthenticated, or "Add to Home Screen" from the (signed-out) login
    // screen fetches a redirect to /login instead of the real manifest and
    // iOS falls back to a plain bookmark - browser chrome and all - instead
    // of installing a standalone app icon.
    "/((?!_next/static|_next/image|favicon.ico|api/telegram/webhook|api/cron|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
