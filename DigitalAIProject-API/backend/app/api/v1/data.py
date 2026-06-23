"""
Data Management API — upload, validate, feature engineering.
Upload flow (single step):
  POST /upload : validate + bulk ingest raw_data, then automatically runs
                 feature engineering → scoring → alerts → recommendations → retrain
                 scoped to only the products present in the uploaded file.
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List, Optional
from datetime import date
import logging
import threading

from app.core.database import get_db
from app.core.deps import require_roles, get_current_user
from app.models.user import User
from app.models.data import RawData, ProcessedFeatures
from app.models.ml_models import Score
from app.models.product import Product
from app.schemas.data import RawDataCreate, RawDataResponse, ProcessedFeaturesResponse
from app.services.data_service import data_service
from app.services.feature_engineering import feature_engineering_service
from app.services.ml_service import ml_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/data", tags=["Data Management"])


# ─────────────────────────────────────────────────────────────────────────────
# Internal helper — score every product+period that has processed features.
# Processes ALL periods in chronological order so score_change is correct.
# ─────────────────────────────────────────────────────────────────────────────
def _run_scoring_pipeline(db: Session, product_ids: List[int], period_dates: List[date]):
    from app.services.ml_service import ml_service
    from app.services.recommendation_service import recommendation_service

    scored = []
    for product_id in set(product_ids):
        try:
            # Get ONLY the latest processed feature record for this product
            latest_pf = (
                db.query(ProcessedFeatures)
                .filter(ProcessedFeatures.product_id == product_id)
                .order_by(ProcessedFeatures.period_date.desc())
                .first()
            )
            if not latest_pf:
                logger.warning(f"No processed features for product_id={product_id}")
                continue

            # Score the latest period
            latest_score_obj = ml_service.score_product(db, product_id, latest_pf.period_date)

            latest_features = {
                "active_user_rate":             latest_pf.active_user_rate,
                "txn_success_rate":             latest_pf.transaction_success_rate,
                "transaction_success_rate":     latest_pf.transaction_success_rate,
                "failed_txn_rate":              latest_pf.failed_txn_rate_pct,
                "revenue_per_txn":              latest_pf.revenue_per_transaction,
                "revenue_per_active_user":      latest_pf.revenue_per_active_user,
                "operational_efficiency_score": latest_pf.operational_efficiency_score,
                "downtime_impact_score":        latest_pf.downtime_impact_score,
                "complaint_growth_rate":        latest_pf.complaint_growth_rate,
                "complaint_resolution_rate":    latest_pf.complaint_resolution_rate,
                "fraud_incidents":              latest_pf.fraud_event_count,
                "api_error_rate":               latest_pf.api_error_rate,
                "user_engagement_index":        latest_pf.user_engagement_index,
                "avg_session_duration_sec":     latest_pf.avg_session_duration_sec,
                "csat_score":                   latest_pf.csat_score,
            }

            # Regenerate recommendations and alerts from the new data
            recommendation_service.generate_for_product(
                db, product_id, latest_pf.period_date, latest_score_obj, latest_features
            )
            recommendation_service.generate_alerts(
                db, product_id, latest_pf.period_date, latest_score_obj, latest_features
            )

            scored.append({
                "product_id":   product_id,
                "period_date":  str(latest_pf.period_date),
                "score":        round(latest_score_obj.performance_score, 2),
                "tier":         latest_score_obj.performance_tier,
                "score_change": round(latest_score_obj.score_change, 2)
                                if latest_score_obj.score_change is not None else None,
            })

        except Exception as e:
            db.rollback()
            logger.warning(f"Scoring failed for product_id={product_id}: {e}", exc_info=True)

    return scored


# ─────────────────────────────────────────────────────────────────────────────
# POST /upload  — validates, ingests, then auto-runs feature engineering
#                 scoped to only the products present in the uploaded file.
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "data_engineer", "ml_engineer")),
):
    content = await file.read()

    # 1 — Parse file
    try:
        df = data_service.read_file(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 2 — Validate
    validation = data_service.validate_dataframe(df, db)
    if not validation.is_valid:
        return {"status": "validation_failed", "validation": validation.model_dump()}

    # 3 — Bulk ingest
    success, errors, batch_id = data_service.ingest_dataframe(
        df, db, source="upload", uploaded_by=current_user.id
    )
    if success == 0:
        return {
            "status": "no_rows_imported",
            "rows_imported": 0,
            "rows_failed": errors,
            "warnings": validation.warnings,
        }

    # 4 — Determine which product IDs were in this upload (scope engineering to them only)
    uploaded_codes = df["product_code"].dropna().unique().tolist()
    uploaded_product_ids = [
        p.id for p in db.query(Product).filter(Product.code.in_(uploaded_codes)).all()
    ]

    # 5 — Auto-run feature engineering + scoring in background, scoped to uploaded products
    # NOTE: Training is separate - use POST /api/ml/train-all for model training
    user_id = current_user.id

    def _run_pipeline(product_ids: List[int]):
        from app.core.database import SessionLocal
        from app.core.config import settings as cfg
        db_bg = SessionLocal()
        try:
            # Feature engineering only for uploaded products
            for pid in product_ids:
                try:
                    feature_engineering_service.reprocess_all(db_bg, pid)
                except Exception as e:
                    logger.warning(f"Feature engineering failed for product_id={pid}: {e}")

            # Conditional auto-training based on environment variable
            if cfg.AUTO_TRAIN_ON_UPLOAD:
                logger.info("AUTO_TRAIN_ON_UPLOAD=True: Training models with uploaded data...")
                model_types = ["classification", "random_forest", "decision_tree", 
                              "gradient_boosting", "regression", "similarity"]
                trained_models = []
                
                for model_type in model_types:
                    try:
                        if model_type == "classification":
                            ml_service.train_classification(db_bg, dataset_version="auto_upload")
                        elif model_type == "random_forest":
                            ml_service.train_random_forest(db_bg, dataset_version="auto_upload")
                        elif model_type == "decision_tree":
                            ml_service.train_decision_tree(db_bg, dataset_version="auto_upload")
                        elif model_type == "gradient_boosting":
                            ml_service.train_gradient_boosting(db_bg, dataset_version="auto_upload")
                        elif model_type == "regression":
                            ml_service.train_regression(db_bg, dataset_version="auto_upload")
                        elif model_type == "similarity":
                            ml_service.train_similarity(db_bg, dataset_version="auto_upload")
                        
                        trained_models.append(model_type)
                        logger.info(f"Successfully trained {model_type} model")
                    except Exception as e:
                        logger.warning(f"Failed to train {model_type}: {e}")
                
                # Select best models
                if trained_models:
                    try:
                        ml_service.select_best_model(db_bg)
                        logger.info(f"Model training complete. Trained: {', '.join(trained_models)}")
                    except Exception as e:
                        logger.warning(f"Best model selection failed: {e}")
            else:
                logger.info("AUTO_TRAIN_ON_UPLOAD=False: Skipping training, using existing models for predictions.")

            # Score + recommendations + alerts using pre-trained models
            _run_scoring_pipeline(db_bg, product_ids, [])

            logger.info(f"Auto-pipeline complete for products: {product_ids}")
        except Exception as e:
            logger.error(f"Background pipeline failed: {e}", exc_info=True)
        finally:
            db_bg.close()

    threading.Thread(
        target=_run_pipeline, args=(uploaded_product_ids,), daemon=True
    ).start()

    return {
        "status":        "success",
        "filename":      file.filename,
        "rows_imported": success,
        "rows_failed":   errors,
        "batch_id":      batch_id,
        "warnings":      validation.warnings,
        "products_in_upload": uploaded_product_ids,
        "message": (
            f"Imported {success} row(s) for {len(uploaded_product_ids)} channel(s). "
            "Feature engineering, scoring, and alerts running in background using pre-trained models."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /validate  — dry-run, no import
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/validate")
async def validate_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "data_engineer", "ml_engineer")),
):
    content = await file.read()
    try:
        df = data_service.read_file(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return data_service.validate_dataframe(df, db)


# ─────────────────────────────────────────────────────────────────────────────
# POST /manual  — single-record entry, immediately processes
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/manual", response_model=RawDataResponse)
async def create_manual_entry(
    payload: RawDataCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "data_engineer")),
):
    raw = RawData(
        **payload.model_dump(),
        source="manual",
        uploaded_by=current_user.id,
        is_validated=True,
    )
    db.add(raw)
    db.commit()
    db.refresh(raw)

    # Feature engineering + scoring for this single record
    feature_engineering_service.process_and_store(raw, db)
    _run_scoring_pipeline(db, [raw.product_id], [raw.period_date])
    return raw


# ─────────────────────────────────────────────────────────────────────────────
# GET /raw
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/raw", response_model=List[RawDataResponse])
async def list_raw_data(
    product_id: Optional[int] = None,
    limit: int = Query(50, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(RawData)
    if product_id:
        q = q.filter(RawData.product_id == product_id)
    return q.order_by(RawData.period_date.desc()).limit(limit).all()


# ─────────────────────────────────────────────────────────────────────────────
# GET /features
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/features", response_model=List[ProcessedFeaturesResponse])
async def list_features(
    product_id: Optional[int] = None,
    limit: int = Query(50, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ProcessedFeatures)
    if product_id:
        q = q.filter(ProcessedFeatures.product_id == product_id)
    return q.order_by(ProcessedFeatures.period_date.desc()).limit(limit).all()


# ─────────────────────────────────────────────────────────────────────────────
# POST /engineer  — manual trigger: features → scores → alerts → recommendations
#                   (auto-runs after /upload; kept for manual / admin use)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/engineer")
async def run_feature_engineering(
    product_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "data_engineer", "ml_engineer")),
):
    # ── Step A: compute / update processed_features ─────────────────────────
    try:
        count = feature_engineering_service.reprocess_all(db, product_id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Feature engineering failed: {e}")

    # ── Step B: score products that have processed features ──────────────────
    all_products_with_features = (
        db.query(ProcessedFeatures.product_id)
        .distinct()
        .all()
    )
    if product_id:
        all_product_ids = [product_id]
    else:
        all_product_ids = [row[0] for row in all_products_with_features]

    if not all_product_ids:
        return {
            "message": "No processed features found. Upload data first.",
            "features_computed": count,
            "products_scored": [],
        }

    # ── Step C: score + recommendations + alerts ─────────────────────────────
    scored_products = _run_scoring_pipeline(db, all_product_ids, [])

    return {
        "message":           f"Feature engineering completed for {count} record(s).",
        "features_computed": count,
        "products_scored":   scored_products,
    }
