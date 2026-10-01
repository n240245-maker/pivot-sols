# Pivot Sols · Supabase setup

The frontend integration and database migrations are implemented. No live Supabase credentials were present during development, so Google consent, email delivery and a real authenticated session still need to be tested after this setup. The app never substitutes a demo session when configuration is missing.

## 1. Create the project and configure the app

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard). Save the database password privately; the frontend does not use it.
2. In the project's Connect dialog or Settings → API, copy the **Project URL**.
3. Copy the **publishable key**, or the legacy **anon/public** key, from Settings → API Keys. Either works with the environment variable name below. Never use a secret key, service-role key, database password or Google client secret in a `VITE_` variable: Vite variables are bundled into browser code.
4. Copy `.env.example` to `.env.local`, then fill in the two values locally:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
   ```

5. Restart `npm run dev`. `.env.local` is ignored by Git. On Vercel, set these same two values in the project's environment settings and rebuild/redeploy. Environment values are read at build time.

Missing/invalid configuration leaves landing, signup and login usable for preview and validation, displays an account-service notice, disables Google redirect, and denies protected routes. A submitted form cannot claim success without Supabase.

## 2. Create the database and enable RLS

Use the Supabase SQL Editor to execute these files in order against the new project:

1. `supabase/migrations/001_student_profiles.sql`
2. `supabase/migrations/002_academic_cycle.sql`

The first migration is a one-time schema migration, not a repeatable reset. Track it as applied; do not rerun it over an existing schema. The second file can be reapplied when advancing the academic cycle.

The migration creates:

- `public.profiles`, with an `auth.users` foreign key, unique student ID/email, admission batch, derived academic level, campus and timestamps.
- RLS policies allowing authenticated students to read, insert and update **their own** profile. Anonymous access and client deletion are denied.
- A validation trigger that reads the real `auth.users` record, requires a confirmed institutional email, normalizes the ID, checks email/ID agreement when extractable, and derives email, batch, level, campus and timestamps. A student cannot change their stored ID or owner UUID.
- `ensure_student_profile`, an invoker-rights RPC using an atomic conflict handler. It preserves RLS and prevents duplicate profile creation across retries, tabs and React StrictMode.
- A protected academic configuration table and the signup-domain hook described below.

Keep the `private` schema out of exposed Data API schemas. Passwords remain entirely in Supabase Auth; the profiles table never stores them. Account metadata can supply a display name and candidate ID, but cannot grant access or set the saved academic level.

## 3. Restrict account creation on the server

In Authentication → Auth Hooks, enable **Before User Created** and choose the Postgres function:

```text
public.hook_restrict_rgukt_signup
```

This step is required. Creating the SQL function alone does not activate an Auth hook. The function permits only exact `rguktn.ac.in` email domains and the `email` or `google` providers; it rejects anonymous signup and other providers before a new Auth user is created. Its execution permission is limited to `supabase_auth_admin`.

Disable anonymous sign-ins, phone authentication and any other OAuth provider. Keep only Email and Google enabled. The profile trigger and RLS still deny unverified/non-institutional accounts even if a provider is mistakenly enabled, but the hook is what prevents foreign-domain Auth accounts from being created in the first place.

See [Supabase's Before User Created hook documentation](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook).

## 4. Enable email verification

1. In Authentication → Sign In / Providers → Email, enable Email signup and **Confirm email**.
2. Set the minimum password length to at least **8** in the project's password-security settings.
3. Configure a custom SMTP provider in Authentication → Emails/SMTP for actual student delivery. The default email service is intended for limited testing and may only send to authorized project/team addresses; production institutional delivery needs working SMTP.
4. Keep the signup confirmation email template using Supabase's confirmation URL (`{{ .ConfirmationURL }}`). The app supplies its callback URL as `emailRedirectTo`.
5. Register with an institutional account you control. Before confirmation there should be no usable app session/profile. The app displays a verification state with resend cooldown and a Back to login link.
6. Open the confirmation link in the **same browser** used to register so the PKCE verifier is available. If opened elsewhere or the verifier/link has expired, return to `/login` after confirming the email, or request a new verification link. Do not disable Confirm email to work around a callback issue.

With Confirm email disabled, Supabase implicitly confirms users. The client cannot distinguish that configuration from actual verification, so enabling it is mandatory. See [password authentication](https://supabase.com/docs/guides/auth/passwords) and [general auth configuration](https://supabase.com/docs/guides/auth/general-configuration).

## 5. Configure Google OAuth

1. In Google Cloud / Google Auth Platform, create or select a project and configure application branding, audience and consent. Use the Pivot Sols name and an audience that can include RGUKT students. For a testing-mode app, add the institutional test accounts you control.
2. Configure the basic `openid`, email and profile scopes. No Drive, contacts or other Google data access is needed.
3. Create an OAuth client of type **Web application**.
4. Authorized JavaScript origins:

   ```text
   http://localhost:5173
   https://pivot-sols.vercel.app
   ```

5. In **Google's Authorized redirect URIs**, add the Supabase provider callback shown on your Supabase Google provider page:

   ```text
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

   This is distinct from the application's `/auth/callback`. Google returns to Supabase first; Supabase then returns to Pivot Sols.

