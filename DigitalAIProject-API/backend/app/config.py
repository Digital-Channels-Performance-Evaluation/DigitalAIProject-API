from pydantic_settings import BaseSettings
from pathlib import Path
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Digital Channels Performance Evaluation"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "mysql+pymysql://root:@127.0.0.1:3307/digital_channels_db"

    # Security
    SECRET_KEY: str = "change-me-in-production"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours

    # Data folder paths
    DATA_ROOT: Path = Path(__file__).parent.parent / "data"
    RAW_DATA_DIR: Path = DATA_ROOT / "raw"
    PROCESSED_DATA_DIR: Path = DATA_ROOT / "processed"
    VALIDATION_DIR: Path = DATA_ROOT / "validation"
    MODELS_DIR: Path = DATA_ROOT / "models"

    # Supported file formats
    ALLOWED_EXTENSIONS: List[str] = [".csv", ".xlsx", ".json"]

    # Feature engineering config
    DATE_COLUMN: str = "metric_date"
    PRODUCT_ID_COLUMN: str = "product_id"

    # Auto-reprocess on new file
    WATCH_DATA_FOLDER: bool = True
    SCAN_INTERVAL_SECONDS: int = 30

    class Config:
        env_file = ".env"


settings = Settings()

# Create directories if they don't exist
for d in [
    settings.RAW_DATA_DIR,
    settings.PROCESSED_DATA_DIR,
    settings.VALIDATION_DIR,
    settings.MODELS_DIR,
]:
    d.mkdir(parents=True, exist_ok=True)
