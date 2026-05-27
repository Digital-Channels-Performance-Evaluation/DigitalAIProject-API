from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from pathlib import Path
from datetime import datetime

from app.core.ml_pipeline import ml_pipeline
from app.core.deps import get_current_user, require_analyst
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/ml", tags=["Machine Learning"])


def _train_and_save(model_id: int, processed_file: str, model_type: str):
    """Background task: train model and persist metrics to DB."""
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

        ml_model.status = models.ModelStatus.ready
        ml_model.model_path = result["model_path"]
        ml_model.accuracy = result["accuracy"]
        ml_model.precision_score = result["precision_score"]
        ml_model.recall_score = result["recall_score"]
        ml_model.f1_score = result["f1_score"]
        ml_model.feature_importance = result["feature_importance"]
        ml_model.training_params = result["training_params"]
        ml_model.updated_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        db.rollback()
        ml_model = db.query(models.MLModel).filter(models.MLModel.id == model_id).first()
        if ml_model:
            ml_model.status = models.ModelStatus.failed
            db.commit()
    finally:
        db.close()


@router.post("/train", response_model=schemas.TrainResponse)
def train_model(
    request: schemas.TrainRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_analyst),
):
    """Train an ML model on a processed dataset."""
    dataset = db.query(models.Dataset).filter(models.Dataset.id == request.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if dataset.status != models.UploadStatus.completed:
        raise HTTPException(
            status_code=400,
            detail=f"Dataset is not ready for training (status: {dataset.status}). Process it first.",
        )

    if not dataset.processed_file_path or not Path(dataset.processed_file_path).exists():
        raise HTTPException(status_code=400, detail="Processed file not found on disk")

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
        message=f"Training {request.model_type} model in background. Check /ml/models/{ml_model.id} for status.",
    )


@router.get("/models", response_model=list[schemas.MLModelResponse])
def list_models(db: Session = Depends(get_db),
                _: models.User = Depends(get_current_user)):
    """List all trained models."""
    return db.query(models.MLModel).order_by(models.MLModel.created_at.desc()).all()


@router.get("/models/{model_id}", response_model=schemas.MLModelResponse)
def get_model(model_id: int, db: Session = Depends(get_db),
              _: models.User = Depends(get_current_user)):
    """Get details of a specific model."""
    ml_model = db.query(models.MLModel).filter(models.MLModel.id == model_id).first()
    if not ml_model:
        raise HTTPException(status_code=404, detail="Model not found")
    return ml_model


@router.post("/predict/{model_id}/{dataset_id}", response_model=schemas.PredictionListResponse)
def run_predictions(
    model_id: int,
    dataset_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_analyst),
):
    """Run predictions using a trained model on a processed dataset."""
    ml_model = db.query(models.MLModel).filter(models.MLModel.id == model_id).first()
    if not ml_model or ml_model.status != models.ModelStatus.ready:
        raise HTTPException(status_code=400, detail="Model not ready")

    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
    if not dataset or not dataset.processed_file_path:
        raise HTTPException(status_code=404, detail="Processed dataset not found")

    pred_df = ml_pipeline.predict(
        model_path=ml_model.model_path,
        processed_file=Path(dataset.processed_file_path),
    )

    # Persist predictions
    db.query(models.Prediction).filter(
        models.Prediction.model_id == model_id,
        models.Prediction.dataset_id == dataset_id,
    ).delete()

    db_preds = []
    for _, row in pred_df.iterrows():
        p = models.Prediction(
            dataset_id=dataset_id,
            model_id=model_id,
            product_id=row["product_id"],
            metric_date=row.get("metric_date"),
            prediction_label=row["prediction_label"],
            confidence=row["confidence"],
        )
        db.add(p)
        db_preds.append(p)

    db.commit()
    for p in db_preds:
        db.refresh(p)

    return schemas.PredictionListResponse(
        predictions=db_preds,
        total=len(db_preds),
        model_id=model_id,
    )


@router.get("/predictions/{model_id}", response_model=schemas.PredictionListResponse)
def get_predictions(model_id: int, db: Session = Depends(get_db),
                    _: models.User = Depends(get_current_user)):
    """Retrieve stored predictions for a model."""
    preds = (
        db.query(models.Prediction)
        .filter(models.Prediction.model_id == model_id)
        .order_by(models.Prediction.product_id)
        .all()
    )
    return schemas.PredictionListResponse(predictions=preds, total=len(preds), model_id=model_id)


@router.delete("/models/{model_id}")
def delete_model(model_id: int, db: Session = Depends(get_db),
                 _: models.User = Depends(require_analyst)):
    """Delete a model record."""
    ml_model = db.query(models.MLModel).filter(models.MLModel.id == model_id).first()
    if not ml_model:
        raise HTTPException(status_code=404, detail="Model not found")
    db.delete(ml_model)
    db.commit()
    return {"message": f"Model {model_id} deleted"}
