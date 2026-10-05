import type { Metadata } from "next";
import { MergeFeature } from "@/features/merge/MergeFeature";

export const metadata: Metadata = {
  title: "Merge PDF — Combine & Organize Pages",
  description:
    "Merge up to 20 PDF files, organize pages visually, rotate, delete, restore and extract pages. Free, no account, files deleted within one hour.",
  alternates: { canonical: "/merge-pdf" },
};

export default function MergePdfPage() {
  return <MergeFeature />;
}
