# Pivot Sols PostgreSQL setup

The local application uses database `pivot_sols` as user `pivot_admin`. Its existing connection string stays in `backend/.env` as `DATABASE_URL`. This phase uses SQLAlchemy 2, psycopg 3 and Alembic. It does not replace the existing student-auth implementation or contact-email service.

## Install and verify

```powershell
cd C:\pavan\backend
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe test_db_connection.py
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
```

The connection check prints only success, database name and database user. It never prints the connection URL or raw driver exceptions. The initial migration `222b971ed0e6` was applied to the actual local PostgreSQL database. Alembic keeps the applied revision in `alembic_version`.

## Schema

| Purpose | Tables |
| --- | --- |
| Admin authentication | `admins`, `admin_challenges`, `admin_sessions`, `admin_auth_throttles` |
| Academics | `branches`, `semesters`, `subjects`, `reference_books` |
| Labs | `labs`, `experiments` |
| Careers | `career_domains`, `career_roles` |
| Site copy | `site_content` |
| Relationships | `branch_domains`, `branch_roles`, `domain_related_roles` |

There are 16 application tables, plus Alembic's revision table. UUID primary keys identify records. Foreign keys use RESTRICT, without cascading deletion. Branch/domain/role slugs and site-content keys are unique; subject and lab slugs are unique within a semester; experiment slugs are unique within a lab. E1 semesters are unique by branch and number; P1 semesters use a partial unique index with no branch. Checks constrain academic level, status and other enum-like values. Status, parent foreign keys, academic level and authentication expiry fields have targeted indexes.

Arrays, authors and structured roadmaps use JSONB. Content records have creation/update timestamps and sort order. SQLAlchemy updates `updated_at` for application edits. The API uses that version to reject stale editor saves with HTTP 409. Multi-record relationship edits commit together.

## Import the preserved prototype content

```powershell
cd C:\pavan\backend
.\.venv\Scripts\python.exe scripts\seed_existing_content.py
```

The checked-in `backend/seed_content.json` preserves the existing typed content. The initial import created:

| Content | Records |
| --- | ---: |
| Branches | 6 |
| Semesters | 14 |
| Subjects | 30 |
| Books | 31 |
| Labs | 18 |
| Experiments | 30 |
| Career domains | 16 |
| Career roles | 24 |
| About / Explore | 2 |
| Total | 171 |

Experiments previously reused across multiple labs are stored as separate lab-specific placements. Their 30 placements are preserved. Seeded rows are published to retain the existing student experience; they are still prototype material, not a verified official curriculum. Book links and videos that were unavailable remain unavailable.

The importer inserts missing source keys, preserves existing records and relationships, and commits atomically. A repeat import with unchanged keys inserts zero rows. It does not overwrite CMS edits or republish archived rows. It identifies most records by their original slug/parent, so changing those identity fields and rerunning the importer can recreate the original source entry. Treat this as an initial import, not a recurring synchronization job. Keep the original local datasets as reference fixtures; runtime student pages do not fall back to them.

To regenerate the snapshot intentionally, run `node scripts/export-cms-seed.mjs` from the project root and review the resulting diff before importing. Ordinary editing belongs in the CMS.

## Future schema changes

```powershell
cd C:\pavan\backend
.\.venv\Scripts\python.exe -m alembic revision --autogenerate -m "Describe the change"
# Review the generated migration before applying it.
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic check
```

No automatic `create_all` runs at application startup. The initial migration is additive. Its downgrade deliberately refuses destructive rollback. Obtain owner approval and a verified backup before any future destructive migration, DROP, TRUNCATE or bulk removal. Archive content through the admin panel instead.

## Tests and API behavior

```powershell
cd C:\pavan\backend
.\.venv\Scripts\python.exe -m pytest
```

CMS integration tests connect to the real local `pivot_sols` database. Each test uses an outer transaction with savepoints and rolls it back; fixtures do not delete tables or stored content. Test admin passwords are synthetic, and OTP delivery is captured by an injected test sender. No test email is sent by pytest.

`GET /api/public/catalog` provides the complete student-shaped snapshot. Individual read-only endpoints exist for branches, semesters, subjects, books, labs, experiments, career-domains, career-roles and site-content. Only published records with published ancestors are visible. Draft/archived relationships are filtered too. The public content is intentionally readable without a student session; the student page UI retains its existing route guard.

`/api/admin/catalog` and each `/api/admin/<resource>` collection require admin authentication. They support GET, POST, PUT, dependency inspection and PATCH of `/:id/status`. There is no hard-delete API. The auth login/resend/verify endpoints are necessarily unauthenticated but protected by validation, Origin checks and database-backed limits. `/auth/me` and `/auth/logout` require a real session.

Server configuration uses parameter-hiding SQLAlchemy logging and safe API errors. Never enable SQL echo, paste `.env` contents into reports, or put database credentials in frontend code.

Implementation references: [SQLAlchemy PostgreSQL dialect](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html), [Alembic tutorial](https://alembic.sqlalchemy.org/en/latest/tutorial.html).
