"""Add composite indexes for query performance + ussd product category.

All indexes use IF NOT EXISTS (via try/except) so this migration is safe
to run on databases that were created fresh from SQLAlchemy metadata.

Revision ID: 002
Revises: 001
Create Date: 2024-01-02 00:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _try(fn):
    """Run a DDL operation, silently skip if it already exists."""
    try:
        fn()
    except Exception:
        pass


def upgrade() -> None:
    # ── scores ────────────────────────────────────────────────────────────────
    _try(lambda: op.create_index("ix_scores_product_period", "scores", ["product_id", "period_date"]))
    _try(lambda: op.create_index("ix_scores_period_product", "scores", ["period_date", "product_id"]))

    # ── predictions ───────────────────────────────────────────────────────────
    _try(lambda: op.create_index("ix_predictions_product_period", "predictions", ["product_id", "period_date"]))

    # ── model_registry ────────────────────────────────────────────────────────
    _try(lambda: op.create_index("ix_modelregistry_type_active", "model_registry", ["model_type", "is_active"]))

    # ── alerts ────────────────────────────────────────────────────────────────
    _try(lambda: op.create_index("ix_alerts_resolved_created",  "alerts", ["is_resolved", "created_at"]))
    _try(lambda: op.create_index("ix_alerts_product_resolved",  "alerts", ["product_id",  "is_resolved"]))
    _try(lambda: op.create_index("ix_alerts_resolved_severity", "alerts", ["is_resolved", "severity"]))

    # ── recommendations ───────────────────────────────────────────────────────
    _try(lambda: op.create_index("ix_recs_product_ack",  "recommendations", ["product_id", "is_acknowledged"]))
    _try(lambda: op.create_index("ix_recs_period",       "recommendations", ["product_id", "period_date"]))

    # ── raw_data ─────────────────────────────────────────────────────────────
    _try(lambda: op.create_index("ix_rawdata_product_period",            "raw_data", ["product_id", "period_date"]))
    _try(lambda: op.create_index("ix_rawdata_validated_product_period",  "raw_data", ["is_validated", "product_id", "period_date"]))

    # ── processed_features ───────────────────────────────────────────────────
    _try(lambda: op.create_index("ix_pf_product_period", "processed_features", ["product_id", "period_date"]))
    _try(lambda: op.create_index("ix_pf_raw_data_id",    "processed_features", ["raw_data_id"]))

    # ── products.is_active index ──────────────────────────────────────────────
    _try(lambda: op.create_index("ix_products_is_active", "products", ["is_active"]))

    # ── Add 'ussd' to product_category enum (MySQL ALTER TYPE) ───────────────
    # MySQL doesn't support ALTER TYPE; instead we ALTER COLUMN to expand the SET.
    # This is a no-op if 'ussd' is already in the enum.
    _try(lambda: op.execute(
        "ALTER TABLE products MODIFY COLUMN category "
        "ENUM('mobile_banking','card_banking','atm','pos',"
        "'qr_payment','digital_wallet','ussd','future_product') NOT NULL"
    ))

    # ── Add avg_session_duration_sec to raw_data if not yet present ───────────
    _try(lambda: op.execute(
        "ALTER TABLE raw_data ADD COLUMN IF NOT EXISTS "
        "avg_session_duration_sec DOUBLE NULL "
        "COMMENT 'Avg user session duration in seconds from app analytics'"
    ))


def downgrade() -> None:
    # Drop indexes in reverse order (best-effort)
    for idx, tbl in [
        ("ix_pf_raw_data_id",                   "processed_features"),
        ("ix_pf_product_period",                 "processed_features"),
        ("ix_rawdata_validated_product_period",  "raw_data"),
        ("ix_rawdata_product_period",            "raw_data"),
        ("ix_recs_period",                       "recommendations"),
        ("ix_recs_product_ack",                  "recommendations"),
        ("ix_alerts_resolved_severity",          "alerts"),
        ("ix_alerts_product_resolved",           "alerts"),
        ("ix_alerts_resolved_created",           "alerts"),
        ("ix_modelregistry_type_active",         "model_registry"),
        ("ix_predictions_product_period",        "predictions"),
        ("ix_scores_period_product",             "scores"),
        ("ix_scores_product_period",             "scores"),
        ("ix_products_is_active",                "products"),
    ]:
        _try(lambda i=idx, t=tbl: op.drop_index(i, table_name=t))
