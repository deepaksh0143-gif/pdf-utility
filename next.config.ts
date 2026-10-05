import type { NextConfig } from "next";

/**
 * Baseline security headers apply to every response.
 * The Content-Security-Policy with per-request nonces is added by
 * src/middleware.ts (production only) — see that file for details.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Emits .next/standalone for the Docker deployment (Dockerfile);
  // `next start` and dev mode are unaffected.
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