6. In Supabase Authentication → Sign In / Providers → Google, enable the provider and enter the Google Client ID and Client Secret. Keep the secret in Supabase's provider settings, never in the app's environment or repository. Keep email/nonce verification enabled.
7. Leave the app's `hd=rguktn.ac.in` account-chooser hint in place, but do not regard it as enforcement. The signup hook checks the domain, the app calls `getUser()` and checks the confirmed actual email, and the database validates the Auth record independently.

See [Supabase's Google setup documentation](https://supabase.com/docs/guides/auth/social-login/auth-google).

## 6. Configure Supabase URLs

Under Authentication → URL Configuration:

- **Site URL:** `https://pivot-sols.vercel.app` for the production project. A separate development project may use `http://localhost:5173`.
- **Redirect URLs:** add these exact application destinations:

  ```text
  http://localhost:5173/auth/callback
  https://pivot-sols.vercel.app/auth/callback
  ```

If using `127.0.0.1`, another Vite port, `vite preview` on port 4173, or a Vercel preview URL, add that origin's `/auth/callback` explicitly. Avoid broad production wildcards.

The app constructs all redirect URLs from `window.location.origin`. Its singleton Supabase client uses PKCE, persists the session, refreshes tokens and detects the returned code in the URL. The SDK performs the exchange once; `AuthCallbackPage` observes the shared auth state instead of exchanging it on each render. See [redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls) and [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

`vercel.json` already rewrites application routes to `index.html`, so direct visits and refreshes on `/auth/callback`, `/dashboard` and `/profile` reach React Router.

## 7. Academic-cycle changes

`src/config/academic.ts` is the source of truth for the deployment's current P1 batch. It is currently 26. E1 is always P1 minus two; batch 25 is P2 and unsupported in this cycle.

At the institution's academic transition:

1. Update `CURRENT_P1_BATCH` in that file.
2. Run `npm run db:academic` to regenerate `002_academic_cycle.sql` from it.
3. Apply the generated SQL to Supabase, then deploy the matching frontend in the same release window.
4. Run `npm test` and test the newly supported batches.

Do not edit scattered ID prefixes, use the calendar year, or manually change generated SQL. The tests detect a stale generated seed. The database re-derives levels on profile writes and denies access to batches outside its configured cycle; do not bulk-rewrite permanent student IDs or admission batches.

## 8. Live acceptance checks

Use only real institutional accounts you control; do not seed production with the isolated local test fixtures.

- Manual signup with lowercase ID normalizes on save; batch 26 detects P1 and batch 24 E1. A batch-25 ID is rejected. An email with a different embedded ID is rejected.
- Signup with personal Gmail, suffix-spoofed domains and direct requests to Supabase must be rejected by the server hook. Confirm that no such Auth user was created.
- Before email confirmation, password login is rejected and `/dashboard` remains inaccessible. Confirm, log in and check that one profile is created.
- Google with an institutional ID email automatically creates the correct profile. Google with a valid institutional email lacking an ID goes to `/complete-profile`, retaining the name/email and asking only for ID.
- Try a personal Google account; it must never reach `/dashboard` or create a profile.
- Refresh a completed session, revisit the callback, and open a second tab; there must still be one profile for the student.
- While logged out, directly visit `/dashboard` and `/profile`: both redirect to `/login`. Once fully authenticated, `/signup` and `/login` redirect to `/dashboard`.
- Log Out from the profile menu: the current browser session clears and the app returns home. Direct protected URLs must then redirect to login. This uses Supabase's `local` sign-out scope; it does not sign out other devices.
- Using two test students' authenticated clients, verify each can only read/update their own profile; inserting another user's UUID, changing the stored ID, or forging email/level must fail or be server-corrected.

## Local verification already available

```sh
npm test
npm run build
```

The tests include the real SQL migration executed in an isolated PGlite PostgreSQL instance with a minimal test-only Auth schema. They cover RLS, verified-email requirements, uniqueness, identity-field derivation, batch restrictions, the signup hook, profile resolution, request wiring, route gates and the existing landing video loop. They do **not** substitute for live Supabase Auth/OAuth/SMTP acceptance tests.
