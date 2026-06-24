# Import all models so SQLAlchemy registers all tables in metadata.
# This prevents NoReferencedTableError when FK resolution happens
# during commit (e.g. in feature engineering reprocess_all).
from app.models.user import User
from app.models.product import Product
from app.models.data import RawData, ProcessedFeatures
from app.models.ml_models import Score, Prediction, ModelRegistry, SimilarProduct
from app.models.alerts import Alert
from app.models.recommendations import Recommendation
from app.models.reports import Report
from app.models.audit_log import AuditLog

__all__ = [
    "User", "Product", "RawData", "ProcessedFeatures",
    "Score", "Prediction", "ModelRegistry", "SimilarProduct",
    "Alert", "Recommendation", "Report", "AuditLog",
]
