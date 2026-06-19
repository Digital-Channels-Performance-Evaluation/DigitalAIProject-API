from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.ml_models import Score
from app.models.product import Product
from app.models.recommendations import Recommendation
from app.schemas.scores import RankingEntry

router = APIRouter(prefix="/rankings", tags=["Rankings"])


@router.get("", response_model=List[RankingEntry])
@router.get("/", response_model=List[RankingEntry])
async def get_rankings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    products = db.query(Product).filter(Product.is_active == True).all()
    if not products:
        return []

    product_ids = [p.id for p in products]
    product_map = {p.id: p for p in products}

    # ── Single query: latest score per product (subquery approach) ────────────
    latest_dates_sq = (
        db.query(Score.product_id, func.max(Score.period_date).label("max_date"))
        .filter(Score.product_id.in_(product_ids))
        .group_by(Score.product_id)
        .subquery()
    )
    latest_scores = (
        db.query(Score)
        .join(
            latest_dates_sq,
            (Score.product_id == latest_dates_sq.c.product_id)
            & (Score.period_date == latest_dates_sq.c.max_date),
        )
        .all()
    )
    score_map = {s.product_id: s for s in latest_scores}

    # ── Single query: unacknowledged recommendation count per product ─────────
    rec_counts = (
        db.query(Recommendation.product_id, func.count(Recommendation.id).label("cnt"))
        .filter(
            Recommendation.product_id.in_(product_ids),
            Recommendation.is_acknowledged == False,
        )
        .group_by(Recommendation.product_id)
        .all()
    )
    rec_map = {row.product_id: row.cnt for row in rec_counts}

    # ── Build entries ─────────────────────────────────────────────────────────
    entries = []
    for pid in product_ids:
        s = score_map.get(pid)
        if not s:
            continue
        p = product_map[pid]
        sc = s.score_change
        trend = "stable" if sc is None or abs(sc) <= 1 else ("up" if sc > 1 else "down")
        entries.append({
            "product_id": p.id,
            "product_name": p.name,
            "product_category": p.category,
            "performance_score": s.performance_score,
            "performance_tier": s.performance_tier,
            "score_change": sc,
            "trend": trend,
            "recommendation_count": rec_map.get(pid, 0),
        })

    entries.sort(key=lambda x: x["performance_score"], reverse=True)
    for i, e in enumerate(entries):
        e["rank"] = i + 1

    return [RankingEntry(**e) for e in entries]
