from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    EXECUTIVE_MANAGEMENT = "executive_management"
    PRODUCT_MANAGER = "product_manager"
    DATA_ENGINEER = "data_engineer"
    ML_ENGINEER = "ml_engineer"
    RISK_TEAM = "risk_team"
    COMPLIANCE_TEAM = "compliance_team"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(
        Enum(
            "super_admin", "executive_management", "product_manager",
            "data_engineer", "ml_engineer", "risk_team", "compliance_team",
            name="user_role"
        ),
        nullable=False,
        default="product_manager",
    )
    is_active = Column(Boolean, default=True)
    is_mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(255), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
