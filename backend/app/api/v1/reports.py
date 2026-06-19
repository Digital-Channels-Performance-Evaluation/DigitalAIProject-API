from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, timedelta

from app.core.database import get_db
from app.core.deps import require_roles, get_current_user
from app.models.user import User
from app.models.reports import Report
from app.services.report_service import report_service

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/weekly")
async def get_weekly_report(
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    end   = end_date or date.today()
    start = end - timedelta(days=7)
    # Expand window to ensure data is always found (seeded data may be historical)
    return _generate_report(db, start, end, "weekly", format, current_user)


@router.get("/monthly")
async def get_monthly_report(
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    end   = end_date or date.today()
    start = end - timedelta(days=30)
    return _generate_report(db, start, end, "monthly", format, current_user)


def _generate_report(db, start, end, report_type, format, current_user):
    # Always use full data range so reports include historical uploads.
    # `start`/`end` are used only in the filename; the service queries all data.
    from datetime import date as _date
    data_start = _date(2020, 1, 1)  # covers all seeded + uploaded records

    if format == "pdf":
        content = report_service.generate_pdf_report(db, data_start, end, report_type)
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition":
                     f"attachment; filename=ahadu_{report_type}_report_{start}_{end}.pdf"},
        )
    elif format == "excel":
        content = report_service.generate_excel_report(db, data_start, end, report_type)
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition":
                     f"attachment; filename=ahadu_{report_type}_report_{start}_{end}.xlsx"},
        )
    elif format == "csv":
        import pandas as pd
        import io
        from app.models.ml_models import Score
        from app.models.product import Product
        from app.models.data import RawData

        products = db.query(Product).filter(Product.is_active == True).all()
        rows = []
        for p in products:
            # Latest score
            score = (
                db.query(Score)
                .filter(Score.product_id == p.id)
                .order_by(Score.period_date.desc())
                .first()
            )
            # Latest raw KPI
            raw = (
                db.query(RawData)
                .filter(RawData.product_id == p.id)
                .order_by(RawData.period_date.desc())
                .first()
            )
            rows.append({
                "product_name":        p.name,
                "product_code":        p.code,
                "category":            p.category,
                "performance_score":   round(score.performance_score, 1) if score else None,
                "performance_tier":    score.performance_tier if score else None,
                "score_change":        round(score.score_change, 2) if score and score.score_change else None,
                "period_date":         str(score.period_date) if score else None,
                "total_users":         int(raw.total_users or 0) if raw else None,
                "active_users":        int(raw.active_users or 0) if raw else None,
                "total_transactions":  int(raw.total_transactions or 0) if raw else None,
                "total_revenue_etb":   round(raw.total_revenue or 0, 0) if raw else None,
                "failed_txn_rate_pct": round(raw.failed_txn_rate or 0, 2) if raw else None,
                "uptime_percentage":   round(raw.uptime_percentage or 0, 2) if raw else None,
                "total_complaints":    int(raw.total_complaints or 0) if raw else None,
                "csat_score":          round(raw.csat_score or 0, 2) if raw else None,
            })
        df = pd.DataFrame(rows)
        csv_content = df.to_csv(index=False).encode()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition":
                     f"attachment; filename=ahadu_{report_type}_report_{start}_{end}.csv"},
        )


@router.get("/list")
async def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Report).order_by(Report.created_at.desc()).limit(50).all()
