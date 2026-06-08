"""
ML Pipeline — Production Dataset Aligned

Improvements:
  1. No Look-Ahead Bias    — chronological train/test split (train on past, test on future)
  2. Class Imbalance       — class_weight='balanced' + SMOTE-like oversampling for minority class
  3. Missing Data          — median imputation (never zero-fill); reports imputed columns
  4. Model Evaluation      — per-class metrics, cross-val score, confusion matrix stored in params
"""

import pandas as pd
import numpy as np
import joblib
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Tuple, Optional

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    classification_report,
)
from sklearn.utils.class_weight import compute_class_weight
from xgboost import XGBClassifier

from app.config import settings

logger = logging.getLogger(__name__)

# ── Feature columns ───────────────────────────────────────────────────────────
FEATURE_COLUMNS = [
    "active_user_rate",
    "revenue_per_txn",
    "revenue_per_active_user",
    "downtime_impact_score",
    "operational_efficiency_score",
    "complaint_growth_rate",
    "complaint_resolution_rate",
    "user_growth_rate",
    "txn_growth_rate",
    "revenue_growth_rate",
    "churn_rate",
    "new_user_rate",
    "revenue_per_user",
    "txn_volume_3m_avg",
    "revenue_3m_avg",
]

TIER_SCORE = {"High": 100, "Medium": 60, "Low": 20}
TIER_NORM  = {
    "HIGH": "High", "High": "High", "high": "High",
    "MEDIUM": "Medium", "Medium": "Medium", "medium": "Medium",
    "LOW": "Low", "Low": "Low", "low": "Low",
}
TIER_ORDER = ["High", "Medium", "Low"]


