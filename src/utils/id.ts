import { randomBytes } from "node:crypto";

/**
 * Cryptographically random identifier with a short prefix, e.g. "job_a1b2c3d4e5".
 * Uses the Web-standard crypto API available in Node 18+ and browsers.
 */
export function generateId(prefix: string, byteLength = 10): string {
  const bytes = randomBytes(byteLength);
  const id = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${id}`;
}
