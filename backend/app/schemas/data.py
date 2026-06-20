"""
Pydantic schemas for data ingestion and feature responses.
All fields aligned with BRD Section 3.1.2 and models/data.py.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import date, datetime


class RawDataCreate(BaseModel):
    """Schema for manual or API-based raw data submission."""
    product_id:  int
    period_date: date

    # User metrics
    total_users:   Optional[float] = None
    active_users:  Optional[float] = None
    new_users:     Optional[float] = None
    churned_users: Optional[float] = None

    # Transaction metrics
    total_transactions:      Optional[float] = None
    successful_transactions: Optional[float] = None
    failed_transactions:     Optional[float] = None
    failed_txn_rate:         Optional[float] = Field(None, description="failed / total * 100 (%)")
    transaction_volume:      Optional[float] = Field(None, description="Total value in ETB")

    # Revenue metrics
    total_revenue: Optional[float] = Field(None, description="Revenue in ETB")
    fee_revenue:   Optional[float] = None

    # Operational metrics
    uptime_percentage:    Optional[float] = None
    downtime_minutes:     Optional[float] = Field(None, description="Primary BRD field — minutes")
    downtime_hours:       Optional[float] = None
    avg_response_time_ms: Optional[float] = None
    api_error_rate:       Optional[float] = Field(None, description="API error rate %")

    # Complaint / CRM metrics
    total_complaints:    Optional[float] = None
    resolved_complaints: Optional[float] = None
    csat_score:          Optional[float] = Field(None, ge=1.0, le=5.0, description="1-5 CSAT score from CRM")

    # Risk metrics
    fraud_event_count:       Optional[int] = None
    security_incident_count: Optional[int] = None

    # Metadata
    source:          Optional[str] = "manual"
    upload_batch_id: Optional[str] = None

    @field_validator("failed_txn_rate")
    @classmethod
    def validate_failed_txn_rate(cls, v):
        if v is not None and not (0.0 <= v <= 100.0):
            raise ValueError("failed_txn_rate must be between 0 and 100")
        return v

    @field_validator("uptime_percentage")
    @classmethod
    def validate_uptime(cls, v):
        if v is not None and not (0.0 <= v <= 100.0):
            raise ValueError("uptime_percentage must be between 0 and 100")
        return v


class RawDataResponse(RawDataCreate):
    id:               int
    is_validated:     bool
    validation_errors: Optional[str] = None
    created_at:       datetime

    class Config:
        from_attributes = True


class ProcessedFeaturesResponse(BaseModel):
    """Full response schema for processed_features — all 14 ML features included."""
    id:          int
    product_id:  int
    period_date: date

    # Engineered features
    active_user_rate:             Optional[float] = None
    revenue_per_transaction:      Optional[float] = None
    revenue_per_active_user:      Optional[float] = None
    transaction_success_rate:     Optional[float] = None
    failed_txn_rate_pct:          Optional[float] = None
    user_engagement_index:        Optional[float] = None
    complaint_growth_rate:        Optional[float] = None
    downtime_impact_score:        Optional[float] = None
    operational_efficiency_score: Optional[float] = None

    # Normalised features
    norm_active_user_rate:         Optional[float] = None
    norm_revenue_per_active_user:  Optional[float] = None
    norm_transaction_success_rate: Optional[float] = None
    norm_operational_efficiency:   Optional[float] = None
    norm_complaint_growth_rate:    Optional[float] = None
    norm_downtime_impact:          Optional[float] = None
    norm_user_engagement_index:    Optional[float] = None
    norm_revenue_per_transaction:  Optional[float] = None

    # Risk / CRM pass-throughs
    csat_score:                Optional[float] = None
    fraud_event_count:         Optional[int]   = None
    security_incident_count:   Optional[int]   = None
    api_error_rate:            Optional[float] = None
    complaint_resolution_rate: Optional[float] = None
    avg_session_duration_sec:  Optional[float] = None

    # Metadata
    data_quality_flag:   Optional[bool] = None
    engineering_version: Optional[str]  = None
    created_at:          datetime

    class Config:
        from_attributes = True


class ValidationResult(BaseModel):
    is_valid:     bool
    errors:       List[str]
    warnings:     List[str]
    row_count:    int
    invalid_rows: int
