from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
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

    entries = []
    for p in products:
        latest = db.query(Score).filter(Score.product_id == p.id).order_by(Score.period_date.desc()).first()
        if not latest:
            continue

        rec_count = db.query(Recommendation).filter(
            Recommendation.product_id == p.id,
            Recommendation.is_acknowledged == False,
        ).count()

        # Determine trend
        if latest.score_change is None:
            trend = "stable"
        elif latest.score_change > 1:
            trend = "up"
        elif latest.score_change < -1:
            trend = "down"
        else:
            trend = "stable"

        entries.append({
            "product_id": p.id,
            "product_name": p.name,
            "product_category": p.category,
            "performance_score": latest.performance_score,
            "performance_tier": latest.performance_tier,
            "score_change": latest.score_change,
            "trend": trend,
            "recommendation_count": rec_count,
        })

    # Sort by score descending
    entries.sort(key=lambda x: x["performance_score"], reverse=True)

    # Assign rank
    for i, e in enumerate(entries):
        e["rank"] = i + 1

    return [RankingEntry(**e) for e in entries]
