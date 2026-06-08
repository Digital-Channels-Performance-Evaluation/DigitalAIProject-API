"""
Feature Engineering

Imports & Setup
"""
import pandas as pd
import numpy as np
from pathlib import Path
import json
import logging
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = [
    "product_id", "eval_period", "eval_year", "eval_month",
    "total_users", "active_users", "monthly_txn_count",
    "txn_value_etb", "revenue_etb", "complaint_volume",
    "downtime_minutes", "performance_score", "performance_tier",
]

PRECOMPUTED_FEATURES = [
    "active_user_rate", "revenue_per_txn", "revenue_per_active_user",
    "downtime_impact_score", "operational_efficiency_score",
    "complaint_growth_rate", "complaint_resolution_rate",
]

TIER_MAP = {
    "high": "High", "HIGH": "High",
    "medium": "Medium", "MEDIUM": "Medium",
    "low": "Low", "LOW": "Low",
}

# Numeric columns that must be coerced before arithmetic
NUMERIC_COLS = [
    "total_users", "active_users", "monthly_txn_count", "txn_value_etb",
    "revenue_etb", "complaint_volume", "downtime_minutes", "performance_score",
    "new_user_registrations", "churned_users", "eval_year", "eval_month",
] + PRECOMPUTED_FEATURES


def _median_fill(series: pd.Series, col_name: str) -> pd.Series:
    """Fill NaN/Inf with column median. Log a warning if any values were imputed."""
    s = series.replace([float('inf'), float('-inf')], np.nan)
    n_missing = int(s.isna().sum())
    if n_missing > 0:
        median = s.median()
        logger.warning(
            f"Column '{col_name}': {n_missing} missing/inf values "
            f"filled with median ({median:.4g})"
        )
        s = s.fillna(median)
    return s


