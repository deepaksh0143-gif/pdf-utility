import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How this website handles your files: temporary processing storage, automatic deletion within one hour, no accounts and no document history.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <Container className="max-w-3xl py-16">
      <h1 className="text-4xl font-bold tracking-tight text-ink-900">Privacy</h1>
      <div className="mt-8 space-y-6 text-ink-700">
        <section aria-labelledby="files">
          <h2 id="files" className="text-xl font-semibold text-ink-900">
            How we handle your files
          </h2>
          <p className="mt-2">
            When you upload a PDF, it is stored temporarily on our server only
            for as long as it takes to validate and process it. Generated
            results (merged PDFs) are stored temporarily so you can download
            them.
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>
              All uploaded and generated files are <strong>automatically
              deleted within one hour</strong> — usually sooner.
            </li>
            <li>
              Files are <strong>not retained as user history</strong>. There is
              no document history, because there are no user accounts.
            </li>
            <li>
              We never look at, share or sell your documents. Document content
              is never logged.
            </li>
            <li>
              For the PDF to Image tool, conversion happens in your browser:
              your PDF is validated by the server, but the pages never leave
              your device.
            </li>
          </ul>
        </section>

        <section aria-labelledby="accounts">
          <h2 id="accounts" className="text-xl font-semibold text-ink-900">
            No accounts, no tracking of documents
          </h2>
          <p className="mt-2">
            This site works entirely without signup or login. We use a single
            anonymous session cookie that contains a random token so your task
            belongs to your browser tab session — it holds no identity, no
            document data and no credentials. Session data disappears when the
            session ends or expires.
          </p>
        </section>

        <section aria-labelledby="logs">
          <h2 id="logs" className="text-xl font-semibold text-ink-900">
            Operational logs
          </h2>
          <p className="mt-2">
            We keep minimal operational logs (for example: an anonymous task
            ID, an error category, a timestamp and processing duration) to keep
            the service working and prevent abuse. These logs never contain
            document content or document text.
          </p>
        </section>

        <section aria-labelledby="security">
          <h2 id="security" className="text-xl font-semibold text-ink-900">
            Security
          </h2>
          <p className="mt-2">
            Uploaded files are validated server-side (file type, signature,
            structure and encryption) before processing. Encrypted or
            password-protected PDFs are rejected — we never attempt to bypass
            document security. Access to temporary files is restricted, and
            every download is checked against the anonymous session that
            created it.
          </p>
        </section>

        <section aria-labelledby="contact">
          <h2 id="contact" className="text-xl font-semibold text-ink-900">
            Questions
          </h2>
          <p className="mt-2">
            If you have questions about this notice, use the details on our{" "}
            <a className="font-medium text-primary-700 underline" href="/contact">
              contact page
            </a>
            .
          </p>
        </section>
      </div>
    </Container>
  );
}
