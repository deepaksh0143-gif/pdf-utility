/**
 * Client-safe limits mirror the PRD values (they are public product limits,
 * not secrets). Server limits are authoritative; these exist to give
 * instant frontend feedback (AGENTS.md §10).
 */
export const clientLimits = {
  maxFileSizeMb: 50,
  maxFilesPerSession: 20,
  maxTotalPages: 100,
};

export const ACCEPTED_PDF_MIME = "application/pdf";
