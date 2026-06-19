"""
Celery Report Tasks — with retry configuration so transient failures don't
permanently fail scheduled report generation.
"""
import logging
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.tasks.report_tasks.generate_weekly_report",
    bind=True,
    max_retries=3,
    default_retry_delay=300,  # 5 minutes between retries
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def generate_weekly_report(self):
    """Generate and store weekly report. Retries up to 3 times on failure."""
    try:
        from app.core.database import SessionLocal
        from app.services.report_service import report_service
        from datetime import date, timedelta

        db = SessionLocal()
        end = date.today()
        start = end - timedelta(days=7)
        try:
            content = report_service.generate_pdf_report(db, start, end, "weekly")
            logger.info(f"Weekly report generated: {len(content)} bytes")
            return {"status": "completed", "size_bytes": len(content)}
        finally:
            db.close()
    except Exception as exc:
        logger.error(f"Weekly report generation failed (attempt {self.request.retries + 1}): {exc}")
        raise
