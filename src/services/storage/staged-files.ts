/**
 * Staged-file registry (storage concern, kept out of route handlers).
 * Tracks metadata for uploaded files so job creation can verify ownership
 * and page counts. Records are pruned after the job TTL; files themselves
 * are deleted from temp storage on removal/expiry.
 */
import { limits } from "@/lib/config";

export interface StagedFileMeta {
  sessionId: string;
  name: string;
  size: number;
  pageCount: number;
  stagedAt: number;
}

/** Pinned to globalThis so dev-server HMR rebuilds cannot lose records. */
const store = globalThis as typeof globalThis & {
  __pdfStagedFiles?: Map<string, StagedFileMeta>;
};
const stagedFiles = (store.__pdfStagedFiles ??= new Map<string, StagedFileMeta>());

/** Drops staged-file records older than the job TTL (1 hour). */
export function pruneStagedFiles(now = Date.now()): void {
  const cutoff = now - limits.jobTtlMs;
  for (const [fileId, meta] of stagedFiles) {
    if (meta.stagedAt < cutoff) stagedFiles.delete(fileId);
  }
}

export function addStagedFile(fileId: string, meta: StagedFileMeta): void {
  stagedFiles.set(fileId, meta);
}

export function getStagedFileMeta(fileId: string): StagedFileMeta | undefined {
  return stagedFiles.get(fileId);
}

export function removeStagedFile(fileId: string): void {
  stagedFiles.delete(fileId);
}

export function countSessionFiles(sessionId: string): number {
  let n = 0;
  for (const meta of stagedFiles.values()) {
    if (meta.sessionId === sessionId) n += 1;
  }
  return n;
}

export function getSessionFileIds(sessionId: string): string[] {
  const ids: string[] = [];
  for (const [fileId, meta] of stagedFiles) {
    if (meta.sessionId === sessionId) ids.push(fileId);
  }
  return ids;
}

/** Test hook. */
export function resetStagedFilesForTests(): void {
  stagedFiles.clear();
}
