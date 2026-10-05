/**
 * Server-side PDF validation (AGENTS.md §10/§11, TDD §23/§24).
 * Layers: signature → parse → encryption → page count. Reject before use.
 */
import { PDFDocument } from "pdf-lib";
import { AppError } from "@/lib/errors";

export interface PdfValidationResult {
  ok: boolean;
  pageCount: number;
}

/** Fast pre-check: real PDFs start with "%PDF-" within the first kilobyte. */
export function hasPdfSignature(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 1024).toString("latin1");
  return head.includes("%PDF-");
}

/**
 * Full validation: parses the document, rejects encrypted files and counts
 * pages. Throws AppError with precise categories — nothing is processed
 * before this passes.
 */
export async function validatePdfBuffer(
  buffer: Buffer,
  context: { jobId?: string; fileName?: string },
): Promise<PdfValidationResult> {
  if (!hasPdfSignature(buffer)) {
    throw new AppError(
      "UNSUPPORTED_FILE",
      "This file is not a valid PDF.",
      { detail: context.fileName, logContext: { reason: "missing_pdf_signature", ...context } },
    );
  }

  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(buffer, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isEncrypted =
      message.includes("encrypted") ||
      message.includes("password") ||
      message.includes("Input document to `PDFDocument.load` is encrypted");

    if (isEncrypted) {
      throw new AppError(
        "ENCRYPTED_PDF",
        "Password-protected PDFs are not currently supported. Please upload an unlocked PDF.",
        { detail: context.fileName, logContext: { reason: "encrypted", ...context } },
        err,
      );
    }
    throw new AppError(
      "CORRUPTED_FILE",
      "We couldn't read this PDF. It may be corrupted or unsupported.",
      { detail: context.fileName, logContext: { reason: "parse_failed", ...context } },
      err,
    );
  }

  try {
    if (pdf.isEncrypted) {
      throw new AppError(
        "ENCRYPTED_PDF",
        "Password-protected PDFs are not currently supported. Please upload an unlocked PDF.",
        { detail: context.fileName, logContext: { reason: "encrypted", ...context } },
      );
    }

    const pageCount = pdf.getPageCount();
    if (pageCount < 1) {
      throw new AppError(
        "CORRUPTED_FILE",
        "This PDF contains no pages and cannot be processed.",
        { detail: context.fileName, logContext: { reason: "zero_pages", ...context } },
      );
    }
    return { ok: true, pageCount };
  } catch (err) {
    // pdf-lib can throw lazily on structurally broken files (even TypeErrors)
    // when the page tree is accessed — map everything to a safe category.
    if (err instanceof AppError) throw err;
    throw new AppError(
      "CORRUPTED_FILE",
      "We couldn't read this PDF. It may be corrupted or unsupported.",
      { detail: context.fileName, logContext: { reason: "structure_failed", ...context } },
      err,
    );
  }
}
