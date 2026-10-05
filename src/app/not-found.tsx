import Link from "next/link";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">
        404
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-ink-900">
        Page not found
      </h1>
      <p className="mx-auto mt-3 max-w-md text-ink-500">
        The page you are looking for doesn&apos;t exist or has moved. The tools
        themselves are one click away.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/merge-pdf"
          className="inline-flex min-h-11 items-center rounded-lg bg-primary-600 px-5 font-medium text-white hover:bg-primary-700"
        >
          Merge PDFs
        </Link>
        <Link
          href="/pdf-to-image"
          className="inline-flex min-h-11 items-center rounded-lg border border-border bg-white px-5 font-medium text-ink-900 hover:bg-surface-muted"
        >
          Convert PDF to Image
        </Link>
      </div>
    </Container>
  );
}
