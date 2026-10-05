import type { AppErrorDto } from "./errors";

export type JobType = "merge" | "extract";

/**
 * Job status values (AGENTS.md §12). UPLOADING is client-side only
 * (the API receives complete files), EXPIRED is set by the cleanup sweeper.
 */
export type JobStatus =
  | "CREATED"
  | "VALIDATING"
  | "QUEUED"
  | "PROCESSING"
  | "GENERATING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLING"
  | "CANCELLED"
  | "EXPIRED";

export type StepState = "pending" | "active" | "done" | "failed";

export interface JobStep {
  id: string;
  label: string;
  state: StepState;
}

export interface JobProgress {
  /** 0–100. Only reported where accurately measurable. */
  percent: number;
  currentStep: string;
  detail?: string;
  steps: JobStep[];
}

export interface JobOutputFile {
  fileId: string;
  filename: string;
  sizeBytes: number;
}

export interface JobDto {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: JobProgress;
  createdAt: string;
  expiresAt: string;
  result: {
    files: JobOutputFile[];
  } | null;
  error: AppErrorDto | null;
}

export const TERMINAL_JOB_STATUSES: readonly JobStatus[] = [
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
];

export function isTerminalStatus(status: JobStatus): boolean {
  return TERMINAL_JOB_STATUSES.includes(status);
}
