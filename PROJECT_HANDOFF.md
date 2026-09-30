# Pivot Sols project handoff

Verified against the local project in `C:\pavan` on 30 September 2026. This is an **existing** student resource platform, not a new scaffold. Neon Free database setup and content transfer are complete; public frontend and backend deployment remain pending. Read `ENVIRONMENT_REFERENCE.md`, `LOCAL_SETUP.md`, `DEPLOYMENT.md`, and `DEPLOYMENT_CHECKLIST.md` alongside this file. Never paste local `backend/.env` or database credentials into a ticket, browser variable, frontend build, or Git commit.

## Product and runtime architecture

React 19 + TypeScript + Vite 7 serves the student site and agent CMS. FastAPI (`backend/main.py` → `app.create_app`) serves real emailed student OTP, Contact, agent authentication and CMS APIs. SQLAlchemy 2/psycopg 3 connect to PostgreSQL; Alembic manages the current schema. The local backend is port **8000**, frontend **5173**. `src/config/api.ts` uses the local port-8000 backend in development and same-origin `/api` in production through `vercel.json`. `backend/config.py` loads backend `.env` and validates mail/OTP/origin fields at startup. `FRONTEND_URL` is a single exact CORS origin; credentials are enabled for cookies.

Active `DEMO_MODE=true` is a legacy name for the current **real email OTP** student UI. Successful FastAPI verification issues an opaque, revocable 30-day student session stored as a token hash in PostgreSQL. The browser receives a persistent HttpOnly cookie; React calls `GET /api/auth/me` before deciding protected routes and does not use the old localStorage marker as authentication. Student Problems derive author and vote identity from the server session. The name, student ID and academic level entered at login are not independently checked against a campus registry, so they should not be treated as verified institutional claims. Agent authentication remains independent. The alternate Supabase code/migrations remain in the tree but are inactive.

Student send: validated email → `POST /api/auth/send-otp` → cryptographic six-digit `secrets.randbelow` → HMAC-SHA-256 digest keyed by server-only `OTP_SECRET` → SMTP or Brevo HTTPS → API returns success **without code**. Verify: `POST /api/auth/verify-otp` consumes the matching code. Five-minute expiry, five wrong attempts, 60-second resend cooldown, five sends per 15 minutes, replacement invalidates the old code, and mail failure leaves no usable code. The digest/history are **process memory**; one worker only, restart loses pending student OTPs. Backend automated tests mock the sender. In the final execution pass, the owner entered one live student OTP privately and confirmed the dashboard; the browser independently verified dashboard refresh, profile values, logout and the protected-route redirect. No code was logged or copied into this report.

Agents use independent database-backed authentication: Argon2id password → emailed OTP challenge → PostgreSQL admin session. The session cookie is HttpOnly, 8-hour absolute / 30-minute idle, and revocable on logout. Mutation requests require the exact frontend Origin, `X-Pivot-Admin`, and signed CSRF token. Localhost cookie is SameSite=Strict; hosted HTTPS cookies are Secure + SameSite=None. The production frontend proxies `/api` to the backend so browser requests remain same-origin. `src/lib/adminApi.ts` sends credentials. The local database already has one agent; do not recreate or reveal credentials. Agent UI says “Agent Login”; backend and routes intentionally retain `admin` identifiers.

The CMS has nine resource kinds: branches, semesters, subjects, books, labs, experiments, career-domains, career-roles, site-content. Each supports create, edit, draft/published/archived, and dependency checks; public read shows only published records with published ancestors. Books navigate P1/E1 → branch where applicable → semester → subject → details, showing truthful availability and only safe resource links. Labs navigate level/branch/semester/lab/experiment and show objective, theory, apparatus, procedure, expected result, precautions. Video links are validated server-side and parsed into safe YouTube/embed or HTTPS media forms; YouTube uses a no-cookie iframe, explicit load action, 16:9 sizing and autoplay disabled. Career pages, Branches, Explore and global search read the published public catalog; search is a local index over that API result, not a separate search server. About/Explore content is CMS-backed. Contact validates sender input and sends through the same provider to `CONTACT_TO_EMAIL`. The owner-selected local recipient is now configured in ignored `backend/.env`; one controlled Contact message was confirmed in the owner's inbox.

## Important project tree

