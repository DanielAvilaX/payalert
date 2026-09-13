import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PayAlert",
  description: "Tus pagos, siempre en la mira. Recordatorios de pago por Telegram.",
  // Together with manifest.ts, this is what makes "Add to Home Screen" from
  // Safari on iOS open full-screen instead of inside Safari's normal browser
  // chrome (address bar, back/forward, share). `appleWebApp` covers the
  // modern `mobile-web-app-capable` tag and the home-screen title; `other`
  // adds the older `apple-` prefixed tag older iOS versions still key off.
  // A shortcut added from Chrome on iPhone always opens through Safari
  // regardless - Chrome for iOS has no standalone mode, so that one only
  // fixes itself by re-adding the icon from Safari.
  appleWebApp: {
    capable: true,
    title: "PayAlert",
    statusBarStyle: "default",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
