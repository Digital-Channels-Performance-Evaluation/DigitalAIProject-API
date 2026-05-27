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

TIER_SCORE  = {"Excellent": 100, "Good": 75, "Average": 45, "Poor": 15}
TIER_ORDER  = {"Excellent": 1,   "Good": 2,  "Average": 3,  "Poor": 4}
TIER_EMOJI  = {"Excellent": "🟢", "Good": "🔵", "Average": "🟡", "Poor": "🔴"}


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
        counter   = Counter(labels)
        top_tier  = counter.most_common(1)[0][0]
        scores    = [TIER_SCORE.get(l, 0) for l in labels]
        avg_score = sum(scores) / len(scores)
        confs     = [p.confidence for p in ps if p.confidence]
        avg_conf  = sum(confs) / len(confs) if confs else 0

        mid = len(scores) // 2
        trend = 0
        if mid > 0:
            diff = (sum(scores[mid:]) / (len(scores) - mid)) - (sum(scores[:mid]) / mid)
            trend = 1 if diff > 5 else (-1 if diff < -5 else 0)

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

    excellent = [c for c in channels if c["tier"] == "Excellent"]
    poor      = [c for c in channels if c["tier"] == "Poor"]
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
            "excellent_count":   tier_dist.get("Excellent", 0),
            "good_count":        tier_dist.get("Good",      0),
            "average_count":     tier_dist.get("Average",   0),
            "poor_count":        tier_dist.get("Poor",      0),
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

    total   = s["total_channels"]
    avg     = s["avg_score"]
    exc_pct = round(s["excellent_count"] / total * 100) if total else 0
    poor_pct= round(s["poor_count"]      / total * 100) if total else 0

    health = "strong" if avg >= 70 else ("moderate" if avg >= 50 else "concerning")

    lines = [
        f"## Executive Summary",
        f"",
        f"This report covers **{total} digital channels** evaluated using the "
        f"**{m['name']}** model (accuracy: {round((m['accuracy'] or 0)*100, 1)}%). "
        f"The overall portfolio health is **{health}** with an average performance score of **{avg}/100**.",
        f"",
        f"- **{s['excellent_count']} channels ({exc_pct}%)** are performing at Excellent tier",
        f"- **{s['good_count']} channels** are at Good tier",
        f"- **{s['average_count']} channels** need attention (Average tier)",
        f"- **{s['poor_count']} channels ({poor_pct}%)** are at Poor tier and require immediate action",
        f"",
    ]

    if top:
        lines += [
            f"## 🏆 Top Performing Channels",
            f"",
        ]
        for c in top:
            trend_txt = "↑ improving" if c["trend"] == 1 else ("↓ declining" if c["trend"] == -1 else "→ stable")
            lines.append(
                f"**{c['rank']}. {c['product_id']}** — Score: {c['score']}/100 | "
                f"Tier: {TIER_EMOJI[c['tier']]} {c['tier']} | Confidence: {c['confidence']}% | {trend_txt}"
            )
        lines.append("")

    if bot:
        lines += [
            f"## ⚠️ Channels Requiring Attention",
            f"",
        ]
        for c in bot:
            trend_txt = "↑ improving" if c["trend"] == 1 else ("↓ declining" if c["trend"] == -1 else "→ stable")
            lines.append(
                f"**{c['product_id']}** — Score: {c['score']}/100 | "
                f"Tier: {TIER_EMOJI[c['tier']]} {c['tier']} | Confidence: {c['confidence']}% | {trend_txt}"
            )
        lines.append("")

    if imp:
        lines += [
            f"## 📈 Improving Channels",
            f"",
            f"The following channels show a positive performance trend:",
            f"",
        ]
        for c in imp:
            lines.append(f"- **{c['product_id']}** (Score: {c['score']}, Tier: {c['tier']})")
        lines.append("")

    if dec:
        lines += [
            f"## 📉 Declining Channels",
            f"",
            f"The following channels show a negative performance trend and need investigation:",
            f"",
        ]
        for c in dec:
            lines.append(f"- **{c['product_id']}** (Score: {c['score']}, Tier: {c['tier']})")
        lines.append("")

    lines += [
        f"## 📋 Recommendations",
        f"",
    ]
    if s["poor_count"] > 0:
        poor_names = ", ".join(c["product_id"] for c in data["channels"] if c["tier"] == "Poor")
        lines.append(f"1. **Immediate action required** for Poor-tier channels: {poor_names}. "
                     f"Investigate failure rates, downtime, and fraud incidents.")
    if s["declining_count"] > 0:
        lines.append(f"2. **Monitor declining channels** closely — {s['declining_count']} channel(s) "
                     f"show a downward trend. Review recent operational changes.")
    if s["improving_count"] > 0:
        lines.append(f"3. **Replicate success patterns** from {s['improving_count']} improving channel(s) "
                     f"across the portfolio.")
    if exc_pct < 30:
        lines.append(f"4. **Portfolio improvement needed** — only {exc_pct}% of channels are Excellent. "
                     f"Target: raise Average-tier channels to Good through operational improvements.")
    lines += [
        f"",
        f"---",
        f"*Report generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} "
        f"by DigitalPerf ML Evaluation Platform*",
    ]

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
