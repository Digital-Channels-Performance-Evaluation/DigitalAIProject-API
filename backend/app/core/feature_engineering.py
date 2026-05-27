import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import logging
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FeatureEngineer:
    """Automated feature engineering for product performance data"""
    
    def __init__(self):
        self.required_columns = [
            'product_id', 'metric_date', 'total_users', 'active_users',
            'transaction_count', 'transaction_value', 'revenue',
            'failed_transactions', 'complaints', 'downtime_minutes'
        ]
        # Optional columns — filled with 0 if absent
        self.optional_columns = ['fraud_incidents']
    
    def load_raw_data(self, file_path: Path) -> pd.DataFrame:
        """Load CSV, Excel, or JSON file"""
        if file_path.suffix == '.csv':
            df = pd.read_csv(file_path)
        elif file_path.suffix in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        elif file_path.suffix == '.json':
            df = pd.read_json(file_path)
        else:
            raise ValueError(f"Unsupported format: {file_path.suffix}")
        
        # Convert date column
        if 'metric_date' in df.columns:
            df['metric_date'] = pd.to_datetime(df['metric_date'])
        
        return df
    
    def validate_data(self, df: pd.DataFrame) -> dict:
        """Validate data quality before feature engineering"""
        date_min = df['metric_date'].min() if 'metric_date' in df.columns else None
        date_max = df['metric_date'].max() if 'metric_date' in df.columns else None

        validation_report = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "row_count": len(df),
            "column_count": len(df.columns),
            "missing_values": {k: int(v) for k, v in df.isnull().sum().items()},
            "date_range": {
                "min": str(date_min) if date_min is not None and not pd.isnull(date_min) else None,
                "max": str(date_max) if date_max is not None and not pd.isnull(date_max) else None,
            }
        }
        
        # Check required columns
        missing_cols = [col for col in self.required_columns if col not in df.columns]
        if missing_cols:
            validation_report["is_valid"] = False
            validation_report["errors"].append(f"Missing columns: {missing_cols}")
        
        # Check for empty data
        if len(df) == 0:
            validation_report["is_valid"] = False
            validation_report["errors"].append("Dataset is empty")
        
        # Check date range
        if 'metric_date' in df and df['metric_date'].isnull().any():
            validation_report["warnings"].append("Null dates found")
        
        return validation_report
    
    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform raw data into ML-ready features"""

        # Fill optional columns with 0 if missing
        for col in self.optional_columns:
            if col not in df.columns:
                df[col] = 0

        # Sort by product and date
        df = df.sort_values(['product_id', 'metric_date'])
        
        # 1. Growth features
        df['user_growth_rate'] = df.groupby('product_id')['total_users'].pct_change() * 100
        df['transaction_growth_rate'] = df.groupby('product_id')['transaction_count'].pct_change() * 100
        df['revenue_growth_rate'] = df.groupby('product_id')['revenue'].pct_change() * 100
        
        # 2. Operational features
        df['failure_rate'] = (df['failed_transactions'] / df['transaction_count']) * 100
        df['complaints_per_1000_users'] = (df['complaints'] / df['total_users']) * 1000
        df['uptime_percentage'] = 100 - ((df['downtime_minutes'] / (24 * 60)) * 100)
        
        # 3. Adoption features
        df['active_user_ratio'] = (df['active_users'] / df['total_users']) * 100
        df['retention_rate'] = df.groupby('product_id')['active_users'].shift(1) / df['active_users'] * 100
        
        # 4. Financial efficiency
        df['revenue_per_user'] = df['revenue'] / df['total_users']
        df['transaction_value_per_user'] = df['transaction_value'] / df['active_users']
        
        # 5. Rolling averages (7-day)
        df['transaction_volume_7d_avg'] = df.groupby('product_id')['transaction_count'].transform(
            lambda x: x.rolling(7, min_periods=1).mean()
        )
        df['revenue_7d_avg'] = df.groupby('product_id')['revenue'].transform(
            lambda x: x.rolling(7, min_periods=1).mean()
        )
        
        # 6. Risk indicators
        df['fraud_rate'] = (df['fraud_incidents'] / df['transaction_count']) * 100000  # per 100k transactions
        df['operational_risk_score'] = (
            df['failure_rate'] * 0.4 + 
            df['downtime_minutes'] * 0.3 + 
            df['fraud_rate'] * 0.3
        )
        
        # 7. Fill NaN values
        df = df.fillna({
            'user_growth_rate': 0,
            'failure_rate': 0,
            'retention_rate': 100,
            'active_user_ratio': 0,
            'fraud_rate': 0
        })
        
        # 8. Cap outliers
        for col in ['failure_rate', 'fraud_rate', 'operational_risk_score']:
            if col in df.columns:
                upper_cap = df[col].quantile(0.99)
                df[col] = df[col].clip(upper=upper_cap)
        
        return df
    
    def save_processed_data(self, df: pd.DataFrame, output_path: Path):
        """Save featured data for model training"""
        df.to_csv(output_path, index=False)
        logger.info(f"Saved featured data to {output_path}")
        return output_path
    
    def process_file(self, file_path: Path) -> dict:
        """End-to-end processing: raw file → features → save"""
        logger.info(f"Processing file: {file_path}")
        
        # Load
        raw_df = self.load_raw_data(file_path)
        
        # Validate
        validation = self.validate_data(raw_df)
        if not validation["is_valid"]:
            return {"status": "failed", "validation": validation}
        
        # Engineer features
        featured_df = self.engineer_features(raw_df)
        
        # Save processed
        output_name = f"{file_path.stem}_featured.csv"
        output_path = settings.PROCESSED_DATA_DIR / output_name
        self.save_processed_data(featured_df, output_path)
        
        # Save validation report
        report_path = settings.VALIDATION_DIR / f"{file_path.stem}_validation.json"
        import json
        with open(report_path, 'w') as f:
            json.dump(validation, f, indent=2, default=str)
        
        return {
            "status": "success",
            "original_file": str(file_path),
            "processed_file": str(output_path),
            "validation": validation,
            "featured_shape": list(featured_df.shape),
            "features_created": [col for col in featured_df.columns if col not in self.required_columns]
        }

# Singleton instance
feature_engineer = FeatureEngineer()