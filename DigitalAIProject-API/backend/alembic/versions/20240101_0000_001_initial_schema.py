"""Initial schema — baseline migration representing the current DB state.

All tables already exist if you ran the application before adding Alembic.
This migration is a no-op (pass) so that existing deployments can start
using Alembic without errors, while new deployments build from SQLAlchemy
Base.metadata.create_all() on first startup.

To generate future migrations from model changes, run:
    alembic revision --autogenerate -m "describe your change"

Revision ID: 001
Revises: None
Create Date: 2024-01-01 00:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Baseline: schema already created by SQLAlchemy on startup.
    # Future additive changes belong in new migration files.
    pass


def downgrade() -> None:
    # Dropping the entire schema is destructive — do not implement.
    pass
