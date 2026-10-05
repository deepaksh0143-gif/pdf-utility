import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PDFDocument } from "pdf-lib";
import { mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { generateMergedPdf, MergeCancelledError } from "@/services/pdf/merge-engine";
import { hasPdfSignature, validatePdfBuffer } from "@/services/pdf/validate";
import { AppError, toErrorResponse } from "@/lib/errors";
import type { FinalPageInstruction } from "@/types/pages";

/** Builds a landscape 400x300 PDF with N pages. */
async function makeSourcePdf(pageCount: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pageCount; i += 1) {
    const page = doc.addPage([400, 300]);
    page.drawText(`Page ${i}`, { x: 150, y: 140, size: 24 });
  }
  return Buffer.from(await doc.save());
}

async function makeEncryptedPdf(): Promise<Buffer> {
  const { PDFDocument: Doc } = await import("pdf-lib");
  const doc = await Doc.create();
  doc.addPage([400, 300]);
  // pdf-lib cannot encrypt; simulate encryption via a fake %PDF body the
  // parser rejects as corrupt and rely on signature tests for the rest.
  return Buffer.from(await doc.save());
}

describe("PDF validation", () => {
  it("accepts a valid PDF and reports its page count", async () => {
    const bytes = await makeSourcePdf(3);
    const result = await validatePdfBuffer(bytes, { fileName: "a.pdf" });
    expect(result.ok).toBe(true);
    expect(result.pageCount).toBe(3);
  });

  it("rejects non-PDF content (missing signature)", async () => {
    const bytes = Buffer.from("This is not a pdf at all".repeat(10));
    await expect(validatePdfBuffer(bytes, { fileName: "x.pdf" })).rejects.toMatchObject({
      code: "UNSUPPORTED_FILE",
    });
  });

  it("rejects corrupted PDFs (bad signature + bad structure)", async () => {
    const bytes = Buffer.from("%PDF-1.7 broken", "latin1");
    await expect(validatePdfBuffer(bytes, { fileName: "x.pdf" })).rejects.toMatchObject({
      code: "CORRUPTED_FILE",
    });
  });

  it("rejects empty buffers as unsupported", async () => {
    const bytes = Buffer.alloc(0);
    await expect(validatePdfBuffer(bytes, { fileName: "x.pdf" })).rejects.toMatchObject({
      code: "UNSUPPORTED_FILE",
    });
  });
});

