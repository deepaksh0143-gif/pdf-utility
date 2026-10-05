/**
 * File name helpers shared by merge output and image downloads.
 * The user may customize the base name; extensions are enforced safely.
 */

const ILLEGAL_FILENAME_CHARS = /[/\\?%*:|"<>]/g;

/** Strips path separators and other characters unsafe in downloads. */
export function sanitizeBaseName(input: string, fallback = "document"): string {
  const cleaned = input
    .normalize("NFKD")
    .replace(ILLEGAL_FILENAME_CHARS, "")
    .replace(/[\u0000-\u001f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^\.+/, ""); // Never allow leading dots (hidden files / traversal).
  return cleaned.length > 0 ? cleaned.slice(0, 80) : fallback;
}

/** Removes a trailing extension (keeps names like "my.v2.file" mostly intact). */
export function stripExtension(name: string): string {
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === name.length - 1) return name;
  const ext = name.slice(lastDot + 1).toLowerCase();
  const knownExtensions = new Set([
    "pdf", "jpg", "jpeg", "png", "webp", "zip",
  ]);
  return knownExtensions.has(ext) ? name.slice(0, lastDot) : name;
}

/** Builds "{base}.{ext}", sanitizing the base name. */
export function buildFilename(base: string, extension: string): string {
  return `${sanitizeBaseName(stripExtension(base))}.${extension}`;
}
