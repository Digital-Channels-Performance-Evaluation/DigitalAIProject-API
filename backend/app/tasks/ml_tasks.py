"""
Celery ML Tasks
"""
import logging
from datetime import date
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.ml_tasks.check_and_retrain", bind=True, max_retries=3)
def check_and_retrain(self):
    """Weekly: Check for model drift and retrain if needed."""
    try:
        from app.core.database import SessionLocal
        from app.services.ml_service import ml_service

        db = SessionLocal()
        try:
            drift_reports = ml_service.detect_drift(db)
            retrained = []
            for report in drift_reports:
                if report["drift_detected"]:
                    logger.info(f"Drift detected in {report['model_name']}, retraining...")
                    if report["model_type"] == "classification":
                        ml_service.train_classification(db)
                    elif report["model_type"] == "regression":
                        ml_service.train_regression(db)
                    elif report["model_type"] == "similarity":
                        ml_service.train_similarity(db)
                    retrained.append(report["model_type"])
            return {"status": "completed", "retrained_models": retrained}
        finally:
            db.close()
    except Exception as exc:
        logger.error(f"check_and_retrain failed: {exc}")
        raise self.retry(exc=exc, countdown=3600)


@celery_app.task(name="app.tasks.ml_tasks.run_feature_engineering")
def run_feature_engineering():
    """Daily: Run feature engineering on unprocessed raw data."""
    try:
        from app.core.database import SessionLocal
        from app.services.feature_engineering import feature_engineering_service

        db = SessionLocal()
        try:
            count = feature_engineering_service.reprocess_all(db)
            logger.info(f"Feature engineering completed for {count} records")
            return {"status": "completed", "records_processed": count}
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Feature engineering task failed: {e}")
        return {"status": "failed", "error": str(e)}


@celery_app.task(name="app.tasks.ml_tasks.score_all_products")
def score_all_products():
    """Daily: Score all active products for today."""
    try:
        from app.core.database import SessionLocal
        from app.models.product import Product
        from app.services.ml_service import ml_service
        from app.services.recommendation_service import recommendation_service
        from app.models.data import ProcessedFeatures

        db = SessionLocal()
        today = date.today()
        try:
            products = db.query(Product).filter(Product.is_active == True).all()
            scored = []
            for product in products:
                # Check if we have recent features
                pf = (
                    db.query(ProcessedFeatures)
                    .filter(ProcessedFeatures.product_id == product.id)
                    .order_by(ProcessedFeatures.period_date.desc())
                    .first()
                )
                if pf:
                    score_obj = ml_service.score_product(db, product.id, today)
                    # Full 14-feature dict matching train_models.py FEATURES list
                    features = {
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
    except Exception as e:
        logger.error(f"score_all_products task failed: {e}")
        return {"status": "failed", "error": str(e)}
