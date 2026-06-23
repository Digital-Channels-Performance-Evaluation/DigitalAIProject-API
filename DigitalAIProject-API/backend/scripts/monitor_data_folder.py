"""
Standalone folder watcher script.
Monitors the raw data folder and processes any new files,
creating Dataset DB records and populating ChannelMetric table.

Usage:
    python scripts/monitor_data_folder.py
"""

import time
import sys
import logging
from pathlib import Path

# Allow imports from the backend root
sys.path.append(str(Path(__file__).parent.parent))

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from app.config import settings
from app.core.feature_engineering import feature_engineer
from app.database import SessionLocal
from app import models
from app.api.v1.upload import _save_channel_metrics
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class DataFolderHandler(FileSystemEventHandler):
    def _process(self, file_path: Path):
        if file_path.suffix.lower() not in settings.ALLOWED_EXTENSIONS:
            return

        db = SessionLocal()
        try:
            # Skip if already tracked
            existing = db.query(models.Dataset).filter(
                models.Dataset.filename == file_path.name
            ).first()
            if existing:
                logger.info(f"Already tracked, skipping: {file_path.name}")
                return

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
            logger.info(f"New file detected: {file_path.name} — starting feature engineering")

            ds.status = models.UploadStatus.processing
            db.commit()

            result = feature_engineer.process_file(file_path)

            if result["status"] == "success":
                ds.status = models.UploadStatus.completed
                ds.processed_file_path = result.get("processed_file")
                ds.row_count = result["validation"].get("row_count")
                ds.column_count = result["validation"].get("column_count")
                ds.validation_report = result.get("validation")
                ds.features_created = result.get("features_created", [])
                ds.processed_at = datetime.utcnow()
                db.commit()
                _save_channel_metrics(db, ds.id, result["processed_file"])
                logger.info(f"Done: {file_path.name} — {ds.row_count} rows processed")
            else:
                ds.status = models.UploadStatus.failed
                ds.error_message = str(result.get("validation", {}).get("errors"))
                db.commit()
                logger.error(f"Failed: {file_path.name} — {ds.error_message}")

        except Exception as e:
            db.rollback()
            logger.error(f"Error processing {file_path.name}: {e}")
        finally:
            db.close()

    def on_created(self, event):
        if not event.is_directory:
            self._process(Path(event.src_path))


def start_monitoring():
    handler = DataFolderHandler()
    observer = Observer()
    observer.schedule(handler, str(settings.RAW_DATA_DIR), recursive=False)
    observer.start()
    logger.info(f"Monitoring {settings.RAW_DATA_DIR} for new files...")
    logger.info("Press Ctrl+C to stop.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Stopping watcher...")
        observer.stop()
    observer.join()
    logger.info("Watcher stopped.")


if __name__ == "__main__":
    start_monitoring()
