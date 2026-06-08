from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from collections import defaultdict, Counter
from datetime import datetime

from app.database import get_db
from app.core.deps import get_current_user
from app import models, schemas

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# Tier scores: High>=80, Medium>=50, Low<50
TIER_SCORE = {"High": 100, "Medium": 60, "Low": 20}
TIER_ORDER = {"High": 1, "Medium": 2, "Low": 3}


@router.get("/kpis", response_model=schemas.KPISummary)
def get_kpis(db: Session = Depends(get_db),
             _: models.User = Depends(get_current_user)):
    total_datasets  = db.query(models.Dataset).count()
    total_preds     = db.query(models.Prediction).count()
    models_trained  = db.query(models.MLModel).filter(
        models.MLModel.status == models.ModelStatus.ready).count()
    avg_acc = db.query(func.avg(models.MLModel.accuracy)).filter(
        models.MLModel.status == models.ModelStatus.ready).scalar()
    latest_upload   = db.query(func.max(models.Dataset.uploaded_at)).scalar()
    total_products  = db.query(
        func.count(func.distinct(models.Prediction.product_id))
    ).scalar() or 0

    return schemas.KPISummary(
        total_datasets=total_datasets,
        total_products=total_products,
        total_predictions=total_preds,
        models_trained=models_trained,
        avg_model_accuracy=round(avg_acc, 4) if avg_acc else None,
        latest_upload=latest_upload,
    )


@router.get("/channel-performance", response_model=List[schemas.ChannelPerformanceSummary])
def get_channel_performance(
    model_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    q = db.query(models.Prediction)
    if model_id:
        q = q.filter(models.Prediction.model_id == model_id)
    predictions = q.all()
    if not predictions:
        return []

    groups = defaultdict(list)
    for p in predictions:
        groups[p.product_id].append(p)

    summaries = []
    for product_id, preds in groups.items():
        labels = [p.prediction_label for p in preds if p.prediction_label]
        if not labels:
            continue
        most_common = Counter(labels).most_common(1)[0][0]
        avg_score   = sum(TIER_SCORE.get(l, 0) for l in labels) / len(labels)

        summaries.append(schemas.ChannelPerformanceSummary(
            product_id=product_id,
            avg_active_user_ratio=round(avg_score, 2),
            avg_failure_rate=round((100 - avg_score) * 0.1, 2),
            avg_uptime=round(90 + avg_score * 0.099, 2),
            avg_revenue_per_user=0.0,
            avg_operational_risk=round((100 - avg_score) * 0.5, 2),
            performance_tier=most_common,
        ))

    return summaries


@router.get("/prediction-distribution")
def get_prediction_distribution(
    model_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    q = db.query(
        models.Prediction.prediction_label,
        func.count(models.Prediction.id).label("count"),
    )
    if model_id:
        q = q.filter(models.Prediction.model_id == model_id)
    rows = q.group_by(models.Prediction.prediction_label).all()
    return [{"label": r.prediction_label, "count": r.count} for r in rows]


@router.get("/model-comparison")
def compare_models(db: Session = Depends(get_db),
                   _: models.User = Depends(get_current_user)):
    mls = (
        db.query(models.MLModel)
        .filter(models.MLModel.status == models.ModelStatus.ready)
        .order_by(models.MLModel.created_at.desc())
        .all()
    )
    return [
        {
            "id": m.id, "name": m.name, "model_type": m.model_type,
            "accuracy": m.accuracy, "f1_score": m.f1_score,
            "precision_score": m.precision_score, "recall_score": m.recall_score,
            "created_at": m.created_at,
        }
        for m in mls
    ]


@router.get("/recent-activity")
def recent_activity(limit: int = 10, db: Session = Depends(get_db),
                    _: models.User = Depends(get_current_user)):
    uploads = (db.query(models.Dataset)
               .order_by(models.Dataset.uploaded_at.desc()).limit(limit).all())
    trained = (db.query(models.MLModel)
               .order_by(models.MLModel.created_at.desc()).limit(limit).all())

    activity = []
    for u in uploads:
        activity.append({
            "type": "upload", "id": u.id, "label": u.original_filename,
            "status": u.status, "timestamp": u.uploaded_at,
        })
    for m in trained:
        activity.append({
            "type": "training", "id": m.id, "label": m.name,
            "status": m.status, "timestamp": m.created_at,
        })

    activity.sort(key=lambda x: x["timestamp"] or datetime.min, reverse=True)
    return activity[:limit]


@router.get("/channel-ranking")
def get_channel_ranking(
    model_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """Rank channels using actual performance_score (predicted_value) when available."""
    q = db.query(models.Prediction)
    if model_id:
        q = q.filter(models.Prediction.model_id == model_id)

    preds = (
        q.with_entities(
            models.Prediction.product_id,
            models.Prediction.prediction_label,
            models.Prediction.predicted_value,
            models.Prediction.confidence,
            models.Prediction.metric_date,
        )
        .order_by(models.Prediction.product_id, models.Prediction.metric_date)
        .all()
    )

    if not preds:
        return []

    groups: dict = defaultdict(list)
    for p in preds:
        groups[p.product_id].append(p)

    ranked = []
    for product_id, plist in groups.items():
        labels  = [p.prediction_label for p in plist if p.prediction_label]
        confs   = [p.confidence for p in plist if p.confidence is not None]
        # Use actual performance_score (predicted_value) when available and meaningful (>20)
        scores  = [p.predicted_value for p in plist
                   if p.predicted_value is not None and p.predicted_value > 20]
        if not labels:
            continue

        counter  = Counter(labels)

        # Compute composite score from actual performance scores, fall back to tier weights
        if scores:
            avg_score = sum(scores) / len(scores)
        else:
            avg_score = sum(TIER_SCORE.get(l, 0) for l in labels) / len(labels)

        # Derive the tier from the score using business rules: >=80 High, >=50 Medium, <50 Low
        if avg_score >= 80:
            top_tier = "High"
        elif avg_score >= 50:
            top_tier = "Medium"
        else:
            top_tier = "Low"

        # Trend: compare first-half vs second-half score
        mid = len(scores) // 2 if scores else len(labels) // 2
        trend = 0
        if mid > 0:
            if scores:
                first  = sum(scores[:mid]) / mid
                second = sum(scores[mid:]) / (len(scores) - mid)
            else:
                first  = sum(TIER_SCORE.get(l, 0) for l in labels[:mid]) / mid
                second = sum(TIER_SCORE.get(l, 0) for l in labels[mid:]) / (len(labels) - mid)
            diff   = second - first
            trend  = 1 if diff > 2 else (-1 if diff < -2 else 0)

        ranked.append({
            "product_id":        product_id,
            "performance_tier":  top_tier,
            "score":             round(avg_score, 1),
            "confidence":        round(sum(confs) / len(confs), 4) if confs else 0,
            "total_predictions": len(plist),
            "tier_breakdown":    {t: counter.get(t, 0) for t in ["High", "Medium", "Low"]},
            "trend":             trend,
        })

    ranked.sort(key=lambda x: (-x["score"], x["product_id"]))
    for i, item in enumerate(ranked):
        item["rank"] = i + 1

    return ranked
