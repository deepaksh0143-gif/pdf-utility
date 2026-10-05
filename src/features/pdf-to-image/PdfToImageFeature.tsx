"use client";

/**
 * PDF to Image feature (PRD §14–§18).
 * Flow: upload → server validation → preview → format + quality → convert
 * → gallery preview → individual / ZIP download. Conversion runs in the
 * browser page-by-page; nothing is stored on the server.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { UploadZone } from "@/components/upload/UploadZone";
import { PdfViewerModal } from "@/components/pdf/PdfViewerModal";
import { ErrorAlert } from "@/components/processing/ProcessingPanel";
import { validateOnServer } from "@/services/api/validate-api";
import { ApiError } from "@/services/api/jobs-api";
import {
  convertPdfToImages,
  ConversionCancelledError,
  type ConvertedImage,
} from "./converter";
import { clientLimits } from "@/lib/client-config";
import {
  IMAGE_FORMATS,
  IMAGE_FORMAT_LABELS,
  IMAGE_QUALITIES,
  imageExtension,
  type ImageFormat,
  type ImageQuality,
} from "@/types/image";
import type { AppErrorDto } from "@/types/errors";
import { buildFilename } from "@/utils/filename";

type Phase = "upload" | "ready" | "converting" | "done";

const QUALITY_LABELS: Record<ImageQuality, { title: string; text: string }> = {
  low: { title: "Low", text: "Smaller file size" },
  medium: { title: "Medium", text: "Balanced quality and size" },
  high: { title: "High", text: "Best quality, larger files" },
};

export function PdfToImageFeature() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [error, setError] = useState<AppErrorDto | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<{
    pageCount: number;
  } | null>(null);
  const [format, setFormat] = useState<ImageFormat>("jpg");
  const [quality, setQuality] = useState<ImageQuality>("medium");
  const [images, setImages] = useState<ConvertedImage[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [zipBaseName, setZipBaseName] = useState("document-images");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const cancelFlagRef = useRef(false);
  const objectUrlsRef = useRef<string[]>([]);

  const completed = phase === "done" || phase === "converting";

  // Revoke object URLs on unmount.
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    setError(null);
    const picked = files[0];
    if (!picked) return;

    // Layer 1 — frontend validation.
    const isPdf =
      picked.type === "application/pdf" ||
      picked.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError({
        code: "UNSUPPORTED_FILE",
        message: "Only PDF files are supported.",
        detail: picked.name,
      });
      return;
    }
    if (picked.size > clientLimits.maxFileSizeMb * 1024 * 1024) {
      setError({
        code: "FILE_TOO_LARGE",
        message: `This file is larger than the ${clientLimits.maxFileSizeMb} MB limit.`,
        detail: picked.name,
      });
      return;
    }

    // Layer 2 — mandatory server validation (nothing is stored).
    try {
      const result = await validateOnServer(picked);
      setFile(picked);
      setValidation(result);
      setZipBaseName(`${picked.name.replace(/\.pdf$/i, "")}-images`);
      setPhase("ready");
    } catch (err) {
      if (err instanceof ApiError) {
        setError({
          code: err.code,
          message: err.message,
          ...(err.detail ? { detail: err.detail } : {}),
        });
      }
    }
  }, []);

  const startConversion = useCallback(() => {
    if (!file) return;
    cancelFlagRef.current = false;
    setImages([]);
    setProgress({ done: 0, total: validation?.pageCount ?? 0 });
    setPhase("converting");

    void (async () => {
      try {
        const data = await file.arrayBuffer();
        await convertPdfToImages(data, file.name, format, quality, {
          shouldCancel: () => cancelFlagRef.current,
          onPageCompleted: (_completed, _total, image) => {
            setImages((prev) => [...prev, image]);
            setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
          },
        });
        setPhase("done");
      } catch (err) {
        if (err instanceof ConversionCancelledError) {
          setPhase("ready");
        } else {
          setError({
            code: "PROCESSING_FAILED",
            message:
              "Conversion couldn't be completed. Your original file has not been changed.",
          });
          setPhase("ready");
        }
      }
    })();
  }, [file, format, quality, validation]);

  const handleCancel = useCallback(() => {
    cancelFlagRef.current = true;
    setConfirmCancel(false);
  }, []);

  const resetAll = useCallback(() => {
    cancelFlagRef.current = true;
    for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
    objectUrlsRef.current = [];
    setImages([]);
    setFile(null);
    setValidation(null);
    setPhase("upload");
  }, []);

  // Track object URLs for cleanup.
  useEffect(() => {
    for (const image of images) {
      if (!objectUrlsRef.current.includes(image.url)) {
        objectUrlsRef.current.push(image.url);
      }
    }
  }, [images]);

  const percent =
    progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  const downloadZip = useCallback(async () => {
    if (images.length === 0) return;
    const zip = new JSZip();
    const folder = zip.folder("") ?? zip;
    for (const image of images) {
      folder.file(image.filename, image.blob);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildFilename(zipBaseName || "document-images", "zip");
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, [images, zipBaseName]);

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          PDF to Image
        </h1>
        <p className="mt-3 text-ink-500">
          Convert PDF pages to {IMAGE_FORMATS.map((f) => IMAGE_FORMAT_LABELS[f]).join(", ")} images.
          Conversion happens in your browser — your pages never leave your device.
        </p>
      </div>

      {error ? (
        <div className="mx-auto mt-6 max-w-2xl">
          <ErrorAlert error={error} />
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={resetAll}>
              Start Again
            </Button>
          </div>
        </div>
      ) : null}

      {/* Upload */}
      {phase === "upload" ? (
        <div className="mx-auto mt-10 max-w-2xl">
          <UploadZone
            onFiles={handleFilesSelected}
            multiple={false}
            label="Drop a PDF here"
            buttonText="Select PDF File"
          />
          <div className="mt-4 rounded-xl border border-border bg-white p-4 text-sm text-ink-500">
            <p className="font-medium text-ink-900">Limits</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Up to {clientLimits.maxFileSizeMb} MB per PDF</li>
              <li>Up to {clientLimits.maxTotalPages} pages per task</li>
              <li>Password-protected PDFs are not supported</li>
            </ul>
          </div>
        </div>
      ) : null}

      {/* Ready: settings + preview + convert */}
      {phase === "ready" && file ? (
        <div className="mx-auto mt-10 max-w-2xl space-y-6">
          <section className="rounded-2xl border border-border bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">{file.name}</p>
                <p className="text-sm text-ink-500">
                  {validation?.pageCount} page{validation?.pageCount === 1 ? "" : "s"} ·
                  validated
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setViewerOpen(true)}>
                  Preview PDF
                </Button>
                <Button variant="ghost" onClick={resetAll}>
                  Start New Task
                </Button>
              </div>
            </div>

            <fieldset className="mt-6">
              <legend className="text-sm font-medium text-ink-700">Image format</legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {IMAGE_FORMATS.map((option) => (
                  <label
                    key={option}
                    className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium ${
                      format === option
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-border bg-white text-ink-700 hover:bg-surface-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="image-format"
                      value={option}
                      checked={format === option}
                      onChange={() => setFormat(option)}
                      className="sr-only"
                    />
                    {IMAGE_FORMAT_LABELS[option]}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-6">
              <legend className="text-sm font-medium text-ink-700">Quality</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {IMAGE_QUALITIES.map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${
                      quality === option
                        ? "border-primary-600 bg-primary-50"
                        : "border-border bg-white hover:bg-surface-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="image-quality"
                      value={option}
                      checked={quality === option}
                      onChange={() => setQuality(option)}
                      className="mt-1 h-4 w-4 accent-primary-600"
                    />
                    <span>
                      <span className="block text-sm font-medium text-ink-900">
                        {QUALITY_LABELS[option].title}
                      </span>
                      <span className="block text-xs text-ink-500">
                        {QUALITY_LABELS[option].text}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-6">
              <Button size="lg" onClick={startConversion} className="w-full sm:w-auto">
                Convert to {IMAGE_FORMAT_LABELS[format]}
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {/* Converting: progress + cancel */}
      {phase === "converting" ? (
        <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-border bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-ink-900">Converting pages…</h2>
              <p className="mt-1 text-sm text-ink-500">
                Page {Math.min(progress.done + 1, progress.total)} of{" "}
                {progress.total} — {percent}%
              </p>
            </div>
            <Button variant="secondary" onClick={() => setConfirmCancel(true)}>
              Cancel Processing
            </Button>
          </div>
          <div
            className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Conversion progress"
          >
            <div
              className="h-full rounded-full bg-primary-600 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p role="status" aria-live="polite" className="sr-only">
            {`Converting page ${progress.done} of ${progress.total}. ${percent} percent complete.`}
          </p>
        </div>
      ) : null}

      {/* Gallery */}
      {images.length > 0 ? (
        <section aria-labelledby="gallery-heading" className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="gallery-heading" className="font-semibold text-ink-900">
              Converted images ({images.length})
            </h2>
            {phase === "done" ? (
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label
                    htmlFor="zip-name"
                    className="block text-xs font-medium text-ink-700"
                  >
                    ZIP file name
                  </label>
                  <div className="mt-1 flex rounded-lg border border-border focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-600">
                    <input
                      id="zip-name"
                      type="text"
                      value={zipBaseName}
                      onChange={(event) => setZipBaseName(event.target.value)}
                      className="min-h-11 w-44 rounded-l-lg bg-transparent px-3 text-sm text-ink-900 outline-none"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <span
                      aria-hidden="true"
                      className="flex items-center border-l border-border bg-surface-muted px-2 text-sm text-ink-500"
                    >
                      .zip
                    </span>
                  </div>
                </div>
                <Button onClick={() => void downloadZip()}>Download All (.zip)</Button>
                <Button variant="ghost" onClick={resetAll}>
                  Start New Task
                </Button>
              </div>
            ) : null}
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image) => (
              <li
                key={image.pageNumber}
                className="flex flex-col rounded-xl border border-border bg-white p-3"
              >
                <div className="flex h-44 items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={`Page ${image.pageNumber} preview`}
                    loading="lazy"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <p className="mt-2 text-sm font-medium text-ink-900">
                  Page {image.pageNumber}
                </p>
                <a
                  href={image.url}
                  download={image.filename}
                  className="mt-2 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 text-sm font-medium text-ink-900 hover:bg-surface-muted"
                >
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 4v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Download
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Cancel confirmation */}
      <Modal
        open={confirmCancel}
        title="Cancel conversion?"
        onClose={() => setConfirmCancel(false)}
      >
        <p>Conversion stops at the current page. Images already converted stay available.</p>
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => {
              handleCancel();
            }}
          >
            Yes, cancel it
          </Button>
          <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
            Keep converting
          </Button>
        </div>
      </Modal>

      <PdfViewerModal
        open={viewerOpen && file !== null}
        title={file?.name ?? ""}
        data={null}
        onClose={() => setViewerOpen(false)}
      />
    </Container>
  );
}
