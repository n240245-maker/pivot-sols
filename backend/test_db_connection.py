"""Read-only local connectivity check; never display credentials or driver errors."""
from sqlalchemy import text
from cms.database import create_database_engine


def main():
    try:
        engine = create_database_engine()
        with engine.connect() as connection:
            row = connection.execute(text('SELECT current_database(), current_user')).one()
        engine.dispose()
    except Exception:
        print('Database connection failed. Check backend/.env and the local PostgreSQL service; details hidden.')
        return 1
    print('PostgreSQL connection successful')
    print('Database:', row[0])
    print('User:', row[1])
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
