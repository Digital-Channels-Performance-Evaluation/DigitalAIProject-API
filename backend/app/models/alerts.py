from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Date, Enum
from sqlalchemy.sql import func
from app.core.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    
    alert_type = Column(
        Enum("score_drop", "downtime_spike", "failure_rate_increase", "complaint_surge", name="alert_type"),
        nullable=False,
    )
    severity = Column(
        Enum("critical", "high", "medium", "low", name="alert_severity"),
        nullable=False,
    )
    title = Column(String(500), nullable=False)
    message = Column(Text, nullable=False)
    
    metric_name = Column(String(100), nullable=True)
    metric_value = Column(Float, nullable=True)
    threshold_value = Column(Float, nullable=True)
    previous_value = Column(Float, nullable=True)
    
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    period_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
