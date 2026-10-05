/**
 * POST /api/jobs/:id/cancel — flags cooperative cancellation (TDD §20).
 * The processor checks the flag between pages, stops safely, cleans temp
 * files and marks the job CANCELLED.
 */
import { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { getSessionId } from "@/lib/session";
import { getJob, isJobOwner, requestCancel } from "@/services/jobs/job-registry";
import { handleRoute, jsonOk } from "@/app/api/_lib/http";

export const runtime = "nodejs";

export async function POST(
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

    const accepted = requestCancel(id);
    return jsonOk({ ok: accepted, status: getJob(id)?.status ?? "CANCELLED" });
  });
}
