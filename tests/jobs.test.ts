import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  createJob,
  getJob,
  hasActiveJobForSession,
  requestCancel,
  markCancelled,
  failJob,
  completeJob,
  isCancelRequested,
  findAndRemoveExpiredJobs,
  resetJobsForTests,
  countRunningJobs,
} from "@/services/jobs/job-registry";
import {
  checkRateLimit,
  resetRateLimiterForTests,
} from "@/lib/rate-limit";
import { sweepOnce, stopSweeperForTests } from "@/services/jobs/sweeper";
import {
  deleteJobFiles,
  writeInputFile,
  ensureJobDirs,
} from "@/services/storage/temp-storage";
import { buildFilename, sanitizeBaseName, stripExtension } from "@/utils/filename";

const STEPS = [
  { id: "upload", label: "Files uploaded" },
  { id: "read", label: "Reading pages" },
];

describe("Job registry", () => {
  beforeEach(() => resetJobsForTests());

  it("creates a job with QUEUED status and 1h expiry", () => {
    const job = createJob({
      id: "job_test1",
      sessionId: "s1",
      type: "merge",
      steps: STEPS,
      inputFileIds: ["f1"],
    });
    expect(job.status).toBe("QUEUED");
    expect(job.expiresAt - job.createdAt).toBeLessThanOrEqual(3_600_000);
    expect(job.progress.steps.map((s) => s.state)).toEqual([
      "active",
      "pending",
    ]);
  });

  it("enforces the one-active-job rule per session", () => {
    createJob({
      id: "job_test2",
      sessionId: "s2",
      type: "merge",
      steps: STEPS,
      inputFileIds: [],
    });
    expect(hasActiveJobForSession("s2")).toBe(true);
    expect(hasActiveJobForSession("s3")).toBe(false);

    // Terminal statuses free the session slot.
    const job = getJob("job_test2")!;
    completeJob("job_test2", [
      { fileId: "merged.pdf", filename: "merged.pdf", sizeBytes: 10 },
    ]);
    expect(job.status).toBe("COMPLETED");
    expect(hasActiveJobForSession("s2")).toBe(false);
  });

  it("supports cooperative cancellation flow", () => {
    createJob({
      id: "job_test3",
      sessionId: "s1",
      type: "merge",
      steps: STEPS,
      inputFileIds: [],
    });
    expect(requestCancel("job_test3")).toBe(true);
    expect(isCancelRequested("job_test3")).toBe(true);
    expect(getJob("job_test3")!.status).toBe("CANCELLING");

    markCancelled("job_test3");
    expect(getJob("job_test3")!.status).toBe("CANCELLED");
    expect(hasActiveJobForSession("s1")).toBe(false);
  });

  it("tracks failure and running counts", () => {
    createJob({
      id: "job_test4",
      sessionId: "s1",
      type: "merge",
      steps: STEPS,
      inputFileIds: [],
    });
    failJob("job_test4", { code: "PROCESSING_FAILED", message: "x" });
    expect(getJob("job_test4")!.status).toBe("FAILED");
    expect(getJob("job_test4")!.error!.code).toBe("PROCESSING_FAILED");
    expect(countRunningJobs()).toBe(0);
  });
});

describe("Rate limiter", () => {
  beforeEach(() => resetRateLimiterForTests());

  it("allows requests below the limit and blocks above it", () => {
    const ip = "1.2.3.4";
    // validate limit is 10/min by default.
    for (let i = 0; i < 10; i += 1) {
      expect(checkRateLimit(ip, "validate").allowed).toBe(true);
    }
    const blocked = checkRateLimit(ip, "validate");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks route classes and IPs independently", () => {
    checkRateLimit("1.1.1.1", "validate");
    checkRateLimit("2.2.2.2", "validate");
    const result = checkRateLimit("1.1.1.1", "upload");
    expect(result.allowed).toBe(true);
  });

  it("resets the window after it elapses", () => {
    const ip = "5.5.5.5";
    const now = Date.now();
    for (let i = 0; i < 10; i += 1) checkRateLimit(ip, "validate", now);
    expect(checkRateLimit(ip, "validate", now).allowed).toBe(false);
    // Next window.
    expect(checkRateLimit(ip, "validate", now + 61_000).allowed).toBe(true);
  });
});

describe("Sweeper / temporary storage", () => {
  beforeEach(() => resetJobsForTests());
  afterEach(() => stopSweeperForTests());

  it("deletes expired jobs and their files idempotently", async () => {
    const jobId = "job_expiry";
    createJob({
      id: jobId,
      sessionId: "s-exp",
      type: "merge",
      steps: STEPS,
      inputFileIds: [],
    });
    await ensureJobDirs(jobId);
    await writeInputFile(jobId, "f_demo", Buffer.from("%PDF-fake"));

    // Force expiry into the past.
    const job = getJob(jobId)!;
    job.createdAt = Date.now() - 3_700_000;
    job.expiresAt = Date.now() - 100_000;

    const removed = await sweepOnce();
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(getJob(jobId)).toBeUndefined();

    // Idempotent: second run removes nothing more for this job.
    const again = await sweepOnce();
    expect(again).toBe(0);
  });
});

describe("Filename utilities", () => {
  it("strips known extensions", () => {
    expect(stripExtension("report.pdf")).toBe("report");
    expect(stripExtension("photos.zip")).toBe("photos");
    expect(stripExtension("my.v2.file")).toBe("my.v2.file");
  });

  it("sanitizes dangerous characters", () => {
    expect(sanitizeBaseName('bad:name*?.pdf')).toBe("badname.pdf");
    expect(sanitizeBaseName("../../etc/passwd")).toBe("etcpasswd");
  });

  it("builds safe final filenames", () => {
    expect(buildFilename("My Report", "pdf")).toBe("My Report.pdf");
    expect(buildFilename("report.pdf", "pdf")).toBe("report.pdf");
    expect(buildFilename("*.bad:name", "zip")).toBe("badname.zip");
  });
});
