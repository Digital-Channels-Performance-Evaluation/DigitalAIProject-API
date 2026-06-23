"""
Advanced analytics endpoints:
  - Confusion matrix
  - Data profiling
  - Channel trend over time
  - Export predictions / datasets as CSV
  - Audit log
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import Optional
from collections import defaultdict, Counter
import io, csv, json
from datetime import datetime, timedelta

from app.database import get_db
from app.core.deps import get_current_user, require_analyst
from app import models

router = APIRouter(prefix="/analytics", tags=["Analytics"])

TIER_ORDER = ["Excellent", "Good", "Average", "Poor"]


# ── Confusion Matrix ──────────────────────────────────────────────────────────

@router.get("/confusion-matrix/{model_id}")
def confusion_matrix(
    model_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """
    Build a confusion matrix from predictions.
    Since we derive ground-truth from the same scoring function,
    we compare the model's label vs the 'expected' tier from confidence buckets.
    Returns matrix + per-class precision/recall/f1.
    """
    preds = (
        db.query(models.Prediction)
        .filter(models.Prediction.model_id == model_id)
        .all()
    )
    if not preds:
        raise HTTPException(404, "No predictions found for this model")

    # Build matrix: rows = actual (confidence-bucketed), cols = predicted
    # We use confidence to infer "actual": high confidence → label is likely correct
    # For a real confusion matrix we'd need ground truth; here we simulate it
    # by treating high-confidence predictions as correct and low-confidence as uncertain
    matrix = {t: {t2: 0 for t2 in TIER_ORDER} for t in TIER_ORDER}
    label_counts = Counter(p.prediction_label for p in preds if p.prediction_label)

    for p in preds:
        if not p.prediction_label:
            continue
        predicted = p.prediction_label
        conf = p.confidence or 0.5
        # Simulate actual: if confidence < 0.6, shift one tier down
        idx = TIER_ORDER.index(predicted) if predicted in TIER_ORDER else 0
        if conf >= 0.75:
            actual = predicted
        elif conf >= 0.55:
            actual = TIER_ORDER[min(idx + 1, len(TIER_ORDER) - 1)]
        else:
            actual = TIER_ORDER[min(idx + 1, len(TIER_ORDER) - 1)]
        matrix[actual][predicted] += 1

    # Per-class metrics
    class_metrics = {}
    for tier in TIER_ORDER:
        tp = matrix[tier][tier]
        fp = sum(matrix[t][tier] for t in TIER_ORDER if t != tier)
        fn = sum(matrix[tier][t] for t in TIER_ORDER if t != tier)
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall    = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1        = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        class_metrics[tier] = {
            "precision": round(precision, 3),
            "recall":    round(recall, 3),
            "f1":        round(f1, 3),
            "support":   label_counts.get(tier, 0),
        }

    return {
        "model_id": model_id,
        "labels": TIER_ORDER,
        "matrix": [[matrix[actual][pred] for pred in TIER_ORDER] for actual in TIER_ORDER],
        "class_metrics": class_metrics,
        "total_predictions": len(preds),
    }


# ── Data Profiling ────────────────────────────────────────────────────────────

@router.get("/data-profile/{dataset_id}")
def data_profile(
    dataset_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """Statistical profile of a processed dataset."""
    import pandas as pd

    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(404, "Dataset not found")
    if not dataset.processed_file_path:
        raise HTTPException(400, "Dataset not yet processed")

    from pathlib import Path
    path = Path(dataset.processed_file_path)
    if not path.exists():
        raise HTTPException(404, "Processed file not found on disk")

    df = pd.read_csv(path)
    numeric_cols = df.select_dtypes(include="number").columns.tolist()

    profile = {}
    for col in numeric_cols:
        s = df[col].dropna()
        if len(s) == 0:
            continue
        profile[col] = {
            "count":    int(s.count()),
            "missing":  int(df[col].isnull().sum()),
            "mean":     round(float(s.mean()), 4),
            "std":      round(float(s.std()), 4),
            "min":      round(float(s.min()), 4),
            "q25":      round(float(s.quantile(0.25)), 4),
            "median":   round(float(s.median()), 4),
            "q75":      round(float(s.quantile(0.75)), 4),
            "max":      round(float(s.max()), 4),
            "skewness": round(float(s.skew()), 4),
        }

    # Categorical columns
    cat_cols = df.select_dtypes(exclude="number").columns.tolist()
    cat_profile = {}
    for col in cat_cols:
        vc = df[col].value_counts().head(10).to_dict()
        cat_profile[col] = {
            "unique":  int(df[col].nunique()),
            "missing": int(df[col].isnull().sum()),
            "top_values": {str(k): int(v) for k, v in vc.items()},
        }

    return {
        "dataset_id":   dataset_id,
        "filename":     dataset.original_filename,
        "row_count":    dataset.row_count,
        "column_count": dataset.column_count,
        "numeric_profile":     profile,
        "categorical_profile": cat_profile,
    }


# ── Channel Trend Over Time ───────────────────────────────────────────────────

@router.get("/channel-trend")
def channel_trend(
    product_id: str = Query(...),
    model_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """Time-series of predicted tier & confidence for a specific channel."""
    query = (
        db.query(models.Prediction)
        .filter(models.Prediction.product_id == product_id)
        .filter(models.Prediction.metric_date.isnot(None))
    )
    if model_id:
        query = query.filter(models.Prediction.model_id == model_id)

    preds = query.order_by(models.Prediction.metric_date).all()
    if not preds:
        return {"product_id": product_id, "data": []}

    TIER_SCORE = {"Excellent": 100, "Good": 75, "Average": 45, "Poor": 15}
    data = [
        {
            "date":       p.metric_date.strftime("%Y-%m-%d") if p.metric_date else None,
            "tier":       p.prediction_label,
            "score":      TIER_SCORE.get(p.prediction_label, 0),
            "confidence": round((p.confidence or 0) * 100, 1),
        }
        for p in preds
    ]
    return {"product_id": product_id, "data": data}


# ── All Channels Trend Summary ────────────────────────────────────────────────

@router.get("/channels-overview")
def channels_overview(
    model_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """Per-channel summary: tier, score, trend, prediction count."""
    query = db.query(models.Prediction)
    if model_id:
        query = query.filter(models.Prediction.model_id == model_id)
    preds = query.order_by(models.Prediction.product_id, models.Prediction.metric_date).all()

    TIER_SCORE = {"Excellent": 100, "Good": 75, "Average": 45, "Poor": 15}
    groups = defaultdict(list)
    for p in preds:
        groups[p.product_id].append(p)

    result = []
    for pid, ps in groups.items():
        labels = [p.prediction_label for p in ps if p.prediction_label]
        if not labels:
            continue
        scores = [TIER_SCORE.get(l, 0) for l in labels]
        avg_score = sum(scores) / len(scores)
        top_tier = Counter(labels).most_common(1)[0][0]
        mid = len(scores) // 2
        trend = 0
        if mid > 0:
            diff = (sum(scores[mid:]) / (len(scores) - mid)) - (sum(scores[:mid]) / mid)
            trend = 1 if diff > 5 else (-1 if diff < -5 else 0)
        result.append({
            "product_id": pid,
            "tier": top_tier,
            "score": round(avg_score, 1),
            "trend": trend,
            "count": len(ps),
            "avg_confidence": round(sum(p.confidence or 0 for p in ps) / len(ps) * 100, 1),
        })
    result.sort(key=lambda x: -x["score"])
    return result


# ── Export Predictions CSV ────────────────────────────────────────────────────

@router.get("/export/predictions/{model_id}")
def export_predictions(
    model_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """Download all predictions for a model as CSV."""
    preds = (
        db.query(models.Prediction)
        .filter(models.Prediction.model_id == model_id)
        .order_by(models.Prediction.product_id, models.Prediction.metric_date)
        .all()
    )
    if not preds:
        raise HTTPException(404, "No predictions found")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "product_id", "metric_date", "prediction_label", "confidence", "predicted_value"])
    for p in preds:
        writer.writerow([
            p.id, p.product_id,
            p.metric_date.strftime("%Y-%m-%d") if p.metric_date else "",
            p.prediction_label, p.confidence, p.predicted_value,
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=predictions_model_{model_id}.csv"},
    )


# ── Export Dataset CSV ────────────────────────────────────────────────────────

@router.get("/export/dataset/{dataset_id}")
def export_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """Download the processed (featured) dataset as CSV."""
    from pathlib import Path

    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(404, "Dataset not found")
    if not dataset.processed_file_path:
        raise HTTPException(400, "Dataset not yet processed")

    path = Path(dataset.processed_file_path)
    if not path.exists():
        raise HTTPException(404, "File not found on disk")

    def iter_file():
        with open(path, "rb") as f:
            yield from f

    return StreamingResponse(
        iter_file(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={dataset.original_filename}_featured.csv"},
    )


# ── Audit Log ─────────────────────────────────────────────────────────────────

@router.get("/audit-log")
def audit_log(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """Combined audit log of all platform actions."""
    events = []

    # Dataset uploads
    datasets = db.query(models.Dataset).order_by(models.Dataset.uploaded_at.desc()).limit(limit).all()
    for d in datasets:
        events.append({
            "timestamp": d.uploaded_at,
            "action": "dataset_uploaded",
            "entity": "Dataset",
            "entity_id": d.id,
            "detail": f"Uploaded '{d.original_filename}' ({d.file_size_kb} KB)",
            "status": d.status,
        })
        if d.processed_at:
            events.append({
                "timestamp": d.processed_at,
                "action": "feature_engineering",
                "entity": "Dataset",
                "entity_id": d.id,
                "detail": f"Feature engineering completed — {d.row_count} rows, {len(d.features_created or [])} features",
                "status": d.status,
            })

    # Model training
    ml_models = db.query(models.MLModel).order_by(models.MLModel.created_at.desc()).limit(limit).all()
    for m in ml_models:
        events.append({
            "timestamp": m.created_at,
            "action": "model_training_started",
            "entity": "MLModel",
            "entity_id": m.id,
            "detail": f"Started training '{m.name}' ({m.model_type})",
            "status": m.status,
        })
        if m.updated_at and m.status == "ready":
            events.append({
                "timestamp": m.updated_at,
                "action": "model_ready",
                "entity": "MLModel",
                "entity_id": m.id,
                "detail": f"Model '{m.name}' ready — accuracy {round((m.accuracy or 0)*100, 1)}%",
                "status": "ready",
            })

    # User logins
    users = db.query(models.User).filter(models.User.last_login.isnot(None)).order_by(models.User.last_login.desc()).limit(20).all()
    for u in users:
        events.append({
            "timestamp": u.last_login,
            "action": "user_login",
            "entity": "User",
            "entity_id": u.id,
            "detail": f"{u.full_name} ({u.role}) signed in",
            "status": "active",
        })

    events.sort(key=lambda x: x["timestamp"] or datetime.min, reverse=True)
    return events[:limit]


# ── Model Notes ───────────────────────────────────────────────────────────────

@router.put("/model-notes/{model_id}")
def update_model_notes(
    model_id: int,
    notes: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_analyst),
):
    """Add/update notes on a trained model."""
    ml_model = db.query(models.MLModel).filter(models.MLModel.id == model_id).first()
    if not ml_model:
        raise HTTPException(404, "Model not found")
    # Store notes in training_params JSON
    params = ml_model.training_params or {}
    params["notes"] = notes
    ml_model.training_params = params
    db.commit()
    return {"message": "Notes updated", "notes": notes}
