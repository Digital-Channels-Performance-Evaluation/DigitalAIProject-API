"""
Data Management Service - Upload, validate, process.
"""
import io
import uuid
import logging
import pandas as pd
from typing import List, Tuple
from datetime import date
from sqlalchemy.orm import Session

from app.models.data import RawData
from app.models.product import Product
from app.schemas.data import ValidationResult

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = ["product_code", "period_date"]

# All columns that may appear in an uploaded CSV
NUMERIC_COLUMNS = [
    "total_users", "active_users", "new_users", "churned_users",
    "total_transactions", "successful_transactions", "failed_transactions",
    "transaction_volume", "total_revenue", "fee_revenue",
    "uptime_percentage", "downtime_hours", "downtime_minutes",
    "avg_response_time_ms", "api_error_rate",
    "total_complaints", "resolved_complaints",
    "failed_txn_rate", "csat_score",
    "fraud_event_count", "security_incident_count",
]

RANGE_RULES = {
    "uptime_percentage":  (0, 100),
    "failed_txn_rate":    (0, 100),
    "csat_score":         (1, 5),
}


class DataService:
    COLUMN_ALIASES = {
        "monthly_txn_count": "total_transactions",
        "txn_count": "total_transactions",
        "txn_value_etb": "transaction_volume",
        "transaction_volume_etb": "transaction_volume",
        "revenue_etb": "total_revenue",
        "total_revenue_etb": "total_revenue",
        "fee_revenue_etb": "fee_revenue",
        "complaint_volume": "total_complaints",
        "complaints": "total_complaints",
        "resolved_complaint_count": "resolved_complaints",
        "fraud_incidents": "fraud_event_count",
        "security_incidents": "security_incident_count",
        "avg_session_duration": "avg_response_time_ms",
        "avg_session_duration_sec": "avg_response_time_ms",
    }

    def _normalise_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normalise headers from generated/BRD files to raw_data column names."""
        df = df.copy()
        df.columns = [
            str(c).strip().lower().replace(" ", "_").replace("-", "_")
            for c in df.columns
        ]

        rename_map = {}
        for alias, canonical in self.COLUMN_ALIASES.items():
            if alias in df.columns and canonical not in df.columns:
                rename_map[alias] = canonical
        if rename_map:
            df = df.rename(columns=rename_map)

        # If a spreadsheet contains duplicate canonical columns after aliasing,
        # keep the first value. Pandas can otherwise return Series for row.get().
        df = df.loc[:, ~df.columns.duplicated()]
        return df

    def validate_dataframe(self, df: pd.DataFrame, db: Session) -> ValidationResult:
        errors = []
        warnings = []

        for col in REQUIRED_COLUMNS:
            if col not in df.columns:
                errors.append(f"Missing required column: {col}")

        if errors:
            return ValidationResult(
                is_valid=False, errors=errors, warnings=warnings,
                row_count=len(df), invalid_rows=len(df)
            )

        missing = df[REQUIRED_COLUMNS].isnull().sum()
        for col, count in missing.items():
            if count > 0:
                errors.append(f"Column '{col}' has {count} missing values")

        dup_count = df.duplicated(subset=["product_code", "period_date"]).sum()
        if dup_count > 0:
            warnings.append(f"{dup_count} duplicate records found (product_code + period_date)")

        for col, (min_val, max_val) in RANGE_RULES.items():
            if col in df.columns:
                out_of_range = df[col].dropna().apply(
                    lambda x: not (min_val <= x <= max_val)
                ).sum()
                if out_of_range > 0:
                    warnings.append(
                        f"Column '{col}' has {out_of_range} values outside [{min_val}, {max_val}]"
                    )

        for col in NUMERIC_COLUMNS:
            if col in df.columns:
                neg_count = (df[col].dropna() < 0).sum()
                if neg_count > 0:
                    errors.append(f"Column '{col}' has {neg_count} negative values")

        if "product_code" in df.columns:
            codes = df["product_code"].dropna().unique().tolist()
            existing_codes = [
                p.code for p in db.query(Product).filter(Product.code.in_(codes)).all()
            ]
            invalid_codes = [c for c in codes if c not in existing_codes]
            if invalid_codes:
                errors.append(f"Unknown product codes: {invalid_codes}")

        invalid_rows = len(df) if errors else 0
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            row_count=len(df),
            invalid_rows=invalid_rows,
        )

    def ingest_dataframe(
        self, df: pd.DataFrame, db: Session,
        source: str = "csv", uploaded_by: int = None
    ) -> Tuple[int, int, str]:
        """Ingest validated dataframe into raw_data table — writes all BRD columns.
        Returns (success_count, error_count, batch_id).
        """
        batch_id = str(uuid.uuid4())
        success_count = 0
        error_count = 0

        codes    = df["product_code"].dropna().unique().tolist()
        products = {
            p.code: p.id
            for p in db.query(Product).filter(Product.code.in_(codes)).all()
        }

        for _, row in df.iterrows():
            product_id = products.get(row.get("product_code"))
            if not product_id:
                error_count += 1
                continue

            try:
                period_date = pd.to_datetime(row["period_date"]).date()
            except Exception:
                error_count += 1
                continue

            # Derive downtime_minutes / downtime_hours from whichever is present
            dh = self._safe_float(row.get("downtime_hours"))
            dm = self._safe_float(row.get("downtime_minutes"))
            if dm is None and dh is not None:
                dm = dh * 60
            if dh is None and dm is not None:
                dh = dm / 60

            # Derive failed_txn_rate if not provided
            failed_txn_rate = self._safe_float(row.get("failed_txn_rate"))
            if failed_txn_rate is None:
                total = self._safe_float(row.get("total_transactions"))
                failed = self._safe_float(row.get("failed_transactions"))
                if total and failed is not None and total > 0:
                    failed_txn_rate = round(failed / total * 100, 4)

            raw = RawData(
                product_id=product_id,
                period_date=period_date,
                # User metrics
                total_users=self._safe_float(row.get("total_users")),
                active_users=self._safe_float(row.get("active_users")),
                new_users=self._safe_float(row.get("new_users")),
                churned_users=self._safe_float(row.get("churned_users")),
                # Transaction metrics
                total_transactions=self._safe_float(row.get("total_transactions")),
                successful_transactions=self._safe_float(row.get("successful_transactions")),
                failed_transactions=self._safe_float(row.get("failed_transactions")),
                failed_txn_rate=failed_txn_rate,
                transaction_volume=self._safe_float(row.get("transaction_volume")),
                # Revenue metrics
                total_revenue=self._safe_float(row.get("total_revenue")),
                fee_revenue=self._safe_float(row.get("fee_revenue")),
                # Operational metrics
                uptime_percentage=self._safe_float(row.get("uptime_percentage")),
                downtime_minutes=dm,
                downtime_hours=dh,
                avg_response_time_ms=self._safe_float(row.get("avg_response_time_ms")),
                api_error_rate=self._safe_float(row.get("api_error_rate")),
                # Complaint / CRM metrics
                total_complaints=self._safe_float(row.get("total_complaints")),
                resolved_complaints=self._safe_float(row.get("resolved_complaints")),
                csat_score=self._safe_float(row.get("csat_score")),
                # Risk metrics
                fraud_event_count=self._safe_int(row.get("fraud_event_count")),
                security_incident_count=self._safe_int(row.get("security_incident_count")),
                # Metadata
                source=source,
                upload_batch_id=batch_id,
                is_validated=True,
                uploaded_by=uploaded_by,
            )
            db.add(raw)
            success_count += 1

        db.commit()
        return success_count, error_count, batch_id

    def _safe_float(self, val) -> float:
        if val is None:
            return None
        if isinstance(val, float) and pd.isna(val):
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    def _safe_int(self, val) -> int:
        if val is None:
            return None
        if isinstance(val, float) and pd.isna(val):
            return None
        try:
            return int(float(val))
        except (ValueError, TypeError):
            return None

    def read_file(self, file_content: bytes, filename: str) -> pd.DataFrame:
        """Read CSV or Excel file into dataframe.
        Handles files with title rows at the top (skips up to 5 rows to find headers).
        """
        fname = (filename or "").lower()

        if fname.endswith(".csv"):
            # Try plain read first, then skip rows if required columns missing
            df = pd.read_csv(io.BytesIO(file_content))
            df = self._normalise_dataframe(df)
            if "product_code" not in df.columns:
                for skip in range(1, 6):
                    try:
                        df = pd.read_csv(io.BytesIO(file_content), skiprows=skip)
                        df = self._normalise_dataframe(df)
                        if "product_code" in df.columns:
                            break
                    except Exception:
                        continue
            return df

        elif fname.endswith((".xlsx", ".xls")):
            # Prefer the generated upload sheet if present, then try the first sheet.
            excel = pd.ExcelFile(io.BytesIO(file_content))
            sheet = "Upload_Ready" if "Upload_Ready" in excel.sheet_names else 0
            df = pd.read_excel(excel, sheet_name=sheet)
            df = self._normalise_dataframe(df)
            if "product_code" not in df.columns:
                for skip in range(1, 8):
                    try:
                        df = pd.read_excel(excel, sheet_name=sheet, skiprows=skip)
                        df = self._normalise_dataframe(df)
                        if "product_code" in df.columns:
                            break
                    except Exception:
                        continue
            return df

        else:
            raise ValueError(
                f"Unsupported file format: {filename}. Use .csv or .xlsx"
            )


data_service = DataService()
