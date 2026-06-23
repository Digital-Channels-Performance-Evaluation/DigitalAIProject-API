from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class ScoreResponse(BaseModel):
    id: int
    product_id: int
    period_date: date
    performance_score: float
    previous_score: Optional[float] = None
    score_change: Optional[float] = None
    performance_tier: str
    previous_tier: Optional[str] = None
    tier_changed: bool
    model_version: Optional[str] = None
    confidence: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RankingEntry(BaseModel):
    rank: int
    product_id: int
    product_name: str
    product_category: str
    performance_score: float
    performance_tier: str
    score_change: Optional[float] = None
    trend: str  # up, down, stable
    recommendation_count: int


class DashboardKPIs(BaseModel):
    total_products: int
    avg_performance_score: float
    high_tier_count: int
    medium_tier_count: int
    low_tier_count: int
    total_alerts: int
    critical_alerts: int


class TrendPoint(BaseModel):
    date: str
    value: float
    product_id: Optional[int] = None
    product_name: Optional[str] = None


class DashboardCharts(BaseModel):
    performance_trend: List[TrendPoint]
    revenue_trend: List[TrendPoint]
    user_growth_trend: List[TrendPoint]
    failure_rate_trend: List[TrendPoint]
    complaint_trend: List[TrendPoint]
