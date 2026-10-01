# Landing-page verification

- Production build: `npm run build` (TypeScript project checks and Vite production bundle).
- Automated video checks: `npm test`, five passing tests covering fade-in/out, delayed restart, paused/hidden behavior, cleanup, and media/autoplay errors.
- Browser: landing page and live playback verified using the supplied remote MP4 (14.04 seconds; ready state 4; unpaused).
- Desktop Sign Up, Get Started, mobile Sign Up, Back to Home, and browser back verified.
- Mobile navigation opens and supports Escape dismissal. Explore Platform targets the bottom resource area.
- Pause/resume control verified against both the video's paused property and marquee animation state.
- Layout measured at 320, 375, 430, 768, 1024, 1280, 1440, and 1920 CSS pixels. No document or heading horizontal overflow. Desktop navigation replaces the menu at 1024px.
- A 1280 × 720 viewport fits the page without vertical scrolling. Narrow phones use normal vertical scrolling as content wraps.
- No browser console errors or warnings observed during the interaction checks.

Reduced-motion handling is implemented in Motion, CSS, and video playback; its video behavior is covered by the deterministic tests. An OS-level reduced-motion setting was not changed during browser QA.

External video/font availability remains dependent on the supplied hosting services. Dark background and local Geist Sans fallbacks are provided.

## Authentication phase

- `npm run build`: passes TypeScript and Vite production build with no build warnings.
- `npm test`: 33 passing tests, including the existing video-loop tests, student validation, profile resolution, auth request wiring, route gating, and actual PostgreSQL migration/RLS tests using development-only PGlite.
- Signup and login measured at 320, 375, 430, 768, 1024, 1280, 1440 and 1920 pixels: no horizontal overflow. Desktop auth panel appears at 1024px; below that breakpoint its video element is removed and the form uses the full mobile layout.
- Auth video loaded and played with ready state 4. No full-panel dark overlay is added.
- Browser verified P1/E1 detection, unsupported-batch error, rejected personal email, email/ID mismatch, password visibility, signup/login links and the graceful missing-configuration notice.
- Direct logged-out visits to `/dashboard`, `/profile` and `/complete-profile` resolve to `/login`. Empty callback and 404 states render correctly.
- Landing page source/styles were preserved; its Sign Up link reaches the new registration page.
- No browser console errors or warnings observed during final checks.
- Live Supabase sign-in, actual confirmation email delivery, Google consent, real authenticated dashboard/profile rendering, and live logout are **not tested** because credentials are absent. Their request wiring, profile logic, route decisions and logout state clearing are covered by isolated tests. No fake authenticated session was placed in the app.
- Supabase hook activation, provider configuration, SMTP delivery and real-user acceptance checks remain required; follow `SUPABASE_SETUP.md`.

## Dashboard UI phase

- `npm test`: 40 passing tests, preserving all existing authentication, academic-cycle, PostgreSQL/RLS and landing-video coverage.
- `npm run build`: TypeScript and Vite production build pass with no warnings.
- Dashboard, profile, contact, branches and about measured at 320, 375, 430, 768, 1024, 1280, 1440 and 1920 pixels: no horizontal overflow. Mobile navigation has exactly five readable links; page-bottom spacing clears it. Desktop sidebar is 244px; card grid adapts from one to two columns.
- All five resource cards, desktop/mobile navigation and Profile dropdown navigation verified. Active links expose aria-current.
- Search verified with input focus, Tab/Shift+Tab containment, Escape/X/backdrop dismissal and trigger focus restoration. Modal and dropdown fit 320px screens.
- All ten student routes redirect anonymous direct visits to login; login refresh works. No browser console errors or warnings observed.
- Student-page browser layout checks used isolated fixture props in a temporary component-only harness, removed after QA. No fake application session or production profile was created.
- Live verified login, authenticated deep-link refresh and logout remain untested because Supabase credentials are absent. Existing auth wiring and route-gate tests pass. See `DASHBOARD_PHASE_REPORT.md` for the full file and feature inventory.

## Prototype demo override and preserved books work

Historical checks below describe the retired fixed-code phase. Current authentication uses the real email OTP flow described in REAL_OTP_SETUP.md.