```text
C:\pavan\
  src\App.tsx, main.tsx, config\{api,demo,adminFields,...}.ts
  src\contexts\{AuthContext,DemoAuthContext,AdminContext,ContentContext}.tsx
  src\pages\{Landing,DemoLogin,Dashboard,Profile,Branches,About,Contact,
    ReferenceBooks,LabVideos,CareerDomains,CareerJobs,Explore}Page.tsx
  src\pages\admin\{AdminApp,AdminLoginPage,AdminShell,AdminResourcePage}.tsx
  src\components\resources\{books\*,labs\*,Discovery,LocalSearchResults}.tsx
  src\lib\{otpApi,adminApi,contentApi,contactApi,demoSession,labVideoSource,localSearch}.ts
  src\data\ (original seed/fixture content; live student catalog comes from API)
  public\favicon.svg
  tests\*.test.mjs                    frontend tests
  backend\main.py, app.py, config.py, otp_service.py, email_service.py
  backend\contact_{models,service}.py
  backend\cms\{api,auth,catalog,database,models,repository,schemas}.py
  backend\migrations\env.py, versions\222b971ed0e6_*.py
  backend\scripts\{create_admin,seed_existing_content,transfer_content}.py
  backend\tests\test_{api,cms,config_and_email,contact,otp_service}.py
  backend\{alembic.ini,requirements.txt,Dockerfile,.env.example}
  backend\.env                         ignored; real local secrets
  supabase\migrations\*.sql          inactive alternate auth
  scripts\*.mjs                      seed/export helpers
  .env.example, .gitignore, package.json, vite.config.ts, vercel.json, render.yaml
  deployment-private\content-export.json   ignored content-only snapshot
  ENVIRONMENT_REFERENCE.md, LOCAL_SETUP.md, DEPLOYMENT.md,
  DEPLOYMENT_CHECKLIST.md, PROJECT_HANDOFF.md
```

No `node_modules`, `.venv`, `dist`, caches or generated TypeScript info files belong in a source review. Git was initialized on `main` in the final execution pass; there is no remote yet. The first commit awaits the owner's Git `user.name` configuration. The staged file audit excluded ignored real `.env`, private content snapshot, virtual environment and build artifacts; only placeholder `.env.example` files are staged.

## Frontend routes

| Route | Page / protection | Live data |
| --- | --- | --- |
| `/` | Landing; public | static presentation |
| `/signup` | In active mode redirects to `/login`; guest | alternate Supabase UI inactive |
| `/login` | Student details + email OTP; guest | auth API |
| `/auth/callback`, `/complete-profile` | Active mode redirects to dashboard | alternate Supabase flow inactive |
| `/dashboard`, `/profile` | Student route guard; dashboard/profile | local student profile + public catalog |
| `/branches`, `/branches/:branchSlug` | Student; list/detail | public catalog |
| `/about`, `/contact` | Student | published site content; Contact POST API |
| `/resources/books`, `/resources/books/*` | Student; level/branch/semester/subject/books | published catalog |
| `/resources/labs`, `/resources/labs/*` | Student; level/branch/semester/lab/experiment | published catalog |
| `/careers/domains`, `/careers/domains/:domainSlug` | Student | published catalog |
| `/careers/jobs`, `/careers/jobs/:roleSlug` | Student | published catalog |
| `/explore` | Student, including global search | published catalog/search index |
| `/admin/login` | Agent password and OTP; public form | admin auth API |
| `/admin` | Agent dashboard; server identity guard | admin catalog |
| `/admin/{section}` | Agent list; guard | admin CMS API |
| `/admin/{section}/new` | Agent create; guard | admin CMS API |
| `/admin/{section}/:id`, `/admin/{section}/:id/preview` | Agent edit/preview; guard | admin CMS API |
| `*` and invalid nested discovery paths | Not found / recoverable resource state | none or catalog |

Admin `{section}` is `branches`, `semesters`, `subjects`, `books`, `labs`, `experiments`, `career-domains`, `career-jobs` (API kind `career-roles`), or `content` (API kind `site-content`).

## Complete application API map

All listed endpoints are declared in the local FastAPI OpenAPI schema. Request validation is Pydantic. `ContentResponse` returns a serialized row with UUID, status, revision/timestamps and type fields. Authentication notation: `P` public, `A` server-authorized agent.

