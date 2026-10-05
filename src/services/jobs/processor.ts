/**
 * Job processing orchestrator (TDD §11/§17/§19/§20).
 * Runs generation with accurate progress reporting, cancellation checks
 * between pages, and guaranteed temp-file cleanup on failure/cancellation.
 */
import { logger } from "@/lib/logging";
import { AppError } from "@/lib/errors";
import { limits } from "@/lib/config";
import {
  countQueuedJobs,
  countRunningJobs,
  failJob,
  getJob,
  isCancelRequested,
  markCancelled,
  requestCancel,
  setStatus,
  updateProgress,
  completeJob,
} from "./job-registry";
import {
  ensureJobDirs,
  readInputFile,
  writeOutputFile,
  outputFileSize,
  deleteJobFiles,
} from "@/services/storage/temp-storage";
import {
  generateMergedPdf,
  MergeCancelledError,
} from "@/services/pdf/merge-engine";
import { hasPdfSignature } from "@/services/pdf/validate";
import type { FinalPageInstruction, PageSizeOption } from "@/types/pages";

const PROCESS_TIMEOUT_MS = 120_000;

interface QueuedRun {
  jobId: string;
  sessionId: string;
  type: "merge" | "extract";
  fileIds: string[];
  instructions: FinalPageInstruction[];
  pageSize: PageSizeOption;
  /** Display name for the download header. */
  outputFilename: string;
  /** Filesystem-safe name used inside temp storage. */
  outputStorageName: string;
}

// Pinned to globalThis so dev-server HMR rebuilds cannot orphan queued
// runs or start a second drain loop on the same process.
const queueStore = globalThis as typeof globalThis & {
  __pdfJobQueue?: QueuedRun[];
  __pdfQueueDraining?: boolean;
};
const queue = (queueStore.__pdfJobQueue ??= []);

/**
 * Places a job on the processing queue. Policy checks (session job rule,
 * server capacity) are enforced by the API route before calling this.
 */
export function enqueueJob(run: QueuedRun): void {
  queue.push(run);
  void drain();
}

async function drain(): Promise<void> {
  if (queueStore.__pdfQueueDraining) return;
  queueStore.__pdfQueueDraining = true;
  try {
    while (queue.length > 0) {
      if (countRunningJobs() >= limits.maxConcurrentJobs) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      const run = queue.shift();
      if (!run) continue;
      // Fire-and-forget: the client polls job status via GET /api/jobs/:id.
      void processJob(run);
    }
  } finally {
    queueStore.__pdfQueueDraining = false;
  }
}

function assertNotCancelled(jobId: string): void {
  if (isCancelRequested(jobId)) {
    throw new MergeCancelledError();
  }
}

/**
 * Reads a job input file and re-checks the PDF signature. Inputs stay in
 * the session's staging area for the whole editor session (single copy —
 * jobs never consume them, so regenerating or retrying just works);
 * full parse/encryption validation already happened at upload time.
 */
async function loadSourceBytes(
  sessionId: string,
  fileId: string,
): Promise<Buffer> {
  const bytes = await readInputFile(sessionId, fileId);
  if (!hasPdfSignature(bytes)) {
    throw new AppError(
      "CORRUPTED_FILE",
      "We couldn't read one of the uploaded files anymore. Please start again.",
      { logContext: { sessionId, fileId } },
    );
  }
  return bytes;
}

async function processJob(run: QueuedRun): Promise<void> {
  const { jobId } = run;
  const startedAt = Date.now();
  // Processing timeout: flags cancellation so the engine stops safely (TDD §25).
  const timeout = setTimeout(() => requestCancel(jobId), PROCESS_TIMEOUT_MS);

  try {
    setStatus(jobId, "PROCESSING");
    updateProgress(
      jobId,
      { currentStep: "read", detail: "Reading source PDFs", percent: 5 },
      { upload: "done", read: "active" },
    );

    const sources = new Map<string, { bytes: Buffer }>();
    for (const fileId of run.fileIds) {
      assertNotCancelled(jobId);
      // Skip files that no instruction references (extract tool).
      if (!run.instructions.some((i) => i.sourceFileId === fileId)) continue;
      sources.set(fileId, {
        bytes: await loadSourceBytes(run.sessionId, fileId),
      });
    }

    updateProgress(
      jobId,
      { percent: 25, currentStep: "assemble", detail: undefined },
      { read: "done", assemble: "active" },
    );
    assertNotCancelled(jobId);

    const outputBytes = await generateMergedPdf(
      sources,
      run.instructions,
      { pageSize: run.pageSize },
      {
        // Accurate, measurable progress between 25% and 85% (AGENTS.md §13).
        onPage: (done, total) => {
          const percent = 25 + Math.round((done / total) * 60);
          updateProgress(jobId, {
            percent,
            detail: `Processing page ${done} of ${total}`,
          });
        },
      },
    );

    setStatus(jobId, "GENERATING");
    updateProgress(
      jobId,
      { currentStep: "finalize", percent: 92, detail: undefined },
      { assemble: "done", finalize: "active" },
    );
    assertNotCancelled(jobId);
    await ensureJobDirs(jobId); // job output directory
    await writeOutputFile(jobId, run.outputStorageName, outputBytes);
    const sizeBytes = await outputFileSize(jobId, run.outputStorageName);

    completeJob(jobId, [
      {
        fileId: run.outputStorageName,
        filename: run.outputFilename,
        sizeBytes,
      },
    ]);
    updateProgress(
      jobId,
      { currentStep: "done", percent: 100, detail: undefined },
      { finalize: "done", done: "done" },
    );
    logger.info("job.completed", {
      jobId,
      type: run.type,
      pages: run.instructions.length,
      outputBytes: sizeBytes,
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    await cleanupFailedJob(jobId, run, err);
  } finally {
    clearTimeout(timeout);
    run.instructions = []; // Release references promptly (AGENTS.md §21).
  }
}

async function cleanupFailedJob(
  jobId: string,
  run: QueuedRun,
  err: unknown,
): Promise<void> {
  if (err instanceof MergeCancelledError || isCancelRequested(jobId)) {
    // Cancel: stop safely and clean this job's own temp output. Staged
    // inputs stay in the session area so the editor remains usable; they
    // are deleted by the one-hour sweeper or when the user removes them.
    await deleteJobFiles(jobId).catch(() => undefined);
    markCancelled(jobId);
    logger.info("job.cancelled", { jobId, type: run.type });
    return;
  }

  const errorDto =
    err instanceof AppError
      ? {
          code: err.code,
          message: err.userMessage,
          ...(err.detail ? { detail: err.detail } : {}),
        }
      : {
          code: "PROCESSING_FAILED" as const,
          message:
            "Processing couldn't be completed. Your original files have not been changed.",
        };

  await deleteJobFiles(jobId).catch(() => undefined);
  failJob(jobId, errorDto);
  logger.error("job.failed", {
    jobId,
    type: run.type,
    code: errorDto.code,
    message: err instanceof Error ? err.message : String(err),
  });
}

export { countQueuedJobs, countRunningJobs };
