from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.ml_models import Score
from app.models.product import Product
from app.schemas.scores import ScoreResponse, RankingEntry, DashboardKPIs, DashboardCharts, TrendPoint
from app.models.alerts import Alert
from app.models.data import RawData

router = APIRouter(prefix="/scores", tags=["Scores"])


@router.get("", response_model=List[ScoreResponse])
@router.get("/", response_model=List[ScoreResponse])
async def list_scores(
    product_id: Optional[int] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Score)
    if product_id:
        query = query.filter(Score.product_id == product_id)
    return query.order_by(Score.period_date.desc()).limit(limit).all()


@router.get("/dashboard/kpis", response_model=DashboardKPIs)
async def get_dashboard_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    products = db.query(Product).filter(Product.is_active == True).all()
    total_products = len(products)

    scores_latest = []
    tiers = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}

    for p in products:
        s = db.query(Score).filter(Score.product_id == p.id).order_by(Score.period_date.desc()).first()
        if s:
            scores_latest.append(s.performance_score)
            tiers[s.performance_tier] = tiers.get(s.performance_tier, 0) + 1

    avg_score = round(sum(scores_latest) / len(scores_latest), 2) if scores_latest else 0.0
    total_alerts = db.query(Alert).filter(Alert.is_resolved == False).count()
    critical_alerts = db.query(Alert).filter(Alert.is_resolved == False, Alert.severity == "critical").count()

    return DashboardKPIs(
        total_products=total_products,
        avg_performance_score=avg_score,
        high_tier_count=tiers["HIGH"],
        medium_tier_count=tiers["MEDIUM"],
        low_tier_count=tiers["LOW"],
        total_alerts=total_alerts,
        critical_alerts=critical_alerts,
    )


@router.get("/dashboard/charts", response_model=DashboardCharts)
async def get_dashboard_charts(
    days: int = Query(90, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import timedelta
    cutoff = date.today() - timedelta(days=days)

    products = db.query(Product).filter(Product.is_active == True).all()

    performance_trend = []
    revenue_trend = []
    user_growth_trend = []
    failure_rate_trend = []
    complaint_trend = []

    for p in products:
        scores = (
            db.query(Score)
            .filter(Score.product_id == p.id, Score.period_date >= cutoff)
            .order_by(Score.period_date)
            .all()
        )
        for s in scores:
            performance_trend.append(TrendPoint(
                date=str(s.period_date), value=s.performance_score,
                product_id=p.id, product_name=p.name,
            ))

        raw_records = (
            db.query(RawData)
            .filter(RawData.product_id == p.id, RawData.period_date >= cutoff)
            .order_by(RawData.period_date)
            .all()
        )
        for r in raw_records:
            if r.total_revenue:
                revenue_trend.append(TrendPoint(date=str(r.period_date), value=r.total_revenue, product_id=p.id, product_name=p.name))
            if r.active_users:
                user_growth_trend.append(TrendPoint(date=str(r.period_date), value=r.active_users, product_id=p.id, product_name=p.name))
            if r.total_transactions and r.failed_transactions is not None:
                failure_rate = (r.failed_transactions / r.total_transactions) * 100 if r.total_transactions > 0 else 0
                failure_rate_trend.append(TrendPoint(date=str(r.period_date), value=round(failure_rate, 2), product_id=p.id, product_name=p.name))
            if r.total_complaints:
                complaint_trend.append(TrendPoint(date=str(r.period_date), value=r.total_complaints, product_id=p.id, product_name=p.name))

    return DashboardCharts(
        performance_trend=performance_trend,
        revenue_trend=revenue_trend,
        user_growth_trend=user_growth_trend,
        failure_rate_trend=failure_rate_trend,
        complaint_trend=complaint_trend,
    )


@router.get("/{score_id}", response_model=ScoreResponse)
async def get_score(
    score_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    score = db.query(Score).filter(Score.id == score_id).first()
    if not score:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Score not found")
    return score
