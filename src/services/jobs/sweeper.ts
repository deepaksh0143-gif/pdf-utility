/**
 * Automatic cleanup (AGENTS.md §16, TDD §21).
 * A single interval sweeps expired jobs: deletes input/output files and
 * registry entries. Idempotent — safe if invoked concurrently or restarted.
 */
import { limits } from "@/lib/config";
import { logger } from "@/lib/logging";
import { deleteJobFiles } from "@/services/storage/temp-storage";
import { findAndRemoveExpiredJobs } from "./job-registry";

// Pinned to globalThis: HMR re-evaluation must not spawn duplicate intervals.
const store = globalThis as typeof globalThis & {
  __pdfSweeperTimer?: NodeJS.Timeout | null;
};
let running = false;

export async function sweepOnce(now = Date.now()): Promise<number> {
  if (running) return 0;
  running = true;
  try {
    const expired = findAndRemoveExpiredJobs(now);
    for (const jobId of expired) {
      await deleteJobFiles(jobId).catch((err) => {
        logger.warn("sweep.delete_failed", {
          jobId,
          message: err instanceof Error ? err.message : String(err),
        });
      });
    }
    if (expired.length > 0) {
      logger.info("sweep.expired_jobs_removed", { count: expired.length });
    }
    return expired.length;
  } finally {
    running = false;
  }
}

/** Starts the background sweeper (idempotent). */
export function startSweeper(): void {
  if (store.__pdfSweeperTimer) return;
  const timer = setInterval(() => {
    void sweepOnce();
  }, limits.sweepIntervalMs);
  // Don't keep the process alive just for cleanup.
  timer.unref?.();
  store.__pdfSweeperTimer = timer;
}

export function stopSweeperForTests(): void {
  const timer = store.__pdfSweeperTimer;
  if (timer) {
    clearInterval(timer);
    store.__pdfSweeperTimer = null;
  }
}
