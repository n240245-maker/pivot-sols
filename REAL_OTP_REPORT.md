# Real email OTP implementation report

Updated 23 September 2026. The active prototype now sends random email codes through a Python FastAPI backend. The fixed-code path is retired. The owner has confirmed successful manual operation of the email flow.

## 1. Frontend files created or modified

Created: `src/config/api.ts`, `src/lib/otpApi.ts`, `src/hooks/useOtpCountdown.ts`, `tests/email-otp.test.mjs`.

Modified: `src/pages/DemoLoginPage.tsx`, `src/components/demo/DemoOtp.tsx`, `src/contexts/DemoAuthContext.tsx`, `src/lib/demoSession.ts`, `src/demo.css`, `src/vite-env.d.ts`, frontend `.env.example`, `.gitignore`, and the optional prototype method's asynchronous type in `src/contexts/AuthContext.tsx`.

Test updates: `tests/demo-auth.test.mjs` replaces retired fixed-code assumptions with verified-backend-result requirements while retaining its original coverage; `tests/prototype-books.test.mjs` uses a verified-email fixture; `tests/load-typescript.mjs` supports the API environment value and controlled fetch/timer globals. No existing test was deleted. No npm dependency was added.

Documentation: created `REAL_OTP_SETUP.md` and this report; updated README, DEMO_MODE_GUIDE, QA and the historical Reference Books report's login note.

## 2. Backend files created

`backend/main.py`, `app.py`, `config.py`, `models.py`, `otp_service.py`, `email_service.py`, `requirements.txt`, `.env.example`, `pytest.ini`, and tests `conftest.py`, `test_otp_service.py`, `test_api.py`, `test_config_and_email.py`.

The ignored local `backend/.venv` was installed with Python 3.12.14. An ignored `backend/.env` was prepared with a randomly generated OTP_SECRET; the owner entered their SMTP configuration directly into that file. No credential value is included in source, examples or this report.

## 3. API endpoints

- `GET /api/health`: generic service health.
- `POST /api/auth/send-otp`: normalized email, generic success only.
- `POST /api/auth/verify-otp`: normalized email and a six-digit string; returns `success: true, verified: true` only after successful verification.

Validation responses never echo input. Safe error codes map to frontend messages; throttling includes Retry-After. All responses are marked no-store. CORS accepts the exact configured frontend origin.

## 4–5. Generation and hashing

Codes use `secrets.randbelow(1_000_000)` formatted to six digits. HMAC-SHA-256 hashes `email:otp` using the server-only OTP_SECRET. Constant-time comparison uses `hmac.compare_digest`. A resend also avoids repeating the previous active code if random generation happens to collide. Codes and hashes are not logged or returned by the API.

## 6. In-memory storage

The centralized service stores only an OTP digest, expiry and attempt count. Separate per-email send history preserves limits after verification or expiry. A `threading.Lock` protects transitions. A sending reservation prevents concurrent sends for one email while SMTP runs outside the lock. A code becomes usable only after SMTP succeeds. A failure invalidates all usable code state for that email and returns a generic 503.

The store is single-process and disappears on backend restart. Cleanup runs during sending and verification. Redis or a shared database should replace it for production/multi-instance operation.

## 7–10. Limits

- Expiry: 300 seconds after successful SMTP delivery acceptance; expired records are removed.
- Incorrect attempts: the fifth wrong code deletes the record.
- Resend: minimum 60 seconds, enforced by the server and reflected in the frontend countdown.
- Send rate: five attempts per normalized email in a rolling 900-second window. Failed delivery attempts also count. Verification does not reset sending history.
- Single use: successful verification immediately deletes the record.

## 11. SMTP implementation

Python `smtplib` and `EmailMessage`, plain text plus HTML, sender name Pivot Sols and subject “Your Pivot Sols verification code.” Uses a 12-second socket timeout and EHLO → STARTTLS with default certificate/hostname verification → EHLO → login → send. Raw exceptions are not exposed or logged. No SMTP code or credentials are in the frontend.

## 12. Environment variables

Backend-only required values: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `OTP_SECRET`, `FRONTEND_URL`. Optional `SMTP_FROM_NAME` defaults to Pivot Sols. Configuration fails clearly on missing fields, invalid sender/origin/port or an unsafe placeholder secret.

Frontend: only public `VITE_API_BASE_URL`, defaulting to `http://localhost:8000`.

## 13. Exact local startup commands

Frontend, from `C:\pavan`:

```powershell
npm install
npm run dev
```

Backend, using the already installed environment:

```powershell
cd C:\pavan\backend
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

Open `http://localhost:5173` and check `http://localhost:8000/api/health`. Fresh environment creation and both PowerShell/CMD activation commands are in `REAL_OTP_SETUP.md`.

## 14. Frontend tests

`npm test`: **85 passed, 0 failed, 0 skipped**. This retains all 73 prior tests, updating retired authentication expectations, and adds 12 new tests. Coverage includes email form rendering, send/verify API calls and errors, pending submission guards, send-only access denial, changed recipient, six-digit filtering, resend countdown, backend verification before storage, logout and cancellation of a late verification result. Existing Supabase, PostgreSQL/RLS, dashboard, books and landing coverage passes.

## 15. Backend tests

`pytest`: **45 passed, 0 failed**. Tests use mocked delivery and a controlled clock. They cover generation, HMAC storage, single use, incorrect/expired/exhausted codes, cooldown boundaries, rolling limits, replacement, failed SMTP, cleanup, concurrency, input validation, safe responses, health, CORS, startup validation and the actual SMTP call sequence/template construction.

The installed Starlette test client emits two upstream deprecation warnings concerning its httpx adapter and an AnyIO alias. They are not test failures and do not affect the application's SMTP or API behavior.

## 16. Frontend build and preservation

`npm run build` passed TypeScript and Vite without warnings after the frontend tests. Main JavaScript: 453.10 kB (144.33 kB gzip); CSS: 62.53 kB (13.31 kB gzip).

SHA-256 checks confirm all 19 monitored Supabase client, production validation, protected route, SQL, dashboard/navigation, landing/style, Reference Books and production-auth documentation files remain unchanged. The only AuthContext change is the optional prototype method's return type; production auth actions remain intact. Reference Books data, routes and components were not redesigned.

## 17. Owner configuration and manual acceptance

The owner has filled the local Gmail configuration, and startup validation passed. For another checkout/account, enter the Gmail address into SMTP_USERNAME and SMTP_FROM_EMAIL, enter a Google App Password into SMTP_PASSWORD, and generate OTP_SECRET locally. Never commit this file. The setup guide provides exact commands and Google's App Password instructions.

Live acceptance: the configured Gmail server accepted the approved send, the API returned HTTP 200, and the UI transitioned to Verify OTP with a resend countdown. The owner then manually checked the flow, reported that it works, and confirmed the email phase is complete. The live health endpoint also returned HTTP 200 with the expected generic service response. No further test emails were sent after that confirmation.

Expiry, replay, incorrect-attempt limits, resend boundaries and rate limiting were verified by automated tests. These edge cases are not represented as individually completed real-inbox manual tests. The full optional acceptance checklist remains in REAL_OTP_SETUP.md.

Browser checks already confirm required-field validation and no horizontal overflow at 320, 375, 430, 768, 1024 and 1440 CSS-pixel widths. Temporary viewport overrides were reset.

The stored session is still intentionally a local prototype marker/profile, not a signed server authorization system. Old fixed-code markers are rejected. Only profile fields and the new marker are saved, with no OTP, hash or backend secret in browser storage.
