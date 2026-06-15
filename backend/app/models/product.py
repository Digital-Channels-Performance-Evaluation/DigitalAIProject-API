from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, Enum
from sqlalchemy.sql import func
from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    code = Column(String(100), nullable=False, unique=True)
    category = Column(
        Enum(
            "mobile_banking", "card_banking", "atm", "pos",
            "qr_payment", "digital_wallet", "future_product",
            name="product_category"
        ),
        nullable=False,
    )
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    launch_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
