from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text as sql_text
from pathlib import Path
from datetime import datetime
import pandas as pd
import logging

from app.core.ml_pipeline import ml_pipeline, TIER_SCORE
from app.core.deps import get_current_user, require_analyst
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/ml", tags=["Machine Learning"])
logger = logging.getLogger(__name__)


# ── Background: train ─────────────────────────────────────────────────────────

def _train_and_save(model_id: int, processed_file: str, model_type: str):
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        ml_model = db.query(models.MLModel).filter(models.MLModel.id == model_id).first()
        if not ml_model:
            return

        result = ml_pipeline.train(
            processed_file=Path(processed_file),
            model_type=model_type,
            model_name=f"model_{model_id}",
        )

        ml_model.status         = models.ModelStatus.ready
        ml_model.model_path     = result["model_path"]
        ml_model.accuracy       = result["accuracy"]
        ml_model.precision_score = result["precision_score"]
        ml_model.recall_score   = result["recall_score"]
        ml_model.f1_score       = result["f1_score"]
        ml_model.feature_importance = result["feature_importance"]
        ml_model.training_params    = result["training_params"]
        ml_model.updated_at     = datetime.utcnow()
        db.commit()
        logger.info(f"Model {model_id} ready — acc={result['accuracy']:.4f}")
    except Exception as e:
        db.rollback()
        logger.error(f"Training failed for model {model_id}: {e}", exc_info=True)
        ml_model = db.query(models.MLModel).filter(models.MLModel.id == model_id).first()
        if ml_model:
            ml_model.status = models.ModelStatus.failed
            db.commit()
    finally:
        db.close()


# ── Background: predict ───────────────────────────────────────────────────────

def _run_predict_task(model_id: int, dataset_id: int,
                      model_path: str, processed_file: str):
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        logger.info(f"Predict task started: model={model_id} dataset={dataset_id}")

        pred_df = ml_pipeline.predict(
            model_path=model_path,
            processed_file=Path(processed_file),
        )

        # Delete old predictions for this combo
        db.execute(
            sql_text("DELETE FROM predictions WHERE model_id=:mid AND dataset_id=:did"),
            {"mid": model_id, "did": dataset_id},
        )
        db.commit()

        BATCH = 5000
        total_saved = 0

        for start in range(0, len(pred_df), BATCH):
            chunk = pred_df.iloc[start:start + BATCH]
            records = []
            for _, row in chunk.iterrows():
                label = row["prediction_label"]

                metric_date = None
                raw = row.get("metric_date")
                if raw is not None:
                    try:
                        ts = pd.Timestamp(raw)
                        metric_date = None if pd.isnull(ts) else ts.to_pydatetime()
                    except Exception:
                        pass

                records.append(models.Prediction(
                    dataset_id=dataset_id,
                    model_id=model_id,
                    product_id=str(row["product_id"]),
                    metric_date=metric_date,
                    prediction_label=label,
                    confidence=float(row["confidence"]) if pd.notna(row.get("confidence")) else None,
                    # Use actual performance_score if available, otherwise fall back to tier score
                    predicted_value=(
                        float(row["actual_score"])
                        if "actual_score" in pred_df.columns and pd.notna(row.get("actual_score"))
                        else float(TIER_SCORE.get(label, 0))
                    ),
                    actual_value=(
                        float(row["actual_score"])
                        if "actual_score" in pred_df.columns and pd.notna(row.get("actual_score"))
                        else None
                    ),
                ))

            db.bulk_save_objects(records)
            db.commit()
            total_saved += len(records)
            logger.info(f"  Saved {total_saved:,}/{len(pred_df):,}")

        logger.info(f"Predict task done: {total_saved:,} predictions for model {model_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Predict task failed: {e}", exc_info=True)
    finally:
        db.close()


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/train", response_model=schemas.TrainResponse)
def train_model(
    request: schemas.TrainRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_analyst),
):
    """Train an ML model on a processed dataset (background task)."""
    dataset = db.query(models.Dataset).filter(models.Dataset.id == request.dataset_id).first()
    if not dataset:
        raise HTTPException(404, "Dataset not found")
    if dataset.status != models.UploadStatus.completed:
        raise HTTPException(400, f"Dataset not ready (status: {dataset.status})")
    if not dataset.processed_file_path or not Path(dataset.processed_file_path).exists():
        raise HTTPException(400, "Processed file not found on disk")

    ml_model = models.MLModel(
        name=f"{request.model_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        model_type=request.model_type,
        target=request.target,
        status=models.ModelStatus.training,
        trained_on_dataset_id=request.dataset_id,
    )
    db.add(ml_model)
    db.commit()
    db.refresh(ml_model)

    background_tasks.add_task(
        _train_and_save, ml_model.id, dataset.processed_file_path, request.model_type
    )

    return schemas.TrainResponse(
        status="training",
        model_id=ml_model.id,
        message=f"Training {request.model_type} started in background.",
    )


@router.get("/models", response_model=list[schemas.MLModelResponse])
def list_models(db: Session = Depends(get_db),
                _: models.User = Depends(get_current_user)):
    return db.query(models.MLModel).order_by(models.MLModel.created_at.desc()).all()


@router.get("/models/{model_id}", response_model=schemas.MLModelResponse)
def get_model(model_id: int, db: Session = Depends(get_db),
              _: models.User = Depends(get_current_user)):
    m = db.query(models.MLModel).filter(models.MLModel.id == model_id).first()
    if not m:
        raise HTTPException(404, "Model not found")
    return m


@router.post("/predict/{model_id}/{dataset_id}", response_model=schemas.PredictionListResponse)
def run_predictions(
    model_id: int,
    dataset_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_analyst),
):
    """Start predictions as a background task — returns immediately.
    Poll GET /ml/predictions/{model_id} to get results."""
    ml_model = db.query(models.MLModel).filter(models.MLModel.id == model_id).first()
    if not ml_model or ml_model.status != models.ModelStatus.ready:
        raise HTTPException(400, "Model not ready")

    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
    if not dataset or not dataset.processed_file_path:
        raise HTTPException(404, "Processed dataset not found")
    if not Path(dataset.processed_file_path).exists():
        raise HTTPException(404, "Processed file not found on disk")

    background_tasks.add_task(
        _run_predict_task,
        model_id, dataset_id,
        ml_model.model_path,
        dataset.processed_file_path,
    )

    return schemas.PredictionListResponse(
        predictions=[], total=0, model_id=model_id,
    )


@router.get("/predictions/{model_id}", response_model=schemas.PredictionListResponse)
def get_predictions(
    model_id: int,
    skip: int = 0,
    limit: int = 1000,
    product_id: str = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """Get predictions for a model (paginated, optional product filter)."""
    q = db.query(models.Prediction).filter(models.Prediction.model_id == model_id)
    if product_id:
        q = q.filter(models.Prediction.product_id == product_id)

    total = q.count()
    preds = (
        q.order_by(models.Prediction.product_id, models.Prediction.metric_date)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return schemas.PredictionListResponse(predictions=preds, total=total, model_id=model_id)


@router.delete("/models/{model_id}")
def delete_model(model_id: int, db: Session = Depends(get_db),
                 _: models.User = Depends(require_analyst)):
    m = db.query(models.MLModel).filter(models.MLModel.id == model_id).first()
    if not m:
        raise HTTPException(404, "Model not found")
    db.query(models.Prediction).filter(
        models.Prediction.model_id == model_id
    ).delete(synchronize_session=False)
    db.delete(m)
    db.commit()
    return {"message": f"Model {model_id} and all predictions deleted"}
