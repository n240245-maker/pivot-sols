# Prototype authentication mode

`src/config/demo.ts` still exports `DEMO_MODE = true`, but this mode now uses **real email OTP verification through FastAPI**. The former fixed-code flow has been retired. Follow [REAL_OTP_SETUP.md](./REAL_OTP_SETUP.md) for Gmail configuration, startup commands and acceptance checks.

1. Open `/login`, or choose Get Started / Sign Up on the landing page.
2. Enter a non-empty name and student ID, choose P1/E1, and enter an email you control.
3. Send OTP. The backend delivers a random code to that address. Sending alone never creates a session.
4. Enter the delivered code. Only a successful backend verification creates the local prototype profile and opens the dashboard.

The email is used directly in Profile. Student ID parsing, institutional-domain restrictions and batch inference are not applied in this prototype. Campus remains `Nuzvid` internally and displays as RGUKT Nuzvid. The required runtime profile `batch` remains a non-authoritative zero sentinel and is not stored. No Supabase user or session is fabricated.

## Sessions

`src/lib/demoSession.ts` owns `pivot-sols-demo-session` and `pivot-sols-demo-profile`. The marker is now `email-verified-v2`; older markers cannot restore access. Storage contains only name, student ID, academic level, verified email and campus, plus that marker. Malformed profiles are rejected. Refresh restores the profile; logout removes both keys and returns home. Resource branch preferences are retained separately.

This is a local browser-managed prototype session, not production authorization. No OTP, OTP hash, SMTP configuration or OTP secret belongs in browser storage. DemoAuthProvider shares the existing AuthContext, so dashboard and Reference Books retain their existing profile interface.

## Resources

Reference Books continues to follow `DEMO_MODE`. With it enabled, the P1/CSE/ECE sample catalog works in both development and built previews. See `REFERENCE_BOOKS_DATA_GUIDE.md` for catalog editing. The older Reference Books report records the feature's initial release; authentication now follows this guide.

## Return to Supabase authentication

Set `DEMO_MODE = false` and rebuild/restart the frontend. The existing AuthProvider, institutional signup/login, email confirmation, Google OAuth, callback/profile completion and production protected-route checks are selected again. Prototype storage grants no access in that mode. Follow `SUPABASE_SETUP.md` for configuration. The Supabase client, SQL/RLS, validation and production auth actions remain intact.

## Verification

Current results, modified files and the outstanding/live Gmail acceptance status are recorded in `REAL_OTP_REPORT.md` and the latest section of `QA.md`. The existing authentication, database/RLS, dashboard, Reference Books and landing regression tests remain in the suite; the former fixed-code assertions now require backend verification instead.
