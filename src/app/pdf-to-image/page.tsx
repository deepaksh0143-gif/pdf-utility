import type { Metadata } from "next";
import { PdfToImageFeature } from "@/features/pdf-to-image/PdfToImageFeature";

export const metadata: Metadata = {
  title: "PDF to Image — Convert PDF Pages to JPG, PNG or WEBP",
  description:
    "Convert PDF pages to JPG, PNG or WEBP images with quality control. Preview every page and download individually or as a ZIP. Free, no account.",
  alternates: { canonical: "/pdf-to-image" },
};

export default function PdfToImagePage() {
  return <PdfToImageFeature />;
}
