from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import threading

from app.config import settings
from app.database import create_tables
from app.api.v1 import upload, ml, dashboard, auth, users, analytics, report

logger = logging.getLogger(__name__)

_watcher_thread: threading.Thread | None = None


def _start_folder_watcher():
    """Start the raw-data folder watcher in a background daemon thread."""
    try:
        import time
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler
        from app.core.feature_engineering import feature_engineer
        from app.database import SessionLocal
        from app import models
        from app.api.v1.upload import _process_and_save
        from pathlib import Path

        class _Handler(FileSystemEventHandler):
            def _handle(self, file_path: Path):
                if file_path.suffix.lower() not in settings.ALLOWED_EXTENSIONS:
                    return
                db = SessionLocal()
                try:
                    existing = db.query(models.Dataset).filter(
                        models.Dataset.filename == file_path.name
                    ).first()
                    if existing:
                        return
                    from datetime import datetime
                    size_kb = round(file_path.stat().st_size / 1024, 2)
                    ds = models.Dataset(
                        filename=file_path.name,
                        original_filename=file_path.name,
                        file_path=str(file_path),
                        file_size_kb=size_kb,
                        file_type=file_path.suffix.lstrip("."),
                        status=models.UploadStatus.pending,
                    )
                    db.add(ds)
                    db.commit()
                    db.refresh(ds)
                    logger.info(f"Watcher: new file detected — {file_path.name}")
                    _process_and_save(ds.id, file_path)
                except Exception as e:
                    logger.warning(f"Watcher error for {file_path.name}: {e}")
                finally:
                    db.close()

            def on_created(self, event):
                if not event.is_directory:
                    self._handle(Path(event.src_path))

        observer = Observer()
        observer.schedule(_Handler(), str(settings.RAW_DATA_DIR), recursive=False)
        observer.start()
        logger.info(f"Folder watcher started on {settings.RAW_DATA_DIR}")
        try:
            while True:
                time.sleep(settings.SCAN_INTERVAL_SECONDS)
        except Exception:
            pass
        finally:
            observer.stop()
            observer.join()
    except Exception as e:
        logger.warning(f"Folder watcher could not start: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        create_tables()
        _seed_admin()
    except Exception as e:
        logger.warning(f"DB not available at startup: {e}")

    # Start folder watcher if enabled
    if settings.WATCH_DATA_FOLDER:
        global _watcher_thread
        _watcher_thread = threading.Thread(target=_start_folder_watcher, daemon=True)
        _watcher_thread.start()

    yield


def _seed_admin():
    """Create the default admin account if no users exist yet."""
    from app.database import SessionLocal
    from app import models
    from app.core.security import hash_password

    db = SessionLocal()
    try:
        if db.query(models.User).count() == 0:
            admin = models.User(
                full_name="System Administrator",
                email="admin@digitalchannels.com",
                hashed_password=hash_password("Admin@1234"),
                role=models.UserRole.admin,
                is_active=True,
            )
            db.add(admin)
            db.commit()
            logger.info("Default admin created: admin@digitalchannels.com / Admin@1234")
    finally:
        db.close()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="ML-powered evaluation platform for digital channel performance.",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/api/v1")   # public
app.include_router(users.router,     prefix="/api/v1")   # admin-protected
app.include_router(upload.router,    prefix="/api/v1")   # auth-protected
app.include_router(ml.router,        prefix="/api/v1")   # auth-protected
app.include_router(dashboard.router, prefix="/api/v1")   # auth-protected
app.include_router(analytics.router, prefix="/api/v1")   # auth-protected
app.include_router(report.router,   prefix="/api/v1")   # auth-protected


@app.get("/", tags=["Health"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    from app.database import engine
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"unavailable: {e}"
    return {"status": "ok", "database": db_status}
