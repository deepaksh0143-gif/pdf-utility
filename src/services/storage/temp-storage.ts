/**
 * Temporary storage service (TDD §21).
 * Layout: {tmpRoot}/{jobId}/input | output. Every path is scoped to a job
 * and all reads are name-checked to prevent path traversal.
 */
import { mkdir, rm, writeFile, readFile, stat } from "node:fs/promises";

import path from "node:path";
import { tmpRoot } from "@/lib/config";

export type StorageArea = "input" | "output";

function jobDir(jobId: string): string {
  return path.join(tmpRoot(), safeSegment(jobId));
}

function areaDir(jobId: string, area: StorageArea): string {
  return path.join(jobDir(jobId), area);
}

/** Only allow ids/names made of safe characters — blocks traversal. */
function safeSegment(segment: string): string {
  if (!/^[A-Za-z0-9._-]{1,120}$/.test(segment)) {
    throw new Error("Invalid storage path segment");
  }
  return segment;
}

export async function ensureJobDirs(jobId: string): Promise<void> {
  await mkdir(areaDir(jobId, "input"), { recursive: true });
  await mkdir(areaDir(jobId, "output"), { recursive: true });
}

export async function writeInputFile(
  jobId: string,
  fileId: string,
  data: Buffer,
): Promise<string> {
  const target = path.join(areaDir(jobId, "input"), safeSegment(fileId));
  await writeFile(target, data);
  return target;
}

export async function writeOutputFile(
  jobId: string,
  filename: string,
  data: Buffer | Uint8Array,
): Promise<string> {
  const target = path.join(areaDir(jobId, "output"), safeSegment(filename));
  await writeFile(target, data);
  return target;
}

export async function readOutputFile(
  jobId: string,
  filename: string,
): Promise<Buffer> {
  const target = path.join(areaDir(jobId, "output"), safeSegment(filename));
  return readFile(target);
}

export async function outputFileSize(
  jobId: string,
  filename: string,
): Promise<number> {
  const target = path.join(areaDir(jobId, "output"), safeSegment(filename));
  const s = await stat(target);
  return s.size;
}

export async function readInputFile(
  jobId: string,
  fileId: string,
): Promise<Buffer> {
  const target = path.join(areaDir(jobId, "input"), safeSegment(fileId));
  return readFile(target);
}

/** Removes one staged input file (idempotent). */
export async function deleteInputFile(
  jobId: string,
  fileId: string,
): Promise<void> {
  const target = path.join(areaDir(jobId, "input"), safeSegment(fileId));
  await rm(target, { force: true });
}

/** Removes an entire job directory. Idempotent. */
export async function deleteJobFiles(jobId: string): Promise<void> {
  await rm(jobDir(jobId), { recursive: true, force: true });
}
