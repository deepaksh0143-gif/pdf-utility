import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms of use for the free online PDF tools: fair use of the service, no warranty and limitation of liability.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <Container className="max-w-3xl py-16">
      <h1 className="text-4xl font-bold tracking-tight text-ink-900">
        Terms of Use
      </h1>
      <div className="mt-8 space-y-6 text-ink-700">
        <section aria-labelledby="service">
          <h2 id="service" className="text-xl font-semibold text-ink-900">
            The service
          </h2>
          <p className="mt-2">
            This website provides free PDF utilities that run without an
            account. The service is provided as-is and may enforce limits (file
            size, file count, page count, processing time) to stay fast and
            available for everyone.
          </p>
        </section>

        <section aria-labelledby="acceptable-use">
          <h2 id="acceptable-use" className="text-xl font-semibold text-ink-900">
            Acceptable use
          </h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Only upload documents you have the right to process.</li>
            <li>
              Do not attempt to disrupt, overload or circumvent the limits of
              the service.
            </li>
            <li>
              Do not upload content that is unlawful or that contains malware.
            </li>
            <li>
              Automated access is rate limited; please contact us if you need
              higher volumes.
            </li>
          </ul>
        </section>

        <section aria-labelledby="no-warranty">
          <h2 id="no-warranty" className="text-xl font-semibold text-ink-900">
            No warranty
          </h2>
          <p className="mt-2">
            The tools are provided without warranty of any kind. Always keep
            your own copy of uploaded documents. Temporary files are deleted
            automatically within one hour, and results that are not downloaded
            within that period cannot be recovered.
          </p>
        </section>

        <section aria-labelledby="liability">
          <h2 id="liability" className="text-xl font-semibold text-ink-900">
            Limitation of liability
          </h2>
          <p className="mt-2">
            To the maximum extent permitted by law, we are not liable for any
            damages or data loss arising from the use of this service.
          </p>
        </section>
      </div>
    </Container>
  );
}
