"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadPdfjs } from "@/services/pdf/pdfjs";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/**
 * Full PDF viewer (PRD §8): render pages of an ArrayBuffer-backed document
 * with zoom controls and page navigation. Renders lazily: only the current
 * page is drawn at full quality (AGENTS.md §21).
 */
export function PdfViewerModal({
  open,
  title,
  data,
  onClose,
}: {
  open: boolean;
  title: string;
  data: ArrayBuffer | null;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  type PdfDoc = Awaited<ReturnType<Awaited<ReturnType<typeof loadPdfjs>>["getDocument"]>["promise"]>;
  const docRef = useRef<PdfDoc | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [error, setError] = useState<string | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void; promise: Promise<unknown> } | null>(null);

  const loadDocument = useCallback(async () => {
    if (!data) return;
    setError(null);
    try {
      const pdfjs = await loadPdfjs();
      const copied = new Uint8Array(data.slice(0));
      const task = pdfjs.getDocument({ data: copied });
      const doc = await task.promise;
      docRef.current = doc;
      setNumPages(doc.numPages);
      setPageNumber(1);
    } catch {
      setError("This document can't be previewed.");
    }
  }, [data]);

  useEffect(() => {
    if (open) void loadDocument();
    return () => {
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      const doc = docRef.current;
      docRef.current = null;
      void doc?.destroy().catch(() => undefined);
    };
  }, [open, loadDocument]);

  useEffect(() => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || !open) return;

    let cancelled = false;
    const render = async () => {
      try {
        const page = await doc.getPage(pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext("2d");
        if (!context) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        renderTaskRef.current?.cancel();
        const task = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch {
        // Render cancelled or failed — the error state covers parse issues.
      }
    };
    void render();
    return () => {
      cancelled = true;
    };
  }, [open, pageNumber, scale]);

  return (
    <Modal open={open} title={`Preview: ${title}`} onClose={onClose}>
      {error ? (
        <p className="text-danger-600">{error}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
            >
              ◀ Prev
            </Button>
            <span className="text-sm text-ink-700" aria-live="polite">
              Page {pageNumber} of {numPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
            >
              Next ▶
            </Button>
            <span aria-hidden="true" className="mx-2 h-6 w-px bg-border" />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setScale((s) => Math.max(0.5, Number((s - 0.2).toFixed(2))))}
              disabled={scale <= 0.5}
              aria-label="Zoom out"
            >
              −
            </Button>
            <span className="text-sm text-ink-700">{Math.round(scale * 100)}%</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setScale((s) => Math.min(3, Number((s + 0.2).toFixed(2))))}
              disabled={scale >= 3}
              aria-label="Zoom in"
            >
              +
            </Button>
          </div>
          <div className="max-h-[60vh] overflow-auto rounded-xl border border-border bg-surface-muted p-3">
            <canvas ref={canvasRef} className="mx-auto block bg-white shadow" />
          </div>
        </div>
      )}
    </Modal>
  );
}
