# Pivot Sols environment reference

Verified 25 September 2026. Values below are examples only. Never commit `backend/.env`, `.env.local`, an exported database, or any real credential. Vite exposes every `VITE_*` value to the browser.

| Variable | Location | Needed | Secret? | Purpose | Local example | Production example |
| --- | --- | --- | --- | --- | --- | --- |
| `VITE_API_BASE_URL` | frontend `.env.local`; Vercel | Required for hosted build; local dev has port-8000 fallback | No | FastAPI origin, no `/api` suffix | `http://localhost:8000` | `https://YOUR-BACKEND.example` |
| `VITE_SUPABASE_URL` | frontend | Only if `DEMO_MODE` is changed to false | Public | Preserved alternate Supabase client | blank in active mode | Supabase project URL, if alternate mode adopted |
| `VITE_SUPABASE_ANON_KEY` | frontend | Only for alternate Supabase mode | Public client key | Preserved Supabase client | blank in active mode | Supabase anon key, if adopted |
| `DATABASE_URL` | `backend/.env`; backend host | Yes | **Secret** | SQLAlchemy and Alembic PostgreSQL connection | `postgresql+psycopg://USER:<PASSWORD>@localhost:5432/pivot_sols` | Provider PostgreSQL URL; database factory selects psycopg driver |
| `EMAIL_PROVIDER` | backend | Optional; defaults to `smtp` | No | Select `smtp` or `brevo` HTTPS API | `smtp` | `brevo` on free hosts that block SMTP; `smtp` on SMTP-enabled hosting |
| `SMTP_HOST` | backend | With SMTP | No | Mail server hostname | `smtp.gmail.com` | SMTP provider host |
| `SMTP_PORT` | backend | With SMTP | No | STARTTLS port | `587` | Provider port, usually `587` |
| `SMTP_USERNAME` | backend | With SMTP | **Secret/config** | SMTP login | `<SMTP_USERNAME>` | `<SMTP_USERNAME>` |
| `SMTP_PASSWORD` | backend | With SMTP | **Secret** | SMTP App Password/API password | `<SMTP_APP_PASSWORD>` | `<SMTP_PASSWORD>` |
| `SMTP_FROM_EMAIL` | backend | Yes, both providers | No | Verified sender address for OTP and contact | `<VERIFIED_SENDER_EMAIL>` | `<VERIFIED_SENDER_EMAIL>` |
| `SMTP_FROM_NAME` | backend | Optional | No | Display name | `Pivot Sols` | `Pivot Sols` |
| `BREVO_API_KEY` | backend | With `EMAIL_PROVIDER=brevo` | **Secret** | HTTPS email delivery | blank with SMTP | `<BREVO_API_KEY>` |
| `OTP_SECRET` | backend | Yes | **Secret** | HMAC for student/admin OTP and admin CSRF; minimum 32 random characters | `<LONG_RANDOM_SECRET>` | A separately generated long random secret |
| `FRONTEND_URL` | backend | Yes | No | Exact single CORS/Origin allowance and cookie environment | `http://localhost:5173` | Actual Vercel HTTPS origin, no trailing path |
| `CONTACT_TO_EMAIL` | backend | Required for functional Contact delivery | No | Inbox receiving messages; configured in local `.env` | `<CONTACT_INBOX>` | `<CONTACT_INBOX>` |
| `PORT` | backend host | Host-provided | No | Uvicorn listen port | `8000` via CLI | Use provider's `$PORT`/`${PORT}` |
| `PYTHON_VERSION` | `render.yaml` | Render configuration only | No | Runtime pin | current local venv is Python 3.12 | `3.13.12` in Render blueprint |

Actual files: root `.env.example` and `backend/.env.example` exist and contain placeholders; `backend/.env` exists and is ignored; root `.env` and `.env.local` are absent. The frontend therefore currently uses its development fallback `http://localhost:8000`. The backend process loads `backend/.env` unless a process environment variable already defines a key. The active mode is `src/config/demo.ts` `DEMO_MODE=true`; the preserved Supabase variables do not make the current OTP flow work.

`CONTACT_TO_EMAIL` is configured locally for the owner's inbox. One controlled Contact delivery was confirmed there on 25 September 2026. The local `FRONTEND_URL` was corrected to `http://localhost:5173`; the backend was restarted and student OTP was verified through the browser.

For Vercel, configure only `VITE_API_BASE_URL` from the active variables. All database and mail credentials belong on the backend host. A frontend production build requires a public HTTPS origin by `vite.config.ts`; localhost or a missing value fails deliberately.
