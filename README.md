# Pivot Sols

For the audited architecture, verified local commands, environment variables and manual deployment order, start with [PROJECT_HANDOFF.md](./PROJECT_HANDOFF.md), [LOCAL_SETUP.md](./LOCAL_SETUP.md), [ENVIRONMENT_REFERENCE.md](./ENVIRONMENT_REFERENCE.md), [DEPLOYMENT.md](./DEPLOYMENT.md), and [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md). The current student UI session is browser-local after real email verification; see the handoff's production limitation before adding private student data.

The Pivot Sols working prototype for RGUKT Nuzvid P1 and E1 students: email-verified login, dashboard, Reference Books, Lab Videos, career guides, Explore, branches, global search, profile and contact email.

Email-verified prototype authentication is currently enabled in `src/config/demo.ts`. Enter a non-empty name/ID, choose P1 or E1 and provide an email you control. A Python FastAPI backend sends and verifies a random email code before creating the local session. Configure Gmail in `backend/.env` using [REAL_OTP_SETUP.md](./REAL_OTP_SETUP.md). The old fixed code and its stored sessions no longer grant access.

## PostgreSQL and Admin CMS

Student Books, Labs, careers, branches, About, Explore and global search now use published PostgreSQL content through FastAPI. Draft/archived content is hidden; API failures show a retry action without a local-data fallback. The original student layouts and email OTP/contact workflows are preserved.

