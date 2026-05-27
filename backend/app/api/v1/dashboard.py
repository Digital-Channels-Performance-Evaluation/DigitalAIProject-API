from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from collections import defaultdict, Counter

from app.database import get_db
from app.core.deps import get_current_user
from app import models, schemas

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/kpis", response_model=schemas.KPISummary)
def get_kpis(db: Session = Depends(get_db),
             _: models.User = Depends(get_current_user)):
    """High-level KPI summary for the dashboard header."""
    total_datasets = db.query(models.Dataset).count()
    total_predictions = db.query(models.Prediction).count()
    models_trained = db.query(models.MLModel).filter(
        models.MLModel.status == models.ModelStatus.ready
    ).count()

    avg_acc = db.query(func.avg(models.MLModel.accuracy)).filter(
        models.MLModel.status == models.ModelStatus.ready
    ).scalar()

    latest_upload = db.query(func.max(models.Dataset.uploaded_at)).scalar()

    # Distinct products from predictions
    total_products = db.query(func.count(func.distinct(models.Prediction.product_id))).scalar() or 0

    return schemas.KPISummary(
        total_datasets=total_datasets,
        total_products=total_products,
        total_predictions=total_predictions,
        models_trained=models_trained,
        avg_model_accuracy=round(avg_acc, 4) if avg_acc else None,
        latest_upload=latest_upload,
    )


@router.get("/channel-performance", response_model=List[schemas.ChannelPerformanceSummary])
def get_channel_performance(model_id: int = None, db: Session = Depends(get_db),
                            _: models.User = Depends(get_current_user)):
    """
    Aggregate performance summary per product/channel.
    Derives metric averages from ChannelMetric table when available,
    falls back to prediction-based estimates otherwise.
    """
    query = db.query(models.Prediction)
    if model_id:
        query = query.filter(models.Prediction.model_id == model_id)

    predictions = query.all()
    if not predictions:
        return []

    # Group predictions by product_id
    groups = defaultdict(list)
    for p in predictions:
        groups[p.product_id].append(p)

    # Try to get real metric data from ChannelMetric table
    metric_query = db.query(models.ChannelMetric)
    if model_id:
        # Get dataset_ids used by this model's predictions
        dataset_ids = list({p.dataset_id for p in predictions})
        metric_query = metric_query.filter(models.ChannelMetric.dataset_id.in_(dataset_ids))
    channel_metrics = metric_query.all()

    # Group channel metrics by product_id
    metric_groups = defaultdict(list)
    for m in channel_metrics:
        metric_groups[m.product_id].append(m)

    summaries = []
    for product_id, preds in groups.items():
        labels = [p.prediction_label for p in preds if p.prediction_label]
        if not labels:
            continue

        most_common_tier = Counter(labels).most_common(1)[0][0]

        # Use real metrics if available, otherwise derive from prediction confidence
        cms = metric_groups.get(product_id, [])
        if cms:
            def _avg(attr):
                vals = [getattr(m, attr) for m in cms if getattr(m, attr) is not None]
                return round(sum(vals) / len(vals), 2) if vals else 0.0

            avg_active_user_ratio = _avg("active_user_ratio")
            avg_failure_rate      = _avg("failure_rate")
            avg_uptime            = _avg("uptime_percentage")
            avg_revenue_per_user  = _avg("revenue_per_user")
            avg_operational_risk  = _avg("operational_risk_score")
        else:
            # Estimate from tier distribution when no raw metrics exist
            tier_scores = {"Excellent": 1.0, "Good": 0.75, "Average": 0.5, "Poor": 0.25}
            avg_score = sum(tier_scores.get(l, 0.5) for l in labels) / len(labels)
            avg_active_user_ratio = round(avg_score * 100, 2)
            avg_failure_rate      = round((1 - avg_score) * 10, 2)
            avg_uptime            = round(90 + avg_score * 9.9, 2)
            avg_revenue_per_user  = 0.0
            avg_operational_risk  = round((1 - avg_score) * 50, 2)

        summaries.append(
            schemas.ChannelPerformanceSummary(
                product_id=product_id,
                avg_active_user_ratio=avg_active_user_ratio,
                avg_failure_rate=avg_failure_rate,
                avg_uptime=avg_uptime,
                avg_revenue_per_user=avg_revenue_per_user,
                avg_operational_risk=avg_operational_risk,
                performance_tier=most_common_tier,
            )
        )

    return summaries


@router.get("/prediction-distribution")
def get_prediction_distribution(model_id: int = None, db: Session = Depends(get_db),
                                _: models.User = Depends(get_current_user)):
    """Count of predictions per tier label."""
    query = db.query(
        models.Prediction.prediction_label,
        func.count(models.Prediction.id).label("count"),
    )
    if model_id:
        query = query.filter(models.Prediction.model_id == model_id)

    rows = query.group_by(models.Prediction.prediction_label).all()
    return [{"label": r.prediction_label, "count": r.count} for r in rows]