| Method and path | Auth | Request → response / purpose |
| --- | --- | --- |
| `GET /api/health` | P | service status |
| `POST /api/auth/send-otp` | P | email → generic send success/error, never code |
| `POST /api/auth/verify-otp` | P | email + six-digit OTP → `verified: true` or safe error |
| `POST /api/contact` | P | name, email, message → delivery status; rate limited |
| `POST /api/admin/auth/login` | P + Origin/header | email + password → challenge token; email sent |
| `POST /api/admin/auth/resend` | challenge | challenge → resend status/limit |
| `POST /api/admin/auth/verify` | challenge | challenge + OTP → HttpOnly session cookie + CSRF data |
| `GET /api/admin/auth/me` | A | current agent identity + CSRF state |
| `POST /api/admin/auth/logout` | A + CSRF | revokes DB session and clears cookie |
| `GET /api/public/catalog` | P | complete published catalog |
| `GET /api/public/site-content/{key}` | P | one published site-content row |
| `GET /api/admin/catalog` | A | all statuses for all CMS kinds |

For **each** of `branches`, `semesters`, `subjects`, `books`, `labs`, `experiments`, `career-domains`, `career-roles`, `site-content`, these exact six admin paths plus one public path exist:

| Method and path (replace `{kind}` with each name above) | Auth | Request → response / purpose |
| --- | --- | --- |
| `GET /api/public/{kind}` | P | published list, ancestor-filtered |
| `GET /api/admin/{kind}` | A | all-status list |
| `POST /api/admin/{kind}` | A + CSRF | type-specific validated body → created row |
| `GET /api/admin/{kind}/{row_id}` | A | UUID → row |
| `PUT /api/admin/{kind}/{row_id}` | A + CSRF | type-specific validated body/revision → updated row |
| `GET /api/admin/{kind}/{row_id}/dependencies` | A | UUID → dependent rows before archive |
| `PATCH /api/admin/{kind}/{row_id}/status` | A + CSRF | status + revision → changed row or dependency error |

The documented pattern represents every instantiated path, not an additional catch-all route. Interactive request schemas and exact status codes are available at local `/docs` or `/openapi.json`.

## PostgreSQL schema and content

Local connection query confirmed `pivot_sols` / `pivot_admin`; Alembic current and head both `b6d3f9a2c741` on 30 September 2026. The additive revisions since `222b971ed0e6` added level-specific resources, the optional career YouTube URL, and `student_sessions`. The local database previously had one agent, 171 published content rows, nine archived temporary QA rows, and 68 relationship rows; this turn did not recount those rows. The private deployment snapshot was created before the latest QA book and experiment and excludes archived QA records. There is no student account table, but there is a revocable student session table. Neon Free was last verified at `222b971ed0e6` with the 171 content/68 relationship snapshot; it needs the pending migrations before manual deployment. No agent account or sessions were transferred.

| Table | Key / important fields | FKs, unique constraints, lifecycle |
| --- | --- | --- |
| `admins` | UUID `id`, email, Argon2id password_hash, display_name, is_active, last_login_at | email unique; no content status |
| `admin_challenges` | UUID `id`, admin_id, token_hash, otp_hash, expiry, attempts, used_at | FK admins; unique token_hash; one-time challenge |
| `admin_sessions` | UUID `id`, admin_id, token_hash, created/expires/last_used/revoked | FK admins; unique token_hash; revocable |
| `admin_auth_throttles` | `key` PK, window_start, attempts | database login throttle |
| `student_sessions` | UUID `id`, verified email, entered profile fields, token_hash, created/expires/last_used/revoked | unique token hash; 30-day absolute lifetime; revocable |
| `branches` | UUID `id`, slug, short_name, name, description, areas | unique slug; draft/published/archived |
| `semesters` | UUID `id`, academic_level, branch_id, name, number | FK branches; unique(branch_id,number); status |
| `subjects` | UUID `id`, semester_id, slug, code, name, description | FK semesters; unique(semester_id,slug); status |
| `reference_books` | UUID `id`, subject_id, title, authors, category, edition, publisher, resource_url, availability, seed_key | FK subjects; unique seed_key; status |
| `labs` | UUID `id`, semester_id, name, slug, description | FK semesters; unique(semester_id,slug); status |
| `experiments` | UUID `id`, lab_id, title, slug, experiment_number, guide fields, video_type/video_url/duration | FK labs; unique(lab_id,slug); status |
| `career_domains` | UUID `id`, slug, descriptions, skills, subjects, tools, roadmap, programming/mathematics level | unique slug; status |
| `career_roles` | UUID `id`, domain_id, slug, responsibilities, skills, roadmap, interview topics, projects | FK career_domains; unique slug; status |
| `career_resources` | UUID `id`, resource_type, branch_id, title, PDF/supporting/optional YouTube URLs | FK branches; draft/published/archived |
| `site_content` | UUID `id`, key, title, content_json | unique key; status; About/Explore |
| `branch_domains` | branch_id + domain_id composite PK | FKs branches/domains |
| `branch_roles` | branch_id + role_id composite PK | FKs branches/roles |
| `domain_related_roles` | domain_id + role_id composite PK | FKs domains/roles |

