import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, type RateLimitClass } from "@/lib/rate-limit";
import { AppError, toErrorResponse } from "@/lib/errors";
import type { AppErrorDto } from "@/types/errors";

/**
 * Shared helpers so every route handler behaves consistently:
 * rate limiting, JSON parsing, typed error responses (TDD §26/§30).
 */

export function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function jsonOk<T>(body: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, init);
}

/**
 * Wraps a route handler with structured error handling.
 * Never leaks stack traces or internals to the client.
 */
export async function handleRoute<T>(
  request: NextRequest,
  fn: () => Promise<T>,
): Promise<T | NextResponse<{ error: AppErrorDto }>> {
  try {
    return await fn();
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    const response = NextResponse.json(body, { status });
    if (err instanceof AppError && err.retryAfterSeconds) {
      response.headers.set("Retry-After", String(err.retryAfterSeconds));
    }
    return response;
  }
}

/** Enforces the per-IP rate limit for a route class; throws AppError on excess. */
export function enforceRateLimit(
  request: NextRequest,
  routeClass: RateLimitClass,
): void {
  const result = checkRateLimit(clientIp(request), routeClass);
  if (!result.allowed) {
    throw new AppError("RATE_LIMITED", "Too many requests. Please wait a moment and try again.", {
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }
}

/** Parses and validates a JSON body; rejects oversized payloads early. */
export async function parseJsonBody<T>(
  request: NextRequest,
  maxBytes: number,
): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new AppError("VALIDATION_ERROR", "Expected a JSON request.");
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new AppError("VALIDATION_ERROR", "Request body is too large.");
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body is not valid JSON.");
  }
}
