/** Extra rotation applied by the user, in degrees clockwise. */
export type Rotation = 0 | 90 | 180 | 270;

/** Output page size option (PRD §11). */
export type PageSizeOption = "original" | "a4" | "letter";

/**
 * Non-destructive page record (AGENTS.md §7).
 * Original PDFs are never modified; edits live here and are applied
 * only when the final PDF is generated.
 */
export interface OrganizerPage {
  id: string;
  sourceFileId: string;
  /** 1-based page number inside the source PDF. */
  sourcePageNumber: number;
  /** 0-based position in the final document. */
  displayOrder: number;
  /** Additional clockwise rotation chosen by the user. */
  rotation: Rotation;
  isDeleted: boolean;
  isSelected: boolean;
}

/** Instruction sent to the server to build one page of the output PDF. */
export interface FinalPageInstruction {
  sourceFileId: string;
  sourcePageNumber: number;
  rotation: Rotation;
}

/** Target page sizes in PDF points (72 dpi). A4: 210×297mm, Letter: 8.5×11in. */
export const PAGE_SIZE_PRESETS: Record<
  Exclude<PageSizeOption, "original">,
  { widthPt: number; heightPt: number }
> = {
  a4: { widthPt: 595.28, heightPt: 841.89 },
  letter: { widthPt: 612, heightPt: 792 },
};
