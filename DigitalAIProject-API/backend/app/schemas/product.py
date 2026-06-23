from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProductCreate(BaseModel):
    name: str
    code: str
    category: str
    description: Optional[str] = None
    launch_date: Optional[datetime] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    launch_date: Optional[datetime] = None


class ProductResponse(BaseModel):
    id: int
    name: str
    code: str
    category: str
    description: Optional[str] = None
    is_active: bool
    launch_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProductWithScore(ProductResponse):
    current_score: Optional[float] = None
    current_tier: Optional[str] = None
    score_change: Optional[float] = None
    rank: Optional[int] = None
