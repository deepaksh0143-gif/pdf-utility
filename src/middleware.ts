import { NextRequest, NextResponse } from "next/server";

/**
 * Production-only CSP with per-request nonces (defense in depth, TDD §25).
 * Development keeps the looser dev-only requirements (HMR, eval).
 * Nonce-based CSP requires dynamic rendering for HTML routes.
 */
export function middleware(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === "production";

  const requestHeaders = new Headers(request.headers);
  const shouldSetCsp = isProduction && request.nextUrl.pathname.startsWith("/api") === false;

  if (shouldSetCsp) {
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    requestHeaders.set("x-nonce", nonce);

    const csp = [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' blob: data:`,
      `font-src 'self'`,
      `connect-src 'self' blob:`,
      `worker-src 'self' blob:`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
      `require-trusted-types-for 'script'`,
    ].join("; ");

    requestHeaders.set("Content-Security-Policy", csp);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except API, static files and common assets.
    "/((?!api|_next/static|_next/image|favicon.ico|pdf.worker.min.mjs).*)",
  ],
};