@router.get("/model-comparison")
def compare_models(db: Session = Depends(get_db),
                   _: models.User = Depends(get_current_user)):
    """Return accuracy metrics for all ready models side by side."""
    ml_models = (
        db.query(models.MLModel)
        .filter(models.MLModel.status == models.ModelStatus.ready)
        .order_by(models.MLModel.created_at.desc())
        .all()
    )
    return [
        {
            "id": m.id,
            "name": m.name,
            "model_type": m.model_type,
            "accuracy": m.accuracy,
            "f1_score": m.f1_score,
            "precision_score": m.precision_score,
            "recall_score": m.recall_score,
            "created_at": m.created_at,
        }
        for m in ml_models
    ]


@router.get("/recent-activity")
def recent_activity(limit: int = 10, db: Session = Depends(get_db),
                    _: models.User = Depends(get_current_user)):
    """Latest uploads and model training events."""
    uploads = (
        db.query(models.Dataset)
        .order_by(models.Dataset.uploaded_at.desc())
        .limit(limit)
        .all()
    )
    trained = (
        db.query(models.MLModel)
        .order_by(models.MLModel.created_at.desc())
        .limit(limit)
        .all()
    )

    activity = []
    for u in uploads:
        activity.append({
            "type": "upload",
            "id": u.id,
            "label": u.original_filename,
            "status": u.status,
            "timestamp": u.uploaded_at,
        })
    for m in trained:
        activity.append({
            "type": "training",
            "id": m.id,
            "label": m.name,
            "status": m.status,
            "timestamp": m.created_at,
        })

    activity.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    return activity[:limit]


# ── Tier scoring weights ──────────────────────────────────────────────────────
TIER_SCORE = {"Excellent": 100, "Good": 75, "Average": 45, "Poor": 15}
TIER_ORDER = {"Excellent": 1, "Good": 2, "Average": 3, "Poor": 4}


@router.get("/channel-ranking")
def get_channel_ranking(
    model_id: Optional[int] = Query(None, description="Filter by model ID"),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """
    Rank all channels by their ML-predicted performance.

    Returns per-channel:
      - rank (1 = best)
      - performance_tier (most common predicted label)
      - score (0-100 composite)
      - confidence (avg prediction confidence)
      - total_predictions
      - tier_breakdown  {Excellent, Good, Average, Poor counts}
      - trend           (+1 improving, 0 stable, -1 declining)
    """
    query = db.query(models.Prediction)
    if model_id:
        query = query.filter(models.Prediction.model_id == model_id)

    predictions = query.order_by(models.Prediction.product_id, models.Prediction.metric_date).all()
    if not predictions:
        return []

    # Group by product
    groups: dict = defaultdict(list)
    for p in predictions:
        groups[p.product_id].append(p)

    ranked = []
    for product_id, preds in groups.items():
        labels   = [p.prediction_label for p in preds if p.prediction_label]
        confs    = [p.confidence        for p in preds if p.confidence is not None]
        if not labels:
            continue

        counter  = Counter(labels)
        top_tier = counter.most_common(1)[0][0]

        # Composite score: weighted average of tier scores
        score = sum(TIER_SCORE.get(l, 0) for l in labels) / len(labels)

        # Trend: compare first-half vs second-half average score
        mid = len(labels) // 2
        if mid > 0:
            first_half  = sum(TIER_SCORE.get(l, 0) for l in labels[:mid])  / mid
            second_half = sum(TIER_SCORE.get(l, 0) for l in labels[mid:])  / (len(labels) - mid)
            diff = second_half - first_half
            trend = 1 if diff > 5 else (-1 if diff < -5 else 0)
        else:
            trend = 0

        ranked.append({
            "product_id":        product_id,
            "performance_tier":  top_tier,
            "score":             round(score, 1),
            "confidence":        round(sum(confs) / len(confs), 4) if confs else 0,
            "total_predictions": len(preds),
            "tier_breakdown": {
                "Excellent": counter.get("Excellent", 0),
                "Good":      counter.get("Good",      0),
                "Average":   counter.get("Average",   0),
                "Poor":      counter.get("Poor",      0),
            },
            "trend": trend,   # +1 improving | 0 stable | -1 declining
        })

    # Sort: higher score first, then alphabetically
    ranked.sort(key=lambda x: (-x["score"], x["product_id"]))

    # Assign rank
    for i, item in enumerate(ranked):
        item["rank"] = i + 1

    return ranked
