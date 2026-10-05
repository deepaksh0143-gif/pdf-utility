/** Conversion presets for the PDF to Image tool (PRD §15/§16). */
export type ImageFormat = "jpg" | "png" | "webp";
export type ImageQuality = "low" | "medium" | "high";

export const IMAGE_FORMATS: readonly ImageFormat[] = ["jpg", "png", "webp"];
export const IMAGE_QUALITIES: readonly ImageQuality[] = ["low", "medium", "high"];

/**
 * Maps UI quality labels to render scale + encoder settings.
 * PNG ignores JPEG-style quality; its quality setting maps to render
 * resolution (TDD §15).
 */
export const IMAGE_QUALITY_PRESETS: Record<
  ImageQuality,
  { renderScale: number; encoderQuality: number }
> = {
  low: { renderScale: 1, encoderQuality: 0.5 },
  medium: { renderScale: 1.5, encoderQuality: 0.75 },
  high: { renderScale: 2, encoderQuality: 0.92 },
};

export const IMAGE_FORMAT_LABELS: Record<ImageFormat, string> = {
  jpg: "JPG",
  png: "PNG",
  webp: "WEBP",
};

export function imageExtension(format: ImageFormat): string {
  return format === "jpg" ? "jpg" : format;
}

export function imageMimeType(format: ImageFormat): string {
  switch (format) {
    case "jpg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
  }
}
