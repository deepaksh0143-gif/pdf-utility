"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import type { JobDto, JobStep } from "@/types/jobs";
import type { AppErrorDto } from "@/types/errors";

/**
 * Processing panel (PRD §24/§25): percentage where measurable, step list,
 * screen-reader status region and a cancel button with confirmation.
 */
export function ProcessingPanel({
  job,
  onCancel,
  onRetry,
  onDismiss,
}: {
  job: JobDto;
  onCancel?: () => void;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  const isActive = [
    "CREATED",
    "VALIDATING",
    "QUEUED",
    "PROCESSING",
    "GENERATING",
    "CANCELLING",
  ].includes(job.status);

  const failed = job.status === "FAILED";
  const cancelled = job.status === "CANCELLED";

  return (
    <section aria-labelledby="processing-heading" className="rounded-2xl border border-border bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="processing-heading" className="font-semibold text-ink-900">
            {job.status === "GENERATING"
              ? "Preparing output"
              : failed
                ? "Processing failed"
                : cancelled
                  ? "Processing cancelled"
                  : "Processing"}
          </h2>
          {isActive ? (
            <p className="mt-1 text-sm text-ink-500">
              {job.progress.detail ?? "Working…"} — {job.progress.percent}%
            </p>
          ) : null}
        </div>
        {isActive && onCancel ? (
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel Processing
          </Button>
        ) : null}
      </div>

      {/* Percentage only where accurately measurable (AGENTS.md §13). */}
      {isActive ? (
        <div
          className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuenow={job.progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall processing progress"
        >
          <div
            className="h-full rounded-full bg-primary-600 transition-all"
            style={{ width: `${job.progress.percent}%` }}
          />
        </div>
      ) : null}

      <ol className="mt-4 space-y-2" aria-label="Processing steps">
        {job.progress.steps.map((step: JobStep) => (
          <li key={step.id} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                step.state === "done"
                  ? "bg-success-100 text-success-600"
                  : step.state === "active"
                    ? "bg-primary-600 font-bold text-white"
                    : step.state === "failed"
                      ? "bg-danger-100 text-danger-600"
                      : "bg-surface-muted text-ink-300"
              }`}
            >
              {step.state === "done" ? "✓" : step.state === "failed" ? "✕" : ""}
            </span>
            <span
              className={
                step.state === "done"
                  ? "text-ink-500"
                  : step.state === "active"
                    ? "font-medium text-ink-900"
                    : "text-ink-300"
              }
            >
              {step.label}
              {step.state === "active" ? "…" : ""}
            </span>
          </li>
        ))}
      </ol>

      {/* Screen-reader status updates (TDD §32). */}
      <p role="status" aria-live="polite" className="sr-only">
        {`Task status: ${job.status.toLowerCase()}. ${job.progress.percent} percent complete. ${job.progress.detail ?? ""}`}
      </p>

      {failed && job.error ? (
        <div className="mt-4">
          <ErrorAlert error={job.error} />
          <div className="mt-3 flex gap-2">
            {onRetry ? (
              <Button onClick={onRetry} size="sm">
                Retry
              </Button>
            ) : null}
            {onDismiss ? (
              <Button variant="secondary" size="sm" onClick={onDismiss}>
                Start Again
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {cancelled ? (
        <div className="mt-4">
          <Alert variant="info" title="Processing cancelled">
            Temporary files were cleaned up. Nothing was saved.
          </Alert>
          {onDismiss ? (
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={onDismiss}>
                Start Again
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** User-friendly, actionable error presentation (AGENTS.md §15). */
export function ErrorAlert({ error }: { error: AppErrorDto }) {
  return (
    <Alert
      variant="error"
      title={ERROR_TITLES[error.code] ?? "Something went wrong"}
    >
      {error.message}
      {error.detail ? (
        <span className="block text-xs opacity-80">File: {error.detail}</span>
      ) : null}
    </Alert>
  );
}

const ERROR_TITLES: Record<string, string> = {
  VALIDATION_ERROR: "Invalid request",
  UNSUPPORTED_FILE: "Unsupported file",
  FILE_TOO_LARGE: "File too large",
  PAGE_LIMIT_EXCEEDED: "Too many pages",
  ENCRYPTED_PDF: "Password-protected PDF",
  CORRUPTED_FILE: "Corrupted file",
  PROCESSING_FAILED: "Temporary processing failure",
  NETWORK_ERROR: "Network error",
  CANCELLED: "Cancelled",
  EXPIRED: "No longer available",
  RATE_LIMITED: "Too many requests",
  SESSION_CONFLICT: "Task already running",
  JOB_NOT_FOUND: "Task not found",
  FILE_NOT_FOUND: "File not found",
  NOT_FOUND: "Not found",
};
