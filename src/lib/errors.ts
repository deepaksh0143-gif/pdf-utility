import type { AppErrorDto, AppErrorCode } from "@/types/errors";
import { logger } from "./logging";

/** Default HTTP status for each error category. */
const HTTP_STATUS: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNSUPPORTED_FILE: 415,
  FILE_TOO_LARGE: 413,
  PAGE_LIMIT_EXCEEDED: 413,
  ENCRYPTED_PDF: 422,
  CORRUPTED_FILE: 422,
  PROCESSING_FAILED: 500,
  NETWORK_ERROR: 502,
  CANCELLED: 499,
  EXPIRED: 410,
  RATE_LIMITED: 429,
  SESSION_CONFLICT: 409,
  JOB_NOT_FOUND: 404,
  FILE_NOT_FOUND: 404,
  NOT_FOUND: 404,
};

/**
 * Typed application error. Internal details (stack, raw message) stay on the
 * server; only the category and a user-friendly message reach the client.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly httpStatus: number;
  readonly userMessage: string;
  readonly detail?: string;
  readonly retryAfterSeconds?: number;
  /** Context logged server-side for diagnostics (never document content). */
  readonly logContext?: Record<string, unknown>;

  constructor(
    code: AppErrorCode,
    userMessage: string,
    options?: {
      httpStatus?: number;
      detail?: string;
      retryAfterSeconds?: number;
      logContext?: Record<string, unknown>;
    },
    rawError?: unknown,
  ) {
    super(userMessage);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = options?.httpStatus ?? HTTP_STATUS[code];
    this.userMessage = userMessage;
    this.detail = options?.detail;
    this.retryAfterSeconds = options?.retryAfterSeconds;
    this.logContext = options?.logContext;
    if (rawError instanceof Error && rawError.stack) {
      this.stack = rawError.stack;
    }
  }
}

/**
 * Converts any thrown value into a client-safe AppErrorDto and logs the
 * server-side context. Used by every API route.
 */
export function toErrorResponse(error: unknown): {
  status: number;
  body: { error: AppErrorDto };
} {
  if (error instanceof AppError) {
    logger.error("request.failed", {
      code: error.code,
      status: error.httpStatus,
      message: error.message,
      context: error.logContext,
    });
    return {
      status: error.httpStatus,
      body: {
        error: {
          code: error.code,
          message: error.userMessage,
          ...(error.detail ? { detail: error.detail } : {}),
          ...(error.retryAfterSeconds !== undefined
            ? { retryAfterSeconds: error.retryAfterSeconds }
            : {}),
        },
      },
    };
  }

  // Unknown errors are deliberately opaque to clients (AGENTS.md §15).
  logger.error("request.failed_unexpected", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  return {
    status: 500,
    body: {
      error: {
        code: "PROCESSING_FAILED",
        message:
          "Something went wrong while processing your request. Please try again.",
      },
    },
  };
}
