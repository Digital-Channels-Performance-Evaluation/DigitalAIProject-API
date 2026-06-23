"""
Feature Engineering Service
Computes all derived and normalised features from raw data.
"""
import numpy as np
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date
import logging

# Import ALL models so SQLAlchemy FK metadata is fully populated
from app.models.user import User          # noqa
from app.models.product import Product    # noqa
from app.models.data import RawData, ProcessedFeatures
from app.models.ml_models import Score, ModelRegistry  # noqa
from app.models.alerts import Alert                     # noqa
from app.models.recommendations import Recommendation   # noqa

logger = logging.getLogger(__name__)


class FeatureEngineeringService:

    def compute_features(self, raw: RawData, prev_raw: Optional[RawData] = None) -> dict:
        f = {}

        f["active_user_rate"] = self._safe_divide(raw.active_users, raw.total_users)
        f["revenue_per_transaction"] = self._safe_divide(raw.total_revenue, raw.total_transactions)
        f["revenue_per_active_user"] = self._safe_divide(raw.total_revenue, raw.active_users)

        if raw.successful_transactions is not None and raw.total_transactions:
            f["transaction_success_rate"] = self._safe_divide(raw.successful_transactions, raw.total_transactions)
        elif raw.failed_txn_rate is not None:
            f["transaction_success_rate"] = round(1.0 - raw.failed_txn_rate / 100.0, 6)
        else:
            f["transaction_success_rate"] = None

        if raw.failed_txn_rate is not None:
            f["failed_txn_rate_pct"] = raw.failed_txn_rate
        elif raw.failed_transactions is not None and raw.total_transactions and raw.total_transactions > 0:
            f["failed_txn_rate_pct"] = round(raw.failed_transactions / raw.total_transactions * 100, 4)
        else:
            f["failed_txn_rate_pct"] = None

        aur = f["active_user_rate"] or 0
        txn = raw.total_transactions or 0
        f["user_engagement_index"] = round(aur * txn, 4) if (aur and txn) else None

        prev_vol = None
        if prev_raw is not None and prev_raw.total_complaints is not None:
            prev_vol = prev_raw.total_complaints

        if raw.total_complaints is not None and prev_vol is not None and prev_vol > 0:
            f["complaint_growth_rate"] = round((raw.total_complaints - prev_vol) / prev_vol * 100, 4)
            f["prev_complaint_volume"] = prev_vol
        elif raw.total_complaints is not None and raw.resolved_complaints is not None:
            unresolved = raw.total_complaints - raw.resolved_complaints
            f["complaint_growth_rate"] = round(
                self._safe_divide(unresolved, raw.total_complaints) * 100, 4
            ) if raw.total_complaints > 0 else 0.0
            f["prev_complaint_volume"] = None
        else:
            f["complaint_growth_rate"] = None
            f["prev_complaint_volume"] = None

        if raw.resolved_complaints is not None and raw.total_complaints:
            f["complaint_resolution_rate"] = round(
                self._safe_divide(raw.resolved_complaints, raw.total_complaints) * 100, 4
            )
        else:
            f["complaint_resolution_rate"] = None

        MONTHLY_MINUTES = 30 * 24 * 60
        if raw.downtime_minutes is not None:
            f["downtime_impact_score"] = round(min(raw.downtime_minutes / MONTHLY_MINUTES * 100, 100.0), 6)
        elif raw.downtime_hours is not None:
            f["downtime_impact_score"] = round(min(raw.downtime_hours * 60 / MONTHLY_MINUTES * 100, 100.0), 6)
        elif raw.uptime_percentage is not None:
            f["downtime_impact_score"] = round(max(0.0, 100.0 - raw.uptime_percentage), 4)
        else:
            f["downtime_impact_score"] = None

        components, weights = [], []
        tsr = f.get("transaction_success_rate")
        if tsr is not None:
            components.append(tsr); weights.append(0.50)
        api_err = raw.api_error_rate
        if api_err is not None:
            components.append(max(0.0, 1.0 - api_err / 100.0)); weights.append(0.30)
        elif raw.uptime_percentage is not None:
            components.append(raw.uptime_percentage / 100.0); weights.append(0.30)
        res_rate = f.get("complaint_resolution_rate")
        if res_rate is not None:
            components.append(res_rate / 100.0); weights.append(0.20)
        if components:
            total_weight = sum(weights)
            f["operational_efficiency_score"] = round(
                sum(c * w for c, w in zip(components, weights)) / total_weight * 100, 4
            )
        else:
            f["operational_efficiency_score"] = None

        f["csat_score"]               = raw.csat_score
        f["fraud_event_count"]        = raw.fraud_event_count
        f["security_incident_count"]  = raw.security_incident_count
        f["api_error_rate"]           = raw.api_error_rate

        # avg_session_duration_sec: use the dedicated column if present,
        # otherwise leave as None — do NOT fall back to avg_response_time_ms,
        # which is in milliseconds and has completely different semantics.
        # The ML model will default to 0.0 for missing values via the alias map.
        f["avg_session_duration_sec"] = getattr(raw, "avg_session_duration_sec", None)

        return f

    def _safe_divide(self, numerator, denominator) -> Optional[float]:
        if numerator is None or denominator is None:
            return None
        if denominator == 0:
            return 0.0
        return round(numerator / denominator, 6)

    def process_and_store(self, raw: RawData, db: Session,
                          prev_raw: Optional[RawData] = None) -> ProcessedFeatures:
        if prev_raw is None:
            prev_raw = (
                db.query(RawData)
                .filter(RawData.product_id == raw.product_id,
                        RawData.period_date < raw.period_date)
                .order_by(RawData.period_date.desc())
                .first()
            )
        features = self.compute_features(raw, prev_raw)
        kwargs = self._build_kwargs(raw, features)
        processed = ProcessedFeatures(**kwargs)
        db.add(processed)
        db.commit()
        db.refresh(processed)
        return processed

    def _build_kwargs(self, raw: RawData, features: dict) -> dict:
        """Build ProcessedFeatures kwargs from raw + computed features."""
        FEAT_MAP = {
            "active_user_rate":             "active_user_rate",
            "revenue_per_transaction":      "revenue_per_transaction",
            "revenue_per_active_user":      "revenue_per_active_user",
            "transaction_success_rate":     "transaction_success_rate",
            "failed_txn_rate_pct":          "failed_txn_rate_pct",
            "user_engagement_index":        "user_engagement_index",
            "complaint_growth_rate":        "complaint_growth_rate",
            "prev_complaint_volume":        "prev_complaint_volume",
            "complaint_resolution_rate":    "complaint_resolution_rate",
            "downtime_impact_score":        "downtime_impact_score",
            "operational_efficiency_score": "operational_efficiency_score",
            "csat_score":                   "csat_score",
            "fraud_event_count":            "fraud_event_count",
            "security_incident_count":      "security_incident_count",
            "api_error_rate":               "api_error_rate",
            "avg_session_duration_sec":     "avg_session_duration_sec",
        }
        kwargs = {
            "raw_data_id":         raw.id,
            "product_id":          raw.product_id,
            "period_date":         raw.period_date,
            "data_quality_flag":   False,
            "engineering_version": "1.0.0",
        }
        for feat_key, col_name in FEAT_MAP.items():
            val = features.get(feat_key)
            if val is not None:
                kwargs[col_name] = val
        return kwargs

    def reprocess_all(self, db: Session, product_id: Optional[int] = None) -> int:
        """
        Reprocess validated raw records per product.
        - For existing (seed) records: only reprocess the latest 2 (MoM calculation)
        - For newly uploaded records: process all new ones in chronological order
        This ensures new upload data always gets processed while being fast.
        """
        q = db.query(RawData.product_id).filter(RawData.is_validated == True)
        if product_id:
            q = q.filter(RawData.product_id == product_id)
        product_ids = [row[0] for row in q.distinct().all()]

        count = 0
        for pid in product_ids:
            # Get the latest period already processed
            latest_processed = (
                db.query(ProcessedFeatures.period_date)
                .filter(ProcessedFeatures.product_id == pid)
                .order_by(ProcessedFeatures.period_date.desc())
                .first()
            )
            latest_processed_date = latest_processed[0] if latest_processed else None

            # Fetch records to process:
            # - Always include records not yet processed (new uploads)
            # - Also include the last 2 already-processed records for MoM calc
            if latest_processed_date:
                # Get 2 records before the latest processed date (for prev_raw MoM context)
                context_raw = (
                    db.query(RawData)
                    .filter(
                        RawData.product_id == pid,
                        RawData.is_validated == True,
                        RawData.period_date <= latest_processed_date,
                    )
                    .order_by(RawData.period_date.desc())
                    .limit(2)
                    .all()
                )
                # Get all records AFTER the latest processed date (new uploads)
                new_raw = (
                    db.query(RawData)
                    .filter(
                        RawData.product_id == pid,
                        RawData.is_validated == True,
                        RawData.period_date > latest_processed_date,
                    )
                    .order_by(RawData.period_date.asc())
                    .all()
                )
                if not new_raw and not context_raw:
                    continue
                # Combine: context (sorted asc) then new
                to_process = sorted(context_raw, key=lambda x: x.period_date) + new_raw
            else:
                # No processed records yet — process all in order
                to_process = (
                    db.query(RawData)
                    .filter(RawData.product_id == pid, RawData.is_validated == True)
                    .order_by(RawData.period_date.asc())
                    .all()
                )

            if not to_process:
                continue

            # Process chronologically for correct MoM deltas
            prev = None
            for raw in to_process:
                features = self.compute_features(raw, prev)
                kwargs = self._build_kwargs(raw, features)

                existing = (
                    db.query(ProcessedFeatures)
                    .filter(ProcessedFeatures.raw_data_id == raw.id)
                    .first()
                )
                if existing:
                    for k, v in kwargs.items():
                        if hasattr(existing, k) and v is not None:
                            setattr(existing, k, v)
                else:
                    db.add(ProcessedFeatures(**kwargs))

                prev = raw
                count += 1

        try:
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Feature engineering commit failed: {e}")
            raise

        logger.info(f"Feature engineering complete: {count} records processed")
        return count


feature_engineering_service = FeatureEngineeringService()
