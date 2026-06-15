from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Ahadu Bank Digital Banking Evaluation Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "mysql+pymysql://root:@localhost:3306/ahadu_bank_eval"

    # JWT — fixed secret so tokens survive restarts
    JWT_SECRET_KEY: str = "ahadu-bank-super-secret-jwt-key-change-in-production-2024"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS — wide open for local dev; tighten in production
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

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    class Config:
        env_file = ".env"
        case_sensitive = True

        @classmethod
        def parse_env_var(cls, field_name: str, raw_val: str):
            """Auto-parse JSON arrays from .env strings."""
            if field_name == "ALLOWED_ORIGINS" and raw_val.startswith("["):
                try:
                    return json.loads(raw_val)
                except Exception:
                    pass
            return raw_val


settings = Settings()
