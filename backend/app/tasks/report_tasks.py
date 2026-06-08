"""
Celery Report Tasks
"""
import logging
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.report_tasks.generate_weekly_report")
def generate_weekly_report():
    """Generate and store weekly report."""
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
    except Exception as e:
        logger.error(f"Weekly report generation failed: {e}")
        return {"status": "failed", "error": str(e)}
