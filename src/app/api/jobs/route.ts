/**
 * POST /api/jobs — creates a processing job from staged files + final page
 * instructions (TDD §17/§28). Enforces the one-active-job rule, server
 * capacity and ownership of every referenced file before enqueueing.
 */
import { NextRequest } from "next/server";
import { generateId } from "@/utils/id";
import { limits } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { requireSessionId } from "@/lib/session";
import { getStagedFileMeta } from "@/services/storage/staged-files";
import {
  countQueuedJobs,
  countRunningJobs,
  createJob,
  getJob,
  hasActiveJobForSession,
  isJobOwner,
} from "@/services/jobs/job-registry";
import { enqueueJob } from "@/services/jobs/processor";
import { startSweeper } from "@/services/jobs/sweeper";
import {
  enforceRateLimit,
  handleRoute,
  jsonOk,
  parseJsonBody,
} from "@/app/api/_lib/http";
import type { CreateJobRequest } from "@/types/api";
import type {
  FinalPageInstruction,
  PageSizeOption,
  Rotation,
} from "@/types/pages";
import type { JobDto } from "@/types/jobs";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_PAGE_SIZES: readonly PageSizeOption[] = ["original", "a4", "letter"];
const VALID_ROTATIONS: readonly Rotation[] = [0, 90, 180, 270];

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

export async function POST(request: NextRequest) {
  return handleRoute(request, async () => {
    enforceRateLimit(request, "jobs");
    const sessionId = await requireSessionId();

    const body = await parseJsonBody<CreateJobRequest>(request, 512 * 1024);

    if (body.type !== "merge" && body.type !== "extract") {
      throw new AppError("VALIDATION_ERROR", "Unknown job type.");
    }

    // One active job per session (PRD §22, AGENTS.md §24).
    if (hasActiveJobForSession(sessionId)) {
      throw new AppError(
        "SESSION_CONFLICT",
        "You already have a task in progress. Cancel or wait for it to finish before starting a new one.",
      );
    }

    // Server capacity guard (abuse protection, TDD §25).
    if (countRunningJobs() + countQueuedJobs() >= limits.maxConcurrentJobs * 8) {
      throw new AppError(
        "RATE_LIMITED",
        "The service is busy right now. Please try again in a moment.",
        { retryAfterSeconds: 30 },
      );
    }

    const fileIds = body.fileIds;
    if (
      !Array.isArray(fileIds) ||
      fileIds.length === 0 ||
      fileIds.length > limits.maxFilesPerSession
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        `A job needs between 1 and ${limits.maxFilesPerSession} PDF files.`,
      );
    }

    // Verify the session owns every referenced file (no cross-session reads).
    const fileMetas = fileIds.map((fileId) => {
      const meta = getStagedFileMeta(fileId);
      if (!meta || meta.sessionId !== sessionId) {
        throw new AppError(
          "VALIDATION_ERROR",
          "One of the selected files is no longer available. Please re-upload it.",
        );
      }
      return meta;
    });

    const rawInstructions = body.pages;
    if (
      !Array.isArray(rawInstructions) ||
      rawInstructions.length === 0 ||
      rawInstructions.length > limits.maxTotalPages
    ) {
      throw new AppError(
        "PAGE_LIMIT_EXCEEDED",
        `Choose between 1 and ${limits.maxTotalPages} pages for the final document.`,
      );
    }

    // Validate instructions strictly (defense in depth against bad clients).
    const validated: FinalPageInstruction[] = rawInstructions.map(
      (instr: FinalPageInstruction) => {
        const fileIndex = fileIds.indexOf(instr.sourceFileId);
        if (fileIndex === -1) {
          throw new AppError(
            "VALIDATION_ERROR",
            "The final document references a file that wasn't uploaded in this session.",
          );
        }
        const meta = fileMetas[fileIndex];
        if (!VALID_ROTATIONS.includes(instr.rotation)) {
          throw new AppError(
            "VALIDATION_ERROR",
            "The final document contains an invalid page rotation.",
          );
        }
        if (
          !Number.isInteger(instr.sourcePageNumber) ||
          instr.sourcePageNumber < 1 ||
          instr.sourcePageNumber > meta.pageCount
        ) {
          throw new AppError(
            "PAGE_LIMIT_EXCEEDED",
            "The final document references a page that doesn't exist in the uploaded file.",
          );
        }
        return {
          sourceFileId: instr.sourceFileId,
          sourcePageNumber: instr.sourcePageNumber,
          rotation: instr.rotation,
        };
      },
    );

    const pageSize: PageSizeOption = VALID_PAGE_SIZES.includes(
      body.pageSize ?? "original",
    )
      ? (body.pageSize ?? "original")
      : "original";

    // Build a safe output filename server-side: a display name for the
    // download header and a filesystem-safe name for temp storage.
    const rawName =
      typeof body.outputFilename === "string" ? body.outputFilename : "";
    const cleanedBase =
      rawName.replace(/[/\\?%*:|"<>\u0000-\u001f]/g, "").replace(/\.pdf$/i, "").trim().slice(0, 80) ||
      "merged-document";
    const outputFilename = `${cleanedBase}.pdf`;
    const outputStorageName = `${
      cleanedBase.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") ||
      "merged-document"
    }.pdf`;

    const steps = [
      { id: "upload", label: "Files uploaded" },
      { id: "read", label: "Reading pages" },
      { id: "assemble", label: "Assembling document" },
      { id: "finalize", label: "Preparing output" },
      { id: "done", label: "Ready" },
    ];

    const jobId = generateId("job");

    // Inputs remain in the session's staging area (single copy — never
    // consumed), so retrying or generating again needs no re-upload. The
    // job directory holds only this run's output and is swept within the
    // hour (AGENTS.md §7: originals are never modified).
    createJob({
      id: jobId,
      sessionId,
      type: body.type,
      steps,
      inputFileIds: fileIds,
    });
    startSweeper();

    enqueueJob({
      jobId,
      sessionId,
      type: body.type,
      fileIds,
      instructions: validated,
      pageSize,
      outputFilename,
      outputStorageName,
    });

    const job = getJob(jobId);
    if (!job) {
      throw new AppError("PROCESSING_FAILED", "Could not start the job.");
    }
    return jsonOk({ job: toJobDto(job) }, { status: 201 });
  });
}