Every content table also has sort order, created/updated timestamps and an `id`; status is constrained to draft/published/archived. Principal chains: branch → semester → subject → reference book; branch → semester → lab → experiment; career domain → career role, plus many-to-many branch/domain/role links. P1 semesters may have no branch; E1 uses configured branches. `alembic_version` tracks migration and is not an application content table.

## Validation, security and current limits

On 30 September 2026, the two requested changes passed 135/135 frontend tests and the production build; backend tests and local migration checks are reported in the final task result. Automated checks cover student session restoration, expiry and revocation, session-bound Problem author identity, career YouTube URL validation and rendering, and agent auth regression. Earlier live browser checks verified student OTP, dashboard refresh/profile/logout, Contact inbox delivery, responsive student routes, resource search, and a temporary published YouTube experiment. Those earlier checks do not constitute a new hosted acceptance test. The About page reads published CMS content; editorial claims were not externally fact checked.

SQLAlchemy/parameterized operations, Pydantic validation, whitelist video URL handling, no `dangerouslySetInnerHTML` in application source, and server-only secrets were inspected. `.gitignore` and staged paths were checked; there is still no commit history or remote. The owner confirmed local student OTP, Contact delivery, and agent OTP; draft→publish→archive visibility was checked for temporary book and experiment records. The published experiment produced an explicit-load `youtube-nocookie.com` embed, and archiving removed it from the public API. Neon Free has been migrated and imported. Cross-site cookie blocking, free-host cold starts, Brevo delivery, and process-memory student OTPs require hosted acceptance testing. No public frontend/backend deployment or domain was verified yet.

Run `npm test`, `npm run build` at root; run `.\.venv\Scripts\python.exe -m pytest` and `-m alembic current/heads/upgrade head` from `backend`. The exact local startup commands and ports are in `LOCAL_SETUP.md`. New agent creation: `backend/scripts/create_admin.py` in an interactive TTY, after migrating. Data transfer: `backend/scripts/transfer_content.py` content-only import into an empty migrated DB. See `DEPLOYMENT.md` for both Vercel/Render/Neon/Brevo and the requested Vercel/Railway/PostgreSQL manual route.

## Recommended manual deployment order

1. Review the 30-day student session and finish any remaining local CMS/viewport checks.
2. Complete the initialized, secret-reviewed Git repository with the owner's chosen author identity, then create/push the authorized private GitHub repository.
3. Choose the owner's preferred free path: Neon DB, Brevo sender/key, Render Free backend. Railway is an alternative only if the owner deliberately reopens that choice; use Brevo HTTPS below Railway Pro.
4. Set backend-only secrets and exact anticipated frontend origin; migrate the target PostgreSQL database to the latest Alembic head.
5. Import content-only snapshot into the empty migrated DB; create the first production agent via hidden terminal prompt.
6. Deploy one-worker backend, record its real HTTPS origin, check health and public catalog.
7. Connect/import Vercel repository with root `.`, Vite, build `npm run build`, output `dist`; verify the `/api` proxy target in `vercel.json`, then deploy manually.
8. Record the actual frontend HTTPS origin, set backend `FRONTEND_URL` to that exact value, and restart/redeploy backend.
9. Verify CORS and same-origin proxied cookies, direct SPA route refreshes, real student/agent OTP inbox verification, CMS publish→student visibility, video, Contact, logout, and browser/phone layouts.
10. Check persistence after restart, no leaked secrets, provider usage limits and billing settings. Sign off `DEPLOYMENT_CHECKLIST.md` with actual URLs and date.
