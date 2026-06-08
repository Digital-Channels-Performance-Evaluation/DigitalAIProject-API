from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class TrainRequest(BaseModel):
    model_type: str  # classification, regression, similarity
    dataset_version: Optional[str] = None
    hyperparameters: Optional[Dict[str, Any]] = None


class TrainResponse(BaseModel):
    model_id: int
    model_name: str
    model_type: str
    version: str
    accuracy: Optional[float] = None
    f1_score: Optional[float] = None
    r2_score: Optional[float] = None
    mae: Optional[float] = None
    mse: Optional[float] = None
    log_loss: Optional[float] = None
    training_samples: int
    message: str


class PredictRequest(BaseModel):
    product_id: int
    period_date: Optional[str] = None
    features: Optional[Dict[str, float]] = None


class PredictResponse(BaseModel):
    product_id: int
    predicted_score: float
    predicted_tier: str
    confidence: float
    model_version: str
    explanation: str


class RetrainRequest(BaseModel):
    model_id: Optional[int] = None
    model_type: Optional[str] = None
    reason: Optional[str] = None


class ModelRegistryResponse(BaseModel):
    id: int
    model_name: str
    model_type: str
    version: str
    accuracy: Optional[float] = None
    f1_score: Optional[float] = None
    r2_score: Optional[float] = None
    mae: Optional[float] = None
    mse: Optional[float] = None        # log_loss for classifiers, MSE for regressors
    training_date: Optional[datetime] = None
    dataset_version: Optional[str] = None
    training_samples: Optional[int] = None
    is_active: bool
    created_at: datetime
    hyperparameters: Optional[str] = None

    class Config:
        from_attributes = True


class SimilarProductResponse(BaseModel):
    product_id: int
    similar_product_id: int
    similar_product_name: str
    similarity_score: float
    cluster_id: Optional[int] = None
