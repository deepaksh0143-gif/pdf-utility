/**
 * Server-side configuration (TDD §36). All values are configurable via
 * environment variables with safe defaults — nothing is hardcoded at
 * call sites, and no API keys are required for the MVP.
 */
import os from "node:os";
import path from "node:path";

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function floatFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** PRD/TDD limits, overridable via environment. */
export const limits = {
  maxFileSizeMb: floatFromEnv("MAX_FILE_SIZE_MB", 50),
  maxFilesPerSession: intFromEnv("MAX_FILES_PER_SESSION", 20),
  maxTotalPages: intFromEnv("MAX_TOTAL_PAGES", 100),
  jobTtlMs: intFromEnv("JOB_TTL_MS", 3_600_000),
  sweepIntervalMs: intFromEnv("SWEEP_INTERVAL_MS", 60_000),
  maxConcurrentJobs: intFromEnv("MAX_CONCURRENT_JOBS", 2),
};

/** Per-IP rate limits (requests per minute) per route class (TDD §26). */
export const rateLimitConfig = {
  upload: intFromEnv("RATE_LIMIT_UPLOAD_PER_MIN", 30),
  validate: intFromEnv("RATE_LIMIT_VALIDATE_PER_MIN", 10),
  jobs: intFromEnv("RATE_LIMIT_JOBS_PER_MIN", 10),
  download: intFromEnv("RATE_LIMIT_DOWNLOAD_PER_MIN", 60),
  pages: intFromEnv("RATE_LIMIT_PAGES_PER_MIN", 240),
};

/** Root directory for temporary job files (TDD §21). */
export function tmpRoot(): string {
  return process.env.TMP_DIR ?? path.join(os.tmpdir(), "pdf-utility");
}
