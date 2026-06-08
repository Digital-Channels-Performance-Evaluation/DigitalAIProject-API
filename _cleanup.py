"""Clean up oversized prediction data - keep only latest run per model+dataset."""
import sys
sys.path.insert(0, 'g:/Projects/ahadu_digital_performance_model/backend')

from app.database import SessionLocal
from app import models
from sqlalchemy import text

db = SessionLocal()
try:
    total = db.execute(text("SELECT COUNT(*) FROM predictions")).scalar()
    print(f"Total predictions before cleanup: {total:,}")

    # Keep only predictions from the latest model (id=21) + dataset (id=16) combo
    # Delete all others that were test runs
    result = db.execute(text("""
        DELETE FROM predictions
        WHERE NOT (model_id = 21 AND dataset_id = 16)
    """))
    db.commit()
    print(f"Deleted {result.rowcount:,} old predictions")

    # Also cap the remaining ones - if over 50k, keep only a sample
    remaining = db.execute(text("SELECT COUNT(*) FROM predictions")).scalar()
    print(f"Remaining: {remaining:,}")

    if remaining > 50000:
        # Keep only 1 prediction per product per month (deduplicate)
        db.execute(text("""
            DELETE p1 FROM predictions p1
            INNER JOIN predictions p2
            WHERE p1.id > p2.id
              AND p1.product_id = p2.product_id
              AND p1.metric_date = p2.metric_date
              AND p1.model_id = p2.model_id
        """))
        db.commit()
        final = db.execute(text("SELECT COUNT(*) FROM predictions")).scalar()
        print(f"After dedup: {final:,}")
    else:
        print("No further cleanup needed")

    print("Done")
finally:
    db.close()
