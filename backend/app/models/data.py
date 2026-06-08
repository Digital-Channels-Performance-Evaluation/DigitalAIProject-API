"""
SQLAlchemy ORM models for raw_data and processed_features.
All columns aligned with BRD Section 3.1.2 feature list and init.sql schema.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, Date
from sqlalchemy.sql import func
from app.core.database import Base


class RawData(Base):
    __tablename__ = "raw_data"

    id          = Column(Integer, primary_key=True, index=True)
    product_id  = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    period_date = Column(Date, nullable=False, index=True)

    # ── User metrics ─────────────────────────────────────────────────────────
    total_users   = Column(Float, nullable=True, comment="Total registered users")
    active_users  = Column(Float, nullable=True, comment="Monthly active users")
    new_users     = Column(Float, nullable=True, comment="New registrations in period")
    churned_users = Column(Float, nullable=True, comment="Users who became inactive")

    # ── Transaction metrics ──────────────────────────────────────────────────
    total_transactions      = Column(Float, nullable=True, comment="Total txn count (monthly_txn_count)")
    successful_transactions = Column(Float, nullable=True)
    failed_transactions     = Column(Float, nullable=True)
    failed_txn_rate         = Column(Float, nullable=True, comment="failed / total * 100 (%)")
    transaction_volume      = Column(Float, nullable=True, comment="Total txn value in ETB (txn_value_etb)")

    # ── Revenue metrics ──────────────────────────────────────────────────────
    total_revenue = Column(Float, nullable=True, comment="Revenue in ETB (revenue_etb)")
    fee_revenue   = Column(Float, nullable=True, comment="Fee/commission component in ETB")

    # ── Operational metrics ──────────────────────────────────────────────────
    uptime_percentage    = Column(Float, nullable=True, comment="System uptime %")
    downtime_minutes     = Column(Float, nullable=True, comment="Total downtime in MINUTES (BRD primary)")
    downtime_hours       = Column(Float, nullable=True, comment="downtime_minutes / 60 convenience alias")
    avg_response_time_ms = Column(Float, nullable=True, comment="Average API response time ms")
    api_error_rate       = Column(Float, nullable=True, comment="API error rate % from Digital Channel MW")

    # ── Complaint / CRM metrics ───────────────────────────────────────────────
    total_complaints    = Column(Float, nullable=True, comment="Total complaints (complaint_volume)")
    resolved_complaints = Column(Float, nullable=True)
    csat_score          = Column(Float, nullable=True, comment="Customer satisfaction score 1-5 from CRM")

    # ── Risk / Security metrics ───────────────────────────────────────────────
    fraud_event_count       = Column(Integer, nullable=True, comment="Fraud detection events in period")
    security_incident_count = Column(Integer, nullable=True, comment="IT security incidents in period")

    # ── Source / upload metadata ─────────────────────────────────────────────
    source            = Column(String(100), nullable=True, comment="csv | excel | api | manual | seed")
    upload_batch_id   = Column(String(100), nullable=True)
    is_validated      = Column(Boolean, default=False)
    validation_errors = Column(Text, nullable=True)
    uploaded_by       = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())


class ProcessedFeatures(Base):
    __tablename__ = "processed_features"

    id          = Column(Integer, primary_key=True, index=True)
    raw_data_id = Column(Integer, ForeignKey("raw_data.id"), nullable=False, index=True)
    product_id  = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    period_date = Column(Date, nullable=False, index=True)

    # ── Engineered features (BRD Section 3.1.2 — Derived Features) ───────────
    active_user_rate             = Column(Float, nullable=True, comment="active_users / total_users")
    revenue_per_transaction      = Column(Float, nullable=True, comment="total_revenue / total_transactions")
    revenue_per_active_user      = Column(Float, nullable=True, comment="total_revenue / active_users")
    transaction_success_rate     = Column(Float, nullable=True, comment="successful_txn / total_txn")
    failed_txn_rate_pct          = Column(Float, nullable=True, comment="failed_txn_rate direct from raw (%)")
    user_engagement_index        = Column(Float, nullable=True, comment="active_user_rate * total_transactions")
    complaint_growth_rate        = Column(Float, nullable=True, comment="MoM % change in complaint_volume")
    prev_complaint_volume        = Column(Float, nullable=True, comment="Prior period complaints for MoM delta")
    downtime_impact_score        = Column(Float, nullable=True, comment="downtime_minutes / (30*24*60) * 100")
    operational_efficiency_score = Column(Float, nullable=True, comment="Composite operational health score")

    # ── Normalised features (Min-Max 0-1, fit on training set) ───────────────
    norm_active_user_rate          = Column(Float, nullable=True)
    norm_revenue_per_active_user   = Column(Float, nullable=True)
    norm_transaction_success_rate  = Column(Float, nullable=True)
    norm_operational_efficiency    = Column(Float, nullable=True)
    norm_complaint_growth_rate     = Column(Float, nullable=True, comment="Inverted: lower=better")
    norm_downtime_impact           = Column(Float, nullable=True, comment="Inverted")
    norm_user_engagement_index     = Column(Float, nullable=True)
    norm_revenue_per_transaction   = Column(Float, nullable=True)

    # ── CRM / Risk pass-throughs ─────────────────────────────────────────────
    csat_score              = Column(Float, nullable=True)
    fraud_event_count       = Column(Integer, nullable=True)
    security_incident_count = Column(Integer, nullable=True)
    api_error_rate          = Column(Float, nullable=True)
    complaint_resolution_rate = Column(Float, nullable=True, comment="resolved / total_complaints * 100")
    avg_session_duration_sec  = Column(Float, nullable=True)

    # ── Metadata ─────────────────────────────────────────────────────────────
    data_quality_flag  = Column(Boolean, default=False, comment="True = quality warnings")
    data_quality_notes = Column(Text, nullable=True)
    engineering_version = Column(String(50), default="1.0.0")
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