The separate [Admin panel](http://localhost:5173/admin/login) uses an admin password, emailed OTP and a server-validated HttpOnly session. It manages all nine content types with structured editors, previews, publishing and dependency-aware archiving.

- [Admin setup and sign-in](./ADMIN_SETUP.md)
- [Database, migrations and initial import](./DATABASE_SETUP.md)
- [Content editing guide](./CONTENT_MANAGEMENT_GUIDE.md)
- [CMS verification report](./CMS_COMPLETION_REPORT.md)

Run both services:

```powershell
# Terminal 1
cd C:\pavan\backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

```powershell
# Terminal 2
cd C:\pavan
npm run dev
```

PostgreSQL is already running locally. Keep `DATABASE_URL`, SMTP credentials and `OTP_SECRET` only in `backend/.env`. The additive initial migration and 171-record seed import have been applied. On a new installation, follow DATABASE_SETUP before starting the backend.

## Development

Use Node.js 22.12+ (or a newer supported release).

```sh
npm install
npm run dev
npm run build
npm test
npm run preview
```

`npm run build` checks the application and Vite configuration with TypeScript before creating `dist/`.

`npm test` runs student-validation, profile-resolution, authentication-wiring, route-gate, PostgreSQL/RLS, dashboard UI, Reference Books, Lab Videos, careers, branch guides, shared search, contact UI/API, demo-auth and landing-video tests. PGlite is a development-only test dependency.

## Routes

- `/`: responsive landing page.
- `/signup`: redirects to login in demo mode; otherwise real registration and email verification.
- `/login`: prototype details, email delivery and backend OTP verification; otherwise Supabase email/password or Google sign-in when demo mode is disabled.
- `/auth/callback`: central session/callback resolution.
- `/complete-profile`: ID-only completion for a verified account without an extractable ID.
- `/dashboard`: protected student dashboard with five resource cards and real profile context.
- `/profile`: protected read-only student profile and existing logout action.
- `/branches` and `/branches/:branchSlug`: six broad branch guides with linked careers and profile-aware academic resources.
- `/about`: the product purpose and student needs.
- `/contact`: profile-prefilled contact form using the FastAPI email endpoint.
- `/resources/books` and nested level/curriculum/semester/subject routes: working prototype with automatic P1/E1 context, six E1 branches, remembered branch selection, 30 sample subjects, client-side search and book-details dialogs. See [REFERENCE_BOOKS_DATA_GUIDE.md](./REFERENCE_BOOKS_DATA_GUIDE.md) and [REFERENCE_BOOKS_PROTOTYPE_REPORT.md](./REFERENCE_BOOKS_PROTOTYPE_REPORT.md).
- `/resources/labs` and nested P1 semester/lab/experiment or E1 branch/semester/lab/experiment routes: working Lab Videos prototype with 18 labs, sample guides, client-side search and a reusable video renderer. See [LAB_VIDEOS_DATA_GUIDE.md](./LAB_VIDEOS_DATA_GUIDE.md) and [LAB_VIDEOS_REPORT.md](./LAB_VIDEOS_REPORT.md).
- `/careers/domains` and `/careers/domains/:domainSlug`: 16 searchable/filterable domains and complete learning guides.
- `/careers/jobs` and `/careers/jobs/:roleSlug`: 24 searchable/filterable role guides with domain links, roadmaps and project ideas.
- `/explore`: section discovery, shared client-side search and guided resource links.
- `/admin/login`, `/admin`, `/admin/branches`, `/admin/semesters`, `/admin/subjects`, `/admin/books`, `/admin/labs`, `/admin/experiments`, `/admin/career-domains`, `/admin/career-jobs`, `/admin/content`: independent protected content management.
- Unknown routes: branded 404.

React Router uses browser history. `vercel.json` provides a SPA fallback for direct route access when this project is deployed to Vercel. No deployment is performed by this phase.

## Structure

- `src/components/`: shared logo/navigation, hero, custom looping video and resource marquee.
- `src/pages/`: route-level composition.
- `src/components/dashboard/`: persistent app shell, desktop sidebar, mobile bottom navigation, profile dropdown, search dialog, resource cards and shared page content.
- `src/dashboard.css`: scoped responsive dashboard styles using the existing theme.
- `src/config/studentNavigation.ts`: student navigation and resource destination registry.
- `src/config/academicResources.ts`: preserved prototype branch/semester seed definitions.
- `backend/`: FastAPI, SQLAlchemy models, Alembic migrations, admin authentication/CMS, independent student OTP/contact services and Python tests.
- `src/config/api.ts` and `src/lib/otpApi.ts`: public API address and centralized email-verification requests.
- `src/data/demoAcademicResources.ts`: preserved seed/test fixtures; runtime content comes from PostgreSQL.
- `src/data/demoLabResources.ts`: isolated sample labs and experiment guides; `src/data/labVideos/productionLabResources.ts` reserves a separate catalogue for confirmed content.
- `src/components/resources/labs/` and `src/labs.css`: experiment lists, guide sections and responsive video rendering within the existing AppShell.
- `src/data/careers/` and `src/data/branches/`: preserved typed import fixtures.
- `src/components/resources/Discovery.tsx` and `src/discovery.css`: shared career/branch cards, filters, breadcrumbs, levels, roadmaps and consistent styling.
- `src/lib/localSearch.ts`: one client-side index built from published API content for Search and Explore.
- `src/lib/contactApi.ts` and `backend/contact_service.py`: validated contact delivery, truthful failure states and rate limiting.
- `src/lib/studentDisplay.ts`: local-time greeting and profile-name/initials helpers.
- `src/index.css`: shared color and font tokens, Tailwind v4 theme, responsive layouts and restrained glass utility.
- `src/auth.css`: scoped authentication and student-placeholder styles; existing landing styles are preserved.
- `src/contexts/AuthContext.tsx`: verified auth state, session events and centralized auth actions.
- `src/lib/`: Supabase client, validation helpers, profile resolution and safe error messages.
- `src/config/academic.ts`: current P1 batch, with E1 derived two batches earlier.
- `supabase/migrations/`: profile schema, RLS, domain hook and generated academic-cycle seed.
- `src/App.tsx`: route registry.

The supplied remote video uses a requestAnimationFrame opacity loop with 500ms fades and a 100ms restart delay. It handles rejected autoplay, media failure, tab visibility changes and unmount cleanup. The footer pause control pauses both continuous animations. Reduced-motion preferences disable video playback, entrance movement and marquee scrolling; resources remain manually scrollable.

Geist Sans is bundled locally. General Sans and the video load from the specified external providers; the UI retains a local font and dark background fallback if either is unavailable. Navigation for future areas currently targets relevant landing content and the resource strip.

Run the Python backend alongside Vite; see the exact Windows commands in [REAL_OTP_SETUP.md](./REAL_OTP_SETUP.md). When `DEMO_MODE` is false, read [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) to configure the preserved Supabase project, environment, SQL, Auth hook, email confirmation and Google OAuth. Without its credentials, that mode shows an unavailable-service notice. The original dashboard inventory is in [DASHBOARD_PHASE_REPORT.md](./DASHBOARD_PHASE_REPORT.md). The historical confirmed-books file is retained; the old catalog files are retained only as seed/test references. Global search now indexes published API content. Contact uses FastAPI and existing SMTP; set `CONTACT_TO_EMAIL` directly in `backend/.env` and restart the backend.

Teammate editing instructions: [CONTENT_MANAGEMENT_GUIDE.md](./CONTENT_MANAGEMENT_GUIDE.md). Current database/admin validation: [CMS_COMPLETION_REPORT.md](./CMS_COMPLETION_REPORT.md). Earlier integrated-feature history: [PIVOT_SOLS_COMPLETION_REPORT.md](./PIVOT_SOLS_COMPLETION_REPORT.md).
