"use client";

import { useRef, useState } from "react";

/**
 * Upload zone (AGENTS.md §19/§20): drag-and-drop plus a real, keyboard
 * focusable file input. Never the only way to add files.
 */
export function UploadZone({
  onFiles,
  accept = "application/pdf,.pdf",
  multiple = true,
  disabled = false,
  label = "Drop PDF files here",
  hint = "or use the file picker",
  buttonText = "Select PDF Files",
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: string;
  buttonText?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        if (disabled) return;
        const files = Array.from(event.dataTransfer.files ?? []);
        if (files.length > 0) onFiles(files);
      }}
      className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-12 ${
        dragActive
          ? "border-primary-500 bg-primary-50"
          : "border-border bg-white"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <svg
        aria-hidden="true"
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-primary-600"
      >
        <path d="M12 16V4m0 0L8 8m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
      </svg>
      <p className="mt-4 font-medium text-ink-900">{label}</p>
      <p className="mt-1 text-sm text-ink-500">{hint}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary-600 px-5 font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {buttonText}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) onFiles(files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
