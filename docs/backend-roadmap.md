# Backend roadmap: what must change before real use

**Completed (prototype):** UI, workflows, validation logic, role-specific navigation, import workflow, responsive layout, documentation.
**Not done (future work):** everything below.

## 1. Authentication and authorisation (mandatory)
- Real sign-in (institutional accounts, strong password policy or SSO, password reset, optional MFA), server-side sessions/tokens.
- Role-based access control on **every** endpoint:
  - Students: only their own profile, their programme/level courses, their own **published** results.
  - Tutors: only courses assigned to them, only their materials.
  - Registrar: administrative operations, each audited.
- The UI hiding pages is not security; a tutor changing a URL or editing JavaScript must still be refused by the server.

## 2. Database
- Tables for users, students, tutors, programmes, courses, periods, tutor_assignments, enrolments, materials, exams, results, notifications, audit_log.
- Unique constraint on student registration number (never identify by name). Foreign keys, indexes on (reg_no), (course_code, period_id), (published).
- Results carry a `published` flag and `published_at/by`; students' queries must filter on it server-side.
- Regular automated backups and tested restores.

## 3. File storage
- Private object storage; no public unrestricted URLs. Short-lived signed URLs after an authorisation check.
- Server-side checks of file type (content sniffing, not just extension) and size; malware scanning if feasible; storage quotas.

## 4. Results import
- Server re-validates every row (same rules as `analyse()` in `assets/js/import-results.js`), runs in a transaction, records who imported what and when, never auto-publishes.
- Publishing is a distinct permission, audited, and reversible with a record of the reversal.

## 5. Audit and monitoring
- Immutable audit log of sensitive actions (imports, publishing, assignments, deletions, role changes).
- Error monitoring, uptime checks, rate limiting, alerting.

## 6. Scaling to 2,000+ students
- Server-side pagination, filtering and search (the prototype paginates in the browser only); indexed queries.
- Cache read-mostly data; avoid loading whole tables into the browser.
- Plan for result-release peaks (many students at once); load-test before launch.
- Know storage limits and costs for materials; add retention rules.
- A static prototype cannot safely manage thousands of students' private records; this requires the backend above.

## 7. Privacy and compliance
- Data-protection review (consent, retention, access requests), encrypted transport and storage, least-privilege admin access, secrets kept server-side only.

## Suggested phases
1. Pick stack and hosting; set up auth + database + API skeleton.
2. Migrate read-only data (courses, exams) and replace `Repo` reads.
3. Materials with private storage.
4. Results import + publish workflow with audit log.
5. Pilot with a small cohort, then harden, monitor and scale.
