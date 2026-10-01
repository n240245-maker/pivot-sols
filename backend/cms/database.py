"""Server-only PostgreSQL configuration; never render the connection URL."""
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    pass


def create_database_engine():
    load_dotenv(Path(__file__).resolve().parents[1] / '.env', override=False)
    try:
        url = make_url(os.environ['DATABASE_URL'])
        if url.get_backend_name() != 'postgresql':
            raise ValueError
        return create_engine(url.set(drivername='postgresql+psycopg'), pool_pre_ping=True,
                             hide_parameters=True, echo=False, connect_args={'connect_timeout': 5})
    except Exception:
        raise RuntimeError('Configure a valid PostgreSQL DATABASE_URL in backend/.env.') from None


def session_factory(engine):
    return sessionmaker(bind=engine, expire_on_commit=False)
