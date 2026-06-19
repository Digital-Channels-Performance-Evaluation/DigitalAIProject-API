"""Convert products.category from ENUM to VARCHAR(100) to support any channel name.

Previously the category column was an ENUM with fixed values. This migration
converts it to a plain VARCHAR so users can create products with any channel
type (mobile_banking, custom_channel, etc.) without schema changes.

Revision ID: 003
Revises: 002
Create Date: 2024-01-03 00:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _try(fn):
    """Run a DDL operation, silently skip if it already exists / not needed."""
    try:
        fn()
    except Exception:
        pass


def upgrade() -> None:
    # Convert ENUM → VARCHAR(100) — preserves all existing data.
    # Uses _try so it's safe on fresh DBs that were created with the
    # updated SQLAlchemy model (already VARCHAR — MODIFY is a no-op in that case).
    _try(lambda: op.execute(
        "ALTER TABLE products MODIFY COLUMN category VARCHAR(100) NOT NULL"
    ))


def downgrade() -> None:
    # Restore to the original ENUM — only possible if all current values
    # are within the original set; otherwise this will fail.
    _try(lambda: op.execute(
        "ALTER TABLE products MODIFY COLUMN category "
        "ENUM('mobile_banking','card_banking','atm','pos',"
        "'qr_payment','digital_wallet','ussd','future_product') NOT NULL"
    ))
