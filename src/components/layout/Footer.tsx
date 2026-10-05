import Link from "next/link";
import { Container } from "@/components/ui/Container";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-border bg-white">
      <Container className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-sm font-bold text-ink-900">PDF Utility.tools</p>
          <p className="mt-2 max-w-xs text-sm text-ink-500">
            Free, privacy-focused PDF tools. Files are processed quickly and
            deleted automatically within one hour.
          </p>
        </div>
        <nav aria-label="Footer tools" className="text-sm">
          <p className="font-semibold text-ink-900">Tools</p>
          <ul className="mt-2 space-y-2">
            <li>
              <Link className="text-ink-500 hover:text-primary-700" href="/merge-pdf">
                Merge PDF + Page Organizer
              </Link>
            </li>
            <li>
              <Link className="text-ink-500 hover:text-primary-700" href="/pdf-to-image">
                PDF to Image
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Footer legal" className="text-sm">
          <p className="font-semibold text-ink-900">About</p>
          <ul className="mt-2 space-y-2">
            <li>
              <Link className="text-ink-500 hover:text-primary-700" href="/privacy">
                Privacy
              </Link>
            </li>
            <li>
              <Link className="text-ink-500 hover:text-primary-700" href="/terms">
                Terms
              </Link>
            </li>
            <li>
              <Link className="text-ink-500 hover:text-primary-700" href="/contact">
                Contact
              </Link>
            </li>
          </ul>
        </nav>
      </Container>
      <div className="border-t border-border py-4">
        <Container className="text-xs text-ink-500">
          © {year} PDF Utility.tools — Free online PDF tools. No account required.
        </Container>
      </div>
    </footer>
  );
}
