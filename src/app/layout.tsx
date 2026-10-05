import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Free PDF Tools — Merge PDFs & Convert PDF to Image",
    template: "%s | PDF Utility.tools",
  },
  description:
    "Free online PDF tools: merge PDFs with a visual page organizer and convert PDF pages to JPG, PNG or WEBP images. No account required, files deleted within one hour.",
  keywords: [
    "merge pdf",
    "pdf to image",
    "pdf organizer",
    "extract pdf pages",
    "free pdf tools",
  ],
  openGraph: {
    type: "website",
    siteName: "PDF Utility.tools",
    title: "Free PDF Tools — Merge PDFs & Convert PDF to Image",
    description:
      "Merge PDFs with a visual page organizer, or convert PDF pages to images. Free, no account required, automatic file deletion.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="sr-only-focusable absolute left-4 top-2 z-50 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white"
        >
          Skip to main content
        </a>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
