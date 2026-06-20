from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import logging

from app.core.database import get_db
from app.core.deps import require_roles, get_current_user
from app.models.user import User
from app.models.ml_models import ModelRegistry
from app.schemas.ml import (
    TrainRequest, TrainResponse, PredictRequest, PredictResponse,
    RetrainRequest, ModelRegistryResponse, SimilarProductResponse,
)
from app.services.ml_service import ml_service

router = APIRouter(prefix="/ml", tags=["ML / Model Management"])
logger = logging.getLogger(__name__)


@router.post("/train", response_model=TrainResponse)
async def train_model(
    payload: TrainRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "ml_engineer")),
):
    try:
        if payload.model_type == "classification":
            result = ml_service.train_classification(
                db, hyperparams=payload.hyperparameters,
                dataset_version=payload.dataset_version or "1.0.0",
            )
            return TrainResponse(
                model_id=result["model_id"],
                model_name="LogisticRegression_Classifier",
                model_type="classification",
                version=result["version"],
                accuracy=result.get("accuracy"),
                f1_score=result.get("f1_score"),
                training_samples=result["training_samples"],
                message=f"Classification model trained successfully. Accuracy: {result.get('accuracy', 0):.2%}",
            )
        elif payload.model_type == "regression":
            result = ml_service.train_regression(
                db, hyperparams=payload.hyperparameters,
                dataset_version=payload.dataset_version or "1.0.0",
            )
            return TrainResponse(
                model_id=result["model_id"],
                model_name="Ridge_Regressor",
                model_type="regression",
                version=result["version"],
                r2_score=result.get("r2_score"),
                mae=result.get("mae"),
                training_samples=result["training_samples"],
                message=f"Regression model trained successfully. R²: {result.get('r2_score', 0):.4f}",
            )
        elif payload.model_type == "similarity":
            result = ml_service.train_similarity(
                db, hyperparams=payload.hyperparameters,
                dataset_version=payload.dataset_version or "1.0.0",
            )
            return TrainResponse(
                model_id=result["model_id"],
                model_name="KNN_Similarity",
                model_type="similarity",
                version=result["version"],
                training_samples=result["training_samples"],
                message=f"KNN similarity model trained on {result['training_samples']} products.",
            )
        elif payload.model_type == "random_forest":
            result = ml_service.train_random_forest(
                db, hyperparams=payload.hyperparameters,
                dataset_version=payload.dataset_version or "1.0.0",
            )
            return TrainResponse(
                model_id=result["model_id"],
                model_name="RandomForest_Classifier",
                model_type="random_forest",
                version=result["version"],
                accuracy=result.get("accuracy"),
                f1_score=result.get("f1_score"),
                training_samples=result["training_samples"],
                message=f"Random Forest trained. Accuracy: {result.get('accuracy', 0):.2%}  F1: {result.get('f1_score', 0):.4f}",
            )
        elif payload.model_type == "decision_tree":
            result = ml_service.train_decision_tree(
                db, hyperparams=payload.hyperparameters,
                dataset_version=payload.dataset_version or "1.0.0",
            )
            return TrainResponse(
                model_id=result["model_id"],
                model_name="DecisionTree_Classifier",
                model_type="decision_tree",
                version=result["version"],
                accuracy=result.get("accuracy"),
                f1_score=result.get("f1_score"),
                training_samples=result["training_samples"],
                message=f"Decision Tree trained. Accuracy: {result.get('accuracy', 0):.2%}  F1: {result.get('f1_score', 0):.4f}",
            )
        elif payload.model_type == "gradient_boosting":
            result = ml_service.train_gradient_boosting(
                db, hyperparams=payload.hyperparameters,
                dataset_version=payload.dataset_version or "1.0.0",
            )
            return TrainResponse(
                model_id=result["model_id"],
                model_name="GradientBoosting_Classifier",
                model_type="gradient_boosting",
                version=result["version"],
                accuracy=result.get("accuracy"),
                f1_score=result.get("f1_score"),
                training_samples=result["training_samples"],
                message=f"Gradient Boosting trained. Accuracy: {result.get('accuracy', 0):.2%}  F1: {result.get('f1_score', 0):.4f}",
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unknown model type: {payload.model_type}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/predict", response_model=PredictResponse)
async def predict(
    payload: PredictRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "ml_engineer", "product_manager", "executive_management")),
):
    try:
        result = ml_service.predict(db, payload.product_id, payload.features)
        return PredictResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


