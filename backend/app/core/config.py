"""
Application configuration — all secrets are loaded from environment variables.
Never hard-code secrets here. Copy .env.example → .env and fill in real values.
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import json
import sys


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Ahadu Bank Digital Banking Evaluation Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "mysql+pymysql://root:@localhost:3306/ahadu_bank_eval"

    # JWT — MUST be overridden via environment variable in every deployment.
    # Generate a strong secret: python -c "import secrets; print(secrets.token_hex(64))"
    JWT_SECRET_KEY: str = "CHANGE_ME_BEFORE_DEPLOY"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS — tighten in production via ALLOWED_ORIGINS env var
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "http://frontend:3000",
        "http://localhost",
    ]

    # ML
    MODEL_REGISTRY_PATH: str = "./ml_models"
    TRAINING_CHUNK_SIZE: int = 50_000   # rows loaded per chunk when dataset is large

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Email / SMTP — configure in .env to enable alert notifications
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""          # sender address, defaults to SMTP_USER if empty
    SMTP_TLS: bool = True        # STARTTLS on port 587; set False for port 465 SSL

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore",  # silently ignore Docker-only vars like MYSQL_*, REDIS_PASSWORD, etc.
    }

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        """Accept either a JSON array string or a real list."""
        if isinstance(v, str) and v.startswith("["):
            try:
                return json.loads(v)
            except Exception:
                pass
        return v


settings = Settings()

# ── Safety guard: refuse to start with the default placeholder secret ──────────
# This prevents accidental deployment without a real JWT secret.
_UNSAFE_SECRETS = {
    "CHANGE_ME_BEFORE_DEPLOY",
    "ahadu-bank-super-secret-jwt-key-change-in-production-2024",
}
if not settings.DEBUG and settings.JWT_SECRET_KEY in _UNSAFE_SECRETS:
    print(
        "\n[FATAL] JWT_SECRET_KEY is set to an unsafe default value.\n"
        "Set a strong secret in your .env file before running in production.\n"
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(64))\"\n",
        file=sys.stderr,
    )
    sys.exit(1)
