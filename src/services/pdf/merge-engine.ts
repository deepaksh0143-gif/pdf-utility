/**
 * Server-side merge/extract PDF engine (TDD §11–§13).
 * Builds a NEW document from final page instructions — original files are
 * never modified (AGENTS.md §7). Rotation, ordering, page-size normalization
 * and page copying are all applied here, driven purely by metadata.
 *
 * Rotation semantics (PDF spec):
 * - /Rotate is a CLOCKWISE display rotation applied by viewers.
 * - drawPage transform rotation is COUNTER-clockwise (PDF math convention).
 * - embedPage() drops the source page's /Rotate, so it must be re-applied
 *   manually (this is a known pdf-lib behaviour).
 */
import { PDFDocument, PDFPage, degrees } from "pdf-lib";
import type {
  FinalPageInstruction,
  PageSizeOption,
  Rotation,
} from "@/types/pages";
import { PAGE_SIZE_PRESETS } from "@/types/pages";

export interface MergePageSource {
  bytes: Buffer;
}

export interface MergeProgressHooks {
  onPage?: (completedPages: number, totalPages: number) => void;
  shouldCancel?: () => boolean;
}

export class MergeCancelledError extends Error {
  constructor() {
    super("Merge cancelled");
    this.name = "MergeCancelledError";
  }
}

function normalizedRotation(rotation: number): number {
  return ((Math.round(rotation) % 360) + 360) % 360;
}

/**
 * Draws `embedded` (raw, unrotated content of size drawWidth×drawHeight)
 * rotated CLOCKWISE by `totalRotation` and centered on a canvas of
 * canvasWidth×canvasHeight. Returns the draw options for page.drawPage.
 *
 * Derivation (clockwise rotation about the anchor, PDF y-up):
 * rot 0:   box [x, x+dw] × [y, y+dh]            → x=(W-dw)/2, y=(H-dh)/2
 * rot 90:  box [x, x+dh] × [y-dw, y]            → x=(W-dh)/2, y=(H+dw)/2
 * rot 180: box [x-dw, x] × [y-dh, y]            → x=(W+dw)/2, y=(H+dh)/2
 * rot 270: box [x-dh, x] × [y, y+dw]            → x=(W+dh)/2, y=(H-dw)/2
 */
function centeredDrawOptions(
  canvasWidth: number,
  canvasHeight: number,
  drawWidth: number,
  drawHeight: number,
  totalRotation: number,
): Parameters<PDFPage["drawPage"]>[1] {
  const rotation = normalizedRotation(totalRotation);
  // Clockwise rotation for drawPage transforms.
  const transformAngle = (360 - rotation) % 360;

  let x: number;
  let y: number;
  switch (rotation) {
    case 90:
      x = (canvasWidth - drawHeight) / 2;
      y = (canvasHeight + drawWidth) / 2;
      break;
    case 180:
      x = (canvasWidth + drawWidth) / 2;
      y = (canvasHeight + drawHeight) / 2;
      break;
    case 270:
      x = (canvasWidth + drawHeight) / 2;
      y = (canvasHeight - drawWidth) / 2;
      break;
    default:
      x = (canvasWidth - drawWidth) / 2;
      y = (canvasHeight - drawHeight) / 2;
  }

  return { x, y, width: drawWidth, height: drawHeight, rotate: degrees(transformAngle) };
}

/**
 * "Preserve original" mode: copy the page at its own MediaBox size and
 * carry ALL rotation (source /Rotate + user rotation) as the output page's
 * /Rotate metadata — exactly how native PDF tools rotate pages. Viewers
 * swap the displayed dimensions automatically.
 */
function placeOriginal(
  out: PDFDocument,
  embedded: Awaited<ReturnType<typeof out.embedPage>>,
  sourceWidth: number,
  sourceHeight: number,
  totalRotation: number,
): void {
  const page = out.addPage([sourceWidth, sourceHeight]);
  page.drawPage(embedded, {
    x: 0,
    y: 0,
    width: sourceWidth,
    height: sourceHeight,
  });
  const rotation = normalizedRotation(totalRotation);
  if (rotation !== 0) {
    page.setRotation(degrees(rotation));
  }
}

