from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Date, Enum, LargeBinary
from sqlalchemy.sql import func
from app.core.database import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    report_type = Column(
        Enum("weekly", "monthly", name="report_type"),
        nullable=False,
    )
    format = Column(
        Enum("pdf", "excel", "csv", name="report_format"),
        nullable=False,
    )
    title = Column(String(500), nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    
    file_path = Column(String(500), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    
    is_ready = Column(Boolean, default=False)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    generated_at = Column(DateTime(timezone=True), nullable=True)
