from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    # ── Connection pool tuning ────────────────────────────────────────────────
    pool_pre_ping=True,       # drop stale connections automatically
    pool_size=20,             # keep 20 persistent connections (up from 10)
    max_overflow=30,          # allow 30 more under peak load
    pool_recycle=1800,        # recycle connections every 30 min (MySQL drops idle after 8 h)
    pool_timeout=30,          # raise instead of waiting forever if pool is exhausted
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
