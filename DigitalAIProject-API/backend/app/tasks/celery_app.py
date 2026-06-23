from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "ahadu_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.ml_tasks", "app.tasks.report_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Africa/Addis_Ababa",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        # Weekly drift detection and retraining check
        "weekly-drift-detection": {
            "task": "app.tasks.ml_tasks.check_and_retrain",
            "schedule": crontab(day_of_week=1, hour=2, minute=0),  # Every Monday 2AM
        },
        # Daily feature engineering for new data
        "daily-feature-engineering": {
            "task": "app.tasks.ml_tasks.run_feature_engineering",
            "schedule": crontab(hour=1, minute=0),  # Every day 1AM
        },
        # Daily scoring for all products
        "daily-scoring": {
            "task": "app.tasks.ml_tasks.score_all_products",
            "schedule": crontab(hour=3, minute=0),  # Every day 3AM
        },
    },
)
