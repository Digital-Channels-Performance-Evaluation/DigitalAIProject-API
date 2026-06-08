from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

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


@router.post("/retrain")
async def retrain_model(
    payload: RetrainRequest,
    background_tasks: BackgroundTasks,
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

    # Retrain in background
    def do_retrain():
        from app.core.database import SessionLocal
        db_bg = SessionLocal()
        try:
            if model_type == "classification":
                ml_service.train_classification(db_bg)
            elif model_type == "regression":
                ml_service.train_regression(db_bg)
            elif model_type == "similarity":
                ml_service.train_similarity(db_bg)
            elif model_type == "random_forest":
                ml_service.train_random_forest(db_bg)
            elif model_type == "decision_tree":
                ml_service.train_decision_tree(db_bg)
            elif model_type == "gradient_boosting":
                ml_service.train_gradient_boosting(db_bg)
        finally:
            db_bg.close()

    background_tasks.add_task(do_retrain)
    return {"message": f"Retraining {model_type} model started in background", "reason": payload.reason}


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


@router.get("/predictions/{product_id}")
async def get_3month_predictions(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate and return 3-month forward predictions for a product.
    Uses momentum-based projection on the latest feature vector.
    """
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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "ml_engineer", "data_engineer")),
):
    """
    Train all 5 model types in sequence, then auto-select the best.
    Triggered automatically after each data upload pipeline.
    """
    def do_train_all():
        from app.core.database import SessionLocal
        db_bg = SessionLocal()
        try:
            for model_type in ["classification", "random_forest", "decision_tree",
                                "gradient_boosting", "regression", "similarity"]:
                try:
                    if model_type == "classification":
                        ml_service.train_classification(db_bg)
                    elif model_type == "random_forest":
                        ml_service.train_random_forest(db_bg)
                    elif model_type == "decision_tree":
                        ml_service.train_decision_tree(db_bg)
                    elif model_type == "gradient_boosting":
                        ml_service.train_gradient_boosting(db_bg)
                    elif model_type == "regression":
                        ml_service.train_regression(db_bg)
                    elif model_type == "similarity":
                        ml_service.train_similarity(db_bg)
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(f"Train-all: {model_type} failed: {e}")
            # Auto-select best after all trained
            ml_service.select_best_model(db_bg)
        finally:
            db_bg.close()

    background_tasks.add_task(do_train_all)
    return {"message": "Training all 5 model types + auto-select in background"}
