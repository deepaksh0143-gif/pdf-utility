/**
 * Validation API call for the PDF to Image tool. The server validates the
 * document (signature, parseability, encryption, page count) and stores
 * nothing — conversion happens entirely in the browser.
 */
import type { AppErrorDto } from "@/types/errors";
import { ApiError } from "./jobs-api";

export interface ValidationResult {
  fileName: string;
  size: number;
  pageCount: number;
}

export async function validateOnServer(
  file: File,
  signal?: AbortSignal,
): Promise<ValidationResult> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/validate", {
    method: "POST",
    body,
    signal,
  }).catch(() => {
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "Connection lost while validating the file. Please try again.",
    });
  });

  if (!response.ok) {
    let dto: AppErrorDto = {
      code: "NETWORK_ERROR",
      message: "Connection problem. Please try again.",
    };
    try {
      const parsed = await response.json();
      if (parsed?.error?.code && parsed?.error?.message) dto = parsed.error;
    } catch {
      // keep default
    }
    throw new ApiError(dto);
  }

  return (await response.json()) as ValidationResult;
}
