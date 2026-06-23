"""
Alembic environment configuration.
Reads DATABASE_URL from environment so migrations run with the same
credentials as the application — no secrets in alembic.ini.
"""
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Load application models so Alembic can detect schema changes ──────────────
# All models must be imported before Base.metadata is used.
from app.core.database import Base  # noqa: F401

# Import every model module so their tables are registered on Base.metadata
import app.models.user           # noqa: F401
import app.models.product        # noqa: F401
import app.models.data           # noqa: F401
import app.models.ml_models      # noqa: F401
import app.models.alerts         # noqa: F401
import app.models.recommendations  # noqa: F401
import app.models.reports        # noqa: F401
import app.models.audit_log      # noqa: F401

# Alembic Config object, which provides access to the .ini file values
config = context.config

# Override sqlalchemy.url with DATABASE_URL env var (preferred) so secrets
# are never stored in alembic.ini.
database_url = os.getenv("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging (if present)
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for 'autogenerate' support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no live DB connection required)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (live DB connection)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
