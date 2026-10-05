/**
 * POST /api/validate — server-side validation for the PDF to Image tool
 * (TDD §23: "server validation is mandatory"). The file is validated and
 * NOT stored: conversion happens client-side, so nothing touches disk.
 */
import { NextRequest } from "next/server";
import { limits } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { requireSessionId } from "@/lib/session";
import { validatePdfBuffer } from "@/services/pdf/validate";
import { enforceRateLimit, handleRoute, jsonOk } from "@/app/api/_lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  return handleRoute(request, async () => {
    enforceRateLimit(request, "validate");
    await requireSessionId();

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      throw new AppError("VALIDATION_ERROR", "No file was included in the upload.");
    }

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
    const validation = await validatePdfBuffer(buffer, { fileName: file.name });

    if (validation.pageCount > limits.maxTotalPages) {
      throw new AppError(
        "PAGE_LIMIT_EXCEEDED",
        `This PDF has ${validation.pageCount} pages. Up to ${limits.maxTotalPages} pages can be converted per task.`,
        { detail: file.name },
      );
    }

    return jsonOk({
      fileName: file.name,
      size: file.size,
      pageCount: validation.pageCount,
    });
  });
}
