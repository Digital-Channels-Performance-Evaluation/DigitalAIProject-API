"""
Ahadu Bank Digital Banking Product Evaluation Platform - Backend API
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging

from app.core.config import settings
from app.core.database import Base, engine
from app.api.v1 import auth, users, products, scores, rankings, alerts, recommendations, ml, data, reports

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle manager (replaces deprecated @on_event)."""
    logger.info("Starting Ahadu Bank Evaluation Platform...")

    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized.")

    # Apply any missing column migrations (safe ALTER TABLE IF NOT EXISTS)
    _apply_migrations()

    # Seed initial data
    from app.db.seed import seed_database
    seed_database()
    logger.info("Database seeded.")

    yield  # application runs here

    logger.info("Shutting down Ahadu Bank Evaluation Platform.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Digital Banking Product Evaluation Platform for Ahadu Bank",
    docs_url="/docs",
    redoc_url="/redoc",
    redirect_slashes=False,  # Prevent 307/308 redirects that strip Authorization headers
    lifespan=lifespan,
)

# State
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middleware — CORS
# In development allow all localhost origins so any port works.
# In production set ALLOWED_ORIGINS in .env to your real domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# API Routers
API_PREFIX = "/api"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(products.router, prefix=API_PREFIX)
app.include_router(scores.router, prefix=API_PREFIX)
app.include_router(rankings.router, prefix=API_PREFIX)
app.include_router(alerts.router, prefix=API_PREFIX)
app.include_router(recommendations.router, prefix=API_PREFIX)
app.include_router(ml.router, prefix=API_PREFIX)
app.include_router(data.router, prefix=API_PREFIX)
app.include_router(reports.router, prefix=API_PREFIX)

# Serve uploaded avatar images as static files
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


def _apply_migrations():
    """Add missing columns that were added after initial schema creation.
    Uses IF NOT EXISTS so safe to run on any database state.

    NOTE: This handles additive-only migrations (new columns).
    For renames, removals, or data backfills, introduce Alembic migrations instead.
    """
    migrations = [
        # raw_data columns
        "ALTER TABLE raw_data ADD COLUMN IF NOT EXISTS failed_txn_rate DOUBLE NULL",
        "ALTER TABLE raw_data ADD COLUMN IF NOT EXISTS downtime_minutes DOUBLE NULL",
        "ALTER TABLE raw_data ADD COLUMN IF NOT EXISTS api_error_rate DOUBLE NULL",
        "ALTER TABLE raw_data ADD COLUMN IF NOT EXISTS csat_score DOUBLE NULL",
        "ALTER TABLE raw_data ADD COLUMN IF NOT EXISTS fraud_event_count INT NULL",
        "ALTER TABLE raw_data ADD COLUMN IF NOT EXISTS security_incident_count INT NULL",
        # Fix: add proper avg_session_duration_sec (was previously wrongly populated
        # from avg_response_time_ms — see feature_engineering.py)
        "ALTER TABLE raw_data ADD COLUMN IF NOT EXISTS avg_session_duration_sec DOUBLE NULL COMMENT 'Avg user session duration in seconds from app analytics'",
        # processed_features columns
        "ALTER TABLE processed_features ADD COLUMN IF NOT EXISTS failed_txn_rate_pct DOUBLE NULL",
        "ALTER TABLE processed_features ADD COLUMN IF NOT EXISTS prev_complaint_volume DOUBLE NULL",
        "ALTER TABLE processed_features ADD COLUMN IF NOT EXISTS complaint_resolution_rate DOUBLE NULL",
        "ALTER TABLE processed_features ADD COLUMN IF NOT EXISTS norm_active_user_rate DOUBLE NULL",
        "ALTER TABLE processed_features ADD COLUMN IF NOT EXISTS norm_revenue_per_active_user DOUBLE NULL",
        "ALTER TABLE processed_features ADD COLUMN IF NOT EXISTS norm_transaction_success_rate DOUBLE NULL",
        "ALTER TABLE processed_features ADD COLUMN IF NOT EXISTS norm_operational_efficiency DOUBLE NULL",
        "ALTER TABLE processed_features ADD COLUMN IF NOT EXISTS norm_complaint_growth_rate DOUBLE NULL",
        "ALTER TABLE processed_features ADD COLUMN IF NOT EXISTS norm_downtime_impact DOUBLE NULL",
        "ALTER TABLE processed_features ADD COLUMN IF NOT EXISTS norm_user_engagement_index DOUBLE NULL",
        "ALTER TABLE processed_features ADD COLUMN IF NOT EXISTS norm_revenue_per_transaction DOUBLE NULL",
        "ALTER TABLE processed_features ADD COLUMN IF NOT EXISTS csat_score DOUBLE NULL",
        "ALTER TABLE processed_features ADD COLUMN IF NOT EXISTS fraud_event_count INT NULL",
        "ALTER TABLE processed_features ADD COLUMN IF NOT EXISTS security_incident_count INT NULL",
        "ALTER TABLE processed_features ADD COLUMN IF NOT EXISTS api_error_rate DOUBLE NULL",
        "ALTER TABLE processed_features ADD COLUMN IF NOT EXISTS avg_session_duration_sec DOUBLE NULL",
        "ALTER TABLE processed_features ADD COLUMN IF NOT EXISTS data_quality_flag TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE processed_features ADD COLUMN IF NOT EXISTS data_quality_notes TEXT NULL",
        # User profile photo
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512) NULL",
        # Expand product_category enum to include 'ussd'
        "ALTER TABLE products MODIFY COLUMN category "
        "ENUM('mobile_banking','card_banking','atm','pos',"
        "'qr_payment','digital_wallet','ussd','future_product') NOT NULL",
    ]

    from sqlalchemy import text
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        for sql in migrations:
            try:
                db.execute(text(sql))
            except Exception as e:
                # Column may already exist under a different dialect — log and continue
                logger.debug(f"Migration skipped (likely already applied): {e}")
        db.commit()
        logger.info("Database migrations applied successfully.")
    except Exception as e:
        logger.warning(f"Migration warning: {e}")
        db.rollback()
    finally:
        db.close()


@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/")
async def root():
    return {
        "message": "Ahadu Bank Digital Banking Product Evaluation Platform",
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }
