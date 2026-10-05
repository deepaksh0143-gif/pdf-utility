/**
 * GET  /api/jobs/:id — poll job status (TDD §19). Owner-checked; expired
 * jobs report EXPIRED and are removed.
 * DELETE /api/jobs/:id — ends the session's job and deletes its temp files.
 */
import { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { getSessionId } from "@/lib/session";
import {
  getJob,
  isJobOwner,
  removeJob,
} from "@/services/jobs/job-registry";
import { deleteJobFiles } from "@/services/storage/temp-storage";
import { startSweeper } from "@/services/jobs/sweeper";
import { handleRoute, jsonOk } from "@/app/api/_lib/http";
import type { JobDto } from "@/types/jobs";

export const runtime = "nodejs";

function toJobDto(job: NonNullable<ReturnType<typeof getJob>>): JobDto {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    createdAt: new Date(job.createdAt).toISOString(),
    expiresAt: new Date(job.expiresAt).toISOString(),
    result: job.resultFiles
      ? {
          files: job.resultFiles.map((f) => ({
            fileId: f.fileId,
            filename: f.filename,
            sizeBytes: f.sizeBytes,
          })),
        }
      : null,
    error: job.error,
  };
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return handleRoute(request, async () => {
    startSweeper();
    const { id } = await ctx.params;
    const sessionId = await getSessionId();

    const job = getJob(id);
    if (!job || !sessionId || !isJobOwner(job, sessionId)) {
      throw new AppError("JOB_NOT_FOUND", "This task could not be found.");
    }
    if (job.expiresAt <= Date.now()) {
      await deleteJobFiles(job.id).catch(() => undefined);
      removeJob(job.id);
      throw new AppError("EXPIRED", "This task has expired. Temporary files are deleted within one hour.");
    }

    return jsonOk({ job: toJobDto(job) });
  });
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return handleRoute(request, async () => {
    const { id } = await ctx.params;
    const sessionId = await getSessionId();

    const job = getJob(id);
    if (!job || !sessionId || !isJobOwner(job, sessionId)) {
      throw new AppError("JOB_NOT_FOUND", "This task could not be found.");
    }

    removeJob(job.id);
    await deleteJobFiles(job.id).catch(() => undefined);
    return jsonOk({ ok: true });
  });
}
