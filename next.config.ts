import type { NextConfig } from "next";
import path from "node:path";

/**
 * Baseline security headers applied to every route. Aligned with the
 * "polished, client-side, privacy-respecting" positioning:
 *
 *  - X-Frame-Options DENY everywhere except /embed/* (those routes exist
 *    precisely to be framed; everywhere else, refusing frames blocks
 *    clickjacking).
 *  - Strict-Transport-Security with a year + includeSubDomains + preload —
 *    safe for an HTTPS-only deployment.
 *  - Referrer-Policy strict-origin-when-cross-origin avoids leaking full
 *    URLs across origins.
 *  - X-Content-Type-Options nosniff prevents the browser from second-
 *    guessing our declared MIME types.
 *  - Permissions-Policy denies sensors / payments / etc. — we use none.
 *  - Cross-Origin-Opener-Policy gives top-level browsing contexts
 *    isolation; combined with COEP would unlock SharedArrayBuffer if we
 *    ever needed it.
 *  - No CSP yet: Next.js's runtime needs nonced scripts to work without
 *    breaking inline framework code; adding a strict CSP correctly is a
 *    larger follow-up that needs middleware-based nonce wiring.
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const FRAME_DENY = { key: "X-Frame-Options", value: "DENY" };

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this app — otherwise it walks up to a
  // parent monorepo's lockfile.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // The icon resolver imports `* as LucideIcons` so any registry entry can
  // resolve dynamically. This flag rewrites that into per-icon imports
  // during build so we don't ship the entire library.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        // Everything outside /embed gets framing denial.
        source: "/((?!embed).*)",
        headers: [...SECURITY_HEADERS, FRAME_DENY],
      },
      {
        // Embed routes are explicitly designed to be framed — drop the
        // frame-deny header but keep everything else.
        source: "/embed/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
  async redirects() {
    return [
      // `/llms.txt` is the spec (llmstxt.org). The singular form is a near-
      // universal typo — accept it and forward to the canonical URL so an
      // agent or human typing one letter wrong doesn't hit the 404 page.
      { source: "/llm.txt", destination: "/llms.txt", permanent: true },
    ];
  },
};

export default nextConfig;