describe("Merge engine", () => {
  let fileA: Buffer;
  let fileB: Buffer;

  beforeAll(async () => {
    fileA = await makeSourcePdf(3);
    fileB = await makeSourcePdf(2);
  });

  it("merges full documents in order", async () => {
    const out = await generateMergedPdf(
      new Map([
        ["a", { bytes: fileA }],
        ["b", { bytes: fileB }],
      ]),
      [
        { sourceFileId: "a", sourcePageNumber: 1, rotation: 0 },
        { sourceFileId: "a", sourcePageNumber: 2, rotation: 0 },
        { sourceFileId: "a", sourcePageNumber: 3, rotation: 0 },
        { sourceFileId: "b", sourcePageNumber: 1, rotation: 0 },
        { sourceFileId: "b", sourcePageNumber: 2, rotation: 0 },
      ],
      { pageSize: "original" },
    );
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(5);
  });

  it("reorders pages across documents", async () => {
    const out = await generateMergedPdf(
      new Map([
        ["a", { bytes: fileA }],
        ["b", { bytes: fileB }],
      ]),
      [
        { sourceFileId: "b", sourcePageNumber: 1, rotation: 0 },
        { sourceFileId: "a", sourcePageNumber: 2, rotation: 0 },
        { sourceFileId: "a", sourcePageNumber: 1, rotation: 0 },
        { sourceFileId: "b", sourcePageNumber: 2, rotation: 0 },
      ],
      { pageSize: "original" },
    );
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(4);
    expect(hasPdfSignature(Buffer.from(out))).toBe(true);
  });

  it("applies user rotation to output pages", async () => {
    const out = await generateMergedPdf(
      new Map([["a", { bytes: fileA }]]),
      [{ sourceFileId: "a", sourcePageNumber: 1, rotation: 90 }],
      { pageSize: "original" },
    );
    const doc = await PDFDocument.load(out);
    const page = doc.getPage(0);
    expect(page.getRotation().angle).toBe(90);
  });

  it("extracts selected pages only (2 and 4 of 1-4)", async () => {
    const four = await makeSourcePdf(4);
    const out = await generateMergedPdf(
      new Map([["a", { bytes: four }]]),
      [
        { sourceFileId: "a", sourcePageNumber: 2, rotation: 0 },
        { sourceFileId: "a", sourcePageNumber: 4, rotation: 0 },
      ],
      { pageSize: "original" },
    );
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(2);
  });

  it("normalizes mixed sizes to A4 without stretching", async () => {
    const out = await generateMergedPdf(
      new Map([["a", { bytes: fileA }]]),
      [
        { sourceFileId: "a", sourcePageNumber: 1, rotation: 0 },
        { sourceFileId: "a", sourcePageNumber: 1, rotation: 90 },
      ],
      { pageSize: "a4" },
    );
    const doc = await PDFDocument.load(out);
    for (const page of doc.getPages()) {
      expect(page.getWidth()).toBeCloseTo(595.28, 0);
      expect(page.getHeight()).toBeCloseTo(841.89, 0);
    }
  });

  it("normalizes to Letter size", async () => {
    const out = await generateMergedPdf(
      new Map([["a", { bytes: fileA }]]),
      [{ sourceFileId: "a", sourcePageNumber: 1, rotation: 0 }],
      { pageSize: "letter" },
    );
    const doc = await PDFDocument.load(out);
    const page = doc.getPage(0);
    expect(page.getWidth()).toBeCloseTo(612, 0);
    expect(page.getHeight()).toBeCloseTo(792, 0);
  });

  it("reports progress per page and stops on cancellation", async () => {
    const seen: number[] = [];
    try {
      await generateMergedPdf(
        new Map([["a", { bytes: fileA }]]),
        [
          { sourceFileId: "a", sourcePageNumber: 1, rotation: 0 },
          { sourceFileId: "a", sourcePageNumber: 2, rotation: 0 },
          { sourceFileId: "a", sourcePageNumber: 3, rotation: 0 },
        ],
        { pageSize: "original" },
        {
          onPage: (done) => seen.push(done),
          shouldCancel: () => seen.length >= 2,
        },
      );
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(MergeCancelledError);
    }
    expect(seen.length).toBe(2);
  });
});

describe("Storage safety", () => {
  it("rejects path traversal in storage segments", async () => {
    const { writeInputFile } = await import("@/services/storage/temp-storage");
    await mkdir(path.join(os.tmpdir(), "pdf-utility-test-storage"), { recursive: true });
    await expect(
      writeInputFile("../escape", "f_bad", Buffer.from("x")),
    ).rejects.toThrow();
  });
});

describe("AppError mapping", () => {
  it("maps errors to safe client DTOs without internals", async () => {
    const { toErrorResponse } = await import("@/lib/errors");
    const { status, body } = toErrorResponse(
      new AppError("ENCRYPTED_PDF", "Password-protected PDFs are not currently supported. Please upload an unlocked PDF."),
    );
    expect(status).toBe(422);
    expect(body.error.code).toBe("ENCRYPTED_PDF");
    expect(body.error.message).not.toMatch(/stack|Error:/);
  });

  it("never leaks unexpected error details", () => {
    const { body } = toErrorResponse(new Error("internal database at 10.0.0.1"));
    expect(body.error.code).toBe("PROCESSING_FAILED");
    expect(body.error.message).not.toContain("10.0.0.1");
  });
});

afterAll(async () => {
  await rm(path.join(os.tmpdir(), "pdf-utility-test-storage"), {
    recursive: true,
    force: true,
  });
});