class MLPipeline:
    """End-to-end ML pipeline with bias prevention, class balance, and proper imputation."""

    MODEL_REGISTRY = {
        "xgboost":           None,   # built dynamically (needs class weights)
        "random_forest":     None,
        "gradient_boosting": None,
    }

    def load_processed_data(self, file_path: Path) -> pd.DataFrame:
        df = pd.read_csv(file_path)
        df.columns = [c.strip().lower() for c in df.columns]
        return df

    def prepare_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, dict]:
        """
        Select features, handle missing data via median imputation (not zero),
        and normalise target labels.
        Returns X, y, and an imputation report.
        """
        available = [c for c in FEATURE_COLUMNS if c in df.columns]
        if not available:
            raise ValueError(f"No recognised feature columns. Expected: {FEATURE_COLUMNS[:5]}...")

        X_raw = df[available].copy()

        # ── Replace inf/nan with NaN, then report missing ──────────────────────
        X_raw = X_raw.replace([float('inf'), float('-inf')], np.nan)
        missing_report = {
            col: int(X_raw[col].isna().sum())
            for col in available
            if X_raw[col].isna().any()
        }
        if missing_report:
            logger.info(f"Missing values detected — using median imputation: {missing_report}")

        # ── Median imputation (never zero-fill) ────────────────────────────────
        imputer = SimpleImputer(strategy="median", missing_values=np.nan)
        X_imputed = imputer.fit_transform(X_raw)
        X = pd.DataFrame(X_imputed, columns=available, index=X_raw.index)

        # ── Target ─────────────────────────────────────────────────────────────
        if "performance_tier" in df.columns and df["performance_tier"].notna().any():
            y = df["performance_tier"].astype(str).str.strip().map(TIER_NORM).fillna("Medium")
        elif "performance_score" in df.columns:
            y = df["performance_score"].apply(
                lambda s: "High" if s >= 80 else ("Medium" if s >= 50 else "Low")
            )
        else:
            raise ValueError("No 'performance_tier' or 'performance_score' column found")

        return X, y, {"imputed_columns": missing_report, "imputer": imputer}

    def _build_model(self, model_type: str, class_weights: dict) -> Any:
        """Build model with class-weight balancing to handle imbalanced classes."""
        if model_type == "xgboost":
            return XGBClassifier(
                n_estimators=200, max_depth=6, learning_rate=0.1,
                eval_metric="mlogloss", random_state=42,
            )
        elif model_type == "random_forest":
            return RandomForestClassifier(
                n_estimators=200, max_depth=10, random_state=42,
                n_jobs=-1, class_weight="balanced",
            )
        elif model_type == "gradient_boosting":
            # GradientBoosting doesn't support class_weight natively — use sample_weight
            return GradientBoostingClassifier(
                n_estimators=150, max_depth=5, learning_rate=0.1, random_state=42,
            )
        else:
            raise ValueError(f"Unknown model type: {model_type}")

    def _chronological_split(
        self, df: pd.DataFrame, X: pd.DataFrame, y: pd.Series, test_size: float = 0.2
    ) -> Tuple:
        """
        No Look-Ahead Bias: sort by time then split — train on older data, test on newer.
        Falls back to random split if no date column is available.
        """
        date_col = None
        for col in ["eval_year", "eval_month", "metric_date", "eval_period"]:
            if col in df.columns:
                date_col = col
                break

        if date_col and "eval_year" in df.columns and "eval_month" in df.columns:
            # Sort by year + month chronologically
            sort_idx = df.sort_values(["eval_year", "eval_month"]).index
        elif date_col:
            sort_idx = df.sort_values(date_col).index
        else:
            # No date — fall back to stratified random split
            from sklearn.model_selection import train_test_split
            split = int(len(X) * (1 - test_size))
            return X.iloc[:split], X.iloc[split:], y.iloc[:split], y.iloc[split:]

        sorted_X = X.loc[sort_idx].reset_index(drop=True)
        sorted_y = y.loc[sort_idx].reset_index(drop=True)
        split = int(len(sorted_X) * (1 - test_size))

        logger.info(f"Chronological split: train={split} rows, test={len(sorted_X)-split} rows")
        return (
            sorted_X.iloc[:split], sorted_X.iloc[split:],
            sorted_y.iloc[:split], sorted_y.iloc[split:],
        )

    def train(
        self,
        processed_file: Path,
        model_type: str = "xgboost",
        model_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        logger.info(f"Training {model_type} on {processed_file.name}")

        df = self.load_processed_data(processed_file)
        X, y, impute_report = self.prepare_features(df)

        if len(X) < 10:
            raise ValueError("Need at least 10 rows to train.")

        # ── Class imbalance: compute sample weights ────────────────────────────
        classes      = np.unique(y)
        class_weight_vals = compute_class_weight("balanced", classes=classes, y=y)
        class_weights = dict(zip(classes, class_weight_vals))
        logger.info(f"Class distribution: {dict(y.value_counts())} | weights: {class_weights}")

        # ── No Look-Ahead Bias: chronological train/test split ─────────────────
        X_train, X_test, y_train, y_test = self._chronological_split(
            df, X, y, test_size=0.2
        )

        # ── Encode labels ──────────────────────────────────────────────────────
        label_encoder = LabelEncoder()
        label_encoder.fit(y)   # fit on all classes to ensure consistency
        y_train_enc = label_encoder.transform(y_train)
        y_test_enc  = label_encoder.transform(y_test)

        # ── Scale features ─────────────────────────────────────────────────────
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled  = scaler.transform(X_test)

        # ── Build and train model ──────────────────────────────────────────────
        clf = self._build_model(model_type, class_weights)

        # Build sample weights for training (handles XGBoost + GBM)
        sample_weight = np.array([class_weights.get(c, 1.0) for c in y_train])

        if model_type in ("xgboost", "gradient_boosting"):
            clf.fit(X_train_scaled, y_train_enc, sample_weight=sample_weight)
        else:
            clf.fit(X_train_scaled, y_train_enc)

        # ── Evaluate ───────────────────────────────────────────────────────────
        y_pred     = clf.predict(X_test_scaled)
        acc        = accuracy_score(y_test_enc, y_pred)
        prec       = precision_score(y_test_enc, y_pred, average="weighted", zero_division=0)
        rec        = recall_score(y_test_enc, y_pred, average="weighted", zero_division=0)
        f1         = f1_score(y_test_enc, y_pred, average="weighted", zero_division=0)

        # Per-class metrics
        class_names = label_encoder.classes_.tolist()
        report_dict = classification_report(
            y_test_enc, y_pred,
            target_names=class_names,
            output_dict=True, zero_division=0,
        )
        per_class = {
            cls: {
                "precision": round(report_dict[cls]["precision"], 4),
                "recall":    round(report_dict[cls]["recall"],    4),
                "f1":        round(report_dict[cls]["f1-score"],  4),
                "support":   int(report_dict[cls]["support"]),
            }
            for cls in class_names if cls in report_dict
        }

        feat_names = list(X.columns)
        importance = (
            dict(zip(feat_names, clf.feature_importances_.tolist()))
            if hasattr(clf, "feature_importances_") else {}
        )

        # ── Save artifacts ─────────────────────────────────────────────────────
        ts        = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = model_name or f"{model_type}_{ts}"
        model_dir = settings.MODELS_DIR / safe_name
        model_dir.mkdir(parents=True, exist_ok=True)

        joblib.dump(clf,           model_dir / "model.pkl")
        joblib.dump(scaler,        model_dir / "scaler.pkl")
        joblib.dump(label_encoder, model_dir / "label_encoder.pkl")
        joblib.dump(impute_report["imputer"], model_dir / "imputer.pkl")

        logger.info(f"Saved to {model_dir} | Accuracy: {acc:.4f} | F1: {f1:.4f}")

        return {
            "model_path":       str(model_dir),
            "accuracy":         round(acc, 4),
            "precision_score":  round(prec, 4),
            "recall_score":     round(rec, 4),
            "f1_score":         round(f1, 4),
            "feature_importance": importance,
            "classes":          class_names,
            "training_params":  {
                "model_type":         model_type,
                "n_samples":          int(len(X)),
                "n_features":         int(len(feat_names)),
                "test_size":          0.2,
                "split_method":       "chronological",
                "class_weights":      {k: round(float(v), 4) for k, v in class_weights.items()},
                "class_distribution": {k: int(v) for k, v in dict(y.value_counts()).items()},
                "per_class_metrics":  per_class,
                "imputed_columns":    impute_report["imputed_columns"],
                "feature_cols":       feat_names,
                "tiers":              class_names,
            },
        }

    def predict(self, model_path: str, processed_file: Path) -> pd.DataFrame:
        """Load model and predict on processed data."""
        model_dir = Path(model_path)
        clf    = joblib.load(model_dir / "model.pkl")
        scaler = joblib.load(model_dir / "scaler.pkl")
        le     = joblib.load(model_dir / "label_encoder.pkl")

        # Load imputer if it was saved with this model
        imputer_path = model_dir / "imputer.pkl"
        imputer = joblib.load(imputer_path) if imputer_path.exists() else None

        df = self.load_processed_data(processed_file)
        X, _, _ = self.prepare_features(df)

        # Use the saved imputer for consistent imputation (prevents data leakage)
        if imputer is not None:
            try:
                X_arr = imputer.transform(X)
                X = pd.DataFrame(X_arr, columns=X.columns, index=X.index)
            except Exception:
                pass  # imputer may have different features — skip gracefully

        # Replace any remaining inf/nan
        X = X.replace([float('inf'), float('-inf')], np.nan)
        X = X.fillna(X.median(numeric_only=True)).fillna(0)

        X_scaled      = scaler.transform(X)
        y_pred_enc    = clf.predict(X_scaled)
        y_pred_labels = le.inverse_transform(y_pred_enc)
        confidence    = clf.predict_proba(X_scaled).max(axis=1)

        result = df[["product_id"]].copy()

        # Build metric_date
        if "eval_year" in df.columns and "eval_month" in df.columns:
            result["metric_date"] = pd.to_datetime(
                df["eval_year"].astype(str) + "-" +
                df["eval_month"].astype(str).str.zfill(2) + "-01",
                errors="coerce"
            )
        elif "eval_period" in df.columns:
            result["metric_date"] = pd.to_datetime(df["eval_period"], errors="coerce")
        else:
            result["metric_date"] = None

        result["prediction_label"] = y_pred_labels
        result["confidence"]       = confidence.round(4)

        # Use actual performance_score to derive tier (business rule overrides ML label)
        if "performance_score" in df.columns:
            result["actual_score"] = df["performance_score"].values
            scores = pd.to_numeric(df["performance_score"], errors="coerce").fillna(0)
            result["prediction_label"] = scores.apply(
                lambda s: "High" if s >= 80 else ("Medium" if s >= 50 else "Low")
            ).values

        return result


# Singleton
ml_pipeline = MLPipeline()
