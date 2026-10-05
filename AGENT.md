________________________________________
# AGENTS.md

## 1. PROJECT MISSION

Build a modern, minimal, premium-quality public PDF utility website.

The MVP includes two core tools:

1. Merge PDF + Page Organizer
2. PDF to Image Converter

The product must be:

- Free to use
- Publicly accessible
- Usable without an account
- Privacy-focused
- Secure
- Responsive
- Accessible

The project must follow the Product Requirements Document (PRD) and Technical Design Document (TDD).

PRD defines WHAT to build.

TDD defines HOW to build it.

Do not invent major features outside those documents.

---

# 2. CORE DEVELOPMENT RULE

Never attempt to build the entire application in one implementation step.

Always use:

PLAN
↓
IMPLEMENT
↓
TEST
↓
REVIEW
↓
FIX
↓
VERIFY
↓
NEXT MILESTONE

A milestone must be stable before moving to the next milestone.

---

# 3. BEFORE WRITING CODE

Before implementing any new feature:

1. Inspect the existing project.
2. Understand the current architecture.
3. Identify affected files.
4. Check for existing reusable components.
5. Check dependencies already installed.
6. Identify potential conflicts.
7. Create a short implementation plan.

Do not duplicate existing functionality.

Do not rewrite unrelated working components.

---

# 4. PROJECT ARCHITECTURE RULES

Keep the following concerns separate:

UI
Business Logic
PDF Processing
API Communication
Job Management
Storage
Security

Preferred conceptual structure:

src/

app/
components/
features/
services/
lib/
hooks/
types/
utils/

Do not put complex PDF processing logic directly inside page components.

Do not put server secrets in frontend code.

---

# 5. TECHNOLOGY PREFERENCE

Preferred stack:

- Next.js
- React
- TypeScript
- Tailwind CSS

Use mature and actively maintained libraries where possible.

Before adding a dependency:

1. Check whether existing dependencies already solve the problem.
2. Avoid unnecessary packages.
3. Avoid abandoned packages.
4. Avoid packages with unclear licensing.
5. Prefer stable solutions.

---

# 6. MVP SCOPE

The application must provide:

## TOOL 1

Merge PDF + Page Organizer

Users must be able to:

- Upload PDFs
- Upload multiple PDFs
- Preview PDFs
- View page thumbnails
- Reorder pages
- Delete pages
- Restore deleted pages
- Rotate pages
- Select pages
- Extract selected pages
- Generate a final PDF
- Preview the final PDF
- Rename the output
- Download the output

Maximum requirements:

- 20 uploaded PDFs
- 50 MB maximum file size per PDF
- 100-page processing limit

---

## TOOL 2

PDF to Image

Users must be able to:

- Upload PDF
- Preview PDF
- Select output format
- Select quality
- Convert pages to images
- Preview generated images
- Download individual images
- Download all images as ZIP

Formats:

- JPG
- PNG
- WEBP

Quality:

- Low
- Medium
- High

---

# 7. PAGE ORGANIZER RULES

The page organizer must use a non-destructive editing model.

Never modify original uploaded PDFs while editing.

Represent edits using metadata.

Each page should conceptually include:

id
sourceFileId
sourcePageNumber
displayOrder
rotation
isDeleted
isSelected

Final PDF generation must use this metadata.

---

# 8. PAGE OPERATIONS

Support:

- Reordering
- Delete
- Restore
- Rotate clockwise
- Rotate counter-clockwise
- Selection
- Extraction

Drag-and-drop must not be the only way to reorder pages.

Provide accessible alternatives where practical.

Examples:

Move Up

Move Down

---

# 9. PAGE SIZE OUTPUT

Provide:

1. Preserve Original
2. Normalize to A4
3. Normalize to Letter

Rules:

- Preserve aspect ratio.
- Never stretch PDF content.
- Center content appropriately.
- Preserve page rotation correctly.

Default:

Preserve Original.

---

# 10. FILE VALIDATION

Never rely only on frontend validation.

Use layered validation.

## Frontend Validation

Check:

- File selected
- Extension
- File size
- File count

## Server Validation

Check:

- MIME type
- Actual PDF signature
- File parseability
- Page count
- Encryption
- File corruption

Reject invalid files before expensive processing.

---

# 11. PASSWORD-PROTECTED PDF RULE

If a PDF is encrypted or password-protected:

Reject it.

Show a clear user-friendly message.

Example:

"Password-protected PDFs are not currently supported. Please upload an unlocked PDF."

