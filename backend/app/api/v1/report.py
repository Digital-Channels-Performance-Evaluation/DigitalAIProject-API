"""
Smart Report generator — produces a structured, data-driven performance
report for all digital channels based on ML predictions.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from collections import defaultdict, Counter
from datetime import datetime
import io

from app.database import get_db
from app.core.deps import get_current_user
from app import models

router = APIRouter(prefix="/report", tags=["Smart Report"])

TIER_SCORE  = {"High": 100, "Medium": 60, "Low": 20,
               "Excellent": 100, "Good": 75, "Average": 45, "Poor": 15}
TIER_ORDER  = {"High": 1, "Medium": 2, "Low": 3,
               "Excellent": 1, "Good": 2, "Average": 3, "Poor": 4}
TIER_EMOJI  = {"High": "🟢", "Medium": "🟡", "Low": "🔴",
               "Excellent": "🟢", "Good": "🔵", "Average": "🟡", "Poor": "🔴"}
TIERS       = ["High", "Medium", "Low"]


def _build_report_data(model_id: Optional[int], db: Session) -> dict:
    """Aggregate all data needed for the report."""
    # ── Model info ────────────────────────────────────────────────────────────
    if model_id:
        ml_model = db.query(models.MLModel).filter(models.MLModel.id == model_id).first()
    else:
        ml_model = (
            db.query(models.MLModel)
            .filter(models.MLModel.status == models.ModelStatus.ready)
            .order_by(models.MLModel.created_at.desc())
            .first()
        )
    if not ml_model:
        raise HTTPException(400, "No trained model available. Train a model first.")

    # ── Predictions ───────────────────────────────────────────────────────────
    preds = (
        db.query(models.Prediction)
        .filter(models.Prediction.model_id == ml_model.id)
        .order_by(models.Prediction.product_id, models.Prediction.metric_date)
        .all()
    )
    if not preds:
        raise HTTPException(400, "No predictions found. Run predictions first.")

    # ── Per-channel aggregation ───────────────────────────────────────────────
    groups = defaultdict(list)
    for p in preds:
        groups[p.product_id].append(p)

    channels = []
    for pid, ps in groups.items():
        labels = [p.prediction_label for p in ps if p.prediction_label]
        if not labels:
            continue
        counter  = Counter(labels)
        confs    = [p.confidence for p in ps if p.confidence]
        avg_conf = sum(confs) / len(confs) if confs else 0

        # Use actual performance_score (predicted_value) when available
        actual_scores = [p.predicted_value for p in ps
                         if p.predicted_value is not None and p.predicted_value > 20]
        if actual_scores:
            scores    = actual_scores
            avg_score = sum(scores) / len(scores)
        else:
            scores    = [TIER_SCORE.get(l, 0) for l in labels]
            avg_score = sum(scores) / len(scores)

        # Derive tier from score using business rules: >=80 High, >=50 Medium, <50 Low
        if avg_score >= 80:
            top_tier = "High"
        elif avg_score >= 50:
            top_tier = "Medium"
        else:
            top_tier = "Low"

        mid = len(scores) // 2
        trend = 0
        if mid > 0:
            diff = (sum(scores[mid:]) / (len(scores) - mid)) - (sum(scores[:mid]) / mid)
            trend = 1 if diff > 2 else (-1 if diff < -2 else 0)

        channels.append({
            "product_id":   pid,
            "tier":         top_tier,
            "score":        round(avg_score, 1),
            "confidence":   round(avg_conf * 100, 1),
            "trend":        trend,
            "count":        len(ps),
            "breakdown":    dict(counter),
            "date_from":    min((p.metric_date for p in ps if p.metric_date), default=None),
            "date_to":      max((p.metric_date for p in ps if p.metric_date), default=None),
        })

    channels.sort(key=lambda x: -x["score"])
    for i, c in enumerate(channels):
        c["rank"] = i + 1

    # ── Summary stats ─────────────────────────────────────────────────────────
    tier_dist = Counter(c["tier"] for c in channels)
    total     = len(channels)
    avg_score = sum(c["score"] for c in channels) / total if total else 0

    improving = [c for c in channels if c["trend"] == 1]
    declining = [c for c in channels if c["trend"] == -1]

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "model": {
            "id":         ml_model.id,
            "name":       ml_model.name,
            "type":       ml_model.model_type,
            "accuracy":   ml_model.accuracy,
            "f1_score":   ml_model.f1_score,
        },
        "summary": {
            "total_channels":    total,
            "total_predictions": len(preds),
            "avg_score":         round(avg_score, 1),
            "tier_distribution": dict(tier_dist),
            # Production tiers
            "high_count":        tier_dist.get("High",    0),
            "medium_count":      tier_dist.get("Medium",  0),
            "low_count":         tier_dist.get("Low",     0),
            # Legacy compat keys (frontend uses these)
            "excellent_count":   tier_dist.get("High",    0),
            "good_count":        tier_dist.get("Medium",  0),
            "average_count":     tier_dist.get("Medium",  0),
            "poor_count":        tier_dist.get("Low",     0),
            "improving_count":   len(improving),
            "declining_count":   len(declining),
        },
        "top_performers":    channels[:3],
        "bottom_performers": channels[-3:][::-1],
        "improving":         improving[:5],
        "declining":         declining[:5],
        "channels":          channels,
    }


def _narrative(data: dict) -> str:
    """Generate a plain-English narrative from the report data."""
    s   = data["summary"]
    m   = data["model"]
    top = data["top_performers"]
    bot = data["bottom_performers"]
    imp = data["improving"]
    dec = data["declining"]

    total    = s["total_channels"]
    avg      = s["avg_score"]
    high_pct = round(s["high_count"]   / total * 100) if total else 0
    low_pct  = round(s["low_count"]    / total * 100) if total else 0

    health = "strong" if avg >= 75 else ("moderate" if avg >= 50 else "concerning")

    lines = [
        f"## Executive Summary",
        f"",
        f"This report covers **{total} digital channels** evaluated using the "
        f"**{m['name']}** model (accuracy: {round((m['accuracy'] or 0)*100, 1)}%). "
        f"The overall portfolio health is **{health}** with an average performance score of **{avg}/100**.",
        f"",
        f"- **{s['high_count']} channels ({high_pct}%)** are performing at High tier (score ≥ 80)",
        f"- **{s['medium_count']} channels** are at Medium tier (score 50–79)",
        f"- **{s['low_count']} channels ({low_pct}%)** are at Low tier (score < 50) and require immediate action",
        f"",
    ]

    if top:
        lines += [f"## 🏆 Top Performing Channels", f""]
        for c in top:
            trend_txt = "↑ improving" if c["trend"] == 1 else ("↓ declining" if c["trend"] == -1 else "→ stable")
            lines.append(
                f"**{c['rank']}. {c['product_id']}** — Score: {c['score']}/100 | "
                f"Tier: {TIER_EMOJI.get(c['tier'], '')} {c['tier']} | Confidence: {c['confidence']}% | {trend_txt}"
            )
        lines.append("")

    if bot:
        lines += [f"## ⚠️ Channels Requiring Attention", f""]
        for c in bot:
            trend_txt = "↑ improving" if c["trend"] == 1 else ("↓ declining" if c["trend"] == -1 else "→ stable")
            lines.append(
                f"**{c['product_id']}** — Score: {c['score']}/100 | "
                f"Tier: {TIER_EMOJI.get(c['tier'], '')} {c['tier']} | Confidence: {c['confidence']}% | {trend_txt}"
            )
        lines.append("")

    if imp:
        lines += [f"## 📈 Improving Channels", f"",
                  f"The following channels show a positive performance trend:", f""]
        for c in imp:
            lines.append(f"- **{c['product_id']}** (Score: {c['score']}, Tier: {c['tier']})")
        lines.append("")

    if dec:
        lines += [f"## 📉 Declining Channels", f"",
                  f"The following channels show a negative performance trend:", f""]
        for c in dec:
            lines.append(f"- **{c['product_id']}** (Score: {c['score']}, Tier: {c['tier']})")
        lines.append("")

    lines += [f"## 📋 Recommendations", f""]
    if s["low_count"] > 0:
        low_names = ", ".join(c["product_id"] for c in data["channels"] if c["tier"] == "Low")
        lines.append(f"1. **Immediate action required** for Low-tier channels: {low_names}.")
    if s["declining_count"] > 0:
        lines.append(f"2. **Monitor declining channels** — {s['declining_count']} channel(s) show a downward trend.")
    if s["improving_count"] > 0:
        lines.append(f"3. **Replicate success** from {s['improving_count']} improving channel(s).")
    if high_pct < 40:
        lines.append(f"4. **Portfolio improvement needed** — only {high_pct}% of channels are High. "
                     f"Target: raise Medium-tier channels through operational improvements.")
    lines += [f"", f"---",
              f"*Report generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} "
              f"by DigitalPerf ML Evaluation Platform*"]

    return "\n".join(lines)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/data")
def get_report_data(
    model_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """Full structured report data (JSON)."""
    data = _build_report_data(model_id, db)
    data["narrative"] = _narrative(data)
    return data


@router.get("/download")
def download_report(
    model_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """Download the report as a Markdown file."""
    data      = _build_report_data(model_id, db)
    narrative = _narrative(data)
    s         = data["summary"]
    m         = data["model"]

    # Build full markdown document
    header = "\n".join([
        f"# Digital Channels Performance Report",
        f"",
        f"| Field | Value |",
        f"|-------|-------|",
        f"| Generated | {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} |",
        f"| Model | {m['name']} ({m['type']}) |",
        f"| Accuracy | {round((m['accuracy'] or 0)*100, 1)}% |",
        f"| F1 Score | {round((m['f1_score'] or 0)*100, 1)}% |",
        f"| Total Channels | {s['total_channels']} |",
        f"| Total Predictions | {s['total_predictions']} |",
        f"| Avg Score | {s['avg_score']}/100 |",
        f"",
        narrative,
        f"",
        f"## Full Channel Rankings",
        f"",
        f"| Rank | Channel | Tier | Score | Confidence | Trend |",
        f"|------|---------|------|-------|------------|-------|",
    ])

    rows = []
    for c in data["channels"]:
        trend = "↑" if c["trend"] == 1 else ("↓" if c["trend"] == -1 else "→")
        rows.append(
            f"| {c['rank']} | {c['product_id']} | {TIER_EMOJI[c['tier']]} {c['tier']} "
            f"| {c['score']} | {c['confidence']}% | {trend} |"
        )

    full_doc = header + "\n" + "\n".join(rows)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M")

    return StreamingResponse(
        iter([full_doc]),
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=performance_report_{ts}.md"},
    )
