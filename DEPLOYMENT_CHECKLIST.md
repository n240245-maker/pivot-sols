# Pivot Sols deployment checklist

Checked boxes record completed local or Neon setup as of 25 September 2026. Public hosting is still pending; record actual URLs only after deployment.

## Local release gate

- [x] Local FastAPI `/api/health` and Vite `/login` respond.
- [x] PostgreSQL connects as `pivot_admin` to `pivot_sols`; Alembic current=head `222b971ed0e6`.
- [x] Frontend tests, backend tests, and local production compilation pass (see `PROJECT_HANDOFF.md` for exact run).
- [x] `.env.example` uses the actual port 8000; backend CORS origin matches local frontend.
- [x] `.gitignore` excludes local secrets, private content export, builds, and caches.
- [x] Real student OTP inbox receipt and verification confirmed by the owner; browser reached dashboard, retained it on refresh, showed profile, and redirected after logout.
- [x] `CONTACT_TO_EMAIL` configured in ignored local backend `.env`; owner confirmed one real Contact delivery.
- [x] Agent password and OTP sign-in confirmed by the owner; browser reached `/admin`. Student route checks covered 375/768/1024/1440 px across 15 routes, plus selected 320/1920 px checks. Seven agent sections also loaded without document overflow at 375/768/1440 px.
- [x] Local CMS test book and experiment each stayed hidden as drafts, appeared in public API when published, and disappeared after archiving. Experiment preview generated an explicit-load YouTube no-cookie iframe. Temporary rows remain archived locally and are absent from the Neon snapshot.
- [ ] Put student verification behind a server-authorized student session if private student data or production-grade access control is required. Current student profile marker is browser localStorage.

## Source and hosting

- [x] Initialize local Git repository and stage reviewed source. Ignored `.env`, private snapshot, dependencies and build artifacts are excluded. First commit and push await the owner's Git identity and GitHub sign-in.
- [x] Choose the free Render + Neon + Brevo path; no paid plan selected.
- [x] Create Neon Free PostgreSQL and store its connection string only in an ignored local private file.
- [ ] Configure backend `FRONTEND_URL`, `OTP_SECRET`, email provider credentials/sender, and `CONTACT_TO_EMAIL`; verify sender ownership.
- [x] Run Alembic `upgrade head` on the new empty Neon database. Content import confirmed the matching migration revision.
- [x] Import and verify the ignored content-only snapshot in Neon: 171 intended content rows and 68 relationships. The first attempt rolled back safely on a timezone formatting mismatch; normalization was fixed and the verified import succeeded.
- [ ] Create first production agent with hidden password prompt; never put its password in CLI arguments, code, chat, or logs.
- [ ] Deploy one-worker backend and verify actual HTTPS `/api/health`; record actual backend origin.
- [ ] Import repository into Vercel (root `.`, Vite, `npm run build`, output `dist`), set only public `VITE_API_BASE_URL` to the actual HTTPS backend origin, deploy, record actual frontend origin.
- [ ] Set backend `FRONTEND_URL` to the actual Vercel origin, restart/redeploy backend, verify credentialed CORS/Origin and secure admin cookie.

## Production acceptance

- [ ] Refresh deep links `/login`, `/dashboard`, `/admin/login`, `/resources/books/...`, `/resources/labs/...` directly.
- [ ] Receive **and verify** a student OTP; check dashboard refresh, profile, protected route and logout.
- [ ] Agent password → OTP → server session; reject unauthenticated/admin API access; logout revokes session.
- [ ] Publish/edit/archive a temporary book; confirm student visibility rules and restore/archive QA content.
- [ ] Publish/edit/archive a temporary lab experiment with valid YouTube URL; check desktop/mobile playback and cleanup.
- [ ] Validate Career Domains, Jobs, Branches, Explore/global search and draft/archived exclusion.
- [ ] Submit Contact and confirm real recipient inbox delivery, validation, failure display and rate limit.
- [ ] Check 320, 375, 430, 768, 1024, 1280, 1440 and 1920 px widths for overflow and navigation.
- [ ] Check browser console/network for unexpected errors; verify no secrets appear in frontend bundle, responses or logs.
- [ ] Recheck provider quotas, free-tier availability, third-party-cookie behavior and persistent DB after backend restart.