def _celery_worker_available() -> bool:
    """Returns True if at least one Celery worker is reachable."""
    try:
        from app.tasks.celery_app import celery_app as _app
        inspector = _app.control.inspect(timeout=1.0)
        active = inspector.active()
        return bool(active)
    except Exception:
        return False


def _run_retrain_in_thread(model_types: list, dataset_version: str = "manual"):
    """Fallback: run retraining in a background thread when Celery is unavailable."""
    import threading
    import uuid

    fake_task_id = str(uuid.uuid4())

    def _work():
        from app.core.database import SessionLocal
        db_bg = SessionLocal()
        try:
            ALL_TYPES = ["classification", "random_forest", "decision_tree",
                         "gradient_boosting", "regression", "similarity"]
            types = model_types or ALL_TYPES
            for mt in types:
                try:
                    if mt == "classification":      ml_service.train_classification(db_bg, dataset_version=dataset_version)
                    elif mt == "random_forest":     ml_service.train_random_forest(db_bg, dataset_version=dataset_version)
                    elif mt == "decision_tree":     ml_service.train_decision_tree(db_bg, dataset_version=dataset_version)
                    elif mt == "gradient_boosting": ml_service.train_gradient_boosting(db_bg, dataset_version=dataset_version)
                    elif mt == "regression":        ml_service.train_regression(db_bg, dataset_version=dataset_version)
                    elif mt == "similarity":        ml_service.train_similarity(db_bg, dataset_version=dataset_version)
                except Exception as e:
                    logger.warning(f"Thread retrain {mt} failed: {e}")
            ml_service.select_best_model(db_bg)
            logger.info("Thread-based retrain complete")
        finally:
            db_bg.close()

    threading.Thread(target=_work, daemon=True).start()
    return fake_task_id


@router.post("/retrain")
async def retrain_model(
    payload: RetrainRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "ml_engineer")),
):
    if payload.model_id:
        model = db.query(ModelRegistry).filter(ModelRegistry.id == payload.model_id).first()
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        model_type = model.model_type
    elif payload.model_type:
        model_type = payload.model_type
    else:
        raise HTTPException(status_code=400, detail="Provide model_id or model_type")

    if _celery_worker_available():
        from app.tasks.ml_tasks import retrain_all_models
        task = retrain_all_models.delay(dataset_version="manual", model_types=[model_type])
        return {"message": f"Retraining {model_type} queued via Celery", "task_id": task.id, "reason": payload.reason, "mode": "celery"}
    else:
        task_id = _run_retrain_in_thread([model_type], dataset_version="manual")
        return {"message": f"Retraining {model_type} started in background thread (no Celery worker)", "task_id": task_id, "reason": payload.reason, "mode": "thread"}


@router.get("/models", response_model=List[ModelRegistryResponse])
@router.get("/models/", response_model=List[ModelRegistryResponse])
async def list_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "ml_engineer", "data_engineer")),
):
    return db.query(ModelRegistry).order_by(ModelRegistry.created_at.desc()).all()


@router.get("/drift")
async def check_drift(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "ml_engineer")),
):
    return ml_service.detect_drift(db)


