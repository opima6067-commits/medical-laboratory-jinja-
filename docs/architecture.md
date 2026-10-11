# Architecture

## Current (prototype)
```
Browser
 ├─ index.html + assets/ (static files on Cloudflare Pages)
 ├─ assets/js/app.js            hash router + role shell (UI-level access checks only)
 ├─ assets/js/{student,tutor,registrar,shared-views,import-results}.js
 ├─ assets/js/ui.js              shared components + form validation
 ├─ assets/js/store.js           Repo.list/get/insert/update/remove -> localStorage (fictional data)
 └─ assets/js/auth-demo.js       fake login against demo users
```
Data flow: a view calls `Repo`/`Q` helpers, builds HTML (all user text goes through `esc()`), and actions
(`data-action` attributes) update `Repo` then call `App.refresh()`.

## The backend seam
All reads and writes go through `MLS.Repo` (collections: users, students, tutors, programmes, courses, periods,
materials, exams, results, notifications) and `MLS.Auth`. In the backend phase:
1. Replace `Repo` methods with `fetch()` calls to an API (making views async and adding loading states).
2. Replace `Auth.login/current/logout` with the real identity provider/session.
3. Delete `assets/js/demo-data.js`, the demo users and the localStorage persistence.
4. Replace in-memory file URLs with signed download URLs from private storage.
5. Move `analyse()` in `assets/js/import-results.js` to the server (keep the browser version only for fast feedback).

## Proposed target architecture
```
Cloudflare Pages (this frontend)
        │ HTTPS (cookies/tokens)
Trusted API (e.g. Cloudflare Workers/Pages Functions or another hosted API)
  ├─ Authentication + role-based authorisation (student / tutor / registrar)
  ├─ Business rules (publish workflow, assignments, import validation)
  ├─ Audit log
  ├─ Relational database (e.g. Postgres/SQLite-family, with indexes and backups)
  └─ Private object storage for learning materials (signed URLs, type/size checks)
```
Service choices and free-tier limits must be evaluated when the backend phase starts; free tiers change.
