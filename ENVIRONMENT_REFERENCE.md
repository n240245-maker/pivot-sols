# Pivot Sols environment reference

Verified 2 October 2026. Values below are examples only. Never commit `backend/.env`, `.env.local`, an exported database, or any real credential. Vite exposes every `VITE_*` value to the browser.

| Variable | Location | Needed | Secret? | Purpose | Local example | Production example |
| --- | --- | --- | --- | --- | --- | --- |
| `VITE_API_BASE_URL` | frontend `.env.local` | Optional for local development; ignored by production builds | No | Local FastAPI origin, no `/api` suffix | `http://localhost:8000` | Leave unset; production calls same-origin `/api` |
| `VITE_SUPABASE_URL` | frontend | Only if `DEMO_MODE` is changed to false | Public | Preserved alternate Supabase client | blank in active mode | Supabase project URL, if alternate mode adopted |
| `VITE_SUPABASE_ANON_KEY` | frontend | Only for alternate Supabase mode | Public client key | Preserved Supabase client | blank in active mode | Supabase anon key, if adopted |
| `DATABASE_URL` | `backend/.env`; backend host | Yes | **Secret** | SQLAlchemy and Alembic PostgreSQL connection | `postgresql+psycopg://USER:<PASSWORD>@localhost:5432/pivot_sols` | Provider PostgreSQL URL; database factory selects psycopg driver |
| `EMAIL_PROVIDER` | backend | Optional; defaults to `smtp` | No | Select `smtp` or `brevo` HTTPS API | `smtp` | `brevo` on free hosts that block SMTP; `smtp` on SMTP-enabled hosting |
| `SMTP_HOST` | backend | With SMTP | No | Mail server hostname | `smtp.gmail.com` | SMTP provider host |
| `SMTP_PORT` | backend | With SMTP | No | STARTTLS port | `587` | Provider port, usually `587` |
| `SMTP_USERNAME` | backend | With SMTP | **Secret/config** | SMTP login | `<SMTP_USERNAME>` | `<SMTP_USERNAME>` |
| `SMTP_PASSWORD` | backend | With SMTP | **Secret** | SMTP App Password/API password | `<SMTP_APP_PASSWORD>` | `<SMTP_PASSWORD>` |
| `SMTP_FROM_EMAIL` | backend | Yes, both providers | No | Verified sender address for Contact email | `<VERIFIED_SENDER_EMAIL>` | `<VERIFIED_SENDER_EMAIL>` |
| `SMTP_FROM_NAME` | backend | Optional | No | Display name | `Pivot Sols` | `Pivot Sols` |
| `BREVO_API_KEY` | backend | With `EMAIL_PROVIDER=brevo` | **Secret** | HTTPS email delivery | blank with SMTP | `<BREVO_API_KEY>` |
| `OTP_SECRET` | backend | Yes (legacy variable name) | **Secret** | HMAC for student ID pseudonyms, agent CSRF and auth throttles; minimum 32 random characters | `<LONG_RANDOM_SECRET>` | A separately generated long random secret |
| `FRONTEND_URL` | backend | Yes | No | Exact single CORS/Origin allowance and cookie environment | `http://localhost:5173` | Actual Vercel HTTPS origin, no trailing path |
| `CONTACT_TO_EMAIL` | backend | Required for functional Contact delivery | No | Inbox receiving messages; configured in local `.env` | `<CONTACT_INBOX>` | `<CONTACT_INBOX>` |
| `STORAGE_ENDPOINT` | backend | Optional with object storage | No | S3-compatible API endpoint; blank uses AWS S3 | blank | Provider endpoint |
| `STORAGE_REGION` | backend | Optional with object storage | No | Object storage region | blank | Provider region |
| `STORAGE_BUCKET` | backend | For direct uploads | No | Durable bucket name | blank | `<BUCKET>` |
| `STORAGE_ACCESS_KEY` | backend | For direct uploads | **Secret** | Object storage access key | blank | `<ACCESS_KEY>` |
| `STORAGE_SECRET_KEY` | backend | For direct uploads | **Secret** | Object storage secret key | blank | `<SECRET_KEY>` |
| `STORAGE_PUBLIC_BASE_URL` | backend | For direct uploads | No | Public HTTPS base URL used for uploaded files | blank | `https://YOUR-STORAGE.example` |
| `PORT` | backend host | Host-provided | No | Uvicorn listen port | `8000` via CLI | Use provider's `$PORT`/`${PORT}` |
| `PYTHON_VERSION` | `render.yaml` | Render configuration only | No | Runtime pin | current local venv is Python 3.12 | `3.13.12` in Render blueprint |

Actual files: root `.env.example` and `backend/.env.example` contain placeholders; `backend/.env` is ignored. Local Vite development uses `http://localhost:8000` by default. Production calls relative `/api` URLs through the Vercel rewrite in `vercel.json`. The backend process loads `backend/.env` unless a process environment variable already defines a key. The active mode is `src/config/demo.ts` `DEMO_MODE=true`; its student auth now restores from a PostgreSQL-backed 30-day session. The preserved Supabase variables do not operate in this mode.

`CONTACT_TO_EMAIL` is configured locally for the owner's inbox. One controlled Contact delivery was confirmed there on 25 September 2026. Student and agent login no longer send email; Contact still needs the configured provider. Keep `OTP_SECRET` under its existing name because session-related HMAC functions still use it.

For Vercel, do not set `VITE_API_BASE_URL`; `vercel.json` proxies `/api/:path*` to the Render API before the SPA fallback. The browser receives a same-origin HttpOnly student cookie. Set backend `FRONTEND_URL` to the exact deployed frontend origin. All database and mail credentials belong on the backend host. The current API proxy destination is `https://pivot-sols-api.onrender.com`; verify that it is the actual backend URL before manual deployment.
