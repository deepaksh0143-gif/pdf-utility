import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "How to reach the team behind the free online PDF tools for feedback, bug reports or questions.",
  alternates: { canonical: "/contact" },
};

/**
 * Static contact page (mailto) — the MVP has no user accounts or
 * server-side message storage, so no backend form handling is required.
 * Set NEXT_PUBLIC_CONTACT_EMAIL in the environment to customize.
 */
export default function ContactPage() {
  const email =
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@example.com";

  return (
    <Container className="max-w-3xl py-16">
      <h1 className="text-4xl font-bold tracking-tight text-ink-900">
        Contact
      </h1>
      <p className="mt-4 text-ink-700">
        Feedback, bug reports and feature suggestions are welcome. The fastest
        way to reach us is by email:
      </p>
      <p className="mt-4">
        <a
          href={`mailto:${email}`}
          className="inline-flex min-h-11 items-center rounded-lg bg-primary-600 px-5 font-medium text-white hover:bg-primary-700"
        >
          Email us
        </a>
      </p>
      <div className="mt-10 rounded-xl border border-border bg-white p-6 text-sm text-ink-500">
        <p className="font-semibold text-ink-900">Before you write</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            We can&apos;t recover files — temporary files are deleted
            automatically within one hour, and we never keep copies.
          </li>
          <li>
            Include the tool you used (Merge PDF / PDF to Image), the browser
            and a short description of what happened.
          </li>
          <li>
            Never attach confidential documents to bug reports.
          </li>
        </ul>
      </div>
    </Container>
  );
}
