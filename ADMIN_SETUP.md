# Pivot Sols admin setup

The admin panel is at [localhost:5173/admin/login](http://localhost:5173/admin/login). It is separate from student login and is intentionally absent from student navigation. The local first-admin account has already been created by its owner.

## Run locally

Keep PostgreSQL running. In one PowerShell terminal:

```powershell
cd C:\pavan\backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

In another terminal:

```powershell
cd C:\pavan
npm run dev
```

Use `http://localhost:5173`, matching `FRONTEND_URL` in `backend/.env`. The browser API address comes from `VITE_API_BASE_URL`, defaulting to `http://localhost:8000`. SMTP and database credentials belong only in `backend/.env`; never put them in `VITE_` variables.

## Create an admin on a fresh installation

Apply the migrations first using [DATABASE_SETUP.md](./DATABASE_SETUP.md). Then run this in your own interactive terminal:

```powershell
cd C:\pavan\backend
.\.venv\Scripts\python.exe scripts\create_admin.py
```

Enter the admin email, a 12–128 character password and confirmation. Password input is hidden. The script stores an Argon2id hash and refuses to overwrite an existing account. Do not send the password through chat, command arguments, environment examples or source files. There is no default password and no public admin-registration endpoint.

## Sign in and out

1. Open `/admin/login` and enter the admin email and password.
2. Enter the emailed six-digit OTP in the app. It expires after five minutes; resending is available after 60 seconds. Five incorrect attempts exhaust that challenge.
3. The dashboard opens only after the backend verifies both steps.
4. Use **Logout** to revoke the backend session and return to admin login.

Admin OTP challenges, rate limits and sessions are persisted in PostgreSQL. Student OTP state remains independent. The existing SMTP service delivers admin codes; no OTPs are returned by the API or written to logs. Failed delivery produces a retryable error and does not invalidate a previously usable code.

## Session and deployment behavior

The session is a random opaque cookie, with only its hash stored in the database. It is HttpOnly, SameSite=Strict, scoped to `/api/admin`, expires after eight hours, and becomes unusable after 30 minutes without an authenticated API request. The frontend keeps no admin token in localStorage. Every content API checks the session and active account. Writes additionally check the exact frontend Origin and a session-bound CSRF token.

Cookies use `HttpOnly; Secure; SameSite=None` for an HTTPS frontend origin on a separate site, and `SameSite=Strict` for localhost development. The frontend sends credentialed requests, while backend CORS permits only the exact `FRONTEND_URL`. Browser settings that block third-party cookies may still prevent cross-site login; a same-site custom domain is the long-term solution. Keep `OTP_SECRET` stable and private; changing it invalidates pending admin OTPs and CSRF values. These changes do not deploy the app.

## Troubleshooting

- **Email or password is incorrect:** use the admin account, not a student profile. No password-reset or account-management UI is included in this phase.
- **Code could not be sent:** confirm the existing SMTP values locally and allow the backend process to reach Gmail. Preserve the working SMTP configuration.
- **Too many attempts:** wait for the 15-minute rate-limit window. Do not disable limits to retry.
- **Content service unavailable:** run the safe database check and migration commands below; errors deliberately hide connection details.
- **Refresh before trying again:** reload the admin page to obtain a fresh CSRF value. An expired session requires sign-in again.

Content editing instructions: [CONTENT_MANAGEMENT_GUIDE.md](./CONTENT_MANAGEMENT_GUIDE.md).
