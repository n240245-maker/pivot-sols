from app import create_app
from config import Settings
from cms.database import create_database_engine, session_factory

# Configuration validation runs before the server can accept requests.
app = create_app(Settings.from_env(), db_factory=session_factory(create_database_engine()))
