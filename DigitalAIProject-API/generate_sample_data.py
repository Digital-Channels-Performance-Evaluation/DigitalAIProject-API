"""
AHADU PULSE — Sample CSV Dataset Generator
Regenerates database/sample_data.csv for Settings → Data Upload testing.

Run: py generate_sample_data.py
"""
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

from gen_test_files_final import PRODUCTS, make_row

OUT = Path(__file__).parent / "database" / "sample_data.csv"

# Column order matches existing sample_data.csv and data_service ingest schema
COLS_CSV = [
    "product_code", "period_date", "total_users", "active_users", "new_users", "churned_users",
    "total_transactions", "successful_transactions", "failed_transactions", "failed_txn_rate",
    "transaction_volume", "total_revenue", "fee_revenue", "uptime_percentage",
    "downtime_hours", "downtime_minutes", "avg_response_time_ms", "api_error_rate",
    "total_complaints", "resolved_complaints", "csat_score",
    "fraud_event_count", "security_incident_count",
]

MIN_ROWS = 50
MAX_ROWS = 150
NUM_PRODUCTS = len(PRODUCTS)
TARGET_ROWS = 120  # 20 days × 6 products — quick upload testing
DAYS = TARGET_ROWS // NUM_PRODUCTS


def main():
    start = date(2025, 1, 1)
    dates = [start + timedelta(days=i) for i in range(DAYS)]

    rows = []
    for p in PRODUCTS:
        for i, d in enumerate(dates):
            rows.append(make_row(p["code"], d, i, p))

    df = pd.DataFrame(rows)[COLS_CSV]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT, index=False)

    row_count = len(df)
    if not (MIN_ROWS <= row_count <= MAX_ROWS):
        raise SystemExit(
            f"Row count {row_count} is outside required range [{MIN_ROWS}, {MAX_ROWS}]"
        )

    print(f"Generated {OUT}")
    print(f"  Rows   : {row_count:,}")
    print(f"  Columns: {len(df.columns)}")
    print(f"  Period : {df['period_date'].min()} -> {df['period_date'].max()}")
    print(f"  Products: {df['product_code'].nunique()}")


if __name__ == "__main__":
    main()
