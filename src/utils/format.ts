/** Formats a byte count using binary units (1 KB = 1024 bytes). */
export function formatBytes(bytes: number, fractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(fractionDigits)} ${units[unitIndex]}`;
}

/** True when the value is a whole number of bytes. */
export function isWholeBytes(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && Number.isInteger(value);
}
