from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class UploadStatusEnum(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ModelStatusEnum(str, Enum):
    training = "training"
    ready = "ready"
    failed = "failed"


class UserRoleEnum(str, Enum):
    admin = "admin"
    analyst = "analyst"
    viewer = "viewer"


# ── User Schemas ─────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRoleEnum = UserRoleEnum.viewer

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRoleEnum] = None
    is_active: Optional[bool] = None


class UserChangePassword(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters")
        return v


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: UserRoleEnum
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int


# ── Auth Schemas ─────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Dataset Schemas ──────────────────────────────────────────────────────────

class DatasetBase(BaseModel):
    filename: str
    original_filename: str
    file_size_kb: Optional[float] = None
    file_type: Optional[str] = None


class DatasetCreate(DatasetBase):
    file_path: str


class DatasetResponse(DatasetBase):
    id: int
    status: UploadStatusEnum
    row_count: Optional[int] = None
    column_count: Optional[int] = None
    processed_file_path: Optional[str] = None
    validation_report: Optional[Dict[str, Any]] = None
    features_created: Optional[List[str]] = None
    error_message: Optional[str] = None
    uploaded_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DatasetListResponse(BaseModel):
    datasets: List[DatasetResponse]
    total: int


# ── Upload Schemas ───────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    status: str
    filename: str
    dataset_id: int
    size_kb: float
    uploaded_at: str
    message: str


class ProcessingResult(BaseModel):
    status: str
    dataset_id: int
    original_file: str
    processed_file: Optional[str] = None
    validation: Optional[Dict[str, Any]] = None
    featured_shape: Optional[List[int]] = None
    features_created: Optional[List[str]] = None
    error: Optional[str] = None


# ── ML Model Schemas ─────────────────────────────────────────────────────────

class MLModelResponse(BaseModel):
    id: int
    name: str
    model_type: str
    target: str
    status: ModelStatusEnum
    accuracy: Optional[float] = None
    precision_score: Optional[float] = None
    recall_score: Optional[float] = None
    f1_score: Optional[float] = None
    feature_importance: Optional[Dict[str, float]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TrainRequest(BaseModel):
    dataset_id: int
    model_type: str = "xgboost"  # xgboost | random_forest | gradient_boosting
    target: str = "performance_tier"


class TrainResponse(BaseModel):
    status: str
    model_id: int
    message: str


# ── Prediction Schemas ───────────────────────────────────────────────────────

class PredictionResponse(BaseModel):
    id: int
    product_id: str
    metric_date: Optional[datetime] = None
    predicted_value: Optional[float] = None
    prediction_label: Optional[str] = None
    confidence: Optional[float] = None
    actual_value: Optional[float] = None

    class Config:
        from_attributes = True


class PredictionListResponse(BaseModel):
    predictions: List[PredictionResponse]
    total: int
    model_id: int


# ── Dashboard / Analytics Schemas ────────────────────────────────────────────

class KPISummary(BaseModel):
    total_datasets: int
    total_products: int
    total_predictions: int
    models_trained: int
    avg_model_accuracy: Optional[float] = None
    latest_upload: Optional[datetime] = None


class ChannelPerformanceSummary(BaseModel):
    product_id: str
    avg_active_user_ratio: float
    avg_failure_rate: float
    avg_uptime: float
    avg_revenue_per_user: float
    avg_operational_risk: float
    performance_tier: str  # Excellent / Good / Average / Poor


class FolderScanResult(BaseModel):
    scanned_folder: str
    files_found: int
    files_processed: int
    results: List[Dict[str, Any]]
