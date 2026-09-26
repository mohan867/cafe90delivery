from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

import os

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

def get_db_session():
    """Returns the current SQLAlchemy session."""
    return db.session

def ensure_database_exists(db_uri):
    """
    Checks if the target PostgreSQL database exists.
    Restricted strictly to local development environment.
    """
    if os.getenv("ENVIRONMENT", "development") != "development":
        return

    try:

        url = make_url(db_uri)
        db_name = url.database
        if not db_name or db_name in ("postgres", "template1"):
            return

        postgres_url = url._replace(database="postgres")
        
        # Connect to 'postgres' maintenance DB with AUTOCOMMIT
        engine = create_engine(postgres_url, isolation_level="AUTOCOMMIT")
        with engine.connect() as conn:
            res = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :dbname"),
                {"dbname": db_name}
            ).scalar()
            
            if not res:
                print(f"[DB Auto-Init] Database '{db_name}' not found. Creating database...")
                conn.execute(text(f'CREATE DATABASE "{db_name}"'))
                print(f"[DB Auto-Init] ✅ Database '{db_name}' created successfully!")
        engine.dispose()
    except Exception as e:
        print(f"[DB Auto-Init] Database check/creation warning: {e}")