@router.get("/similar/{product_id}", response_model=List[SimilarProductResponse])
async def get_similar_products(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(
        "super_admin", "ml_engineer", "product_manager", "executive_management"
    )),
):
    from app.models.ml_models import SimilarProduct
    from app.models.product import Product

    similar = (
        db.query(SimilarProduct)
        .filter(SimilarProduct.product_id == product_id)
        .order_by(SimilarProduct.similarity_score.desc())
        .all()
    )
    result = []
    for s in similar:
        sp = db.query(Product).filter(Product.id == s.similar_product_id).first()
        result.append(SimilarProductResponse(
            product_id=s.product_id,
            similar_product_id=s.similar_product_id,
            similar_product_name=sp.name if sp else "N/A",
            similarity_score=s.similarity_score,
            cluster_id=s.cluster_id,
        ))
    return result


@router.post("/select-best")
async def select_best_model(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "ml_engineer")),
):
    """
    Automatically select the best classifier (lowest log_loss) and best regressor (lowest MAE)
    from all trained models in the registry and promote them to active.
    """
    try:
        result = ml_service.select_best_model(db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/task/{task_id}")
async def get_task_status(
    task_id: str,
    current_user: User = Depends(require_roles("super_admin", "ml_engineer", "data_engineer")),
):
    """Poll the status of a training task. Works for both Celery tasks and thread-based fallback."""
    try:
        from celery.result import AsyncResult
        from app.tasks.celery_app import celery_app as _celery
        result = AsyncResult(task_id, app=_celery)
        response: dict = {"task_id": task_id, "status": result.status, "mode": "celery"}
        if result.status == "PROGRESS":
            response["progress"] = result.info
        elif result.status == "SUCCESS":
            response["result"] = result.result
        elif result.status == "FAILURE":
            response["error"] = str(result.result)
        return response
    except Exception:
        # Celery unavailable or task is thread-based — return a neutral in-progress status
        return {"task_id": task_id, "status": "PROGRESS", "mode": "thread",
                "progress": {"message": "Training running in background thread…"}}



async def get_bulk_predictions(
    product_ids: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Bulk 3-month predictions for multiple products in a single request.
    Replaces N sequential /predictions/{id} calls with one round-trip.
    product_ids: comma-separated list of product IDs, e.g. ?product_ids=1,2,3

    IMPORTANT: this route must be declared BEFORE /predictions/{product_id}
    so FastAPI matches 'bulk' here instead of treating it as an integer id.
    """
    try:
        ids = [int(x.strip()) for x in product_ids.split(",") if x.strip().isdigit()]
    except Exception:
        raise HTTPException(status_code=400, detail="product_ids must be comma-separated integers")

    if not ids:
        return []
    if len(ids) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 product IDs per bulk request")

    results = []
    for pid in ids:
        try:
            preds = ml_service.predict_3months(db, pid)
            results.append({"product_id": pid, "predictions": preds})
        except Exception:
            results.append({"product_id": pid, "predictions": []})

    return results


@router.get("/predictions/{product_id}")
async def get_3month_predictions(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate and return 3-month forward predictions for a product."""
    try:
        predictions = ml_service.predict_3months(db, product_id)
        return {"product_id": product_id, "predictions": predictions}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/insights")
@router.get("/insights/")
async def get_executive_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate AI executive insights from actual uploaded dataset.
    Insights change dynamically based on latest data.
    """
    try:
        insights = ml_service.generate_executive_insights(db)
        return {"insights": insights, "count": len(insights)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/train-all")
@router.post("/train-all/")
async def train_all_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "ml_engineer", "data_engineer")),
):
    """
    Train all 6 model types, then auto-select the best.
    Uses Celery if a worker is running, otherwise falls back to a background thread.
    """
    if _celery_worker_available():
        from app.tasks.ml_tasks import retrain_all_models
        task = retrain_all_models.delay(dataset_version="manual_train_all")
        return {"message": "Full retrain queued via Celery.", "task_id": task.id, "mode": "celery"}
    else:
        task_id = _run_retrain_in_thread([], dataset_version="manual_train_all")
        return {"message": "Full retrain started in background thread (no Celery worker running).", "task_id": task_id, "mode": "thread"}
