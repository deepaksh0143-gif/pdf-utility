/**
 * In-memory fixed-window rate limiter (TDD §26).
 * Per-IP, per-route-class limits are configurable via environment; the
 * window is one minute. Sufficient for a single-node MVP deployment and
 * deliberately dependency-free.
 */
import { rateLimitConfig } from "./config";

export type RateLimitClass = keyof typeof rateLimitConfig;

interface Bucket {
  windowStart: number;
  count: number;
}

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const PRUNE_INTERVAL_MS = 300_000;
let lastPrune = 0;

function prune(now: number) {
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart >= WINDOW_MS) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  clientIp: string,
  routeClass: RateLimitClass,
  now = Date.now(),
): RateLimitResult {
  const max = rateLimitConfig[routeClass];
  const key = `${routeClass}:${clientIp}`;
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= WINDOW_MS) {
    buckets.set(key, { windowStart: now, count: 1 });
    prune(now);
    return { allowed: true, remaining: max - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > max) {
    const retryAfter = Math.ceil((existing.windowStart + WINDOW_MS - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(retryAfter, 1),
    };
  }

  return { allowed: true, remaining: max - existing.count, retryAfterSeconds: 0 };
}

/** Test hook to reset limiter state between tests. */
export function resetRateLimiterForTests(): void {
  buckets.clear();
  lastPrune = 0;
}
