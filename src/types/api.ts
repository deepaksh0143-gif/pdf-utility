import type { FinalPageInstruction, PageSizeOption } from "./pages";

/** Request body for POST /api/jobs (merge and extract both). */
export interface CreateJobRequest {
  type: "merge" | "extract";
  fileIds: string[];
  /** Final page sequence; omitted pages are simply not included. */
  pages: FinalPageInstruction[];
  outputFilename?: string;
  pageSize?: PageSizeOption;
}
