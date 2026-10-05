"use client";

import { formatBytes } from "@/utils/format";
import type { UploadedFileInfo } from "@/types/files";

export type FileStatus = "pending" | "uploading" | "ready" | "error";

export interface FileListItem {
  /** Client-side id (pre-upload) or server fileId once ready. */
  localId: string;
  file?: File;
  info?: UploadedFileInfo;
  name: string;
  size: number;
  status: FileStatus;
  progressPercent?: number;
  errorMessage?: string;
}

/**
 * Uploaded file list (PRD §7): name, size, page count, status and remove.
 * The remove button is a real button with an accessible name.
 */
export function FileList({
  items,
  onRemove,
}: {
  items: FileListItem[];
  onRemove: (localId: string) => void;
}) {
  return (
    <ul className="space-y-2" aria-label="Uploaded files">
      {items.map((item) => (
        <li
          key={item.localId}
          className="flex items-center gap-3 rounded-xl border border-border bg-white p-3"
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xs font-bold text-primary-700"
          >
            PDF
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-900">{item.name}</p>
            <p className="text-xs text-ink-500">
              {formatBytes(item.size)}
              {item.info ? ` · ${item.info.pageCount} page${item.info.pageCount === 1 ? "" : "s"}` : ""}
              {item.status === "uploading" ? " · uploading…" : ""}
              {item.status === "pending" ? " · waiting…" : ""}
            </p>
            {item.status === "uploading" && item.progressPercent !== undefined ? (
              <div
                className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
                role="progressbar"
                aria-valuenow={item.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Uploading ${item.name}`}
              >
                <div
                  className="h-full rounded-full bg-primary-600 transition-all"
                  style={{ width: `${item.progressPercent}%` }}
                />
              </div>
            ) : null}
            {item.status === "error" && item.errorMessage ? (
              <p className="mt-1 text-xs font-medium text-danger-600">
                {item.errorMessage}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.localId)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-danger-100 hover:text-danger-600"
          >
            <span className="sr-only">Remove {item.name}</span>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}
