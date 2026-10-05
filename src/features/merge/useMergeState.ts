"use client";

/**
 * Merge feature state (TDD §8/§9). A single reducer holds staged files and
 * the non-destructive page model; every operation is a pure metadata
 * update — original files are never modified.
 */
import { useCallback, useReducer, useState } from "react";
import type { UploadedFileInfo } from "@/types/files";
import type {
  OrganizerPage,
  PageSizeOption,
  Rotation,
} from "@/types/pages";

export type MergePhase = "upload" | "organize" | "processing" | "result";

interface MergeEditorState {
  fileInfos: UploadedFileInfo[];
  pages: OrganizerPage[];
}

type MergeAction =
  | { type: "filesAdded"; infos: UploadedFileInfo[] }
  | { type: "fileRemoved"; fileId: string }
  | { type: "setPages"; pages: OrganizerPage[] }
  | { type: "reorder"; activeId: string; overId: string }
  | { type: "toggleSelect"; pageId: string }
  | { type: "selectAll" }
  | { type: "clearSelection" }
  | { type: "rotate"; pageId: string; direction: "cw" | "ccw" }
  | { type: "rotateSelected"; direction: "cw" | "ccw" }
  | { type: "delete"; pageId: string }
  | { type: "deleteSelected" }
  | { type: "restore"; pageId: string }
  | { type: "restoreAll" }
  | { type: "move"; pageId: string; direction: -1 | 1 };

function rotate(current: Rotation, direction: "cw" | "ccw"): Rotation {
  const delta = direction === "cw" ? 90 : -90;
  return ((((current + delta) % 360) + 360) % 360) as Rotation;
}

/** Moves an item within `list` from one index to another (insert semantics). */
function arrayMove<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/** Reindexes displayOrder over visible pages; deleted pages get -1. */
function reindexVisible(pages: OrganizerPage[]): OrganizerPage[] {
  let order = 0;
  return pages.map((page) =>
    page.isDeleted
      ? { ...page, displayOrder: -1 }
      : { ...page, displayOrder: order++ },
  );
}

/**
 * Rebuilds pages from the file list, preserving edits for pages that still
 * exist and appending new pages at the end (PRD §7: "adding more later").
 */
function rebuildPages(
  fileInfos: UploadedFileInfo[],
  previous: OrganizerPage[],
): OrganizerPage[] {
  const validIds = new Set<string>();
  for (const info of fileInfos) {
    for (let n = 1; n <= info.pageCount; n += 1) {
      validIds.add(`p_${info.fileId}_${n}`);
    }
  }

  const kept = previous.filter((p) => validIds.has(p.id));
  const keptIds = new Set(kept.map((p) => p.id));
  const fresh: OrganizerPage[] = [];
  for (const info of fileInfos) {
    for (let n = 1; n <= info.pageCount; n += 1) {
      const id = `p_${info.fileId}_${n}`;
      if (!keptIds.has(id)) {
        fresh.push({
          id,
          sourceFileId: info.fileId,
          sourcePageNumber: n,
          displayOrder: 0,
          rotation: 0,
          isDeleted: false,
          isSelected: false,
        });
      }
    }
  }
  return reindexVisible([...kept, ...fresh]);
}

function editorReducer(
  state: MergeEditorState,
  action: MergeAction,
): MergeEditorState {
  switch (action.type) {
    case "filesAdded": {
      const fileInfos = [...state.fileInfos, ...action.infos];
      return { ...state, fileInfos, pages: rebuildPages(fileInfos, state.pages) };
    }

    case "fileRemoved": {
      const fileInfos = state.fileInfos.filter((f) => f.fileId !== action.fileId);
      return { ...state, fileInfos, pages: rebuildPages(fileInfos, state.pages) };
    }

    case "setPages":
      return { ...state, pages: reindexVisible(action.pages) };

    case "reorder": {
      const { activeId, overId } = action;
      if (activeId === overId) return state;
      const visible = state.pages.filter((p) => !p.isDeleted);
      const from = visible.findIndex((p) => p.id === activeId);
      const to = visible.findIndex((p) => p.id === overId);
      if (from === -1 || to === -1) return state;
      const reordered = arrayMove(visible, from, to);
      return { ...state, pages: reindexVisible(reordered) };
    }

    case "toggleSelect":
      return {
        ...state,
        pages: state.pages.map((p) =>
          p.id === action.pageId ? { ...p, isSelected: !p.isSelected } : p,
        ),
      };

    case "selectAll":
      return {
        ...state,
        pages: state.pages.map((p) =>
          p.isDeleted ? p : { ...p, isSelected: true },
        ),
      };

    case "clearSelection":
      return {
        ...state,
        pages: state.pages.map((p) => ({ ...p, isSelected: false })),
      };

    case "rotate":
      return {
        ...state,
        pages: state.pages.map((p) =>
          p.id === action.pageId
            ? { ...p, rotation: rotate(p.rotation, action.direction) }
            : p,
        ),
      };

    case "rotateSelected":
      return {
        ...state,
        pages: state.pages.map((p) =>
          p.isSelected && !p.isDeleted
            ? { ...p, rotation: rotate(p.rotation, action.direction) }
            : p,
        ),
      };

    case "delete":
      return {
        ...state,
        pages: reindexVisible(
          state.pages.map((p) =>
            p.id === action.pageId
              ? { ...p, isDeleted: true, isSelected: false }
              : p,
          ),
        ),
      };

    case "deleteSelected":
      return {
        ...state,
        pages: reindexVisible(
          state.pages.map((p) =>
            p.isSelected && !p.isDeleted
              ? { ...p, isDeleted: true, isSelected: false }
              : p,
          ),
        ),
      };

    case "restore":
      return {
        ...state,
        pages: reindexVisible(
          state.pages.map((p) =>
            p.id === action.pageId ? { ...p, isDeleted: false } : p,
          ),
        ),
      };

    case "restoreAll":
      return {
        ...state,
        pages: reindexVisible(state.pages.map((p) => ({ ...p, isDeleted: false }))),
      };

    case "move": {
      const visible = state.pages.filter((p) => !p.isDeleted);
      const index = visible.findIndex((p) => p.id === action.pageId);
      const next = index + action.direction;
      if (index === -1 || next < 0 || next >= visible.length) return state;
      const reordered = arrayMove(visible, index, next);
      return { ...state, pages: reindexVisible(reordered) };
    }

    default:
      return state;
  }
}

export function useMergeState() {
  const [editor, dispatch] = useReducer(editorReducer, {
    fileInfos: [],
    pages: [],
  });
  const [pageSize, setPageSize] = useState<PageSizeOption>("original");

  /** Swaps the whole file set (used when starting a new task). */
  const resetEditor = useCallback(() => {
    dispatch({ type: "setPages", pages: [] });
  }, []);

  return {
    editor,
    dispatch,
    pageSize,
    setPageSize,
    resetEditor,
  };
}
