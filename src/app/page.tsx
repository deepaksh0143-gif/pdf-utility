import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Free PDF Tools — Merge PDFs & Convert PDF to Image",
  description:
    "Merge PDF files with a visual page organizer and convert PDF pages to JPG, PNG or WEBP. Free, no signup, files automatically deleted within one hour.",
  alternates: { canonical: "/" },
};

const TRUST_INDICATORS = [
  { icon: "✓", label: "Free to use" },
  { icon: "✓", label: "No account required" },
  { icon: "✓", label: "Secure processing" },
  { icon: "✓", label: "Files automatically deleted" },
];

const FAQS = [
  {
    q: "Is the tool free?",
    a: "Yes. Every tool on this site is completely free to use, with no hidden limits beyond the documented file and page limits.",
  },
  {
    q: "Do I need an account?",
    a: "No. There is no signup, no login and no user profile. Open the tool and start working.",
  },
  {
    q: "How large can my PDF be?",
    a: "Each PDF can be up to 50 MB. For merging, you can combine up to 20 PDFs with a total of 100 pages per task.",
  },
  {
    q: "How many PDFs can I merge?",
    a: "Up to 20 PDFs per task, with a combined maximum of 100 pages.",
  },
  {
    q: "When are files deleted?",
    a: "Uploaded and generated files are temporary and are automatically deleted within one hour — usually much sooner once your task is finished or cancelled.",
  },
  {
    q: "Are password-protected PDFs supported?",
    a: "Not in this version. Password-protected PDFs are rejected safely — we never attempt to bypass document security. Please upload an unlocked PDF.",
  },
  {
    q: "Can I use the tool on mobile?",
    a: "Yes. Both tools are fully responsive and usable on phones and tablets, including page organization with touch-friendly controls.",
  },
];

function FaqJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function HomePage() {
  return (
    <div>
      <FaqJsonLd />

      {/* Hero */}
      <section className="border-b border-border bg-white">
        <Container className="py-16 text-center sm:py-24">
          <p className="mx-auto max-w-xl rounded-full border border-border bg-surface-muted px-4 py-1 text-sm text-ink-500">
            Fast, simple PDF tools without unnecessary complexity
          </p>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
            Merge PDFs. Organize pages. Convert to images.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-500">
            Combine multiple PDFs, rearrange individual pages, rotate, extract
            and convert — right in your browser, in a few clicks.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LinkButton href="/merge-pdf" size="lg" className="w-full sm:w-auto">
              Merge PDFs
            </LinkButton>
            <LinkButton
              href="/pdf-to-image"
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              Convert PDF to Image
            </LinkButton>
          </div>
          <ul className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-500">
            {TRUST_INDICATORS.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="font-bold text-success-600">
                  {item.icon}
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Tools */}
      <section aria-labelledby="tools-heading" className="py-16">
        <Container>
          <h2
            id="tools-heading"
            className="text-center text-3xl font-bold tracking-tight text-ink-900"
          >
            Choose a tool
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <article className="flex flex-col rounded-2xl border border-border bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-xl text-primary-700"
              >
                +
              </span>
              <h3 className="mt-5 text-xl font-semibold text-ink-900">
                Merge PDF
              </h3>
              <p className="mt-2 flex-1 text-ink-500">
                Combine, organize, rotate, and extract PDF pages.
              </p>
              <div className="mt-6">
                <LinkButton href="/merge-pdf">Merge PDFs</LinkButton>
              </div>
            </article>

            <article className="flex flex-col rounded-2xl border border-border bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-xl text-primary-700"
              >
                ⇄
              </span>
              <h3 className="mt-5 text-xl font-semibold text-ink-900">
                PDF to Image
              </h3>
              <p className="mt-2 flex-1 text-ink-500">
                Convert PDF pages into JPG, PNG, or WEBP images.
              </p>
              <div className="mt-6">
                <LinkButton href="/pdf-to-image">Convert PDF</LinkButton>
              </div>
            </article>
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section
        aria-labelledby="how-heading"
        className="border-y border-border bg-white py-16"
      >
        <Container>
          <h2
            id="how-heading"
            className="text-center text-3xl font-bold tracking-tight text-ink-900"
          >
            How it works
          </h2>
          <ol className="mx-auto mt-10 grid max-w-4xl gap-8 sm:grid-cols-3">
            {[
              { title: "Upload", text: "Select or drop your PDF files." },
              {
                title: "Organize or convert",
                text: "Arrange pages, rotate, or pick an image format.",
              },
              {
                title: "Download",
                text: "Preview the result and save it to your device.",
              },
            ].map((step, index) => (
              <li key={step.title} className="text-center">
                <span
                  aria-hidden="true"
                  className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 font-bold text-white"
                >
                  {index + 1}
                </span>
                <h3 className="mt-4 font-semibold text-ink-900">{step.title}</h3>
                <p className="mt-1 text-sm text-ink-500">{step.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Features */}
      <section aria-labelledby="features-heading" className="py-16">
        <Container>
          <h2
            id="features-heading"
            className="text-center text-3xl font-bold tracking-tight text-ink-900"
          >
            Built for getting things done
          </h2>
          <ul className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "No account required",
              "Free to use",
              "PDF preview before you download",
              "Visual page organization",
              "JPG, PNG and WEBP output",
              "Automatic file deletion",
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 rounded-xl border border-border bg-white p-4 text-sm text-ink-700"
              >
                <span aria-hidden="true" className="font-bold text-success-600">
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Use cases (SEO content) */}
      <section
        aria-labelledby="usecases-heading"
        className="border-y border-border bg-white py-16"
      >
        <Container className="max-w-4xl">
          <h2
            id="usecases-heading"
            className="text-center text-3xl font-bold tracking-tight text-ink-900"
          >
            Made for everyday documents
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="font-semibold text-ink-900">Students</h3>
              <p className="mt-2 text-sm text-ink-500">
                Combine lecture notes, merge assignment cover pages, extract
                single chapters, or convert slides into images for study
                flashcards.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-ink-900">Office work</h3>
              <p className="mt-2 text-sm text-ink-500">
                Assemble reports from multiple sources, remove scanned blank
                pages, reorder sections before a deadline, or export invoice
                pages as images for expense systems.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-ink-900">Business documents</h3>
              <p className="mt-2 text-sm text-ink-500">
                Prepare contracts for signature by merging exhibits, normalize
                mixed page sizes to A4 or Letter, and hand over clean,
                single-file documents.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-ink-900">Personal files</h3>
              <p className="mt-2 text-sm text-ink-500">
                Merge scanned certificates, keep only the pages you need, or
                turn a PDF manual into phone-friendly images — without
                installing any software.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Privacy */}
      <section aria-labelledby="privacy-heading" className="py-16">
        <Container className="max-w-4xl">
          <h2
            id="privacy-heading"
            className="text-center text-3xl font-bold tracking-tight text-ink-900"
          >
            Your files stay private
          </h2>
          <ul className="mx-auto mt-10 grid gap-4 sm:grid-cols-2">
            {[
              "Files may be temporarily stored for processing only.",
              "Files are automatically deleted within one hour.",
              "Files are not retained as user history — there is no history at all.",
              "No account is required, so there is nothing to link your documents to.",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl border border-border bg-white p-4 text-sm text-ink-700"
              >
                <span aria-hidden="true" className="font-bold text-success-600">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-sm text-ink-500">
            Read the full{" "}
            <Link className="font-medium text-primary-700 underline" href="/privacy">
              privacy notice
            </Link>
            .
          </p>
        </Container>
      </section>

      {/* FAQ */}
      <section
        aria-labelledby="faq-heading"
        className="border-t border-border bg-white py-16"
      >
        <Container className="max-w-3xl">
          <h2
            id="faq-heading"
            className="text-center text-3xl font-bold tracking-tight text-ink-900"
          >
            Frequently asked questions
          </h2>
          <div className="mt-10 space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-border bg-surface-muted p-4 open:bg-white"
              >
                <summary className="cursor-pointer list-none font-semibold text-ink-900 marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {faq.q}
                    <span
                      aria-hidden="true"
                      className="text-ink-500 transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-ink-500">{faq.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
