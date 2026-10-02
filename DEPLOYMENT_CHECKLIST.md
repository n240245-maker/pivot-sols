# Pivot Sols deployment checklist

Checked boxes record completed local or Neon setup through 2 October 2026. Public hosting is still pending; record actual URLs only after deployment.

## Local release gate

- [x] Local FastAPI `/api/health` and Vite `/login` respond.
- [x] PostgreSQL connects as `pivot_admin` to `pivot_sols`; local Alembic current=head `c84e7a0b6d22`. Neon was last verified at `222b971ed0e6` and needs the pending additive migrations during manual deployment.
- [x] Frontend tests, backend tests, and local production compilation pass (see `PROJECT_HANDOFF.md` for exact run).
- [x] `.env.example` uses the actual port 8000; backend CORS origin matches local frontend.
- [x] `.gitignore` excludes local secrets, private content export, builds, and caches.
- [x] Earlier student OTP inbox receipt and verification were confirmed by the owner. The new name/ID/year flow replaces that prior login and needs hosted acceptance testing.
- [x] `CONTACT_TO_EMAIL` configured in ignored local backend `.env`; owner confirmed one real Contact delivery.
- [x] Earlier Agent password and OTP sign-in were confirmed by the owner; the new password-only flow retains the same Agent accounts and sessions. Earlier student route checks covered 375/768/1024/1440 px across 15 routes, plus selected 320/1920 px checks.
- [x] Local CMS test book and experiment each stayed hidden as drafts, appeared in public API when published, and disappeared after archiving. Experiment preview generated an explicit-load YouTube no-cookie iframe. Temporary rows remain archived locally and are absent from the Neon snapshot.
- [x] Student name/ID/year login issues a revocable 30-day PostgreSQL session; frontend restores through `/api/auth/me` instead of a localStorage login marker. Student ID ownership is self-declared and unverified.

## Source and hosting

- [x] Initialize local Git repository and stage reviewed source. Ignored `.env`, private snapshot, dependencies and build artifacts are excluded. First commit and push await the owner's Git identity and GitHub sign-in.
- [x] Choose the free Render + Neon + Brevo path; no paid plan selected.
- [x] Create Neon Free PostgreSQL and store its connection string only in an ignored local private file.
- [ ] Configure backend `FRONTEND_URL`, `OTP_SECRET`, email provider credentials/sender, and `CONTACT_TO_EMAIL`; verify sender ownership.
- [x] Run Alembic `upgrade head` on the new empty Neon database. Content import confirmed the matching migration revision.
- [x] Import and verify the ignored content-only snapshot in Neon: 171 intended content rows and 68 relationships. The first attempt rolled back safely on a timezone formatting mismatch; normalization was fixed and the verified import succeeded.
- [ ] Create first production agent with hidden password prompt; never put its password in CLI arguments, code, chat, or logs.
- [ ] Deploy one-worker backend and verify actual HTTPS `/api/health`; record actual backend origin.
- [ ] Import repository into Vercel (root `.`, Vite, `npm run build`, output `dist`); verify `vercel.json` proxies `/api/:path*` to the actual Render backend before the SPA fallback. Do not set `VITE_API_BASE_URL` in production. Record the actual frontend origin.
- [ ] Set backend `FRONTEND_URL` to the actual Vercel origin, restart/redeploy backend, verify credentialed CORS/Origin and secure admin cookie.

## Production acceptance

- [ ] Refresh deep links `/login`, `/dashboard`, `/admin/login`, `/resources/books/...`, `/resources/labs/...` directly.
- [ ] Sign in with student name/ID/year; check both dashboards, refresh, browser reopen, profile, protected routes, expiry and logout.
- [ ] Sign in as an existing Agent with email/password; reject unauthenticated/admin API access; verify no code email is sent and logout revokes session.
- [ ] Publish/edit/archive a temporary book; confirm student visibility rules and restore/archive QA content.
- [ ] Publish/edit/archive a temporary lab experiment with valid YouTube URL; check desktop/mobile playback and cleanup.
- [ ] Validate Career Domains, Jobs, Branches, Explore/global search and draft/archived exclusion.
- [ ] Submit Contact and confirm real recipient inbox delivery, validation, failure display and rate limit.
- [ ] Check 320, 375, 430, 768, 1024, 1280, 1440 and 1920 px widths for overflow and navigation.
- [ ] Check browser console/network for unexpected errors; verify no secrets appear in frontend bundle, responses or logs.
- [ ] Recheck provider quotas, free-tier availability, same-origin student cookie behavior and persistent DB after backend restart.
