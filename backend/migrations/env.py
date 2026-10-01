from alembic import context
from cms.database import Base, create_database_engine
from cms import models  # noqa: F401 — registers metadata

if context.is_offline_mode():
    raise RuntimeError('Use online migrations against the configured PostgreSQL database.')

try:
    with create_database_engine().connect() as connection:
        context.configure(connection=connection, target_metadata=Base.metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()
except Exception:
    raise RuntimeError('Migration failed. Check database access and migration compatibility; connection details are hidden.') from None