Never:

- Crack passwords
- Attempt to bypass encryption
- Store passwords

---

# 12. PROCESSING JOB RULES

Only one active processing job per user session.

Jobs should conceptually include:

id
type
status
progress
currentStep
createdAt
expiresAt
cancelRequested

Possible status:

CREATED
VALIDATING
UPLOADING
QUEUED
PROCESSING
GENERATING
COMPLETED
FAILED
CANCELLING
CANCELLED
EXPIRED

---

# 13. PROCESSING PROGRESS

Use:

- Percentage where accurately measurable
- Step-based progress

Do not fake precise percentages.

Example:

Processing PDF — 68%

✓ Upload complete
✓ Reading PDF
● Converting page 68 of 100
○ Preparing output

---

# 14. CANCELLATION

Users must be able to cancel active processing.

Flow:

User clicks Cancel
↓
Confirmation
↓
Cancel request
↓
Processing checks cancellation flag
↓
Stop safely
↓
Clean temporary files
↓
Update job status

Cancelled processing must not continue unnecessarily in the background.

---

# 15. ERROR HANDLING

Never show only:

"Error"

Use meaningful error categories.

Examples:

VALIDATION_ERROR

UNSUPPORTED_FILE

FILE_TOO_LARGE

PAGE_LIMIT_EXCEEDED

ENCRYPTED_PDF

CORRUPTED_FILE

PROCESSING_FAILED

NETWORK_ERROR

CANCELLED

EXPIRED

Frontend error messages must:

- Be understandable
- Explain the problem
- Provide an action

Possible actions:

Retry
Re-upload
Return to Editor
Remove File
Start Again

Never expose:

- Stack traces
- Internal server errors
- Storage credentials
- Infrastructure details

---

# 16. TEMPORARY FILE STORAGE

Files must only be stored temporarily when required.

Automatically delete within:

MAXIMUM 1 HOUR

Delete:

- Uploaded PDFs
- Generated PDFs
- Generated images
- ZIP files
- Temporary previews

Each job should have:

createdAt

expiresAt

Cleanup must be automatic.

Do not depend on manual deletion.

---

# 17. PRIVACY RULES

Do not implement:

- User accounts
- Login
- Persistent document history
- User dashboards
- Permanent document storage

Do not log:

- PDF document content
- Sensitive document text
- Uploaded file contents

Logs may contain minimal operational information.

---

# 18. SECURITY REQUIREMENTS

Use defense in depth.

Implement appropriate:

- Server-side validation
- File type validation
- Resource limits
- Rate limiting
- Request throttling
- Processing timeouts
- Abuse protection

If files are stored server-side and malware scanning is supported by the chosen infrastructure:

Unsafe files must not reach the processing worker.

---

# 19. RESPONSIVE DESIGN

Support:

- Mobile
- Tablet
- Laptop
- Desktop

Do not simply shrink desktop UI.

Adapt layouts.

Mobile requirements:

- Touch-friendly controls
- Large tap targets
- Responsive upload zone
- Usable page organization
- Responsive PDF preview
- Accessible actions

No normal workflow should require horizontal page scrolling.

---

# 20. ACCESSIBILITY

Follow WCAG 2.1 AA principles for core workflows.

Implement:

- Semantic HTML
- Keyboard navigation
- Visible focus states
- Screen-reader labels
- Accessible buttons
- Accessible forms
- Accessible errors
- Sufficient contrast

Critical workflows must not depend only on:

- Color
- Hover
- Drag and drop

---

# 21. PERFORMANCE RULES

Do not:

- Render every high-resolution PDF page immediately.
- Keep all large page images in memory.
- Regenerate PDFs after every page drag.
- Perform unnecessary server processing.

Prefer:

- Lazy loading
- Thumbnail rendering
- Controlled batches
- Page-by-page processing
- Efficient memory cleanup

---

# 22. PDF TO IMAGE MEMORY RULE

Preferred processing flow:

Render Page
↓
Generate Image
↓
Store/Prepare Output
↓
Release Rendering Memory
↓
Next Page

Avoid storing all high-resolution images in memory simultaneously.

---

# 23. DESIGN DIRECTION

Design style:

MODERN + MINIMAL + PREMIUM

Priorities:

- Clear hierarchy
- Generous whitespace
- Simple workflows
- Professional appearance
- Strong trust signals

Avoid:

- Excessive gradients
- Unnecessary animations
- Visual clutter
- Too many colors
- Decorative UI that reduces usability

