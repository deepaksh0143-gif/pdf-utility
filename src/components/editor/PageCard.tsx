"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatBytes } from "@/utils/format";
import type { OrganizerPage } from "@/types/pages";

/**
 * One editable page (AGENTS.md §8): drag handle plus explicit buttons for
 * every action, so drag-and-drop is never the only method. The whole card
 * is focusable; keyboard users get Move/Rotate/Delete/Select controls.
 */
export function PageCard({
  page,
  label,
  thumbnail,
  fileName,
  fileSize,
  hasSelection,
  onToggleSelect,
  onRotate,
  onDelete,
  onRestore,
  onMove,
}: {
  page: OrganizerPage;
  label: string;
  thumbnail?: string;
  fileName: string;
  fileSize: number;
  hasSelection: boolean;
  onToggleSelect: (pageId: string) => void;
  onRotate: (pageId: string, direction: "cw" | "ccw") => void;
  onDelete: (pageId: string) => void;
  onRestore: (pageId: string) => void;
  onMove: (pageId: string, direction: -1 | 1) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id, disabled: page.isDeleted });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const rotationClass = `rotate-${page.rotation}`;

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-deleted={page.isDeleted || undefined}
      className={`group relative flex flex-col rounded-xl border p-2 transition-opacity ${
        page.isDeleted
          ? "border-border bg-surface-muted opacity-60"
          : page.isSelected
            ? "border-primary-500 bg-primary-50 ring-2 ring-primary-200"
            : "border-border bg-white"
      } ${isDragging ? "z-10 opacity-80 shadow-lg" : ""}`}
      aria-label={`Page ${label} from ${fileName}`}
    >
      {/* Drag handle (pointer users); keyboard users use Move buttons. */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={page.isDeleted}
        className="absolute left-2 top-2 flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-lg bg-white/90 text-ink-500 shadow-sm hover:text-ink-900 disabled:hidden"
      >
        <span className="sr-only">Drag to reorder page {label}</span>
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.4" /><circle cx="15" cy="6" r="1.4" />
          <circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" />
          <circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="18" r="1.4" />
        </svg>
      </button>

      <div className="mx-auto flex h-40 w-full items-center justify-center overflow-hidden rounded-lg bg-surface-muted sm:h-44">
        {page.isDeleted ? (
          <span className="text-xs text-ink-500">Deleted</span>
        ) : thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt=""
            width={160}
            height={200}
            className={`max-h-full max-w-full object-contain ${rotationClass}`}
          />
        ) : (
          <span className="text-xs text-ink-500" role="status">
            Rendering…
          </span>
        )}
      </div>

      <div className="mt-2 px-1">
        <p className="truncate text-xs font-medium text-ink-900" title={fileName}>
          {fileName}
        </p>
        <p className="text-[11px] text-ink-500">
          Page {page.sourcePageNumber} · {formatBytes(fileSize)}
          {page.rotation !== 0 ? ` · ↻ ${page.rotation}°` : ""}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
        <IconActionButton
          label={`Move page ${label} up`}
          disabled={page.isDeleted}
          onClick={() => onMove(page.id, -1)}
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5m0 0l-6 6m6-6l6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </IconActionButton>
        <IconActionButton
          label={`Move page ${label} down`}
          disabled={page.isDeleted}
          onClick={() => onMove(page.id, 1)}
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14m0 0l6-6m-6 6l-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </IconActionButton>
        <IconActionButton
          label={`Rotate page ${label} counter-clockwise`}
          disabled={page.isDeleted}
          onClick={() => onRotate(page.id, "ccw")}
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 109-9 9 9 0 00-9 9zm9-9c2.5 2.5 2.5 6.5 0 9" strokeLinecap="round" />
          </svg>
        </IconActionButton>
        <IconActionButton
          label={`Rotate page ${label} clockwise`}
          disabled={page.isDeleted}
          onClick={() => onRotate(page.id, "cw")}
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 11-9-9 9 9 0 019 9zm-9-9c-2.5 2.5-2.5 6.5 0 9" strokeLinecap="round" />
          </svg>
        </IconActionButton>
        <IconActionButton
          label={`${page.isSelected ? "Deselect" : "Select"} page ${label}`}
          disabled={page.isDeleted}
          pressed={page.isSelected}
          onClick={() => onToggleSelect(page.id)}
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </IconActionButton>
        {page.isDeleted ? (
          <IconActionButton
            label={`Restore page ${label}`}
            onClick={() => onRestore(page.id)}
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 109-9 9 9 0 00-9 9zm9-9v4m0-4h-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconActionButton>
        ) : (
          <IconActionButton
            label={`Delete page ${label}`}
            onClick={() => onDelete(page.id)}
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconActionButton>
        )}
      </div>
    </li>
  );
}

function IconActionButton({
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-ink-700 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
