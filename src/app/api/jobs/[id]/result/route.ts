/**
 * GET /api/jobs/:id/result — serves the generated PDF for download (TDD §29).
 * Owner-checked, expiry-checked, safe filename headers, no directory risk.
 */
import { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { getSessionId } from "@/lib/session";
import { getJob, isJobOwner } from "@/services/jobs/job-registry";
import { readOutputFile } from "@/services/storage/temp-storage";
import { enforceRateLimit, handleRoute } from "@/app/api/_lib/http";

export const runtime = "nodejs";

function contentDisposition(filename: string): string {
  // RFC 5987: encode non-ASCII; keep a plain fallback.
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return handleRoute(request, async () => {
    enforceRateLimit(request, "download");

    const { id } = await ctx.params;
    const sessionId = await getSessionId();

    const job = getJob(id);
    if (!job || !sessionId || !isJobOwner(job, sessionId)) {
      throw new AppError("JOB_NOT_FOUND", "This task could not be found.");
    }
    if (job.status !== "COMPLETED" || !job.resultFiles?.length) {
      throw new AppError(
        "VALIDATION_ERROR",
        "This task has no result available yet.",
      );
    }
    if (job.expiresAt <= Date.now()) {
      throw new AppError(
        "EXPIRED",
        "This file is no longer available because temporary files are automatically deleted after one hour.",
      );
    }

    const file = job.resultFiles[0];
    // fileId is the storage name; filename is the display name for headers.
    const bytes = await readOutputFile(id, file.fileId).catch(() => {
      throw new AppError(
        "EXPIRED",
        "This file is no longer available because temporary files are automatically deleted after one hour.",
      );
    });

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": contentDisposition(file.filename),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