class FeatureEngineer:
    """Feature engineering aligned to the production dataset format."""

    def load_raw_data(self, file_path: Path) -> pd.DataFrame:
        """Load CSV, Excel, or JSON — normalise column names immediately."""
        suffix = file_path.suffix.lower()
        if suffix == ".csv":
            df = pd.read_csv(file_path)
        elif suffix in [".xlsx", ".xls"]:
            df = pd.read_excel(file_path)
        elif suffix == ".json":
            df = pd.read_json(file_path)
        else:
            raise ValueError(f"Unsupported format: {file_path.suffix}")
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
        return df

    def validate_data(self, df: pd.DataFrame) -> dict:
        """Validate production dataset — never blocks on missing values, only warns."""
        missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]

        report = {
            "is_valid":      len(missing_cols) == 0 and len(df) > 0,
            "errors":        [],
            "warnings":      [],
            "row_count":     len(df),
            "column_count":  len(df.columns),
            "format":        "production",
            "missing_values": {k: int(v) for k, v in df.isnull().sum().items() if v > 0},
            "date_range":    {},
        }

        if missing_cols:
            report["errors"].append(f"Missing required columns: {missing_cols}")
        if len(df) == 0:
            report["errors"].append("Dataset is empty")
        if len(df) < 10:
            report["warnings"].append(f"Very small dataset ({len(df)} rows)")

        if "eval_year" in df.columns and "eval_month" in df.columns:
            try:
                report["date_range"] = {
                    "min": f"{int(df['eval_year'].min())}-{int(df['eval_month'].min()):02d}",
                    "max": f"{int(df['eval_year'].max())}-{int(df['eval_month'].max()):02d}",
                }
            except Exception:
                pass

        if "performance_tier" in df.columns:
            report["tiers_found"] = df["performance_tier"].dropna().unique().tolist()

        # Warn about missing values — imputation will handle them
        for col, n in report["missing_values"].items():
            report["warnings"].append(f"Column '{col}' has {n} missing value(s) — will be imputed")

        return report

    def _coerce_numerics(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Coerce all known numeric columns to float.
        Uses median imputation — never zero-fill.
        """
        for col in NUMERIC_COLS:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")
                df[col] = _median_fill(df[col], col)
        return df

    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        # ── 0. Coerce + median-impute all numeric columns ──────────────────────
        df = self._coerce_numerics(df)

        # ── 1. Normalise tier labels ───────────────────────────────────────────
        if "performance_tier" in df.columns:
            df["performance_tier"] = (
                df["performance_tier"].astype(str).str.strip()
                .map(TIER_MAP).fillna(df["performance_tier"])
            )

        # ── 2. Sort chronologically by product + period ───────────────────────
        df = df.sort_values(["product_id", "eval_year", "eval_month"]).reset_index(drop=True)

        # ── 3. Derive growth features (using safe division) pct_change() - (current - previous) / previous───────────────────
        for col, new_col in [
            ("total_users",         "user_growth_rate"),
            ("monthly_txn_count",   "txn_growth_rate"),
            ("revenue_etb",         "revenue_growth_rate"),
        ]:
            if col in df.columns:
                raw = df.groupby("product_id")[col].pct_change() * 100
                df[new_col] = _median_fill(raw, new_col).round(4)

        # ── 4. Churn rate ─────────────────────────────────────────────────────
        if "churned_users" in df.columns and "total_users" in df.columns:
            prev = df.groupby("product_id")["total_users"].shift(1)
            prev = prev.replace(0, np.nan)
            raw_churn = df["churned_users"] / prev * 100
            df["churn_rate"] = _median_fill(raw_churn, "churn_rate").round(4)
        else:
            df["churn_rate"] = np.nan
            df["churn_rate"] = _median_fill(df["churn_rate"], "churn_rate")

        # ── 5. New user rate ──────────────────────────────────────────────────
        if "new_user_registrations" in df.columns and "total_users" in df.columns:
            raw_nur = df["new_user_registrations"] / df["total_users"].replace(0, np.nan) * 100
            df["new_user_rate"] = _median_fill(raw_nur, "new_user_rate").round(4)
        else:
            df["new_user_rate"] = np.nan
            df["new_user_rate"] = _median_fill(df["new_user_rate"], "new_user_rate")

        # ── 6. Revenue per user ───────────────────────────────────────────────
        if "revenue_etb" in df.columns and "total_users" in df.columns:
            raw_rpu = df["revenue_etb"] / df["total_users"].replace(0, np.nan)
            df["revenue_per_user"] = _median_fill(raw_rpu, "revenue_per_user").round(4)
        else:
            df["revenue_per_user"] = np.nan
            df["revenue_per_user"] = _median_fill(df["revenue_per_user"], "revenue_per_user")

        # ── 7. 3-month rolling averages ───────────────────────────────────────
        for col, new_col in [
            ("monthly_txn_count", "txn_volume_3m_avg"),
            ("revenue_etb",       "revenue_3m_avg"),
        ]:
            if col in df.columns:
                df[new_col] = df.groupby("product_id")[col].transform(
                    lambda x: x.rolling(3, min_periods=1).mean()
                ).round(2)
                df[new_col] = _median_fill(df[new_col], new_col)

        # ── 8. Ensure pre-computed features exist — derive if missing ────
        # active_user_rate = active_users / total_users
        if "active_user_rate" not in df.columns or df["active_user_rate"].isna().all():
            if "active_users" in df.columns and "total_users" in df.columns:
                raw = df["active_users"] / df["total_users"].replace(0, np.nan)
                df["active_user_rate"] = _median_fill(raw, "active_user_rate").round(4)
            else:
                df["active_user_rate"] = np.nan

        # revenue_per_txn = revenue_etb / monthly_txn_count
        if "revenue_per_txn" not in df.columns or df["revenue_per_txn"].isna().all():
            if "revenue_etb" in df.columns and "monthly_txn_count" in df.columns:
                raw = df["revenue_etb"] / df["monthly_txn_count"].replace(0, np.nan)
                df["revenue_per_txn"] = _median_fill(raw, "revenue_per_txn").round(4)
            else:
                df["revenue_per_txn"] = np.nan

        # revenue_per_active_user = revenue_etb / active_users
        if "revenue_per_active_user" not in df.columns or df["revenue_per_active_user"].isna().all():
            if "revenue_etb" in df.columns and "active_users" in df.columns:
                raw = df["revenue_etb"] / df["active_users"].replace(0, np.nan)
                df["revenue_per_active_user"] = _median_fill(raw, "revenue_per_active_user").round(4)
            else:
                df["revenue_per_active_user"] = np.nan

        # downtime_impact_score = downtime_minutes / 1440 * 100  (% of day)
        if "downtime_impact_score" not in df.columns or df["downtime_impact_score"].isna().all():
            if "downtime_minutes" in df.columns:
                df["downtime_impact_score"] = (df["downtime_minutes"] / 1440 * 100).round(4)
            else:
                df["downtime_impact_score"] = np.nan

        # operational_efficiency_score = 100 - downtime_impact_score
        if "operational_efficiency_score" not in df.columns or df["operational_efficiency_score"].isna().all():
            if "downtime_impact_score" in df.columns:
                df["operational_efficiency_score"] = (100 - df["downtime_impact_score"]).round(4)
            else:
                df["operational_efficiency_score"] = np.nan

        # complaint_growth_rate = pct_change of complaint_volume per product
        if "complaint_growth_rate" not in df.columns or df["complaint_growth_rate"].isna().all():
            if "complaint_volume" in df.columns:
                raw = df.groupby("product_id")["complaint_volume"].pct_change() * 100
                df["complaint_growth_rate"] = _median_fill(raw, "complaint_growth_rate").round(4)
            else:
                df["complaint_growth_rate"] = np.nan

        # complaint_resolution_rate — if not available, default to 100 (assume all resolved)
        if "complaint_resolution_rate" not in df.columns or df["complaint_resolution_rate"].isna().all():
            logger.warning("'complaint_resolution_rate' not found — defaulting to 75.0")
            df["complaint_resolution_rate"] = 75.0

        # Final median fill for any remaining NaN in precomputed features
        for col in PRECOMPUTED_FEATURES:
            if col in df.columns and df[col].isna().any():
                df[col] = _median_fill(df[col], col)

        # ── 9. Replace inf then cap outliers ─────────────────────────────────
        growth_cols = [
            "user_growth_rate", "txn_growth_rate", "revenue_growth_rate",
            "churn_rate", "complaint_growth_rate",
        ]
        for col in growth_cols:
            if col in df.columns:
                df[col] = df[col].replace([float('inf'), float('-inf')], np.nan)
                df[col] = _median_fill(df[col], col)
                p01 = df[col].quantile(0.01)
                p99 = df[col].quantile(0.99)
                df[col] = df[col].clip(lower=p01, upper=p99)

        # ── 10. Final: replace any remaining inf/nan in all numeric cols ──────
        num_cols = df.select_dtypes(include="number").columns
        df[num_cols] = df[num_cols].replace([float('inf'), float('-inf')], np.nan)
        # Use median per column (not zero)
        for col in num_cols:
            if df[col].isna().any():
                median = df[col].median()
                df[col] = df[col].fillna(median if not np.isnan(median) else 0)

        # ── 11. Deduplicate: keep last per product + period ───────────────────
        df = df.drop_duplicates(
            subset=["product_id", "eval_year", "eval_month"], keep="last"
        ).reset_index(drop=True)

        return df

    def process_file(self, file_path: Path) -> dict:
        """End-to-end: load → validate → engineer → save."""
        logger.info(f"Processing: {file_path.name}")

        df = self.load_raw_data(file_path)
        validation = self.validate_data(df)

        if not validation["is_valid"]:
            return {"status": "failed", "validation": validation}

        featured_df = self.engineer_features(df)

        output_name = f"{file_path.stem}_featured.csv"
        output_path = settings.PROCESSED_DATA_DIR / output_name
        featured_df.to_csv(output_path, index=False)
        logger.info(f"Saved: {output_path} ({len(featured_df)} rows)")

        report_path = settings.VALIDATION_DIR / f"{file_path.stem}_validation.json"
        with open(report_path, "w") as f:
            json.dump(validation, f, indent=2, default=str)

        original_cols = set(df.columns)
        features_created = [c for c in featured_df.columns if c not in original_cols]

        return {
            "status":           "success",
            "original_file":    str(file_path),
            "processed_file":   str(output_path),
            "validation":       validation,
            "featured_shape":   list(featured_df.shape),
            "features_created": features_created,
        }


# Singleton
feature_engineer = FeatureEngineer()
