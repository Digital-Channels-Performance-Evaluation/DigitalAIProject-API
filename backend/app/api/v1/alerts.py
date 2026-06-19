from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
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
    # ── Single query with JOIN to avoid N+1 product lookups ──────────────────
    query = (
        db.query(Alert, Product.name.label("product_name"))
        .outerjoin(Product, Alert.product_id == Product.id)
    )
    if product_id:
        query = query.filter(Alert.product_id == product_id)
    if severity:
        query = query.filter(Alert.severity == severity)
    if alert_type:
        query = query.filter(Alert.alert_type == alert_type)
    if is_resolved is not None:
        query = query.filter(Alert.is_resolved == is_resolved)

    rows = query.order_by(Alert.created_at.desc()).limit(limit).all()

    return [
        {
            "id": a.id,
            "product_id": a.product_id,
            "product_name": product_name or "N/A",
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
        }
        for a, product_name in rows
    ]


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
    # ── Single query with conditional aggregation ─────────────────────────────
    from sqlalchemy import func, case
    rows = (
        db.query(
            func.count(Alert.id).label("total"),
            func.sum(case((Alert.severity == "critical", 1), else_=0)).label("critical"),
            func.sum(case((Alert.severity == "high",     1), else_=0)).label("high"),
            func.sum(case((Alert.severity == "medium",   1), else_=0)).label("medium"),
            func.sum(case((Alert.severity == "low",      1), else_=0)).label("low"),
            func.sum(case((Alert.alert_type == "score_drop",           1), else_=0)).label("score_drop"),
            func.sum(case((Alert.alert_type == "downtime_spike",        1), else_=0)).label("downtime_spike"),
            func.sum(case((Alert.alert_type == "failure_rate_increase", 1), else_=0)).label("failure_rate_increase"),
            func.sum(case((Alert.alert_type == "complaint_surge",       1), else_=0)).label("complaint_surge"),
        )
        .filter(Alert.is_resolved == False)
        .one()
    )
    return {
        "total_unresolved": rows.total or 0,
        "by_severity": {
            "critical": rows.critical or 0,
            "high":     rows.high     or 0,
            "medium":   rows.medium   or 0,
            "low":      rows.low      or 0,
        },
        "by_type": {
            "score_drop":           rows.score_drop           or 0,
            "downtime_spike":       rows.downtime_spike       or 0,
            "failure_rate_increase": rows.failure_rate_increase or 0,
            "complaint_surge":      rows.complaint_surge      or 0,
        },
    }
