"use client";

/**
 * pdf.js setup (TDD §5). Loaded lazily so it never runs during server
 * rendering or on pages that don't need it. The worker is served
 * same-origin from /public (copied by the postinstall script).
 */
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

export function loadPdfjs(): Promise<typeof import("pdfjs-dist")> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return lib;
    });
  }
  return pdfjsPromise;
}
