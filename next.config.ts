import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// A finance dashboard is a natural clickjacking and data-exfiltration
// target, and none of these headers cost anything at runtime.
//
// The CSP is deliberately nonce-free: generating a per-request nonce forces
// every page to render dynamically, and the login page being statically
// served from the edge is exactly what makes it load in ~0.3s. Without a
// nonce, Next.js's inlined hydration payload needs 'unsafe-inline' for
// scripts - so this policy's value isn't inline-XSS defense, it's that an
// injected <script src> to an attacker's domain, an exfiltrating fetch, a
// stray <object>, or a hostile <iframe> wrapper all still get blocked.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // The browser never talks to Supabase directly: every read and write goes
  // through a Server Component or Server Action on our own origin.
  "connect-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  headers() {
    return Promise.resolve([{ source: "/:path*", headers: securityHeaders }]);
  },
};

export default nextConfig;
