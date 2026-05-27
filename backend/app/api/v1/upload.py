from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from pathlib import Path
import shutil
import pandas as pd
from datetime import datetime

from app.core.feature_engineering import feature_engineer
from app.core.deps import get_current_user, require_analyst
from app.config import settings
from app.database import get_db
from app import models, schemas
from typing import Dict, List

router = APIRouter(prefix="/upload", tags=["Upload"])


def _save_channel_metrics(db, dataset_id: int, processed_file: str):
    """Persist engineered features into the channel_metrics table."""
    try:
        df = pd.read_csv(processed_file)
        if "product_id" not in df.columns or "metric_date" not in df.columns:
            return

        # Remove existing metrics for this dataset to avoid duplicates on reprocess
        db.query(models.ChannelMetric).filter(
            models.ChannelMetric.dataset_id == dataset_id
        ).delete()

        metric_cols = [
            "total_users", "active_users", "transaction_count", "transaction_value",
            "revenue", "failed_transactions", "complaints", "downtime_minutes",
            "fraud_incidents", "user_growth_rate", "transaction_growth_rate",
            "revenue_growth_rate", "failure_rate", "complaints_per_1000_users",
            "uptime_percentage", "active_user_ratio", "retention_rate",
            "revenue_per_user", "transaction_value_per_user",
            "transaction_volume_7d_avg", "revenue_7d_avg", "fraud_rate",
            "operational_risk_score",
        ]

        records = []
        for _, row in df.iterrows():
            kwargs = {"dataset_id": dataset_id, "product_id": str(row["product_id"])}
            try:
                kwargs["metric_date"] = pd.to_datetime(row["metric_date"])
            except Exception:
                continue
            for col in metric_cols:
                if col in df.columns:
                    val = row[col]
                    kwargs[col] = float(val) if pd.notna(val) else None
            records.append(models.ChannelMetric(**kwargs))

        db.bulk_save_objects(records)
        db.commit()
    except Exception as e:
        db.rollback()
        import logging
        logging.getLogger(__name__).warning(f"ChannelMetric save failed: {e}")


def _process_and_save(dataset_id: int, file_path: Path):
    """Background task: run feature engineering and update DB record."""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
        if not dataset:
            return

        dataset.status = models.UploadStatus.processing
        db.commit()

        result = feature_engineer.process_file(file_path)

        if result["status"] == "success":
            dataset.status = models.UploadStatus.completed
            dataset.processed_file_path = result.get("processed_file")
            dataset.row_count = result["validation"].get("row_count")
            dataset.column_count = result["validation"].get("column_count")
            dataset.validation_report = result.get("validation")
            dataset.features_created = result.get("features_created", [])
            dataset.processed_at = datetime.utcnow()
            db.commit()
            # Populate ChannelMetric table
            _save_channel_metrics(db, dataset_id, result["processed_file"])
        else:
            dataset.status = models.UploadStatus.failed
            dataset.error_message = str(result.get("validation", {}).get("errors", "Unknown error"))
            db.commit()
    except Exception as e:
        db.rollback()
        dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
        if dataset:
            dataset.status = models.UploadStatus.failed
            dataset.error_message = str(e)
            db.commit()
    finally:
        db.close()


@router.post("/dataset", response_model=schemas.UploadResponse)
async def upload_dataset(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    auto_process: bool = True,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_analyst),
):
    """Upload a CSV / Excel / JSON dataset and optionally trigger feature engineering."""
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {settings.ALLOWED_EXTENSIONS}",
        )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = settings.RAW_DATA_DIR / safe_filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    size_kb = round(file_path.stat().st_size / 1024, 2)

    # Persist to DB
    db_dataset = models.Dataset(
        filename=safe_filename,
        original_filename=file.filename,
        file_path=str(file_path),
        file_size_kb=size_kb,
        file_type=file_ext.lstrip("."),
        status=models.UploadStatus.pending,
    )
    db.add(db_dataset)
    db.commit()
    db.refresh(db_dataset)

    if auto_process:
        background_tasks.add_task(_process_and_save, db_dataset.id, file_path)

    return schemas.UploadResponse(
        status="processing" if auto_process else "uploaded",
        filename=safe_filename,
        dataset_id=db_dataset.id,
        size_kb=size_kb,
        uploaded_at=timestamp,
        message="File uploaded. Feature engineering started in background." if auto_process else "File uploaded.",
    )


