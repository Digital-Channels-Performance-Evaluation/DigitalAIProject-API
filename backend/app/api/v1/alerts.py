from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.alerts import Alert
from app.models.product import Product

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("")
@router.get("/")
async def list_alerts(
    product_id: Optional[int] = None,
    severity: Optional[str] = None,
    alert_type: Optional[str] = None,
    is_resolved: Optional[bool] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Alert)
    if product_id:
        query = query.filter(Alert.product_id == product_id)
    if severity:
        query = query.filter(Alert.severity == severity)
    if alert_type:
        query = query.filter(Alert.alert_type == alert_type)
    if is_resolved is not None:
        query = query.filter(Alert.is_resolved == is_resolved)

    alerts = query.order_by(Alert.created_at.desc()).limit(limit).all()

    result = []
    for a in alerts:
        product = db.query(Product).filter(Product.id == a.product_id).first()
        result.append({
            "id": a.id,
            "product_id": a.product_id,
            "product_name": product.name if product else "N/A",
            "alert_type": a.alert_type,
            "severity": a.severity,
            "title": a.title,
            "message": a.message,
            "metric_name": a.metric_name,
            "metric_value": a.metric_value,
            "threshold_value": a.threshold_value,
            "is_resolved": a.is_resolved,
            "period_date": str(a.period_date),
            "created_at": a.created_at,
        })
    return result


@router.post("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_resolved = True
    alert.resolved_by = current_user.id
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolution_notes = notes
    db.commit()

    return {"message": "Alert resolved", "alert_id": alert_id}


@router.get("/summary")
async def get_alerts_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total = db.query(Alert).filter(Alert.is_resolved == False).count()
    critical = db.query(Alert).filter(Alert.is_resolved == False, Alert.severity == "critical").count()
    high = db.query(Alert).filter(Alert.is_resolved == False, Alert.severity == "high").count()
    medium = db.query(Alert).filter(Alert.is_resolved == False, Alert.severity == "medium").count()
    low = db.query(Alert).filter(Alert.is_resolved == False, Alert.severity == "low").count()

    by_type = {}
    for t in ["score_drop", "downtime_spike", "failure_rate_increase", "complaint_surge"]:
        by_type[t] = db.query(Alert).filter(Alert.is_resolved == False, Alert.alert_type == t).count()

    return {
        "total_unresolved": total,
        "by_severity": {"critical": critical, "high": high, "medium": medium, "low": low},
        "by_type": by_type,
    }
