/**
 * POST /api/uploads — receives one PDF, validates it server-side and stages
 * it under the caller's session (TDD §22/§23). Rejects invalid files BEFORE
 * any expensive processing. DELETE removes a staged file the user discarded.
 */
import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { rm } from "node:fs/promises";
import { limits, tmpRoot } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { requireSessionId } from "@/lib/session";
import { ensureJobDirs, writeInputFile } from "@/services/storage/temp-storage";
import {
  addStagedFile,
  countSessionFiles,
  getStagedFileMeta,
  pruneStagedFiles,
  removeStagedFile,
} from "@/services/storage/staged-files";
import { validatePdfBuffer } from "@/services/pdf/validate";
import { enforceRateLimit, handleRoute, jsonOk } from "@/app/api/_lib/http";
import type { UploadedFileInfo } from "@/types/files";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  return handleRoute(request, async () => {
    enforceRateLimit(request, "upload");

    const sessionId = await requireSessionId();
    pruneStagedFiles();

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      throw new AppError("VALIDATION_ERROR", "No file was included in the upload.");
    }

    // Layer 2 validation — server-side, independent of the browser (TDD §23).
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      throw new AppError("UNSUPPORTED_FILE", "Only PDF files are supported.", {
        detail: file.name,
      });
    }
    if (file.size > limits.maxFileSizeMb * 1024 * 1024) {
      throw new AppError(
        "FILE_TOO_LARGE",
        `This file is larger than the ${limits.maxFileSizeMb} MB limit.`,
        { detail: file.name },
      );
    }
    if (file.size === 0) {
      throw new AppError("CORRUPTED_FILE", "This file is empty.", {
        detail: file.name,
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength !== file.size) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Upload size mismatch. Please retry.",
        { detail: file.name },
      );
    }

    const existingCount = countSessionFiles(sessionId);
    if (existingCount >= limits.maxFilesPerSession) {
      throw new AppError(
        "VALIDATION_ERROR",
        `You can merge up to ${limits.maxFilesPerSession} PDFs per session. Remove a file first.`,
        { detail: file.name },
      );
    }

    // Files are staged under the session id as the job directory. All path
    // segments are generated server-side (no client-controlled paths).
    const jobId = sessionId;
    await ensureJobDirs(jobId);
    const validation = await validatePdfBuffer(buffer, { fileName: file.name });

    const fileId = `f_${randomBytes(8).toString("hex")}`;
    await writeInputFile(jobId, fileId, buffer);
    addStagedFile(fileId, {
      sessionId,
      name: file.name,
      size: file.size,
      pageCount: validation.pageCount,
      stagedAt: Date.now(),
    });

    const info: UploadedFileInfo = {
      fileId,
      name: file.name,
      size: file.size,
      pageCount: validation.pageCount,
    };
    return jsonOk({ file: info });
  });
}

/** DELETE /api/uploads?fileId=... — removes a file the user discarded. */
export async function DELETE(request: NextRequest) {
  return handleRoute(request, async () => {
    enforceRateLimit(request, "upload");
    const sessionId = await requireSessionId();
    const fileId = request.nextUrl.searchParams.get("fileId") ?? "";
    const meta = getStagedFileMeta(fileId);

    if (!meta || meta.sessionId !== sessionId) {
      throw new AppError("FILE_NOT_FOUND", "That file is no longer available.");
    }

    removeStagedFile(fileId);
    if (/^[A-Za-z0-9._-]{1,120}$/.test(fileId)) {
      await rm(path.join(tmpRoot(), sessionId, "input", fileId), {
        force: true,
      }).catch(() => undefined);
    }
    return jsonOk({ ok: true });
  });
}
