"""Run scoring pipeline for products with features but no scores."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.product import Product
from app.models.data import ProcessedFeatures
from app.models.ml_models import Score
from app.services.ml_service import ml_service
from app.services.recommendation_service import recommendation_service
from app.services.feature_engineering import feature_engineering_service
from datetime import date

db = SessionLocal()
try:
    products = db.query(Product).filter(Product.is_active == True).all()
    for p in products:
        score_count = db.query(Score).filter(Score.product_id == p.id).count()
        feat = (
            db.query(ProcessedFeatures)
            .filter(ProcessedFeatures.product_id == p.id)
            .order_by(ProcessedFeatures.period_date.desc())
            .first()
        )
        if feat and score_count == 0:
            print(f"Scoring product {p.id} ({p.name})...")
            try:
                score_obj = ml_service.score_product(db, p.id, date.today())
                features = {
                    "active_user_rate":             feat.active_user_rate,
                    "txn_success_rate":             feat.transaction_success_rate,
                    "failed_txn_rate":              feat.failed_txn_rate_pct,
                    "revenue_per_txn":              feat.revenue_per_transaction,
                    "revenue_per_active_user":      feat.revenue_per_active_user,
                    "operational_efficiency_score": feat.operational_efficiency_score,
                    "downtime_impact_score":        feat.downtime_impact_score,
                    "complaint_growth_rate":        feat.complaint_growth_rate,
                    "complaint_resolution_rate":    feat.complaint_resolution_rate,
                    "fraud_incidents":              feat.fraud_event_count,
                    "api_error_rate":               feat.api_error_rate,
                    "user_engagement_index":        feat.user_engagement_index,
                    "avg_session_duration_sec":     feat.avg_session_duration_sec,
                    "csat_score":                   feat.csat_score,
                }
                recommendation_service.generate_for_product(db, p.id, date.today(), score_obj, features)
                recommendation_service.generate_alerts(db, p.id, date.today(), score_obj, features)
                print(f"  -> Score: {score_obj.performance_score:.1f} ({score_obj.performance_tier})")
            except Exception as e:
                print(f"  -> Failed: {e}")
        elif score_count > 0:
            print(f"Product {p.id} ({p.name}): already scored ({score_count} scores)")
        else:
            print(f"Product {p.id} ({p.name}): no features, skipping")
finally:
    db.close()
