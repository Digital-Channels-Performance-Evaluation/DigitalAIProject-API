from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Date, Enum, Index
from sqlalchemy.sql import func
from app.core.database import Base


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    score_id = Column(Integer, ForeignKey("scores.id"), nullable=True)
    period_date = Column(Date, nullable=False)

    category = Column(String(100), nullable=False)
    priority = Column(
        Enum("critical", "high", "medium", "low", name="recommendation_priority"),
        nullable=False,
        default="medium",
    )
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    trigger_metric = Column(String(100), nullable=True)
    trigger_value = Column(Float, nullable=True)
    threshold_value = Column(Float, nullable=True)
    ai_explanation = Column(Text, nullable=True)

    is_acknowledged = Column(Boolean, default=False, index=True)
    acknowledged_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Frequent query: unacknowledged recs per product (used in rankings N+1 fix)
    __table_args__ = (
        Index("ix_recs_product_ack", "product_id", "is_acknowledged"),
        Index("ix_recs_period", "product_id", "period_date"),
    )
