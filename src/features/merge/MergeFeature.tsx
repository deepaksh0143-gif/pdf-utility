"use client";

/**
 * Merge feature orchestration (PRD §6–§13).
 * Phases: upload → organize → processing (with progress + cancel) → result.
 * Server communication goes through the central API client; PDF processing
 * stays in services; UI state lives in this feature + hooks.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { UploadZone } from "@/components/upload/UploadZone";
import { FileList } from "@/components/upload/FileList";
import { PageOrganizer } from "@/components/editor/PageOrganizer";
import { PdfViewerModal } from "@/components/pdf/PdfViewerModal";
import { ProcessingPanel } from "@/components/processing/ProcessingPanel";
import { DownloadPanel } from "@/components/download/DownloadPanel";
import { useMergeState } from "./useMergeState";
import { usePdfThumbnails } from "@/hooks/usePdfThumbnails";
import {
  ApiError,
  cancelJob,
  createJob,
  deleteJob,
  deleteUploadedFile,
  getJobResultUrl,
  getJobStatus,
  uploadPdf,
} from "@/services/api/jobs-api";
import { clientLimits } from "@/lib/client-config";
import type { FinalPageInstruction, PageSizeOption } from "@/types/pages";
import type { JobDto } from "@/types/jobs";
import type { AppErrorDto } from "@/types/errors";

const POLL_INTERVAL_MS = 800;

type ConfirmState =
  | { kind: "cancel-job" }
  | { kind: "start-new" }
  | { kind: "remove-file"; fileId: string; name: string }
  | null;

export function MergeFeature() {
  const { editor, dispatch, pageSize, setPageSize } = useMergeState();
  const [phase, setPhase] = useState<"upload" | "organize">("upload");
  const [job, setJob] = useState<JobDto | null>(null);
  const [error, setError] = useState<AppErrorDto | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [viewer, setViewer] = useState<{ name: string; data: ArrayBuffer } | null>(null);
  const [outputFilename, setOutputFilename] = useState("merged-document");
  const [fileObjects, setFileObjects] = useState<Map<string, File>>(new Map());
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobIdRef = useRef<string | null>(null);

  const fileInfos = editor.fileInfos;
  const pages = editor.pages;
  const visiblePages = useMemo(() => pages.filter((p) => !p.isDeleted), [pages]);
  const selectedCount = pages.filter((p) => p.isSelected && !p.isDeleted).length;
  const deletedCount = pages.length - visiblePages.length;

  const hasEdits = useMemo(
    () => pages.some((p) => p.rotation !== 0 || p.isDeleted || p.isSelected),
    [pages],
  );

  // Incremental, memory-bounded thumbnails for visible pages.
  const { getThumbnail } = usePdfThumbnails(
    useMemo(
      () =>
        fileInfos
          .map((info) => ({
            fileId: info.fileId,
            file: fileObjects.get(info.fileId),
          }))
          .filter(
            (entry): entry is { fileId: string; file: File } =>
              entry.file !== undefined,
          ),
      [fileInfos, fileObjects],
    ),
    useMemo(
      () =>
        visiblePages.map((page) => ({
          fileId: page.sourceFileId,
          pageNumber: page.sourcePageNumber,
        })),
      [visiblePages],
    ),
  );

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      // Transient poll failures (brief network loss) must not kill the task
      // view; only give up after several in a row, or immediately on a
      // terminal answer from the server (job unknown / expired).
      let consecutiveFailures = 0;
      pollTimerRef.current = setInterval(() => {
        void (async () => {
          try {
            const updated = await getJobStatus(jobId);
            consecutiveFailures = 0;
            setJob(updated);
            if (
              updated.status === "COMPLETED" ||
              updated.status === "FAILED" ||
              updated.status === "CANCELLED" ||
              updated.status === "EXPIRED"
            ) {
              stopPolling();
            }
          } catch (err) {
            const terminal =
              err instanceof ApiError &&
              (err.code === "JOB_NOT_FOUND" || err.code === "EXPIRED");
            if (!terminal && consecutiveFailures < 5) {
              consecutiveFailures += 1;
              return; // Transient — keep polling.
            }
            stopPolling();
            if (err instanceof ApiError) {
              setJob((prev) =>
                prev
                  ? {
                      ...prev,
                      status: "FAILED",
                      error: { code: err.code, message: err.message },
                    }
                  : prev,
              );
            }
          }
        })();
      }, POLL_INTERVAL_MS);
    },
    [stopPolling],
  );

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      setError(null);

      // Layer 1 — frontend validation (AGENTS.md §10). Server re-validates.
      const problems: string[] = [];
      const pdfs: File[] = [];
      for (const file of files) {
        const isPdf =
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
          problems.push(`${file.name}: only PDF files are supported.`);
          continue;
        }
        if (file.size > clientLimits.maxFileSizeMb * 1024 * 1024) {
          problems.push(
            `${file.name}: larger than the ${clientLimits.maxFileSizeMb} MB limit.`,
          );
          continue;
        }
        pdfs.push(file);
      }

      const remainingSlots = clientLimits.maxFilesPerSession - fileInfos.length;
      if (pdfs.length > remainingSlots) {
        problems.push(
          remainingSlots <= 0
            ? `You can merge up to ${clientLimits.maxFilesPerSession} PDFs per session. Remove a file first.`
            : `Only ${remainingSlots} more PDF${remainingSlots === 1 ? "" : "s"} allowed in this session.`,
        );
      }
      const acceptable = pdfs.slice(0, Math.max(remainingSlots, 0));

      if (problems.length > 0) {
        setError({
          code: "VALIDATION_ERROR",
          message: problems[0],
          ...(problems.length > 1
            ? { detail: `${problems.length - 1} more file(s) also had problems.` }
            : {}),
        });
      }
      if (acceptable.length === 0) return;

      const staged: {
        fileId: string;
        name: string;
        size: number;
        pageCount: number;
      }[] = [];
      const newObjects = new Map<string, File>();
      for (const file of acceptable) {
        try {
          const info = await uploadPdf(file);
          staged.push(info);
          newObjects.set(info.fileId, file);
        } catch (err) {
          if (err instanceof ApiError) {
            setError({
              code: err.code,
              message: err.message,
              ...(err.detail ? { detail: err.detail } : {}),
            });
            break;
          }
        }
      }

      if (staged.length > 0) {
        setFileObjects((prev) => new Map([...prev, ...newObjects]));
        dispatch({ type: "filesAdded", infos: staged });
        setPhase("organize");
      }
    },
    [fileInfos.length, dispatch],
  );

  const buildInstructions = useCallback(
    (onlySelected: boolean): FinalPageInstruction[] =>
      visiblePages
        .filter((page) => (onlySelected ? page.isSelected : true))
        .map((page) => ({
          sourceFileId: page.sourceFileId,
          sourcePageNumber: page.sourcePageNumber,
          rotation: page.rotation,
        })),
    [visiblePages],
  );

  const startProcessing = useCallback(
    async (onlySelected: boolean) => {
      const instructions = buildInstructions(onlySelected);
      if (instructions.length === 0) {
        setError({
          code: "VALIDATION_ERROR",
          message: onlySelected
            ? "Select at least one page to extract."
            : "All pages are deleted. Restore at least one page to continue.",
        });
        return;
      }
      if (instructions.length > clientLimits.maxTotalPages) {
        setError({
          code: "PAGE_LIMIT_EXCEEDED",
          message: `The final document can contain at most ${clientLimits.maxTotalPages} pages. Remove pages or split the work into two tasks.`,
        });
        return;
      }

      setError(null);
      try {
        const created = await createJob({
          type: onlySelected ? "extract" : "merge",
          fileIds: fileInfos.map((f) => f.fileId),
          pages: instructions,
          pageSize,
          outputFilename: outputFilename || "merged-document",
        });
        jobIdRef.current = created.id;
        setJob(created);
        startPolling(created.id);
      } catch (err) {
        if (err instanceof ApiError) {
          setError({
            code: err.code,
            message: err.message,
            ...(err.detail ? { detail: err.detail } : {}),
          });
        }
      }
    },
    [buildInstructions, fileInfos, pageSize, outputFilename, startPolling],
  );

  const resetToEditor = useCallback(async () => {
    stopPolling();
    const finishedJobId = jobIdRef.current;
    jobIdRef.current = null;
    setJob(null);
    if (finishedJobId) await deleteJob(finishedJobId).catch(() => undefined);
  }, [stopPolling]);

  const handleStartNewTask = useCallback(async () => {
    await resetToEditor();
    setOutputFilename("merged-document");
    // Best-effort cleanup of staged files for a fresh session.
    for (const info of fileInfos) {
      void deleteUploadedFile(info.fileId).catch(() => undefined);
    }
    setFileObjects(new Map());
    dispatch({ type: "setPages", pages: [] });
    setPhase("upload");
  }, [fileInfos, resetToEditor, dispatch]);

  const handleRemoveFile = useCallback(
    (fileId: string) => {
      dispatch({ type: "fileRemoved", fileId });
      setFileObjects((prev) => {
        const next = new Map(prev);
        next.delete(fileId);
        return next;
      });
      void deleteUploadedFile(fileId).catch(() => undefined);
    },
    [dispatch],
  );

  const openViewer = useCallback(
    async (fileId: string, name: string) => {
      // Result preview streams the generated file; source preview reads the
      // local File handle (no extra server round-trip, nothing re-uploaded).
      if (fileId === "result" && job?.status === "COMPLETED") {
        try {
          const response = await fetch(getJobResultUrl(job.id));
          if (!response.ok) throw new Error();
          setViewer({ name, data: await response.arrayBuffer() });
        } catch {
          setError({
            code: "EXPIRED",
            message: "The result is no longer available for preview.",
          });
        }
        return;
      }
      const file = fileObjects.get(fileId);
      if (!file) return;
      setViewer({ name, data: await file.arrayBuffer() });
    },
    [fileObjects, job],
  );

  const filesMeta = useMemo(
    () =>
      new Map(
        fileInfos.map((info) => [info.fileId, { name: info.name, size: info.size }]),
      ),
    [fileInfos],
  );

  const jobFinished = job?.status === "COMPLETED";
  const jobActive =
    job !== null &&
    ["CREATED", "VALIDATING", "QUEUED", "PROCESSING", "GENERATING", "CANCELLING"].includes(
      job.status,
    );
  const jobEnded = job !== null && !jobActive && !jobFinished;

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          Merge PDF + Page Organizer
        </h1>
        <p className="mt-3 text-ink-500">
          Combine up to {clientLimits.maxFilesPerSession} PDFs, organize pages
          visually, rotate, delete, restore, and extract what you need.
        </p>
      </div>

      {error ? (
        <div className="mx-auto mt-6 max-w-2xl">
          <Alert variant="error" title="Something needs your attention">
            {error.message}
            {error.detail ? (
              <span className="block text-xs opacity-80">{error.detail}</span>
            ) : null}
          </Alert>
        </div>
      ) : null}

      {/* Upload phase */}
      {phase === "upload" && !job ? (
        <div className="mx-auto mt-10 max-w-2xl">
          <UploadZone onFiles={handleFilesSelected} />
          <div className="mt-4 rounded-xl border border-border bg-white p-4 text-sm text-ink-500">
            <p className="font-medium text-ink-900">Limits</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Up to {clientLimits.maxFilesPerSession} PDFs per task</li>
              <li>Up to {clientLimits.maxFileSizeMb} MB per PDF</li>
              <li>Up to {clientLimits.maxTotalPages} pages in the final document</li>
              <li>Password-protected PDFs are not supported</li>
            </ul>
          </div>
        </div>
      ) : null}

      {/* Organize phase */}
      {phase === "organize" && !job ? (
        <div className="mt-10 space-y-8">
          <section aria-labelledby="files-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="files-heading" className="font-semibold text-ink-900">
                Files ({fileInfos.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium text-ink-900 hover:bg-surface-muted">
                  Add more PDFs
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      event.target.value = "";
                      if (files.length > 0) void handleFilesSelected(files);
                    }}
                  />
                </label>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (hasEdits) setConfirmState({ kind: "start-new" });
                    else void handleStartNewTask();
                  }}
                >
                  Start New Task
                </Button>
              </div>
            </div>
            <div className="mt-3">
              <FileList
                items={fileInfos.map((info) => ({
                  localId: info.fileId,
                  info,
                  name: info.name,
                  size: info.size,
                  status: "ready" as const,
                }))}
                onRemove={(localId) => {
                  const info = fileInfos.find((f) => f.fileId === localId);
                  if (hasEdits && fileInfos.length > 1) {
                    setConfirmState({
                      kind: "remove-file",
                      fileId: localId,
                      name: info?.name ?? "this file",
                    });
                  } else {
                    handleRemoveFile(localId);
                    if (fileInfos.length === 1) setPhase("upload");
                  }
                }}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {fileInfos.map((info) => (
                <Button
                  key={info.fileId}
                  variant="ghost"
                  size="sm"
                  onClick={() => void openViewer(info.fileId, info.name)}
                >
                  Preview {info.name}
                </Button>
              ))}
            </div>
          </section>

          {pages.length > 0 ? (
            <PageOrganizer
              pages={pages}
              filesMeta={filesMeta}
              thumbnails={(fileId, pageNumber) => getThumbnail(fileId, pageNumber)}
              onReorder={(activeId, overId) =>
                dispatch({ type: "reorder", activeId, overId })
              }
              onToggleSelect={(pageId) => dispatch({ type: "toggleSelect", pageId })}
              onRotate={(pageId, direction) =>
                dispatch({ type: "rotate", pageId, direction })
              }
              onDelete={(pageId) => dispatch({ type: "delete", pageId })}
              onRestore={(pageId) => dispatch({ type: "restore", pageId })}
              onMove={(pageId, direction) =>
                dispatch({ type: "move", pageId, direction })
              }
              onSelectAll={() => dispatch({ type: "selectAll" })}
              onClearSelection={() => dispatch({ type: "clearSelection" })}
              onDeleteSelected={() => dispatch({ type: "deleteSelected" })}
              onRestoreAll={() => dispatch({ type: "restoreAll" })}
              onRotateSelected={(direction) =>
                dispatch({ type: "rotateSelected", direction })
              }
            />
          ) : null}

          {/* Output settings */}
          <section
            aria-labelledby="output-heading"
            className="rounded-2xl border border-border bg-white p-6"
          >
            <h2 id="output-heading" className="font-semibold text-ink-900">
              Output
            </h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <fieldset>
                <legend className="text-sm font-medium text-ink-700">
                  Page size
                </legend>
                <div className="mt-2 space-y-2">
                  {(
                    [
                      ["original", "Preserve original (recommended)"],
                      ["a4", "Normalize to A4"],
                      ["letter", "Normalize to Letter"],
                    ] as [PageSizeOption, string][]
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex min-h-11 items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        name="page-size"
                        value={value}
                        checked={pageSize === value}
                        onChange={() => setPageSize(value)}
                        className="h-4 w-4 accent-primary-600"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label
                  htmlFor="output-name"
                  className="block text-sm font-medium text-ink-700"
                >
                  Output file name
                </label>
                <div className="mt-2 flex rounded-lg border border-border focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-600">
                  <input
                    id="output-name"
                    type="text"
                    value={outputFilename}
                    onChange={(event) => setOutputFilename(event.target.value)}
                    className="min-h-11 w-full rounded-l-lg bg-transparent px-3 text-ink-900 outline-none"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <span
                    aria-hidden="true"
                    className="flex items-center border-l border-border bg-surface-muted px-3 text-sm text-ink-500"
                  >
                    .pdf
                  </span>
                </div>
                <p className="mt-2 text-xs text-ink-500">
                  {visiblePages.length} page
                  {visiblePages.length === 1 ? "" : "s"} will be included.
                  {deletedCount > 0
                    ? ` ${deletedCount} deleted page${deletedCount === 1 ? "" : "s"} stay out unless restored.`
                    : ""}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button
                size="lg"
                onClick={() => void startProcessing(false)}
                disabled={visiblePages.length === 0}
              >
                Generate PDF
              </Button>
              {selectedCount > 0 ? (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => void startProcessing(true)}
                >
                  Extract {selectedCount} selected page
                  {selectedCount === 1 ? "" : "s"}
                </Button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {/* Processing phase */}
      {jobActive && job ? (
        <div className="mx-auto mt-10 max-w-2xl">
          <ProcessingPanel
            job={job}
            onCancel={() => setConfirmState({ kind: "cancel-job" })}
          />
        </div>
      ) : null}

      {/* Result phase */}
      {jobFinished && job ? (
        <div className="mx-auto mt-10 max-w-2xl space-y-4">
          <DownloadPanel
            jobId={job.id}
            defaultFilename={outputFilename}
            onPreview={() => void openViewer("result", outputFilename || "result")}
            onStartNewTask={() => {
              if (hasEdits) setConfirmState({ kind: "start-new" });
              else void handleStartNewTask();
            }}
          />
          <div className="text-center">
            <Button variant="ghost" onClick={() => void resetToEditor()}>
              Back to editor
            </Button>
          </div>
        </div>
      ) : null}

      {/* Failed / cancelled */}
      {jobEnded && job ? (
        <div className="mx-auto mt-10 max-w-2xl">
          <ProcessingPanel
            job={job}
            onRetry={() => void resetToEditor()}
            onDismiss={() => void handleStartNewTask()}
          />
        </div>
      ) : null}

      {/* Confirmations */}
      <Modal
        open={confirmState !== null}
        title={
          confirmState?.kind === "cancel-job"
            ? "Cancel processing?"
            : confirmState?.kind === "remove-file"
              ? `Remove ${confirmState.name}?`
              : "Start a new task?"
        }
        onClose={() => setConfirmState(null)}
      >
        {confirmState?.kind === "cancel-job" ? (
          <div>
            <p>
              Processing stops safely and temporary files are deleted. You will
              return to the editor.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={async () => {
                  const jobId = jobIdRef.current;
                  setConfirmState(null);
                  if (jobId) {
                    try {
                      await cancelJob(jobId);
                    } catch {
                      // Polling will surface the final state.
                    }
                  }
                  // Wait for the job to report CANCELLED, then clean up.
                  setTimeout(() => void resetToEditor(), 1200);
                }}
              >
                Yes, cancel it
              </Button>
              <Button variant="secondary" onClick={() => setConfirmState(null)}>
                Keep processing
              </Button>
            </div>
          </div>
        ) : null}
        {confirmState?.kind === "start-new" ? (
          <div>
            <p>
              This clears the current arrangement. Unsaved edits and results
              you haven&apos;t downloaded will be lost.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => {
                  setConfirmState(null);
                  void handleStartNewTask();
                }}
              >
                Start new task
              </Button>
              <Button variant="secondary" onClick={() => setConfirmState(null)}>
                Go back
              </Button>
            </div>
          </div>
        ) : null}
        {confirmState?.kind === "remove-file" ? (
          <div>
            <p>
              Removing this file also removes its pages from the arrangement.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => {
                  const fileId = confirmState.kind === "remove-file"
                    ? confirmState.fileId
                    : null;
                  setConfirmState(null);
                  if (fileId) handleRemoveFile(fileId);
                  if (fileInfos.length === 1) setPhase("upload");
                }}
              >
                Remove file
              </Button>
              <Button variant="secondary" onClick={() => setConfirmState(null)}>
                Keep file
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* PDF viewer */}
      <PdfViewerModal
        open={viewer !== null}
        title={viewer?.name ?? ""}
        data={viewer?.data ?? null}
        onClose={() => setViewer(null)}
      />
    </Container>
  );
}
