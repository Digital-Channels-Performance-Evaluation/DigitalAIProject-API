"""
Celery ML Tasks — with retry configuration so transient DB/Redis failures
don't permanently break scheduled scoring and retraining jobs.
"""
import logging
from datetime import date
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.tasks.ml_tasks.retrain_all_models",
    bind=True,
    max_retries=2,
    default_retry_delay=300,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def retrain_all_models(self, dataset_version: str = "auto", model_types: list = None):
    """
    Full retraining job for large datasets — runs via Celery so it doesn't block
    the web server.  Trains all model types in sequence, then promotes the best.

    Triggered manually via POST /ml/train-all or POST /ml/retrain.
    NOT triggered automatically on data upload (upload only runs prediction).

    model_types: optional list to retrain a subset, e.g. ["classification", "regression"]
    """
    from app.core.database import SessionLocal
    from app.services.ml_service import ml_service

    ALL_TYPES = ["classification", "random_forest", "decision_tree",
                 "gradient_boosting", "regression", "similarity"]

    types_to_train = model_types or ALL_TYPES

    db = SessionLocal()
    try:
        results = {}
        total   = len(types_to_train)

        for i, model_type in enumerate(types_to_train):
            # Update Celery task state so callers can poll progress
            self.update_state(
                state="PROGRESS",
                meta={"current": i, "total": total, "model_type": model_type}
            )
            logger.info(f"[retrain_all_models] training {model_type} ({i+1}/{total})")

            try:
                if model_type == "classification":
                    r = ml_service.train_classification(db, dataset_version=dataset_version)
                elif model_type == "random_forest":
                    r = ml_service.train_random_forest(db, dataset_version=dataset_version)
                elif model_type == "decision_tree":
                    r = ml_service.train_decision_tree(db, dataset_version=dataset_version)
                elif model_type == "gradient_boosting":
                    r = ml_service.train_gradient_boosting(db, dataset_version=dataset_version)
                elif model_type == "regression":
                    r = ml_service.train_regression(db, dataset_version=dataset_version)
                elif model_type == "similarity":
                    r = ml_service.train_similarity(db, dataset_version=dataset_version)
                else:
                    r = {"error": f"unknown model type: {model_type}"}

                results[model_type] = {"status": "ok", **r}
                logger.info(f"[retrain_all_models] {model_type} done: {r}")

            except Exception as e:
                logger.warning(f"[retrain_all_models] {model_type} failed: {e}")
                results[model_type] = {"status": "failed", "error": str(e)}

        # Promote best model after all training is complete
        try:
            best = ml_service.select_best_model(db)
            results["best_model_selection"] = best
        except Exception as e:
            logger.warning(f"[retrain_all_models] select_best_model failed: {e}")

        logger.info(f"[retrain_all_models] complete. Results: {results}")
        return {"status": "completed", "results": results}

    finally:
        db.close()


@celery_app.task(
    name="app.tasks.ml_tasks.check_and_retrain",
    bind=True,
    max_retries=3,
    default_retry_delay=3600,  # 1 hour between retries
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def check_and_retrain(self):
    """Weekly: Check for model drift and retrain drifted models via Celery."""
    from app.core.database import SessionLocal
    from app.services.ml_service import ml_service

    db = SessionLocal()
    try:
        drift_reports = ml_service.detect_drift(db)
        drifted_types = [r["model_type"] for r in drift_reports if r["drift_detected"]]

        if drifted_types:
            logger.info(f"Drift detected in {drifted_types} — dispatching retrain task")
            # Dispatch a dedicated retrain task so this beat task returns quickly
            retrain_all_models.delay(
                dataset_version="drift_triggered",
                model_types=drifted_types,
            )

        return {
            "status":           "completed",
            "drifted_models":   drifted_types,
            "retrain_queued":   bool(drifted_types),
        }
    finally:
        db.close()


@celery_app.task(
    name="app.tasks.ml_tasks.run_feature_engineering",
    bind=True,
    max_retries=3,
    default_retry_delay=600,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def run_feature_engineering(self):
    """Daily: Run feature engineering on unprocessed raw data."""
    from app.core.database import SessionLocal
    from app.services.feature_engineering import feature_engineering_service

    db = SessionLocal()
    try:
        count = feature_engineering_service.reprocess_all(db)
        logger.info(f"Feature engineering completed for {count} records")
        return {"status": "completed", "records_processed": count}
    finally:
        db.close()


@celery_app.task(
    name="app.tasks.ml_tasks.score_all_products",
    bind=True,
    max_retries=3,
    default_retry_delay=600,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def score_all_products(self):
    """Daily: Score all active products using the current trained model."""
    from app.core.database import SessionLocal
    from app.models.product import Product
    from app.services.ml_service import ml_service
    from app.services.recommendation_service import recommendation_service
    from app.models.data import ProcessedFeatures

    db    = SessionLocal()
    today = date.today()
    try:
        products = db.query(Product).filter(Product.is_active == True).all()
        scored   = []
        for product in products:
            pf = (
                db.query(ProcessedFeatures)
                .filter(ProcessedFeatures.product_id == product.id)
                .order_by(ProcessedFeatures.period_date.desc())
                .first()
            )
            if pf:
                score_obj = ml_service.score_product(db, product.id, today)
                features  = {
                    "active_user_rate":             pf.active_user_rate,
                    "txn_success_rate":             pf.transaction_success_rate,
                    "failed_txn_rate":              pf.failed_txn_rate_pct,
                    "revenue_per_txn":              pf.revenue_per_transaction,
                    "revenue_per_active_user":      pf.revenue_per_active_user,
                    "operational_efficiency_score": pf.operational_efficiency_score,
                    "downtime_impact_score":        pf.downtime_impact_score,
                    "complaint_growth_rate":        pf.complaint_growth_rate,
                    "complaint_resolution_rate":    pf.complaint_resolution_rate,
                    "fraud_incidents":              pf.fraud_event_count,
                    "api_error_rate":               pf.api_error_rate,
                    "user_engagement_index":        pf.user_engagement_index,
                    "avg_session_duration_sec":     pf.avg_session_duration_sec,
                    "csat_score":                   pf.csat_score,
                }
                recommendation_service.generate_for_product(db, product.id, today, score_obj, features)
                recommendation_service.generate_alerts(db, product.id, today, score_obj, features)
                scored.append(product.id)

        return {"status": "completed", "products_scored": scored}
    finally:
        db.close()
