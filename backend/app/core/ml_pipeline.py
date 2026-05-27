"""
ML Pipeline for Digital Channels Performance Evaluation.
Trains classification models to predict performance tiers.
"""

import pandas as pd
import numpy as np
import joblib
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Tuple, Optional

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
)
from xgboost import XGBClassifier

from app.config import settings

logger = logging.getLogger(__name__)

# Features used for training
FEATURE_COLUMNS = [
    "user_growth_rate",
    "transaction_growth_rate",
    "revenue_growth_rate",
    "failure_rate",
    "complaints_per_1000_users",
    "uptime_percentage",
    "active_user_ratio",
    "retention_rate",
    "revenue_per_user",
    "transaction_value_per_user",
    "transaction_volume_7d_avg",
    "revenue_7d_avg",
    "fraud_rate",
    "operational_risk_score",
]


def assign_performance_tier(df: pd.DataFrame) -> pd.Series:
    """
    Derive a performance tier label from engineered features.
    Tiers: Excellent (3), Good (2), Average (1), Poor (0)
    """
    score = (
        (df.get("active_user_ratio", 0) / 100) * 0.25
        + (df.get("uptime_percentage", 100) / 100) * 0.20
        + (1 - df.get("failure_rate", 0).clip(0, 100) / 100) * 0.20
        + (df.get("revenue_growth_rate", 0).clip(-50, 100) + 50) / 150 * 0.15
        + (1 - df.get("operational_risk_score", 0).clip(0, 100) / 100) * 0.20
    )

    def tier(s):
        if s >= 0.75:
            return "Excellent"
        elif s >= 0.55:
            return "Good"
        elif s >= 0.35:
            return "Average"
        else:
            return "Poor"

    return score.apply(tier)


class MLPipeline:
    """End-to-end ML pipeline: feature prep → train → evaluate → save"""

    MODEL_REGISTRY = {
        "xgboost": lambda: XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            eval_metric="mlogloss",
            random_state=42,
        ),
        "random_forest": lambda: RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            random_state=42,
            n_jobs=-1,
        ),
        "gradient_boosting": lambda: GradientBoostingClassifier(
            n_estimators=150,
            max_depth=5,
            learning_rate=0.1,
            random_state=42,
        ),
    }

    def __init__(self):
        self.label_encoder = LabelEncoder()
        self.scaler = StandardScaler()

    def load_processed_data(self, file_path: Path) -> pd.DataFrame:
        df = pd.read_csv(file_path)
        return df

    def prepare_features(
        self, df: pd.DataFrame
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """Select features and create target label."""
        available = [c for c in FEATURE_COLUMNS if c in df.columns]
        X = df[available].copy()

        # Fill remaining NaNs
        X = X.fillna(X.median(numeric_only=True))

        # Create target
        y = assign_performance_tier(df)

        return X, y

    def train(
        self,
        processed_file: Path,
        model_type: str = "xgboost",
        model_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Train a model and return metrics + paths."""
        logger.info(f"Training {model_type} model on {processed_file}")

        df = self.load_processed_data(processed_file)
        X, y = self.prepare_features(df)

        if len(X) < 10:
            raise ValueError("Not enough data to train (need at least 10 rows).")

        # Encode labels
        y_encoded = self.label_encoder.fit_transform(y)

        # Scale
        X_scaled = self.scaler.fit_transform(X)

        # Split
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
        )

        # Train
        clf = self.MODEL_REGISTRY.get(model_type)
        if clf is None:
            raise ValueError(f"Unknown model type: {model_type}")

        clf = clf()  # instantiate fresh model
        clf.fit(X_train, y_train)

        # Evaluate
        y_pred = clf.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
        rec = recall_score(y_test, y_pred, average="weighted", zero_division=0)
        f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)

        # Feature importance
        feat_names = [c for c in FEATURE_COLUMNS if c in df.columns]
        if hasattr(clf, "feature_importances_"):
            importance = dict(
                zip(feat_names, clf.feature_importances_.tolist())
            )
        else:
            importance = {}

        # Save model artifacts
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = model_name or f"{model_type}_{ts}"
        model_dir = settings.MODELS_DIR / safe_name
        model_dir.mkdir(parents=True, exist_ok=True)

        joblib.dump(clf, model_dir / "model.pkl")
        joblib.dump(self.scaler, model_dir / "scaler.pkl")
        joblib.dump(self.label_encoder, model_dir / "label_encoder.pkl")

        logger.info(f"Model saved to {model_dir} | Accuracy: {acc:.4f}")

        return {
            "model_path": str(model_dir),
            "accuracy": round(acc, 4),
            "precision_score": round(prec, 4),
            "recall_score": round(rec, 4),
            "f1_score": round(f1, 4),
            "feature_importance": importance,
            "classes": self.label_encoder.classes_.tolist(),
            "training_params": {
                "model_type": model_type,
                "n_samples": len(X),
                "n_features": len(feat_names),
                "test_size": 0.2,
            },
        }

    def predict(
        self, model_path: str, processed_file: Path
    ) -> pd.DataFrame:
        """Load a saved model and run predictions on a processed file."""
        model_dir = Path(model_path)
        clf = joblib.load(model_dir / "model.pkl")
        scaler = joblib.load(model_dir / "scaler.pkl")
        le = joblib.load(model_dir / "label_encoder.pkl")

        df = self.load_processed_data(processed_file)
        X, _ = self.prepare_features(df)
        X_scaled = scaler.transform(X)

        y_pred_enc = clf.predict(X_scaled)
        y_pred_labels = le.inverse_transform(y_pred_enc)

        proba = clf.predict_proba(X_scaled)
        confidence = proba.max(axis=1)

        result = df[["product_id"]].copy()
        if "metric_date" in df.columns:
            result["metric_date"] = df["metric_date"]
        result["prediction_label"] = y_pred_labels
        result["confidence"] = confidence.round(4)

        return result


# Singleton
ml_pipeline = MLPipeline()
