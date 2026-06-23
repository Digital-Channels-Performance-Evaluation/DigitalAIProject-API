from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.recommendations import Recommendation
from app.models.product import Product

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get("")
@router.get("/")
async def list_recommendations(
    product_id: Optional[int] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    is_acknowledged: Optional[bool] = None,
    limit: int = Query(25, le=200, ge=1),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List recommendations with pagination support.
    
    Default: 25 rows per page (optimized for browser memory)
    Max: 200 rows per page
    """
    query = db.query(Recommendation)
    if product_id:
        query = query.filter(Recommendation.product_id == product_id)
    if priority:
        query = query.filter(Recommendation.priority == priority)
    if category:
        query = query.filter(Recommendation.category == category)
    if is_acknowledged is not None:
        query = query.filter(Recommendation.is_acknowledged == is_acknowledged)

    recs = (
        query
        .order_by(Recommendation.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    # Single join query to get product names — avoids N+1
    product_ids_in_recs = list({r.product_id for r in recs})
    products_map = {
        p.id: p.name
        for p in db.query(Product).filter(Product.id.in_(product_ids_in_recs)).all()
    }

    result = []
    for r in recs:
        result.append({
            "id": r.id,
            "product_id": r.product_id,
            "product_name": products_map.get(r.product_id, "N/A"),
            "category": r.category,
            "priority": r.priority,
            "title": r.title,
            "description": r.description,
            "trigger_metric": r.trigger_metric,
            "trigger_value": r.trigger_value,
            "ai_explanation": r.ai_explanation,
            "is_acknowledged": r.is_acknowledged,
            "period_date": str(r.period_date),
            "created_at": r.created_at,
        })
    return result


@router.post("/{rec_id}/acknowledge")
async def acknowledge_recommendation(
    rec_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rec = db.query(Recommendation).filter(Recommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    rec.is_acknowledged = True
    rec.acknowledged_by = current_user.id
    rec.acknowledged_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Recommendation acknowledged", "recommendation_id": rec_id}
