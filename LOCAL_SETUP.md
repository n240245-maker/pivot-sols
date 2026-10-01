# Local setup (Windows PowerShell)

Verified 25 September 2026 in `C:\pavan`: frontend Vite at `http://localhost:5173`, FastAPI at `http://localhost:8000`, PostgreSQL database `pivot_sols` with application user `pivot_admin`. No secret values are in this document.

1. Start the installed PostgreSQL service using Windows Services if it is not already running. Keep the existing connection in `C:\pavan\backend\.env`. Do not recreate or clear the database. To check the configured connection without displaying it:

   ```powershell
   cd C:\pavan\backend
   .\.venv\Scripts\python.exe test_db_connection.py
   ```

2. In terminal 1, start the backend. The actual FastAPI import is `main:app` (from `backend/main.py`), and the verified local port is **8000**:

   ```powershell
   cd C:\pavan\backend
   .\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

3. In terminal 2, start the frontend:

   ```powershell
   cd C:\pavan
   npm install
   npm run dev -- --host localhost --port 5173
   ```

   The root `.env.example` documents `VITE_API_BASE_URL=http://localhost:8000`. Copy it to `.env.local` only when overriding the development fallback. Use `localhost` for the browser origin because backend `FRONTEND_URL` and CORS match the exact origin. If port 8000 is occupied, run the backend on another port and change **both** frontend `VITE_API_BASE_URL` and the backend command; restart Vite after changing `.env.local`. If Vite's port changes, update backend `FRONTEND_URL` and restart FastAPI.

   A production build intentionally rejects a configured localhost `VITE_API_BASE_URL`. To run `npm run build` locally, leave root `.env.local` absent (as in the verified checkout) or provide the actual public HTTPS backend origin. Do not deploy a bundle using the development fallback.

4. Verify `http://localhost:8000/api/health` returns `{"status":"ok","service":"pivot-sols-api"}`. Swagger is at `http://localhost:8000/docs`. Frontend is `http://localhost:5173`; student login is `/login`; agent login is `/admin/login`.

5. Migrations and checks (no destructive reset):

   ```powershell
   cd C:\pavan\backend
   .\.venv\Scripts\python.exe -m alembic current
   .\.venv\Scripts\python.exe -m alembic heads
   .\.venv\Scripts\python.exe -m alembic upgrade head
   .\.venv\Scripts\python.exe -m pytest
   cd C:\pavan
   npm test
   npm run build
   ```

   Current/head migration is `222b971ed0e6`. Apply `upgrade head` on a new or behind database only after backing up valued data. Backend tests use isolated fixtures/transactions and mock mail; they do not send real messages.

6. Create an agent only on a fresh database, from an interactive local terminal:

   ```powershell
   cd C:\pavan\backend
   .\.venv\Scripts\python.exe scripts\create_admin.py
   ```

   The existing local database already has one agent. The script refuses to replace an existing account. Enter the password only at its hidden terminal prompts.

Student OTP uses the configured backend SMTP server. A successful API response means the provider accepted the send, not that the email reached the inbox. Contact requires owner-supplied `CONTACT_TO_EMAIL` in `backend/.env` and a backend restart.
