# Pivot Sols authentication phase

Implementation is complete in the existing repository. Live authentication awaits external Supabase configuration; missing configuration never produces a simulated success. The landing page and existing visual identity were preserved.

## Created files

- `.env.example`
- `src/vite-env.d.ts`, `src/auth.css`
- `src/config/academic.ts`, `src/types/student.ts`
- `src/lib/supabase.ts`, `studentValidation.ts`, `studentProfile.ts`, `authErrors.ts`
- `src/contexts/AuthContext.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/components/auth/`: `AuthLayout.tsx`, `AuthVideoPanel.tsx`, `InputGroup.tsx`, `DetectedYear.tsx`, `GoogleButton.tsx`, `AuthNotice.tsx`, `VerificationNotice.tsx`, `AccessProblem.tsx`, `useAuthAction.ts`
- `src/components/common/`: `LoadingScreen.tsx`, `RouteEffects.tsx`, `StudentShell.tsx`
- `src/pages/`: `SignupPage.tsx`, `LoginPage.tsx`, `AuthCallbackPage.tsx`, `CompleteProfilePage.tsx`, `DashboardPage.tsx`, `ProfilePage.tsx`, `NotFoundPage.tsx`
- `supabase/migrations/001_student_profiles.sql`, `002_academic_cycle.sql`
- `scripts/generate-academic-sql.mjs`
- `tests/student-validation.test.mjs`, `profile-flow.test.mjs`, `database-security.test.mjs`, `auth-routing.test.mjs`, `load-typescript.mjs`
- `SUPABASE_SETUP.md`, this report

## Modified files

- `src/App.tsx`: new routes, guest/protected guards, route title/scroll effects.
- `src/main.tsx`: centralized AuthProvider and scoped auth styles.
- `vite.config.ts`: separate Supabase bundle.
- `package.json`, `package-lock.json`: dependencies and academic SQL generation command.
- `README.md`, `QA.md`: architecture, setup and validation documentation.

Replaced/removed `src/pages/SignupPlaceholder.tsx`. No changes were made to `LandingPage.tsx`, the landing components, `src/index.css`, or the existing landing video tests. Generated `dist/` and TypeScript build metadata remain ignored build artifacts.

## Dependencies

- Runtime: `@supabase/supabase-js`.
- Development only: `@electric-sql/pglite` for executing PostgreSQL migrations and RLS tests without a remote database.

## Authentication architecture

`AuthProvider` owns session state, confirmed user validation, profile resolution, auth-state subscriptions and signup/login/OAuth/resend/logout actions. It validates stored sessions with `getUser()` before granting access. Auth work runs outside the synchronous subscription callback to avoid lock contention, and stale async responses are discarded. The shared client uses PKCE, persistent sessions and automatic token refresh.

`ProtectedRoute` waits for verification, redirects logged-out visitors to login, routes incomplete verified profiles to completion, and admits only supported complete profiles. Guest routes redirect completed users to the dashboard. Logout invokes Supabase and clears the central state before returning home.

## Student identity and email

IDs are trimmed, uppercased and validated as `N` plus six digits. Admission batch is stored independently. The central configuration is P1 batch 26; E1 is two batches earlier (24), while batch 25 is unsupported. A generation script keeps the SQL academic-cycle seed in sync with the TypeScript source.

Email parsing rejects malformed addresses and accepts only the exact, case-insensitive `rguktn.ac.in` domain. Both manual input and the authenticated user's confirmed email are checked. Embedded IDs must match; ambiguous or truncated IDs are not guessed.

## Google OAuth

The shared action calls `signInWithOAuth` for Google with a callback based on the current application origin. The SDK exchanges the returned PKCE code once. The central provider checks the actual confirmed institutional email, uses an existing profile, or creates one from a safely extracted ID. A valid account without an extractable ID retains the Google name/email and requests only RGUKT ID on `/complete-profile`.

## Database and RLS

The migration creates profiles with an Auth foreign key, unique IDs/emails, RLS for own-row operations, and a trigger that validates confirmed Auth identity and derives protected fields server-side. An invoker-rights RPC makes profile creation idempotent. A Before User Created hook rejects non-institutional and unsupported-provider account creation when activated in Supabase. No password is stored in profiles and no secret/service-role key belongs in the frontend.

## Routes

`/`, `/signup`, `/login`, `/auth/callback`, `/complete-profile`, `/dashboard`, `/profile`, and a wildcard 404. Dashboard/profile are protected and intentionally remain basic placeholders. Resource areas are not implemented.

## Validation and remaining setup

Production build passes without warnings; all 33 tests pass. Browser QA covered both auth forms at all eight requested widths, actual auth video playback, validation states, password visibility, navigation and logged-out route protection, with no console errors. See `QA.md` for exact limits.

Still required in the external dashboards: create/select Supabase project, set public frontend credentials, apply both SQL files, activate the Before User Created hook, enable email confirmation, configure SMTP and Google OAuth, and allow local/production callback URLs. Then test real verification, Google sign-in, profile creation and logout using institutional accounts you control. Follow `SUPABASE_SETUP.md`; the app was not deployed and no live accounts were created.
