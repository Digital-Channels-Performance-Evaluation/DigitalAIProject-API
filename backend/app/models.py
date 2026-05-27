from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean,
    Text, ForeignKey, JSON, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    analyst = "analyst"
    viewer = "viewer"


class UploadStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ModelStatus(str, enum.Enum):
    training = "training"
    ready = "ready"
    failed = "failed"


# ── User ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.viewer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size_kb = Column(Float)
    file_type = Column(String(10))
    status = Column(SAEnum(UploadStatus), default=UploadStatus.pending)
    row_count = Column(Integer)
    column_count = Column(Integer)
    processed_file_path = Column(String(512))
    validation_report = Column(JSON)
    features_created = Column(JSON)
    error_message = Column(Text)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))

    predictions = relationship("Prediction", back_populates="dataset")


class ChannelMetric(Base):
    __tablename__ = "channel_metrics"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    product_id = Column(String(100), nullable=False, index=True)
    metric_date = Column(DateTime, nullable=False, index=True)

    # Raw metrics
    total_users = Column(Float)
    active_users = Column(Float)
    transaction_count = Column(Float)
    transaction_value = Column(Float)
    revenue = Column(Float)
    failed_transactions = Column(Float)
    complaints = Column(Float)
    downtime_minutes = Column(Float)
    fraud_incidents = Column(Float)

    # Engineered features
    user_growth_rate = Column(Float)
    transaction_growth_rate = Column(Float)
    revenue_growth_rate = Column(Float)
    failure_rate = Column(Float)
    complaints_per_1000_users = Column(Float)
    uptime_percentage = Column(Float)
    active_user_ratio = Column(Float)
    retention_rate = Column(Float)
    revenue_per_user = Column(Float)
    transaction_value_per_user = Column(Float)
    transaction_volume_7d_avg = Column(Float)
    revenue_7d_avg = Column(Float)
    fraud_rate = Column(Float)
    operational_risk_score = Column(Float)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MLModel(Base):
    __tablename__ = "ml_models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    model_type = Column(String(50), nullable=False)  # xgboost, random_forest, etc.
    target = Column(String(100), nullable=False)      # what it predicts
    status = Column(SAEnum(ModelStatus), default=ModelStatus.training)
    model_path = Column(String(512))
    accuracy = Column(Float)
    precision_score = Column(Float)
    recall_score = Column(Float)
    f1_score = Column(Float)
    feature_importance = Column(JSON)
    training_params = Column(JSON)
    trained_on_dataset_id = Column(Integer, ForeignKey("datasets.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    predictions = relationship("Prediction", back_populates="model")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    model_id = Column(Integer, ForeignKey("ml_models.id"), nullable=False)
    product_id = Column(String(100), nullable=False, index=True)
    metric_date = Column(DateTime)
    predicted_value = Column(Float)
    actual_value = Column(Float)
    confidence = Column(Float)
    prediction_label = Column(String(50))  # e.g. "high", "medium", "low"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    dataset = relationship("Dataset", back_populates="predictions")
    model = relationship("MLModel", back_populates="predictions")