/**
 * A4/Letter mode: scale to fit the target sheet (aspect ratio preserved,
 * never stretched), centered, with all rotation baked into the draw
 * transform so the output page itself stays a clean A4/Letter sheet.
 */
function placeNormalized(
  out: PDFDocument,
  embedded: Awaited<ReturnType<typeof out.embedPage>>,
  sourceWidth: number,
  sourceHeight: number,
  sourceRotation: number,
  userRotation: Rotation,
  mode: Exclude<PageSizeOption, "original">,
): void {
  const preset = PAGE_SIZE_PRESETS[mode];
  const canvasWidth = preset.widthPt;
  const canvasHeight = preset.heightPt;

  // Effective (post-rotation) display size of the source page.
  const sourceRotationN = normalizedRotation(sourceRotation);
  const quarterTurn = sourceRotationN % 180 !== 0;
  const effectiveWidth = quarterTurn ? sourceHeight : sourceWidth;
  const effectiveHeight = quarterTurn ? sourceWidth : sourceHeight;

  const scale = Math.min(
    canvasWidth / effectiveWidth,
    canvasHeight / effectiveHeight,
  );
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;

  const totalRotation = normalizedRotation(sourceRotationN + userRotation);
  const page = out.addPage([canvasWidth, canvasHeight]);
  page.drawPage(
    embedded,
    centeredDrawOptions(canvasWidth, canvasHeight, drawWidth, drawHeight, totalRotation),
  );
}

/**
 * Generates the output PDF from final page instructions.
 * `instructions` already reflect the user's ordering, deletions and
 * extraction selection — this function applies rotation and page size.
 */
export async function generateMergedPdf(
  sources: Map<string, MergePageSource>,
  instructions: FinalPageInstruction[],
  options: { pageSize: PageSizeOption },
  hooks: MergeProgressHooks = {},
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const loadedSources = new Map<string, PDFDocument>();
  const embeddedPages = new Map<
    string,
    Awaited<ReturnType<typeof out.embedPage>>
  >();

  const loadSource = async (fileId: string): Promise<PDFDocument> => {
    let doc = loadedSources.get(fileId);
    if (!doc) {
      const src = sources.get(fileId);
      if (!src) throw new Error(`Missing source file: ${fileId}`);
      doc = await PDFDocument.load(src.bytes, { ignoreEncryption: false });
      loadedSources.set(fileId, doc);
    }
    return doc;
  };

  const embedOnce = async (
    fileId: string,
    pageIndex: number,
  ): Promise<Awaited<ReturnType<typeof out.embedPage>>> => {
    const key = `${fileId}:${pageIndex}`;
    let embedded = embeddedPages.get(key);
    if (!embedded) {
      const doc = await loadSource(fileId);
      embedded = await out.embedPage(doc.getPage(pageIndex));
      embeddedPages.set(key, embedded);
    }
    return embedded;
  };

  for (let i = 0; i < instructions.length; i += 1) {
    if (hooks.shouldCancel?.()) throw new MergeCancelledError();

    const instruction = instructions[i];
    const pageIndex = instruction.sourcePageNumber - 1;
    const sourceDoc = await loadSource(instruction.sourceFileId);
    const sourcePage = sourceDoc.getPage(pageIndex);
    const embedded = await embedOnce(instruction.sourceFileId, pageIndex);

    const sourceWidth = sourcePage.getWidth();
    const sourceHeight = sourcePage.getHeight();
    const sourceRotation = normalizedRotation(sourcePage.getRotation().angle);
    const totalRotation = normalizedRotation(
      sourceRotation + instruction.rotation,
    );

    if (options.pageSize === "original") {
      placeOriginal(out, embedded, sourceWidth, sourceHeight, totalRotation);
    } else {
      placeNormalized(
        out,
        embedded,
        sourceWidth,
        sourceHeight,
        sourceRotation,
        instruction.rotation,
        options.pageSize,
      );
    }

    hooks.onPage?.(i + 1, instructions.length);
  }

  out.setProducer("PDF Utility");
  out.setCreator("PDF Utility");
  out.setCreationDate(new Date());

  return out.save({ useObjectStreams: true });
}
