/** A PDF that passed server-side validation and is staged temporarily. */
export interface UploadedFileInfo {
  /** Server-assigned id (safe to use in API calls). */
  fileId: string;
  name: string;
  size: number;
  pageCount: number;
}
