from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
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
    limit: int = Query(25, le=200, ge=1),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List scores with pagination support.
    
    Default: 25 rows per page (optimized for browser memory)
    Max: 200 rows per page
    """
    query = db.query(Score)
    if product_id:
        query = query.filter(Score.product_id == product_id)
    return (
        query
        .order_by(Score.period_date.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )


@router.get("/dashboard/kpis", response_model=DashboardKPIs)
async def get_dashboard_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ── Single query: fetch all active products ───────────────────────────────
    products = db.query(Product).filter(Product.is_active == True).all()
    total_products = len(products)
    if not total_products:
        total_alerts = db.query(Alert).filter(Alert.is_resolved == False).count()
        critical_alerts = db.query(Alert).filter(
            Alert.is_resolved == False, Alert.severity == "critical"
        ).count()
        return DashboardKPIs(
            total_products=0, avg_performance_score=0.0,
            high_tier_count=0, medium_tier_count=0, low_tier_count=0,
            total_alerts=total_alerts, critical_alerts=critical_alerts,
        )

    product_ids = [p.id for p in products]

    # ── Single query: for each product get its latest score period ────────────
    # Subquery: max period_date per product
    latest_dates_sq = (
        db.query(Score.product_id, func.max(Score.period_date).label("max_date"))
        .filter(Score.product_id.in_(product_ids))
        .group_by(Score.product_id)
        .subquery()
    )
    # Join back to get the full Score rows
    latest_scores = (
        db.query(Score)
        .join(
            latest_dates_sq,
            (Score.product_id == latest_dates_sq.c.product_id)
            & (Score.period_date == latest_dates_sq.c.max_date),
        )
        .all()
    )

    score_values = [s.performance_score for s in latest_scores]
    tiers = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for s in latest_scores:
        tiers[s.performance_tier] = tiers.get(s.performance_tier, 0) + 1

    avg_score = round(sum(score_values) / len(score_values), 2) if score_values else 0.0

    # ── Single query: alert counts ────────────────────────────────────────────
    total_alerts = db.query(Alert).filter(Alert.is_resolved == False).count()
    critical_alerts = db.query(Alert).filter(
        Alert.is_resolved == False, Alert.severity == "critical"
    ).count()

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
    days: Optional[int] = Query(None, ge=1, le=3650),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import timedelta

    products = db.query(Product).filter(Product.is_active == True).all()
    product_map = {p.id: p.name for p in products}
    product_ids = list(product_map.keys())

    scores_q = db.query(Score).filter(Score.product_id.in_(product_ids))
    raw_q    = db.query(RawData).filter(RawData.product_id.in_(product_ids))

    # Only apply date filter when caller explicitly passes days
    if days is not None:
        cutoff   = date.today() - timedelta(days=days)
        scores_q = scores_q.filter(Score.period_date >= cutoff)
        raw_q    = raw_q.filter(RawData.period_date >= cutoff)

    all_scores = scores_q.order_by(Score.period_date).all()
    all_raw    = raw_q.order_by(RawData.period_date).all()

    performance_trend = [
        TrendPoint(
            date=str(s.period_date),
            value=s.performance_score,
            product_id=s.product_id,
            product_name=product_map.get(s.product_id, ""),
        )
        for s in all_scores
    ]

    revenue_trend, user_growth_trend, failure_rate_trend, complaint_trend = [], [], [], []
    for r in all_raw:
        pname = product_map.get(r.product_id, "")
        d = str(r.period_date)
        pid = r.product_id
        if r.total_revenue:
            revenue_trend.append(TrendPoint(date=d, value=r.total_revenue, product_id=pid, product_name=pname))
        if r.active_users:
            user_growth_trend.append(TrendPoint(date=d, value=r.active_users, product_id=pid, product_name=pname))
        if r.total_transactions and r.total_transactions > 0:
            # Use failed_txn_rate directly if available; otherwise compute from counts
            if r.failed_txn_rate is not None:
                failure_rate_trend.append(TrendPoint(
                    date=d, value=round(r.failed_txn_rate, 2),
                    product_id=pid, product_name=pname,
                ))
            elif r.failed_transactions is not None:
                failure_rate_trend.append(TrendPoint(
                    date=d,
                    value=round((r.failed_transactions / r.total_transactions) * 100, 2),
                    product_id=pid, product_name=pname,
                ))
        if r.total_complaints:
            complaint_trend.append(TrendPoint(date=d, value=r.total_complaints, product_id=pid, product_name=pname))

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
        raise HTTPException(status_code=404, detail="Score not found")
    return score
