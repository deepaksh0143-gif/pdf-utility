# PDF Utility — Free online PDF tools

Merge PDFs with a visual page organizer, and convert PDF pages to JPG, PNG or
WEBP images. Free, no account, privacy-first: temporary files are deleted
automatically within one hour.

Built with Next.js 15, React 19, TypeScript and Tailwind CSS.

## Getting started

No API keys or third-party service credentials are required.

```bash
npm install
npm run dev
```

Optional tuning (limits, rate limiting, cleanup interval) — see
[`.env.example`](./.env.example). Copy it to `.env.local` to override defaults.

## Scripts

| Script            | Purpose                              |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the development server         |
| `npm run build`   | Production build                     |
| `npm start`       | Serve the production build           |
| `npm run typecheck` | TypeScript strict type checking    |
| `npm test`        | Run unit tests (vitest)              |

## Architecture

- `src/app` — routes (App Router): homepage, `/merge-pdf`, `/pdf-to-image`,
  `/privacy`, `/terms`, `/contact`
- `src/components` — reusable UI (layout, upload, pdf, editor, processing,
  download, ui)
- `src/features` — feature-level state and orchestration (merge, pdf-to-image)
- `src/services` — PDF processing (client + server), job API client, storage
- `src/lib` — rate limiting, session, logging, errors
- `src/types` — shared typed contracts (page model, jobs, files)
- `src/utils` — pure helpers (formatting, filenames, id generation)

Processing is hybrid per the TDD: merge/extract run server-side with `pdf-lib`;
PDF→Image conversion renders in the browser with `pdf.js` after mandatory
server-side validation, so converted images never touch the server. Temporary
job files are deleted automatically within one hour.

## Security

- Layered validation (client + server): extension, MIME, `%PDF-` signature,
  parseability, encryption, page count, size, count
- Encrypted/password-protected PDFs are rejected — never bypassed
- Per-IP, per-route rate limiting (configurable, not hardcoded)
- Strict security headers + per-request CSP nonces in production
- No document content is ever logged; errors are categorized, not leaked
