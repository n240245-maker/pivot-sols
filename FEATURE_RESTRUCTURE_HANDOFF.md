# Pivot Sols feature restructure handoff

This change is local only. No hosting service or production database was changed. Existing career domain and role tables and records remain intact; student pages now use the new career resource library.

## Student routes

| Route | Audience | Content |
| --- | --- | --- |
| `/dashboard` | P1 and E1 | Level-specific resource cards |
| `/campus/rooms` | P1 navigation | Published I3 rooms, search and floor filter |
| `/faculty` | P1 navigation | Published faculty subjects and members |
| `/careers/domains` | E1 | Published domain PDFs and links, any branch |
| `/careers/jobs` | E1 | Published job PDFs and links, any branch |
| `/problems` | P1 and E1 | Reports, filters, reactions and submission |

P1 direct career URLs redirect to `/dashboard`. The new sections begin empty until real records are published. No campus contact details were invented.

## Agent routes

`/admin/rooms`, `/admin/faculty-subjects`, `/admin/faculty`, `/admin/career-domain-resources`, `/admin/career-job-resources`, and `/admin/problems` use the existing Agent login. The first four content types support draft creation, editing, status changes, ordering, and deletion of draft records only when they have no dependents. Agent problems support search, status changes including archive/restore, and editing without direct vote-total control.

## API

- `GET /api/public/rooms`, `/api/public/faculty-subjects`, `/api/public/faculty`: published records only.
- `GET /api/public/career-resources?type=domain|job&branch=<slug>`: published resources for any published branch.
- `GET /api/public/problems`, `GET /api/public/problems/{id}`: public report views, excluding archived reports and private identifiers. List filters: `level`, `priority`, `status`, `category`, `sort`.
- `POST /api/problems`, `POST /api/problems/{id}/reaction`: require a name/ID/year-issued HttpOnly student session, exact frontend origin, and student request header. The report body contains level, priority, title, description, and optional category. A reaction body is `{"reaction":"like"}` or `{"reaction":"dislike"}`.
- `/api/admin/{rooms|faculty-subjects|faculty|career-resources}`: existing Agent CMS list, create, detail, update and status pattern, plus safe draft deletion. All require Agent authentication; writes also require CSRF.
- `GET /api/admin/problems`, `PUT /api/admin/problems/{id}`: Agent report moderation.
- `POST /api/admin/uploads/image`, `POST /api/admin/uploads/pdf`: Agent-only validated file upload to configured S3-compatible storage.

The student session is issued by `POST /api/auth/login`, restored by `GET /api/auth/me`, and revoked by `POST /api/auth/logout`. The active login no longer trusts the browser-local profile marker. PostgreSQL stores only a hash of the opaque 30-day token; Student Problems derive vote identity from the normalized student ID. Name, student ID and P1/E1 level are self-declared and not checked against a campus registry.

## Database and local verification

Migration: `backend/migrations/versions/41f606784098_add_level_specific_resources_and_.py`, based on `222b971ed0e6`, adds level-specific resources and reports. The subsequent `b6d3f9a2c741_career_youtube_student_sessions.py` adds the optional career YouTube URL and revocable student sessions. `c84e7a0b6d22_passwordless_student_login.py` permits ID-only student sessions while preserving legacy email rows. All three were applied to the local PostgreSQL database only. Local Alembic head is `c84e7a0b6d22`.

After backing up and reviewing a target database, run the migration through the existing Alembic process from `backend/`. Do not reset or reseed the database. Existing career records are deliberately preserved.

Local checks: `npm test` (130 passing), `npm run build` (passing), backend `python -m pytest -q` (105 passing), and `node scripts/qa-layout.mjs` (36 rendered layout width checks passing at 375, 768, 1024 and 1440 pixels). The layout script checks horizontal document overflow in static renderings; it is not a substitute for a manual interactive browser pass with real published content.

## Optional object storage for direct uploads

Add the backend-only variables documented in `ENVIRONMENT_REFERENCE.md`: `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, and `STORAGE_PUBLIC_BASE_URL`. The bucket must support the S3 API; the public base URL must be HTTPS and serve uploaded objects. Never put storage keys in Vite variables or Git. Without these values, Agent may paste HTTPS image/PDF URLs, while direct uploads return 503. The local storage configuration is currently absent.

Production hosting, production migration, storage provisioning, and live delivery were not performed in this task.

## File inventory

Created:

```text
FEATURE_RESTRUCTURE_HANDOFF.md
backend/cms/problems.py
backend/cms/storage.py
backend/migrations/versions/41f606784098_add_level_specific_resources_and_.py
backend/student_session.py
backend/tests/test_feature_restructure.py
scripts/qa-layout.mjs
src/components/E1Route.tsx
src/directory.css
src/lib/problemApi.ts
src/pages/CareerResourceLibrary.tsx
src/pages/FacultyPage.tsx
src/pages/ProblemsPage.tsx
src/pages/RoomsPage.tsx
src/pages/admin/AdminProblemsPage.tsx
```

Modified:

```text
ENVIRONMENT_REFERENCE.md
backend/.env.example
backend/app.py
backend/cms/api.py
backend/cms/catalog.py
backend/cms/models.py
backend/cms/repository.py
backend/cms/schemas.py
backend/requirements.txt
backend/tests/test_cms.py
src/App.tsx
src/components/admin/AdminForms.tsx
src/components/admin/AdminPreview.tsx
src/components/common/StudentShell.tsx
src/components/dashboard/AppShell.tsx
src/components/dashboard/DesktopSidebar.tsx
src/components/dashboard/MobileBottomNav.tsx
src/components/dashboard/SearchModal.tsx
src/components/resources/LocalSearchResults.tsx
src/config/adminFields.ts
src/config/studentNavigation.ts
src/contexts/DemoAuthContext.tsx
src/dashboard.css
src/lib/adminApi.ts
src/lib/contentApi.ts
src/lib/discoveryTitles.ts
src/lib/localSearch.ts
src/lib/studentSessionApi.ts
src/main.tsx
src/pages/BranchesPage.tsx
src/pages/CareerDomainsPage.tsx
src/pages/CareerJobsPage.tsx
src/pages/DashboardPage.tsx
src/pages/ExplorePage.tsx
src/pages/admin/AdminApp.tsx
src/pages/admin/AdminResourcePage.tsx
src/pages/admin/AdminShell.tsx
src/types/admin.ts
src/types/content.ts
src/types/search.ts
tests/cms.test.mjs
tests/content-fixture.mjs
tests/dashboard-ui.test.mjs
tests/discovery.test.mjs
tests/lab-videos.test.mjs
tests/prototype-books.test.mjs
```