---

# 24. ONE ACTIVE JOB RULE

A user should not accidentally start multiple processing jobs simultaneously.

Provide:

Start New Task

When resetting an unfinished job:

Ask for confirmation if unsaved work may be lost.

---

# 25. CODE QUALITY RULES

Write:

- Readable code
- Modular code
- Typed interfaces
- Reusable components

Avoid:

- Large monolithic components
- Duplicate logic
- Unused dependencies
- Unused state
- Hardcoded secrets
- Unexplained magic numbers

Add comments only when they explain non-obvious decisions.

---

# 26. BEFORE MODIFYING WORKING CODE

Before changing an existing working feature:

1. Understand its purpose.
2. Identify dependencies.
3. Check potential regressions.
4. Modify the smallest necessary area.
5. Test affected workflows.

Do not rewrite working functionality simply because another implementation seems preferable.

---

# 27. TESTING RULE

Every milestone requires testing.

Test:

Happy Path

Edge Cases

Failure Cases

Responsive Layout

Accessibility

Regression Risk

Do not mark a milestone complete without verification.

---

# 28. IMPLEMENTATION ORDER

Follow this sequence.

MILESTONE 1

Foundation

- Project setup
- Design system
- Homepage
- Navigation
- Footer
- Responsive layout

STOP AND TEST.

---

MILESTONE 2

Upload System

- Drag and drop
- File picker
- Validation
- File list
- Remove files

STOP AND TEST.

---

MILESTONE 3

PDF Viewer

- PDF rendering
- Zoom
- Navigation
- Thumbnails

STOP AND TEST.

---

MILESTONE 4

Page Organizer

- Page metadata
- Reordering
- Delete
- Restore
- Rotation
- Selection

STOP AND TEST EXTENSIVELY.

---

MILESTONE 5

PDF Generation

- Merge pages
- Apply order
- Apply rotation
- Output page size
- Generate output

STOP AND TEST.

---

MILESTONE 6

Extract Pages

- Selection
- Extraction
- PDF generation
- Preview
- Download

STOP AND TEST.

---

MILESTONE 7

PDF to Image

- JPG
- PNG
- WEBP
- Quality
- Preview
- Individual download
- ZIP download

STOP AND TEST.

---

MILESTONE 8

Processing Infrastructure

- Jobs
- Progress
- Cancellation
- Retry
- Temporary storage
- Cleanup

STOP AND TEST.

---

MILESTONE 9

Security

- Server validation
- Rate limits
- Resource limits
- Abuse protection
- Secure error handling

STOP AND TEST.

---

MILESTONE 10

FINAL QA

Test:

- Complete user flows
- Edge cases
- Mobile
- Tablet
- Desktop
- Accessibility
- Error recovery
- Security requirements

---

# 29. MILESTONE COMPLETION FORMAT

After completing a milestone, report:

1. What was implemented
2. Files created
3. Files modified
4. Tests performed
5. Issues found
6. Issues fixed
7. Remaining known limitations
8. Whether acceptance criteria passed

Do not proceed silently when a milestone is incomplete.

---

# 30. FINAL SELF-CHECK

Before declaring the MVP complete verify:

PRODUCT

[ ] Public website
[ ] Free
[ ] No account required

MERGE TOOL

[ ] Multiple upload
[ ] Maximum 20 PDFs
[ ] 50 MB limit
[ ] Page limit
[ ] PDF preview
[ ] Page thumbnails
[ ] Reordering
[ ] Delete
[ ] Restore
[ ] Rotation
[ ] Extract pages
[ ] Output preview
[ ] Download

PDF TO IMAGE

[ ] JPG
[ ] PNG
[ ] WEBP
[ ] Low quality
[ ] Medium quality
[ ] High quality
[ ] Preview
[ ] Individual download
[ ] ZIP download

PROCESSING

[ ] Progress
[ ] Cancellation
[ ] Retry
[ ] Smart error recovery
[ ] One active job

SECURITY

[ ] Client validation
[ ] Server validation
[ ] PDF signature validation
[ ] Encryption detection
[ ] Rate limiting
[ ] Resource limits

PRIVACY

[ ] Temporary storage
[ ] Automatic deletion within 1 hour
[ ] No persistent history

UX

[ ] Mobile support
[ ] Tablet support
[ ] Desktop support
[ ] Accessibility baseline

Only declare the project complete after every applicable requirement has been verified.
________________________________________

