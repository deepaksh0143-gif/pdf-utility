"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { getJobResultUrl } from "@/services/api/jobs-api";
import { buildFilename } from "@/utils/filename";

/**
 * Result panel (PRD §12/§13): rename output, preview, download, and
 * "Start New Task". The filename input enforces a safe .pdf extension.
 */
export function DownloadPanel({
  jobId,
  defaultFilename,
  onPreview,
  onStartNewTask,
}: {
  jobId: string;
  defaultFilename: string;
  onPreview: () => void;
  onStartNewTask: () => void;
}) {
  const [filename, setFilename] = useState(defaultFilename);

  const downloadHref = getJobResultUrl(jobId);
  const downloadName = buildFilename(filename || "merged-document", "pdf");

  return (
    <section aria-labelledby="result-heading" className="rounded-2xl border border-border bg-white p-6">
      <h2 id="result-heading" className="font-semibold text-ink-900">
        Your document is ready
      </h2>
      <p className="mt-1 text-sm text-ink-500">
        Download it now — the file is deleted automatically within one hour.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="output-filename"
            className="block text-sm font-medium text-ink-700"
          >
            File name
          </label>
          <div className="mt-1 flex rounded-lg border border-border bg-white focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-600">
            <input
              id="output-filename"
              type="text"
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
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
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <a
          href={downloadHref}
          download={downloadName}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 font-medium text-white hover:bg-primary-700"
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 20h16" strokeLinecap="round" />
          </svg>
          Download PDF
        </a>
        <Button variant="secondary" onClick={onPreview}>
          Preview result
        </Button>
        <Button variant="ghost" onClick={onStartNewTask} className="sm:ml-auto">
          Start New Task
        </Button>
      </div>
    </section>
  );
}
