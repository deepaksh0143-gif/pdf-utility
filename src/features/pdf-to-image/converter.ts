"use client";

/**
 * Client-side PDF→Image conversion engine (TDD §14/§22).
 * Render page → encode → hand off → release → next page. Never keeps all
 * high-resolution bitmaps in memory simultaneously.
 */
import { loadPdfjs } from "@/services/pdf/pdfjs";
import {
  IMAGE_QUALITY_PRESETS,
  imageExtension,
  imageMimeType,
  type ImageFormat,
  type ImageQuality,
} from "@/types/image";

export interface ConvertedImage {
  pageNumber: number;
  blob: Blob;
  url: string;
  filename: string;
}

export interface ConversionHooks {
  onPageCompleted?: (completed: number, total: number, image: ConvertedImage) => void;
  shouldCancel?: () => boolean;
}

export class ConversionCancelledError extends Error {
  constructor() {
    super("Conversion cancelled");
    this.name = "ConversionCancelledError";
  }
}

function baseName(name: string): string {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  return stem.replace(/[/\\?%*:|"<>]/g, "").trim() || "document";
}

/**
 * Converts every page of the given PDF to the requested format/quality.
 * `onPageCompleted` receives each image as soon as it is ready so the UI
 * can show results progressively and store them (downloads/ZIP) without
 * holding the rendering state.
 */
export async function convertPdfToImages(
  data: ArrayBuffer,
  sourceName: string,
  format: ImageFormat,
  quality: ImageQuality,
  hooks: ConversionHooks = {},
): Promise<void> {
  const copied = new Uint8Array(data.slice(0));
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: copied }).promise;
  const preset = IMAGE_QUALITY_PRESETS[quality];
  const extension = imageExtension(format);
  const base = baseName(sourceName);

  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      if (hooks.shouldCancel?.()) throw new ConversionCancelledError();

      const page = await doc.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = preset.renderScale * (2 / baseViewport.width > 1 ? 1 : 1);
      // Render at roughly 144 DPI for high quality (2x a 72dpi baseline).
      const viewport = page.getViewport({ scale: preset.renderScale * 2 });

      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) {
        page.cleanup();
        throw new Error("Canvas is not supported in this browser.");
      }

      // White background so transparent PDFs export correctly as JPG.
      if (format === "jpg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      await page.render({ canvasContext: context, viewport }).promise;

      if (hooks.shouldCancel?.()) {
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
        throw new ConversionCancelledError();
      }

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (result) => resolve(result),
          imageMimeType(format),
          format === "png" ? undefined : preset.encoderQuality,
        );
      });

      // Release rendering memory immediately (AGENTS.md §22).
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();

      if (!blob) throw new Error("Image encoding failed.");
      const image: ConvertedImage = {
        pageNumber,
        blob,
        url: URL.createObjectURL(blob),
        filename: `${base}-page-${pageNumber}.${extension}`,
      };
      hooks.onPageCompleted?.(pageNumber, doc.numPages, image);
    }
  } finally {
    await doc.destroy().catch(() => undefined);
  }
}
