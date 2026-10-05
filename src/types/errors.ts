/**
 * Structured error categories shared by API and UI.
 * Mirrors AGENTS.md §15 / TDD §30 — never expose raw internals to users.
 */
export const APP_ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNSUPPORTED_FILE",
  "FILE_TOO_LARGE",
  "PAGE_LIMIT_EXCEEDED",
  "ENCRYPTED_PDF",
  "CORRUPTED_FILE",
  "PROCESSING_FAILED",
  "NETWORK_ERROR",
  "CANCELLED",
  "EXPIRED",
  "RATE_LIMITED",
  "SESSION_CONFLICT",
  "JOB_NOT_FOUND",
  "FILE_NOT_FOUND",
  "NOT_FOUND",
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

/** Wire format returned by the API as `{ error: ... }`. */
export interface AppErrorDto {
  code: AppErrorCode;
  /** User-friendly, actionable message (safe to display). */
  message: string;
  /** Optional safe context, e.g. the offending file name. */
  detail?: string;
  /** Seconds until the client may retry (rate limiting only). */
  retryAfterSeconds?: number;
}
