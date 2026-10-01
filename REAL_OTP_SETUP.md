# Real email OTP setup

Pivot Sols now uses FastAPI to send and verify random email codes. The active prototype flow is name, student ID, P1/E1 and any valid email → Send OTP → email code → Verify OTP → dashboard. The previous fixed-code login has been retired, and its saved sessions are rejected.

The dashboard and Reference Books remain unchanged. `DEMO_MODE = true` selects this email-verified prototype and the existing sample resource catalog. `DEMO_MODE = false` selects the preserved Supabase authentication implementation; its setup is still in `SUPABASE_SETUP.md`.

## Prerequisites

- Node.js 22.12+ and Python 3.10+.
- A Gmail account with an available Google App Password, or another SMTP account supporting authenticated STARTTLS.
- Access to the recipient inbox. This prototype permits any syntactically valid email domain.

Google requires 2-Step Verification for App Passwords. Availability can depend on the account or administrator. Follow [Google's App Password instructions](https://support.google.com/mail/answer/185833?hl=en). Use an App Password, never your normal Google password.

## Fill the local backend configuration

For this workspace, `backend/.env` has been created with a newly generated OTP secret, and the owner has filled the SMTP credentials and confirmed the email flow works. Its contents are ignored by Git. The backend virtual environment and dependencies have also been installed. The following configuration steps apply when changing accounts or setting up another checkout.

On a fresh checkout, copy `backend/.env.example` to `backend/.env`. Do not overwrite an existing configured file.

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

SMTP_USERNAME=YOUR_GMAIL_ADDRESS
SMTP_PASSWORD=YOUR_GOOGLE_APP_PASSWORD

SMTP_FROM_EMAIL=YOUR_GMAIL_ADDRESS
SMTP_FROM_NAME=Pivot Sols

OTP_SECRET=GENERATE_A_LONG_RANDOM_SECRET

FRONTEND_URL=http://localhost:5173
```

The project owner must enter the actual Gmail address and App Password directly into `backend/.env`. Fill these three fields in the prepared file:

1. `SMTP_USERNAME`: your Gmail address.
2. `SMTP_FROM_EMAIL`: the same Gmail address.
3. `SMTP_PASSWORD`: your Google App Password, copied without display-spacing separators.

Keep the prepared `OTP_SECRET`, or generate a replacement locally:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Copy the generated value into `OTP_SECRET`. There is no fallback secret. Missing required configuration or a short/placeholder secret prevents backend startup with a field-name-only error. Restart the backend after changing `.env`.

SMTP credentials, App Password and OTP_SECRET belong only in `backend/.env`. Do not place them in `src/`, `VITE_*`, browser storage, chat, `.env.example` or a Git commit.

## Terminal 1 — frontend

From the project root:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The public API address defaults to `http://localhost:8000`; the frontend `.env.example` also documents:

```env
VITE_API_BASE_URL=http://localhost:8000
```

If you change that URL, place the override in root `.env.local` and restart Vite. No SMTP values belong there.

## Terminal 2 — backend

From the project root, on a fresh checkout:

```bash
cd backend
python -m venv .venv
```

Windows PowerShell activation:

```powershell
.venv\Scripts\Activate.ps1
```

Windows CMD activation:

```cmd
.venv\Scripts\activate.bat
```

After activation:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

For the already prepared workspace, PowerShell can run the existing environment without activation or a system Python on PATH:

```powershell
cd C:\pavan\backend
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

The backend uses one process. Open `http://localhost:8000/api/health` and expect:

```json
{"status":"ok","service":"pivot-sols-api"}
```

Use `localhost` consistently. `http://127.0.0.1:5173` and another port are different origins. If Vite selects another port, free 5173 or update `FRONTEND_URL` to the exact frontend origin and restart the backend. CORS allows only the configured origin. CORS does not replace API authentication or abuse protection.

## API contract

| Endpoint | Request | Success |
| --- | --- | --- |
| `GET /api/health` | None | `{"status":"ok","service":"pivot-sols-api"}` |
| `POST /api/auth/send-otp` | `{"email":"student@example.com"}` | `{"success":true,"message":"OTP sent successfully"}` |
| `POST /api/auth/verify-otp` | Email and a six-digit string in `otp` | `{"success":true,"verified":true}` |

No endpoint returns the OTP, its hash or server configuration. Validation errors do not echo request inputs. Responses use `Cache-Control: no-store`. Errors contain a safe `code` and `message`; cooldown/rate-limit errors also contain `retry_after` and an HTTP `Retry-After` header.

Invalid input, wrong codes, expired codes and exhausted attempts return 400. Resend/rate limits return 429. Delivery failures return 503. The frontend maps these codes to student-friendly messages.

## OTP behavior

- `secrets.randbelow(1_000_000)` generates exactly six digits, including leading zeroes.
- HMAC-SHA-256 binds the email and code using OTP_SECRET. Only the digest, expiry and attempt counter are retained in the OTP record. Comparisons use `hmac.compare_digest`.
- Codes expire 300 seconds after SMTP accepts the message. The fifth wrong attempt deletes the code. Successful verification deletes it immediately.
- Resend requires 60 seconds. A new send invalidates the previous active code, and only the newly delivered code becomes usable. Failed delivery leaves no usable code, including on resend.
- Five send attempts are permitted per normalized email in a rolling 900-second window. Failed SMTP attempts also consume a slot to avoid repeatedly hammering a failing mail service. Successful verification, expiry and attempt exhaustion do not reset this limit.
- A lock protects records and sending reservations. SMTP happens outside the lock, allowing other recipients to proceed. Concurrent sends for one recipient are rejected; a pending delivery cannot be verified.
- Sending and verifying clean expired records. Rate-limit history remains only while needed for its window. No raw code, hash, credential or recipient address is logged.
- SMTP uses `EmailMessage`, plain-text and HTML alternatives, the requested subject and sender name, a 12-second socket timeout, EHLO → STARTTLS with certificate validation → EHLO → login → send. See [Python's SMTP documentation](https://docs.python.org/3/library/smtplib.html).

Codes and limits live only in the FastAPI process and disappear on restart or development reload. This is expected for a local, single-server prototype. Use shared Redis or database state and additional abuse controls before a multi-worker/multi-instance deployment.

## Local profile and logout

Only backend verification permits the application to create its local prototype profile. Sending a code does not grant access. The browser stores only name, student ID, P1/E1, verified email, campus and the new `email-verified-v2` marker in the existing profile/session keys. Runtime-only `id` and `batch` values preserve the existing dashboard type contract. No code, OTP hash or server credential is stored in the browser.

Refresh restores this profile. Logout removes it and returns home. Existing fixed-code session markers cannot restore access. This remains a browser-managed prototype session, not a signed server session or production authorization boundary; users can edit their own local storage. The preserved Supabase design remains available for the production decision.

## Automated checks

From the project root:

```bash
npm test
npm run build
```

From `backend`, with the virtual environment activated:

```bash
pytest
```

Without activation in this workspace:

```powershell
cd C:\pavan\backend
.\.venv\Scripts\python.exe -m pytest
```

Automated tests mock email delivery and never contact Gmail. They use a controllable clock to test expiry, cooldown and the rolling limit without waiting. The frontend suite covers API responses, form actions, resend, session creation and existing protected/resource routes.

## Real-email acceptance checklist

1. Configure the three SMTP fields locally, start both servers, and open the frontend at the origin configured in `FRONTEND_URL`.
2. Use Harsha, N240001, E1 and an inbox you control. Click Send OTP. Confirm the UI stays unauthenticated until verification and the resend countdown begins.
3. Confirm the email arrives with sender name Pivot Sols, subject “Your Pivot Sols verification code,” a six-digit code and a five-minute expiry note. Check spam if necessary.
4. In browser developer tools, confirm the send response is only the generic success object. No code should appear in console logs. The code exists in the email and the verification request body by design.
5. Enter a different six-digit value once; expect “The verification code is incorrect.” Then enter the current delivered code; expect `/dashboard` and Harsha / N240001 / E1.
6. Open Profile and check the verified email and RGUKT Nuzvid. Refresh the dashboard. Open Reference Books → ECE → Semester 1 → Network Theory → View Details.
7. Log out and visit `/dashboard` directly; expect login. Request another code, select Change email and confirm that action alone grants no access.
8. For single-use verification, replay the already consumed code directly to the verify endpoint; expect 400. This behavior also has an automated test.
9. For resend, request a fresh code. A direct resend before 60 seconds returns 429; the UI disables it. At zero, resend succeeds. The previous code fails and the latest one succeeds.
10. For expiry, request a fresh code and wait a full five minutes without restarting the backend. Verification returns the expiry message.
11. With another fresh code, enter five wrong codes. The fifth produces the attempt-limit message, and the formerly correct code is unusable.

The last scenarios require several real sends and may reach the five-send limit. Wait for the rolling 15-minute window when prompted; do not weaken the limits for the demonstration.

## Troubleshooting

- **Missing backend configuration:** fill the named fields in `backend/.env`. The error deliberately omits their values.
- **Unable to reach the verification service:** check backend startup, API URL, the frontend origin and CORS. A frontend preview alone cannot send mail.
- **We couldn't send your verification code:** verify SMTP host/port, Gmail App Password availability, the sender address and outbound network access. Server logs intentionally contain only “SMTP delivery failed.”
- **Health works but SMTP cannot connect (Windows socket error 10013):** the backend may have been started inside a network-restricted tool process. Start the same Uvicorn command from a normal terminal, or use an approved tool process with outbound network access. A successful local health check does not verify Gmail connectivity. Restarting also invalidates any previously issued in-memory codes, so request a fresh code afterward.
- **Too many requests:** follow the returned wait time. Reloading the browser does not reset backend limits.
- **Backend restarted after sending:** request a new code because its in-memory record was lost.
- **Email or App Password changed:** save the local file and restart the backend.
