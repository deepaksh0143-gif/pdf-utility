/**
 * In-memory job registry (TDD §18/§19). Holds job state, enforces the
 * concurrency cap, supports cancellation flags and expiry. Deliberately
 * not a database (PRD §21/§32) — jobs live for at most one hour.
 */
import { limits } from "@/lib/config";
import type { JobStatus, JobType, JobStep, JobProgress } from "@/types/jobs";
import type { AppErrorDto } from "@/types/errors";

export interface JobRecord {
  id: string;
  sessionId: string;
  type: JobType;
  status: JobStatus;
  progress: JobProgress;
  createdAt: number;
  expiresAt: number;
  cancelRequested: boolean;
  /** File ids staged in temporary storage for this job. */
  inputFileIds: string[];
  resultFiles: { fileId: string; filename: string; sizeBytes: number }[] | null;
  error: AppErrorDto | null;
}

/**
 * Pinned to globalThis: the dev server re-evaluates this module on HMR
 * rebuilds, which would otherwise silently drop every live job record
 * (polls 404, downloads never arrive). A single shared Map also keeps
 * route handlers and the background processor in sync.
 */
const store = globalThis as typeof globalThis & {
  __pdfJobRegistry?: Map<string, JobRecord>;
};
const jobs = (store.__pdfJobRegistry ??= new Map<string, JobRecord>());

export function createJob(init: {
  id: string;
  sessionId: string;
  type: JobType;
  steps: { id: string; label: string }[];
  inputFileIds: string[];
}): JobRecord {
  const now = Date.now();
  const job: JobRecord = {
    id: init.id,
    sessionId: init.sessionId,
    type: init.type,
    status: "QUEUED",
    progress: {
      percent: 0,
      currentStep: init.steps[0]?.id ?? "processing",
      steps: init.steps.map((s, i) => ({
        ...s,
        state: i === 0 ? "active" : "pending",
      })),
    },
    createdAt: now,
    expiresAt: now + limits.jobTtlMs,
    cancelRequested: false,
    inputFileIds: init.inputFileIds,
    resultFiles: null,
    error: null,
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(jobId: string): JobRecord | undefined {
  return jobs.get(jobId);
}

/** Only the owning session may view, cancel or delete a job. */
export function isJobOwner(job: JobRecord, sessionId: string): boolean {
  return job.sessionId === sessionId;
}

export function updateProgress(
  jobId: string,
  patch: Partial<Pick<JobProgress, "percent" | "currentStep" | "detail">>,
  stepStates?: Record<string, JobStep["state"]>,
): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.progress = {
    ...job.progress,
    ...patch,
    steps: job.progress.steps.map((s) =>
      stepStates && s.id in stepStates
        ? { ...s, state: stepStates[s.id] }
        : s,
    ),
  };
}

export function setStatus(jobId: string, status: JobStatus): void {
  const job = jobs.get(jobId);
  if (job) job.status = status;
}

export function failJob(jobId: string, error: AppErrorDto): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "FAILED";
  job.error = error;
}

export function completeJob(
  jobId: string,
  files: { fileId: string; filename: string; sizeBytes: number }[],
): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "COMPLETED";
  job.progress = { ...job.progress, percent: 100, currentStep: "done" };
  job.resultFiles = files;
}

export function requestCancel(jobId: string): boolean {
  const job = jobs.get(jobId);
  if (!job) return false;
  if (job.status === "COMPLETED" || job.status === "CANCELLED" || job.status === "FAILED") {
    return false;
  }
  job.cancelRequested = true;
  job.status = "CANCELLING";
  return true;
}

export function markCancelled(jobId: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "CANCELLED";
  job.progress = {
    ...job.progress,
    currentStep: "cancelled",
    detail: "Processing cancelled.",
    steps: job.progress.steps.map((s) =>
      s.state === "active" ? { ...s, state: "pending" } : s,
    ),
  };
}

export function isCancelRequested(jobId: string): boolean {
  return jobs.get(jobId)?.cancelRequested ?? false;
}

/** Active = anything still running or queued (one-active-job rule, PRD §22). */
export function hasActiveJobForSession(sessionId: string): boolean {
  for (const job of jobs.values()) {
    if (
      job.sessionId === sessionId &&
      !["COMPLETED", "FAILED", "CANCELLED", "EXPIRED"].includes(job.status)
    ) {
      return true;
    }
  }
  return false;
}

export function countRunningJobs(): number {
  let n = 0;
  for (const job of jobs.values()) {
    if (job.status === "PROCESSING" || job.status === "GENERATING") n += 1;
  }
  return n;
}

export function countQueuedJobs(): number {
  let n = 0;
  for (const job of jobs.values()) {
    if (job.status === "QUEUED" || job.status === "VALIDATING") n += 1;
  }
  return n;
}

/** Removes expired jobs from the registry (files are cleaned separately). */
export function removeJob(jobId: string): void {
  jobs.delete(jobId);
}

/**
 * Finds expired jobs and removes them from the registry.
 * Returns their ids so the sweeper can delete files too.
 */
export function findAndRemoveExpiredJobs(now = Date.now()): string[] {
  const expired: string[] = [];
  for (const [id, job] of jobs) {
    if (job.expiresAt <= now) {
      expired.push(id);
      jobs.delete(id);
    }
  }
  return expired;
}

/** Test hook. */
export function resetJobsForTests(): void {
  jobs.clear();
}
