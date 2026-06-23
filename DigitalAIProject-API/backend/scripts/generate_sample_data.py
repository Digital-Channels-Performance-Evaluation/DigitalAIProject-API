#!/usr/bin/env python3
"""
Generate realistic sample data for Digital Channels Performance Evaluation.

Usage:
    python generate_sample_data.py
    python generate_sample_data.py --rows 500 --products 8 --output my_data.csv
"""

import argparse
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
import sys

sys.path.append(str(Path(__file__).parent.parent))


PRODUCTS = {
    "MOBILE_BANKING":   {"base_users": 120_000, "tier": "excellent"},
    "INTERNET_BANKING": {"base_users": 85_000,  "tier": "good"},
    "USSD_SERVICE":     {"base_users": 200_000, "tier": "good"},
    "AGENT_BANKING":    {"base_users": 60_000,  "tier": "average"},
    "ATM_NETWORK":      {"base_users": 150_000, "tier": "average"},
    "POS_TERMINALS":    {"base_users": 40_000,  "tier": "poor"},
    "WALLET_APP":       {"base_users": 95_000,  "tier": "excellent"},
    "CORPORATE_PORTAL": {"base_users": 12_000,  "tier": "good"},
}

TIER_PARAMS = {
    "excellent": dict(
        active_ratio=(0.70, 0.90),
        failure_rate=(0.001, 0.015),
        downtime=(0, 15),
        fraud_rate=(0.0001, 0.001),
        complaint_rate=(0.001, 0.005),
        growth=(0.005, 0.025),
    ),
    "good": dict(
        active_ratio=(0.50, 0.72),
        failure_rate=(0.01, 0.04),
        downtime=(5, 45),
        fraud_rate=(0.0005, 0.003),
        complaint_rate=(0.003, 0.012),
        growth=(0.001, 0.015),
    ),
    "average": dict(
        active_ratio=(0.30, 0.55),
        failure_rate=(0.03, 0.08),
        downtime=(20, 120),
        fraud_rate=(0.001, 0.008),
        complaint_rate=(0.008, 0.025),
        growth=(-0.005, 0.010),
    ),
    "poor": dict(
        active_ratio=(0.10, 0.35),
        failure_rate=(0.06, 0.18),
        downtime=(60, 300),
        fraud_rate=(0.003, 0.015),
        complaint_rate=(0.015, 0.060),
        growth=(-0.020, 0.002),
    ),
}


def generate_product_series(product_id: str, config: dict, start_date: datetime, days: int) -> pd.DataFrame:
    rng = np.random.default_rng(abs(hash(product_id)) % (2**32))
    params = TIER_PARAMS[config["tier"]]
    rows = []
    users = config["base_users"]

    for i in range(days):
        date = start_date + timedelta(days=i)

        # Grow users slightly
        growth = rng.uniform(*params["growth"])
        users = max(1000, int(users * (1 + growth)))

        active_ratio = rng.uniform(*params["active_ratio"])
        active_users = int(users * active_ratio)

        txn_per_active = rng.uniform(2.5, 12.0)
        transaction_count = max(1, int(active_users * txn_per_active))

        avg_txn_value = rng.uniform(150, 4500)
        transaction_value = transaction_count * avg_txn_value * rng.uniform(0.85, 1.15)

        revenue_margin = rng.uniform(0.008, 0.025)
        revenue = transaction_value * revenue_margin

        failure_rate = rng.uniform(*params["failure_rate"])
        failed_transactions = int(transaction_count * failure_rate)

        complaint_rate = rng.uniform(*params["complaint_rate"])
        complaints = int(active_users * complaint_rate)

        downtime_minutes = rng.uniform(*params["downtime"])

        fraud_rate = rng.uniform(*params["fraud_rate"])
        fraud_incidents = max(0, int(transaction_count * fraud_rate))

        rows.append({
            "product_id": product_id,
            "metric_date": date.strftime("%Y-%m-%d"),
            "total_users": users,
            "active_users": active_users,
            "transaction_count": transaction_count,
            "transaction_value": round(transaction_value, 2),
            "revenue": round(revenue, 2),
            "failed_transactions": failed_transactions,
            "complaints": complaints,
            "downtime_minutes": round(downtime_minutes, 1),
            "fraud_incidents": fraud_incidents,
        })

    return pd.DataFrame(rows)


def main():
    parser = argparse.ArgumentParser(description="Generate sample digital channels dataset")
    parser.add_argument("--days", type=int, default=1095, help="Number of days of history (default: 1095)")
    parser.add_argument("--products", type=int, default=len(PRODUCTS), help=f"Number of products (max {len(PRODUCTS)})")
    parser.add_argument("--output", type=str, default=None, help="Output file path (default: data/raw/sample_data.csv)")
    parser.add_argument("--start-date", type=str, default=None, help="Start date YYYY-MM-DD (default: 90 days ago)")
    args = parser.parse_args()

    start_date = (
        datetime.strptime(args.start_date, "%Y-%m-%d")
        if args.start_date
        else datetime.now() - timedelta(days=args.days)
    )

    selected_products = dict(list(PRODUCTS.items())[: args.products])

    print(f"\n📊 Generating sample data:")
    print(f"   Products : {len(selected_products)}")
    print(f"   Days     : {args.days}")
    print(f"   Start    : {start_date.strftime('%Y-%m-%d')}")
    print(f"   Rows     : ~{len(selected_products) * args.days:,}\n")

    frames = []
    for product_id, config in selected_products.items():
        df = generate_product_series(product_id, config, start_date, args.days)
        frames.append(df)
        print(f"   ✅ {product_id:<22} ({config['tier']:>9}) — {len(df)} rows")

    combined = pd.concat(frames, ignore_index=True)
    combined = combined.sort_values(["metric_date", "product_id"]).reset_index(drop=True)

    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        try:
            from app.config import settings
            output_path = settings.RAW_DATA_DIR / "sample_data.csv"
        except Exception:
            output_path = Path(__file__).parent.parent / "data" / "raw" / "sample_data.csv"

    output_path.parent.mkdir(parents=True, exist_ok=True)
    combined.to_csv(output_path, index=False)

    print(f"\n✅ Saved {len(combined):,} rows → {output_path}")
    print(f"   Columns: {list(combined.columns)}\n")


if __name__ == "__main__":
    main()
