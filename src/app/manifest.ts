import type { MetadataRoute } from "next";

// Lets a phone treat "Add to Home Screen" as installing an app instead of
// bookmarking a page: with this in place (plus the apple-mobile-web-app-*
// meta tags in layout.tsx), the icon opens full-screen, no address bar or
// browser toolbar. Only Safari on iOS honours either of these - an icon
// added from Chrome on iPhone always opens through Safari's normal browser
// chrome, which this file can't change.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PayAlert",
    short_name: "PayAlert",
    description: "Tus pagos, siempre en la mira. Recordatorios de pago por Telegram.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6fa",
    theme_color: "#4f46e5",
    icons: [
      { src: "/logo.png", sizes: "500x500", type: "image/png", purpose: "any" },
    ],
  };
}
