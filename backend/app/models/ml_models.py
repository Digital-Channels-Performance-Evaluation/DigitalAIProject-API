from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Date, Enum, Index
from sqlalchemy.sql import func
from app.core.database import Base


class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    processed_features_id = Column(Integer, ForeignKey("processed_features.id"), nullable=True)
    period_date = Column(Date, nullable=False, index=True)

    performance_score = Column(Float, nullable=False)
    previous_score = Column(Float, nullable=True)
    score_change = Column(Float, nullable=True)
    performance_tier = Column(
        Enum("HIGH", "MEDIUM", "LOW", name="performance_tier"),
        nullable=False,
    )
    previous_tier = Column(String(20), nullable=True)
    tier_changed = Column(Boolean, default=False)

    model_version = Column(String(50), nullable=True)
    confidence = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Composite index: the two most frequent query patterns
    # 1. "latest score per product"  → (product_id, period_date DESC)
    # 2. "all scores in date range"  → (period_date, product_id)
    __table_args__ = (
        Index("ix_scores_product_period", "product_id", "period_date"),
        Index("ix_scores_period_product", "period_date", "product_id"),
    )


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    period_date = Column(Date, nullable=False)

    predicted_score = Column(Float, nullable=True)
    predicted_tier = Column(String(20), nullable=True)
    prediction_horizon_days = Column(Integer, default=30)
    confidence = Column(Float, nullable=True)
    model_version = Column(String(50), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_predictions_product_period", "product_id", "period_date"),
    )


class ModelRegistry(Base):
    __tablename__ = "model_registry"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(255), nullable=False)
    model_type = Column(String(100), nullable=False, index=True)
    version = Column(String(50), nullable=False)

    accuracy = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    r2_score = Column(Float, nullable=True)
    mae = Column(Float, nullable=True)
    mse = Column(Float, nullable=True)

    training_date = Column(DateTime(timezone=True), nullable=True)
    dataset_version = Column(String(100), nullable=True)
    training_samples = Column(Integer, nullable=True)
    feature_count = Column(Integer, nullable=True)
    hyperparameters = Column(Text, nullable=True)

    is_active = Column(Boolean, default=False, index=True)
    file_path = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Frequent pattern: WHERE model_type = ? AND is_active = TRUE
    __table_args__ = (
        Index("ix_modelregistry_type_active", "model_type", "is_active"),
    )


class SimilarProduct(Base):
    __tablename__ = "similar_products"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    similar_product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    similarity_score = Column(Float, nullable=False)
    cluster_id = Column(Integer, nullable=True)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())
    model_version = Column(String(50), nullable=True)
