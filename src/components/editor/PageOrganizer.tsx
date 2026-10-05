"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { PageCard } from "./PageCard";
import { Button } from "@/components/ui/Button";
import type { OrganizerPage } from "@/types/pages";

/**
 * Page organizer grid (TDD §10). dnd-kit provides pointer + keyboard
 * sortable coordinates (space to pick up, arrows to move) — drag-and-drop
 * is never the only method (AGENTS.md §8/§20).
 */
export function PageOrganizer({
  pages,
  filesMeta,
  thumbnails,
  onReorder,
  onToggleSelect,
  onRotate,
  onDelete,
  onRestore,
  onMove,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onRestoreAll,
  onRotateSelected,
}: {
  pages: OrganizerPage[];
  filesMeta: Map<string, { name: string; size: number }>;
  thumbnails: (fileId: string, pageNumber: number) => string | undefined;
  onReorder: (activeId: string, overId: string) => void;
  onToggleSelect: (pageId: string) => void;
  onRotate: (pageId: string, direction: "cw" | "ccw") => void;
  onDelete: (pageId: string) => void;
  onRestore: (pageId: string) => void;
  onMove: (pageId: string, direction: -1 | 1) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onRestoreAll: () => void;
  onRotateSelected: (direction: "cw" | "ccw") => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activePages = pages.filter((p) => !p.isDeleted);
  const deletedPages = pages.filter((p) => p.isDeleted);
  const selectedCount = pages.filter((p) => p.isSelected && !p.isDeleted).length;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  };

  return (
    <section aria-labelledby="organizer-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="organizer-heading" className="font-semibold text-ink-900">
          Pages
          <span className="ml-2 text-sm font-normal text-ink-500">
            {activePages.length} visible · {selectedCount} selected
            {deletedPages.length > 0 ? ` · ${deletedPages.length} deleted` : ""}
          </span>
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={onSelectAll}>
            Select all
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onClearSelection}
            disabled={selectedCount === 0}
          >
            Clear selection
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onRotateSelected("cw")}
            disabled={selectedCount === 0}
          >
            Rotate selected ↻
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onDeleteSelected}
            disabled={selectedCount === 0}
          >
            Delete selected
          </Button>
          {deletedPages.length > 0 ? (
            <Button size="sm" variant="secondary" onClick={onRestoreAll}>
              Restore all
            </Button>
          ) : null}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={activePages.map((p) => p.id)}
          strategy={rectSortingStrategy}
        >
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {activePages.map((page) => {
              const meta = filesMeta.get(page.sourceFileId);
              return (
                <PageCard
                  key={page.id}
                  page={page}
                  label={String(page.displayOrder + 1)}
                  fileName={meta?.name ?? "Unknown file"}
                  fileSize={meta?.size ?? 0}
                  thumbnail={thumbnails(page.sourceFileId, page.sourcePageNumber)}
                  hasSelection={selectedCount > 0}
                  onToggleSelect={onToggleSelect}
                  onRotate={onRotate}
                  onDelete={onDelete}
                  onRestore={onRestore}
                  onMove={onMove}
                />
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>

      {deletedPages.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-ink-900">
            Deleted pages
            <span className="ml-2 font-normal text-ink-500">
              restored before generating if left here — they are excluded until restored
            </span>
          </h3>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {deletedPages.map((page) => {
              const meta = filesMeta.get(page.sourceFileId);
              return (
                <PageCard
                  key={page.id}
                  page={page}
                  label={String(page.sourcePageNumber)}
                  fileName={meta?.name ?? "Unknown file"}
                  fileSize={meta?.size ?? 0}
                  hasSelection={selectedCount > 0}
                  onToggleSelect={onToggleSelect}
                  onRotate={onRotate}
                  onDelete={onDelete}
                  onRestore={onRestore}
                  onMove={onMove}
                />
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
