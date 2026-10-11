# Medical Laboratory Sciences Academic Management Portal (Prototype)

A frontend-only, zero-cost demonstration of an academic portal for a medical laboratory training institution.
One shared login serves **students, tutors and the registrar**; each role gets its own dashboard, menu and features.
All data is **fictional**.

> **Demo only.** The sign-in, role switching and data storage are simulated in the browser. This is not real
> authentication or a secure database. See [Security limitations](#security-limitations).

## Main features

| Role | Working in the prototype |
|---|---|
| Shared login | One page, show/hide password, validation, loading state, remember-email, demo role buttons |
| Student | Dashboard, My Courses (search, semester filter), Course Details, Learning Materials (filter by course/type, open/download), Notes and Resources, Examinations, Results (**published only**, unpublished shown as "awaiting"), Notifications, Profile, Help |
| Tutor | Dashboard, Assigned Courses, Course Details, Upload Materials (validation, file type/size checks), Manage Materials (edit, delete with confirmation), Examination Information, Notifications, Profile |
| Registrar | Dashboard, Students (search/filter/add/edit/profile), Tutors (add/edit/assign courses), Courses, Programmes, Academic Periods (set active), Examinations (add/edit/delete), Results Management (review, student preview, publish/unpublish with confirmation), **Excel Results Import**, Materials Overview, Announcements, Reports (+CSV export), Profile, System Settings (reset demo data) |

### Excel results import
1. **Select file** (.xlsx or .csv, up to 8 MB). Template and an "errors" sample are provided.
2. **Validate and preview**: missing columns, empty registration numbers/course codes, invalid/negative marks, marks above maximum, duplicates, unknown registration numbers, unknown course codes, missing/unknown academic period, conflicts with already-published results. Name mismatches are warnings (students are matched by **registration number only**).
3. **Confirm import**: only valid rows are imported into the local demo state; invalid rows are never silently ignored (error report CSV available). Imported results are **unpublished**.
4. **Review and publish**: publishing is a separate action with a confirmation dialog.

Columns (first worksheet, first row): `Student Registration Number`, `Student Name` (optional), `Course Code`, `Academic Year` (e.g. 2026/2027), `Semester` (1 or 2), `Assessment Name`, `Marks`, `Maximum Marks`.
The .xlsx reader is built in (no library, no CDN). Legacy `.xls` is not supported.

## Demo accounts (fictional)

| Role | Email | Password |
|---|---|---|
| Student | student@demo.mls.test | Student#Demo1 |
| Tutor | tutor@demo.mls.test | Tutor#Demo1 |
| Registrar | registrar@demo.mls.test | Registrar#Demo1 |

On the login page, tap **Student / Tutor / Registrar** to fill these in, then **Sign in**. Sign out from the account menu (top right).

## Install as a Standalone App (PWA)
The portal is a full-featured Standalone Progressive Web App (PWA):
- **Desktop (Chrome/Edge/Brave):** Click the "Install App" button in the portal header or the browser install icon in the address bar. Runs in a dedicated standalone window with window-controls-overlay support.
- **Android:** Tap the "Install App" button or browser menu > **Install app**. Launches fullscreen like a native Android app with bottom navigation.
- **iOS Safari:** Tap the **Share** button > **Add to Home Screen**. Adapts to iPhone/iPad safe area notches and bottom home indicators.
- **Offline operation:** The service worker pre-caches all stylesheets, JavaScript modules, templates, and icons. Active network status is monitored in real-time in the header.

## Technology
HTML5, CSS3, vanilla JavaScript. No framework, no build step, no backend, no paid service.
It is a single-page app using URL hashes (`#/student/dashboard`), so it works on any static host without redirect rules.

## Folder structure
```
index.html                  entry page (loads all scripts)
favicon.svg
manifest.webmanifest, sw.js   PWA manifest and offline service worker
assets/icons/               app icons (192, 512, maskable, Apple touch)
_headers                    optional Cloudflare Pages security headers
assets/css/                 style.css (tokens/base), layout.css (shell), components.css
assets/js/
  demo-data.js              fictional seed data (replace with API later)
  store.js                  demo state + Repo layer (the backend seam) + session helpers
  ui.js                     icons, dialogs, toasts, forms/validation, tables, list pages, queries
  auth-demo.js              DEMO-ONLY login (replace with real auth)
  app.js                    router, role-based shell/navigation, login page
  shared-views.js           course details, notifications, material open/download
  student.js tutor.js registrar.js   role pages
  import-results.js         Excel/CSV import workflow and validation
  pwa.js                    install prompt, service worker lifecycle, offline app behavior
assets/templates/           Excel template and sample-with-errors workbook
assets/images/              logo placeholder
docs/                       architecture.md, backend-roadmap.md
```
This differs from the suggested multi-page layout on purpose: one shell and one design system avoid duplicating the layout in ~35 HTML files and make navigation reliable on Cloudflare Pages.

## Run locally
Open a terminal in the project folder and run `python3 -m http.server 8000`, then visit http://localhost:8000.
(Opening `index.html` directly also mostly works, but a local server is recommended.)

## Deploy to Cloudflare Pages (from GitHub, free)
You can do all of this from an Android phone browser (use "Desktop site" if a page looks cramped).
1. **GitHub repository**: sign in at github.com, tap **+ > New repository**, name it (e.g. `mls-portal-demo`), choose Public or Private, create it.
2. **Upload files**: unzip the project on your phone, open the repository, choose **Add file > Upload files**, select the *contents* of the project folder (so `index.html` is at the repository root, with the `assets` and `docs` folders). Upload folders one at a time if your phone cannot select folders. Tap **Commit changes**.
3. **Cloudflare Pages**: sign in at dash.cloudflare.com, go to **Workers & Pages > Create > Pages > Connect to Git**, authorise GitHub and pick the repository.
4. **Build settings**: Framework preset **None**. Build command: *leave empty*. Build output directory: **/** (or leave blank / `.`). No environment variables.
5. **Deploy**: tap **Save and Deploy**. When finished, open the `https://<project>.pages.dev` URL.
6. **Update later**: edit or upload files in GitHub and commit; Cloudflare redeploys automatically in about a minute.

Cloudflare Pages does not provide a database, authentication or private file storage; those belong to the backend phase.
Cloudflare's dashboard wording changes occasionally; the settings above (no framework, no build, root output) are what matter.

## What persists after refresh
| Persists (this browser only, localStorage) | Does NOT persist |
|---|---|
| Students, tutors, courses, programmes, periods, exams, results, announcements, settings, read/unread notifications, imported results and publish status | The signed-in session (cleared when the tab closes), uploaded files themselves (held as temporary in-memory object URLs; their metadata stays but the file cannot be opened after refresh), import-wizard progress |

Nothing is shared between devices or users. **Reset** all of it under Registrar > System Settings > Reset demo data (confirmation required).

## Current limitations
- Sample files (seed materials) are generated PDFs, not real course documents.
- Uploaded files are not stored; see the table above.
- Only the first worksheet of an .xlsx is read; .xls is unsupported.
- Notifications are not delivered anywhere; they are records shown in the app.
- Testing so far: automated Chromium (Playwright) run on the local copy covering login, all three roles, CRUD flows, import validation, publishing, and horizontal-overflow checks at 360, 390, 768, 1024 and 1440 px. It has **not** been tested on a physical Android device, on other browsers, or on a live Cloudflare Pages deployment.

## Security limitations
- Demo credentials are visible in the source. Browser storage and sessionStorage can be edited by anyone with the device.
- Role restrictions and "published only" visibility are UI behaviour. A real server must enforce them on every request.
- Do not enter real names, passwords, student records or examination results.

## Future backend plan
See [docs/backend-roadmap.md](docs/backend-roadmap.md) and [docs/architecture.md](docs/architecture.md).