- 61 tests pass: original 40, 12 books architecture checks and nine demo-auth checks. Existing production guard tests explicitly use DEMO_MODE false.
- TypeScript and Vite production build pass without warnings. Supabase is excluded from the demo bundle; real code remains in the source.
- The historical built app accepted Harsha / ABC123 / E1 with the former presentation code and rejected a different code. Full dashboard reload preserved that profile. Logout returned home and a subsequent direct dashboard visit redirected to login.
- Pavan / N260123 / P1 verified. Landing Get Started reaches login. Profile displays RGUKT Nuzvid and demo@rguktn.ac.in. Five mobile links and profile/search controls verified.
- Login and OTP fit 320, 375, 430, 768, 1024, 1280, 1440 and 1920 pixels. Production books empty state also fits these widths; earlier component checks confirmed long book/author text wrapping.
- No console warnings/errors observed during production-preview checks. No live Supabase sign-in is claimed; the prototype uses local storage and the real auth branch retains automated coverage.
- The temporary books QA fixture files were removed. Current instructions and data preparation are in DEMO_MODE_GUIDE.md and REFERENCE_BOOKS_DATA_GUIDE.md.

## Working Reference Books prototype — 21 September 2026

- Final sequence: `npm test` followed by `npm run build`. All 73 tests pass; TypeScript and Vite build without warnings.
- The prototype catalog now follows `DEMO_MODE`, so supplied demo subjects and book details work in both development and built previews. This supersedes the previous development-only fixture behavior.
- Built-app E1 flow verified at the books release: Landing → Get Started → Harsha / N240001 / E1 → former prototype verification → dashboard → Reference Books → six branches → ECE → Semester 1 → Network Theory → both books and details.
- Built-app P1 flow verified at the books release: logout → Landing → Student / ANYTHING / P1 → former prototype verification → dashboard → Reference Books → semesters directly → Physics → details. The E1 branch preference does not appear in P1.
- E1 branch return/reload, Change, EEE preparation state and invalid subject recovery verified. Deep ECE and P1 subject URLs survive full refresh with the demo session.
- Search verified for Network and author Valkenburg. Automated checks also cover all 30 valid subject paths, both CSE/ECE subject lists and both semesters of all four empty branches.
- Details dialog verified with initial focus, Tab/Shift+Tab wrapping, Escape with focus return, X, Close and backdrop dismissal. At 320px, long sample titles wrap and the dialog scrolls within short viewports.
- Branch/book layout measurements covered 320, 375, 430, 768, 1024, 1280, 1440 and 1920 CSS pixels without horizontal document overflow. Mobile screenshots confirm books clear the five-link bottom navigation. Viewport overrides were reset.
- `npm run dev` verified separately through demo E1 login, CSE Semester 2, Probability & Statistics and its details dialog. No console warnings or errors were observed in either the development or built-app checks.
- SHA-256 comparison confirms all 19 monitored auth, profile, validation, dashboard/navigation, landing/style and SQL files match the pre-task baseline. No new dependency, resource backend or PDF/download feature was added.
- Full inventory and all 13 requested report items are in `REFERENCE_BOOKS_PROTOTYPE_REPORT.md`.

## Real email OTP — completed 23 September 2026

- Final frontend validation: 85 tests passed, zero failures; TypeScript and Vite production build passed without warnings.
- Final backend validation: 45 tests passed, zero failures. Two upstream Starlette test-client deprecation warnings remain, as documented in REAL_OTP_REPORT.md.
- Email OTP uses random six-digit codes, HMAC-SHA-256 storage, five-minute expiry, five incorrect attempts, 60-second resend cooldown, five send attempts per 15 minutes and single-use verification. Automated tests cover these limits, replacement, concurrency and SMTP failure cleanup without sending real emails.
- The retired fixed-code grant and hint are absent from active frontend source. Old session markers cannot restore access. Sending alone creates no session; backend verification must succeed before the profile is persisted.
- Live Gmail send returned 200 and opened Verify OTP with the countdown. The owner completed the manual check, reported that it works, and confirmed the email phase is complete. No further test emails were sent after that confirmation.
- Live health endpoint returned 200 with the expected service response. Manual real-inbox testing of every expiry/replay/rate-limit edge case is not claimed; those cases have automated coverage.
- Login required-field validation and widths 320, 375, 430, 768, 1024 and 1440 were checked without horizontal overflow. Viewport overrides were reset.
- All 19 monitored Supabase, production validation, SQL, dashboard/navigation, landing/style, Reference Books and production-auth documentation files matched their pre-task hashes. The optional prototype AuthContext method's return type was updated; production auth actions were preserved.
- Full 17-item implementation report: REAL_OTP_REPORT.md. Exact startup commands and local Gmail setup: REAL_OTP_SETUP.md.