@router.get("/list", response_model=schemas.DatasetListResponse)
def list_datasets(skip: int = 0, limit: int = 50, db: Session = Depends(get_db),
                  _: models.User = Depends(get_current_user)):
    """List all uploaded datasets with their processing status."""
    total = db.query(models.Dataset).count()
    datasets = db.query(models.Dataset).order_by(models.Dataset.uploaded_at.desc()).offset(skip).limit(limit).all()
    return schemas.DatasetListResponse(datasets=datasets, total=total)


@router.get("/dataset/{dataset_id}", response_model=schemas.DatasetResponse)
def get_dataset(dataset_id: int, db: Session = Depends(get_db),
                _: models.User = Depends(get_current_user)):
    """Get details of a specific dataset."""
    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.post("/process/{dataset_id}", response_model=schemas.DatasetResponse)
def reprocess_dataset(dataset_id: int, background_tasks: BackgroundTasks,
                      db: Session = Depends(get_db),
                      _: models.User = Depends(require_analyst)):
    """Re-trigger feature engineering for an already-uploaded dataset."""
    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    file_path = Path(dataset.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Source file no longer exists on disk")

    background_tasks.add_task(_process_and_save, dataset_id, file_path)
    dataset.status = models.UploadStatus.pending
    db.commit()
    db.refresh(dataset)
    return dataset


@router.post("/scan-folder", response_model=schemas.FolderScanResult)
def scan_folder(db: Session = Depends(get_db),
                _: models.User = Depends(require_analyst)):
    """Scan the raw data folder and process any untracked files."""
    results = []
    processed_count = 0

    for file_path in settings.RAW_DATA_DIR.glob("*"):
        if file_path.suffix.lower() not in settings.ALLOWED_EXTENSIONS:
            continue

        existing = db.query(models.Dataset).filter(
            models.Dataset.filename == file_path.name
        ).first()

        if existing:
            results.append({"file": file_path.name, "action": "skipped", "reason": "already tracked"})
            continue

        size_kb = round(file_path.stat().st_size / 1024, 2)
        db_dataset = models.Dataset(
            filename=file_path.name,
            original_filename=file_path.name,
            file_path=str(file_path),
            file_size_kb=size_kb,
            file_type=file_path.suffix.lstrip("."),
            status=models.UploadStatus.pending,
        )
        db.add(db_dataset)
        db.commit()
        db.refresh(db_dataset)

        result = feature_engineer.process_file(file_path)
        if result["status"] == "success":
            db_dataset.status = models.UploadStatus.completed
            db_dataset.processed_file_path = result.get("processed_file")
            db_dataset.row_count = result["validation"].get("row_count")
            db_dataset.column_count = result["validation"].get("column_count")
            db_dataset.validation_report = result.get("validation")
            db_dataset.features_created = result.get("features_created", [])
            db_dataset.processed_at = datetime.utcnow()
            db.commit()
            _save_channel_metrics(db, db_dataset.id, result["processed_file"])
            processed_count += 1
            results.append({"file": file_path.name, "action": "processed", "status": "success"})
        else:
            db_dataset.status = models.UploadStatus.failed
            db_dataset.error_message = str(result.get("validation", {}).get("errors"))
            db.commit()
            results.append({"file": file_path.name, "action": "processed", "status": "failed"})

    return schemas.FolderScanResult(
        scanned_folder=str(settings.RAW_DATA_DIR),
        files_found=len(results),
        files_processed=processed_count,
        results=results,
    )


@router.delete("/dataset/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db),
                   _: models.User = Depends(require_analyst)):
    """Delete a dataset record (and optionally its files)."""
    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    db.delete(dataset)
    db.commit()
    return {"message": f"Dataset {dataset_id} deleted"}
