# Pivot Sols PostgreSQL / Admin CMS verification

Verified locally on 24 September 2026. Implementation and automated checks are complete. **The final live, authenticated admin publishing walkthrough is still pending the owner's password-and-email-OTP sign-in.** It is not reported as passed below.

## Database

Actual connection verified: database `pivot_sols`, database user `pivot_admin`. No connection URL or password was printed. Migration `222b971ed0e6` was generated, inspected and applied; `alembic current` reports that revision at head and `alembic check` reports no pending upgrade operations.

Created 16 application tables plus `alembic_version`: admins, admin_sessions, admin_challenges, admin_auth_throttles, branches, semesters, subjects, reference_books, labs, experiments, career_domains, career_roles, site_content, branch_domains, branch_roles and domain_related_roles.

Database inspection found 36 indexes (including unique-constraint indexes) and 14 foreign keys. Constraints enforce status/level values, unique identifiers and scoped academic slugs; a partial unique index covers branchless P1 semesters. Foreign keys restrict deletion. Content writes are transactional, with optimistic edit-conflict checking. Archive is implemented in place of hard deletion. No DROP, TRUNCATE or bulk deletion was performed.

## Admin authentication

- The owner-created initial admin account exists; its password was entered through a hidden local prompt.
- Passwords use Argon2id; email OTPs are random, hashed, single-use, valid for five minutes and limited to five incorrect attempts. Resending has a 60-second cooldown and database-backed rate limits.
- Random session cookies are HttpOnly, SameSite=Strict and scoped to `/api/admin`; their hashes are stored in PostgreSQL. Sessions expire after eight hours or 30 minutes of API inactivity. Logout revokes them.
- Secure cookies are enabled for non-local frontend hosts. Writes require the configured Origin and a session-bound CSRF token. Every admin content endpoint checks the backend session and active account.
- Student login never grants admin access. Browser navigation to `/admin/books` while signed in as a student correctly redirected to `/admin/login`.
- Automated password/OTP/session, expiry, resend, replay, rate limits, inactive-account, Origin/CSRF, delivery-failure and logout tests passed. **Live admin email delivery and authenticated browser login remain pending.** Existing student OTP/contact regression tests passed; their configuration was preserved.

## Admin CMS

| Section | Implemented behavior |
| --- | --- |
| Branches | Metadata, major areas, related domains/roles, publishing, archive |
| Semesters | P1/E1 placement, optional/required branch, scoped unique number |
| Subjects | Semester relationship, slug, code, description |
| Reference Books | Cascading placement selectors, authors, category, metadata, HTTPS resource, availability |
| Labs | Semester placement, title/slug, description |
| Experiments | Lab placement, complete written guide, repeatable arrays, YouTube/MP4/external video |
| Career Domains | Summaries, skills, subjects, tools, interests, challenges, levels and structured roadmaps |
| Career Jobs | Real domain FK, responsibilities, skills, roadmap, interview topics and projects |
| Site Content | Structured About and Explore editors; no raw JSON input |

All nine sections provide responsive lists, search/status filters, create/edit, private previews, publish/unpublish and reversible archive. Academic lists also filter by branch/semester. Dependency checks block hiding parents with published children. Duplicate identities and stale saves return useful conflicts. Frontend tests cover every editor and archive-confirmation behavior; PostgreSQL integration tests cover all nine resources. Authenticated browser CRUD/layout verification is still pending.

## Student migration

Books, Labs, Career Domains, Career Jobs, Branches, About, Explore and global search now consume `/api/public/catalog`. Individual read-only public collection endpoints are also available. Only published records with visible ancestors and visible relationships are returned. Admin APIs may read all statuses.

Student routing, P1/E1 context, branch preferences and layouts are preserved. Books retain their existing details dialog and show available links or truthful coming-soon states. Global search uses the API-loaded snapshot. Content requests have loading, failure and retry states, with cancellation of stale requests. There is no silent local-data fallback.

## Seed import

Imported 171 existing content records: 6 branches, 14 semesters, 30 subjects, 31 books, 18 labs, 30 experiment placements, 16 domains, 24 roles and 2 site-content records. A second import inserted zero records. Existing datasets remain as seed/test references. Imported material remains prototype educational content, not an official verified curriculum. The importer preserves existing rows and CMS edits; its identity-key limitation is documented in DATABASE_SETUP.

## Automated validation

| Command | Actual result |
| --- | --- |
| `npm test` | **136 passed / 0 failed**; includes all 124 existing tests plus 12 new CMS tests |
| `npm run build` | **Passed**: TypeScript and Vite production build |
| Backend `python -m pytest -o addopts='' -q` | **92 passed / 0 failed**, 2 upstream TestClient deprecation warnings |
| `alembic current` | `222b971ed0e6 (head)` |
| `alembic check` | No new upgrade operations detected |
| Safe database check | Connected to `pivot_sols` as `pivot_admin` |

Real PostgreSQL CRUD tests create, read, edit, publish, unpublish and archive development records, then roll back their outer test transactions. They verify draft/archive exclusion, parent visibility, FK/unique enforcement, duplicate conflict handling, About visibility, updated catalog values and normalized YouTube URLs. Test email delivery is injected; these tests send no real emails.

Local detailed logs are in `qa-results/cms-frontend.txt`, `qa-results/cms-backend.txt` and `qa-results/cms-build.txt` (ignored by version control).

## Browser checks completed

- Database Books → ECE → Semester 1 → Network Theory → Engineering Circuit Analysis details; authors/category/availability shown correctly.
- Global search for Thevenin → correct ECE lab experiment; written guide and intentional missing-video state shown.
- Branches → ECE → VLSI → RTL Design Engineer; linked domain/role data and detail sections shown.
- Database-backed Explore cards/search/resource finder and editable About copy rendered.
- Book dialog and experiment page inspected at 375px; no horizontal overflow. Admin sign-in inspected at desktop and 320px; no horizontal overflow. Temporary viewport overrides restored.
- Student authentication did not bypass the admin guard.

## Final walkthrough still to run

After the owner signs in, verify in the real browser: admin dashboard → add branch/semester/subject/book → publish → confirm the new student book; add lab/experiment → paste an appropriate YouTube URL → publish → confirm the student guide/player; edit a career domain → confirm updated student content. Then archive only the clearly identified QA records through the CMS, children first, and verify they disappear from public content. This walkthrough, including live YouTube playback, has **not** yet been claimed as complete.

## Owner action

Sign in at [the admin login](http://localhost:5173/admin/login) using the existing admin email, locally chosen password and emailed OTP, then reply **signed in**. Enter credentials only in the app. No database setup, migration, reseeding or repeat admin creation is needed.

Documentation: [ADMIN_SETUP.md](./ADMIN_SETUP.md), [DATABASE_SETUP.md](./DATABASE_SETUP.md), [CONTENT_MANAGEMENT_GUIDE.md](./CONTENT_MANAGEMENT_GUIDE.md), [README.md](./README.md). The local frontend and backend remain running. Nothing was deployed, and no unrelated features were added.
