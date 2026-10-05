"use client";

/**
 * Incremental page-thumbnail rendering (AGENTS.md §21, TDD §33).
 * Renders queued pages one at a time at small scale, caching documents per
 * file. Keeps memory bounded: one page rendered at a time, buffers copied
 * before handing to pdf.js (it transfers/detaches them).
 */
import { useEffect, useRef, useState } from "react";
import { loadPdfjs } from "@/services/pdf/pdfjs";

type PdfjsModule = Awaited<ReturnType<typeof loadPdfjs>>;
type PdfDoc = Awaited<ReturnType<Awaited<ReturnType<typeof loadPdfjs>>["getDocument"]>["promise"]>;

export interface ThumbRequest {
  fileId: string;
  pageNumber: number;
}

const THUMB_WIDTH_PX = 160;

export function usePdfThumbnails(
  files: { fileId: string; file: File }[],
  requests: ThumbRequest[],
) {
  const [thumbs, setThumbs] = useState<Map<string, string>>(new Map());
  const docCacheRef = useRef<Map<string, PdfDoc>>(new Map());
  const runIdRef = useRef(0);

  // Open documents lazily and cache per fileId.
  const getDoc = async (fileId: string): Promise<PdfDoc | null> => {
    const cached = docCacheRef.current.get(fileId);
    if (cached) return cached;
    const entry = files.find((f) => f.fileId === fileId);
    if (!entry) return null;
    try {
      const pdfjs = await loadPdfjs();
      const buffer = await entry.file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
      docCacheRef.current.set(fileId, doc);
      return doc;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const runId = ++runIdRef.current;
    let cancelled = false;

    const pump = async () => {
      for (const request of requests) {
        if (cancelled || runId !== runIdRef.current) return;
        const key = `${request.fileId}:${request.pageNumber}`;
        if (thumbs.has(key)) continue;

        const doc = await getDoc(request.fileId);
        if (cancelled || runId !== runIdRef.current) return;
        if (!doc || request.pageNumber > doc.numPages) continue;

        try {
          const page = await doc.getPage(request.pageNumber);
          if (cancelled || runId !== runIdRef.current) return;
          const base = page.getViewport({ scale: 1 });
          const scale = THUMB_WIDTH_PX / base.width;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          const context = canvas.getContext("2d");
          if (!context) return;
          await page.render({ canvasContext: context, viewport }).promise;
          if (cancelled || runId !== runIdRef.current) {
            canvas.width = 0;
            canvas.height = 0;
            return;
          }
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          canvas.width = 0;
          canvas.height = 0;
          setThumbs((prev) => new Map(prev).set(key, dataUrl));
        } catch {
          // Skip pages that fail to render; the label still shows.
        }
        // Yield to the UI thread between pages.
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    };

    void pump();
    return () => {
      cancelled = true;
    };
    // `thumbs` intentionally excluded: the pump reads a snapshot; new
    // thumbnails are merged via setThumbs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  // Cleanup document caches on unmount.
  useEffect(() => {
    const cache = docCacheRef.current;
    return () => {
      for (const doc of cache.values()) {
        void doc.destroy().catch(() => undefined);
      }
      cache.clear();
    };
  }, []);

  return {
    getThumbnail: (fileId: string, pageNumber: number) =>
      thumbs.get(`${fileId}:${pageNumber}`),
  };
}
