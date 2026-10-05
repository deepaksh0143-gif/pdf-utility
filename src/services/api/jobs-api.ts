/**
 * Central API client (TDD §28). All network communication flows through
 * here — components never call fetch directly. Errors are converted into
 * the shared AppErrorDto shape so UI can present actionable messages.
 */
import type { AppErrorDto } from "@/types/errors";
import type { UploadedFileInfo } from "@/types/files";
import type { JobDto } from "@/types/jobs";
import type { CreateJobRequest } from "@/types/api";

export class ApiError extends Error {
  readonly code: AppErrorDto["code"];
  readonly detail?: string;
  readonly retryAfterSeconds?: number;

  constructor(dto: AppErrorDto) {
    super(dto.message);
    this.name = "ApiError";
    this.code = dto.code;
    this.detail = dto.detail;
    this.retryAfterSeconds = dto.retryAfterSeconds;
  }
}

async function parseError(response: Response): Promise<ApiError> {
  let dto: AppErrorDto = {
    code: "NETWORK_ERROR",
    message: "Connection problem. Check your internet and try again.",
  };
  try {
    const body = await response.json();
    if (body?.error?.code && body?.error?.message) {
      dto = body.error as AppErrorDto;
    }
  } catch {
    // Keep default network error.
  }
  return new ApiError(dto);
}

export async function uploadPdf(
  file: File,
  signal?: AbortSignal,
): Promise<UploadedFileInfo> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/uploads", {
    method: "POST",
    body,
    signal,
  }).catch(() => {
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "Connection lost while uploading. Please try again.",
    });
  });

  if (!response.ok) throw await parseError(response);
  const data = (await response.json()) as { file: UploadedFileInfo };
  return data.file;
}

export async function deleteUploadedFile(fileId: string): Promise<void> {
  const response = await fetch(`/api/uploads?fileId=${encodeURIComponent(fileId)}`, {
    method: "DELETE",
  }).catch(() => {
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "Connection lost. Please try again.",
    });
  });
  if (!response.ok) throw await parseError(response);
}

export async function createJob(payload: CreateJobRequest): Promise<JobDto> {
  const response = await fetch("/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "Connection lost while starting the task. Please try again.",
    });
  });
  if (!response.ok) throw await parseError(response);
  const data = (await response.json()) as { job: JobDto };
  return data.job;
}

export async function getJobStatus(jobId: string, signal?: AbortSignal): Promise<JobDto> {
  const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
    signal,
  }).catch(() => {
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "Connection lost while checking progress.",
    });
  });
  if (!response.ok) throw await parseError(response);
  const data = (await response.json()) as { job: JobDto };
  return data.job;
}

export async function cancelJob(jobId: string): Promise<void> {
  const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: "POST",
  }).catch(() => {
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "Connection lost while cancelling.",
    });
  });
  // 404 is fine: an already-finished job cannot be cancelled.
  if (!response.ok && response.status !== 404) {
    throw await parseError(response);
  }
}

export function getJobResultUrl(jobId: string): string {
  return `/api/jobs/${encodeURIComponent(jobId)}/result`;
}

export async function deleteJob(jobId: string): Promise<void> {
  const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
    method: "DELETE",
  }).catch(() => {
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "Connection lost. Please try again.",
    });
  });
  if (!response.ok && response.status !== 404) {
    throw await parseError(response);
  }
}