## Lab Videos — 23 September 2026

- `npm test`: 102 passed, zero failures; all 85 prior tests preserved plus 17 Labs tests.
- `npm run build`: TypeScript and Vite production build passed without warnings.
- Backend `.venv/Scripts/python.exe -m pytest`: 45 passed, with the same two upstream Starlette deprecation warnings.
- Existing email-verified E1 session: Dashboard → Lab Videos → ECE → Semester 1 → Network Theory Lab → Thevenin guide verified, including refresh, back links, semester breadcrumb, profile navigation and invalid-route recovery.
- Lab-name search, Norton experiment search, clearing and no-match states verified in the browser. Keyboard focus remained visible. No browser console errors or warnings were observed.
- Branch, semester, lab-grid and detail views measured at 320, 375, 430, 768, 1024, 1280, 1440 and 1920 CSS pixels with no horizontal overflow. Video stayed 16:9; the 320px guide cleared bottom navigation. Viewport overrides reset.
- Reference Books regression: saved ECE preference, Semester 1, Network Theory and both reference listings remain functional.
- P1 direct-semester routing, both P1 lab lists and every P1 deep link pass automated checks. A real P1 OTP browser login is awaiting the owner's P1 sign-in; no manual P1 result or fresh email delivery is claimed.
- All 26 monitored auth/session, backend, dashboard/shell, Books page/data/style and SQL hashes match the pre-task baseline. SMTP secrets were neither read nor changed.
- Full inventory, data counts, video limitations and all 17 report items: LAB_VIDEOS_REPORT.md. Teammate content instructions: LAB_VIDEOS_DATA_GUIDE.md.

## Complete current sections — 23 September 2026

- `npm test`: **124 passed**, zero failures/skips. All prior tests retained; obsolete placeholder expectations updated for functional sections.
- Backend pytest: **66 passed**, including all 45 prior tests and 21 new contact cases. Same two upstream test-client deprecation warnings.
- `npm run build`: TypeScript and Vite passed with exit 0, no warnings. Actual production bundle tested before restoring Vite development at port 5173.
- Added 16 domain guides, 24 canonical role guides, six branch guides, functional Explore, one shared search index and FastAPI contact delivery with validation, duplicate prevention and independent limits.
- All ten requested page types checked at all eight widths: 80 measurements without horizontal overflow. Thirty additional mobile end-of-page checks showed at least 96px clearance above fixed bottom navigation. Viewport reset after screenshots and checks.
- Verified existing E1 session journey, domain/role filters, search-result navigation, modal keyboard behavior, book details, lab guide, resource finder, branch links, contact validation, profile, logout and protected-route redirect.
- Final production verification captured no console errors/warnings. Temporary edit-time role-helper hot-reload errors had been resolved before the final build.
- No fresh OTP or real contact email was sent. The owner previously confirmed OTP delivery; P1 and auth edge cases remain covered by automated tests. CONTACT_TO_EMAIL is owner-managed.
- Core preservation baseline: 16 of 18 monitored files unchanged. The two intentional navigation changes keep Branches active on nested routes. SMTP credentials and actual environment files were not read or edited.
- Full feature status, file/route inventory, build output and limitations: [PIVOT_SOLS_COMPLETION_REPORT.md](./PIVOT_SOLS_COMPLETION_REPORT.md). Content editing: [CONTENT_MANAGEMENT_GUIDE.md](./CONTENT_MANAGEMENT_GUIDE.md).

## OTP runtime recovery — 23 September 2026

- Follow-up after the owner reported OTP failure: backend health and browser preflight succeeded, but sends returned 503 and repeated failed sends reached the configured 429 limit.
- A secret-safe SMTP diagnostic isolated Windows socket error 10013 during connection in the restricted tool runtime. The same existing settings connected, negotiated STARTTLS and authenticated successfully in an approved process with outbound network access.
- Restarted the existing local backend with network access. No credentials, authentication code, expiry/cooldown rules or rate-limit implementation were changed. The restart cleared in-memory pending codes and the temporary failed-attempt history.
- One live OTP was sent through `/api/auth/send-otp` to the previously approved test inbox. The endpoint returned HTTP 200 and `success: true`, confirming SMTP accepted delivery. Inbox arrival and code entry remain user-visible checks; no code was read or logged.
- All **66 backend tests passed** during diagnosis, with the same two existing upstream deprecation warnings. Added the runtime/network distinction to `REAL_OTP_SETUP.md`.
