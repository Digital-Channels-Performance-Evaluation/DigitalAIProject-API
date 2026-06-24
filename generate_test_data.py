"""
Generate small test dataset for end-user testing
Creates 300 rows (50 days × 6 products) for quick upload testing
"""
import pandas as pd
from datetime import date, timedelta
from pathlib import Path

# Product codes matching your database
PRODUCTS = [
    {"code": "MB_APP", "name": "Mobile Banking App"},
    {"code": "CARD_SYS", "name": "Card Banking System"},
    {"code": "ATM_NET", "name": "ATM Network"},
    {"code": "POS_SYS", "name": "POS System"},
    {"code": "QR_PAY", "name": "QR Payment"},
    {"code": "WALLET", "name": "Digital Wallet"},
]

def generate_row(product_code, period_date, day_num):
    """Generate realistic data for one day"""
    import random
    
    # Base metrics with realistic ranges
    total_users = random.randint(5000, 15000)
    active_users = int(total_users * random.uniform(0.6, 0.9))
    total_txn = random.randint(2000, 8000)
    success_rate = random.uniform(0.95, 0.99)
    
    return {
        "product_code": product_code,
        "period_date": period_date,
        "total_users": total_users,
        "active_users": active_users,
        "new_users": random.randint(100, 500),
        "churned_users": random.randint(50, 200),
        "total_transactions": total_txn,
        "successful_transactions": int(total_txn * success_rate),
        "failed_transactions": int(total_txn * (1 - success_rate)),
        "failed_txn_rate": round((1 - success_rate) * 100, 2),
        "transaction_volume": round(total_txn * random.uniform(500, 2000), 2),
        "total_revenue": round(total_txn * random.uniform(10, 50), 2),
        "fee_revenue": round(total_txn * random.uniform(2, 10), 2),
        "uptime_percentage": round(random.uniform(98.5, 99.9), 2),
        "downtime_minutes": round(random.uniform(1, 20), 1),
        "downtime_hours": round(random.uniform(0.02, 0.5), 2),
        "avg_response_time_ms": round(random.uniform(100, 500), 1),
        "api_error_rate": round(random.uniform(0.1, 2.0), 2),
        "total_complaints": random.randint(5, 30),
        "resolved_complaints": random.randint(3, 25),
        "csat_score": round(random.uniform(3.5, 4.8), 2),
        "fraud_event_count": random.randint(0, 5),
        "security_incident_count": random.randint(0, 3),
    }

def main():
    # Generate data for last 50 days
    start_date = date.today() - timedelta(days=50)
    dates = [start_date + timedelta(days=i) for i in range(50)]
    
    rows = []
    for product in PRODUCTS:
        for day_num, dt in enumerate(dates):
            rows.append(generate_row(product["code"], dt, day_num))
    
    # Create DataFrame
    df = pd.DataFrame(rows)
    
    # Save to test_data folder
    output_dir = Path("test_data")
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / "sample_test_dataset.csv"
    
    df.to_csv(output_path, index=False)
    
    print(f"✅ Test dataset created: {output_path}")
    print(f"   Rows: {len(df):,}")
    print(f"   Columns: {len(df.columns)}")
    print(f"   Products: {df['product_code'].nunique()}")
    print(f"   Period: {df['period_date'].min()} to {df['period_date'].max()}")
    print(f"   Size: {output_path.stat().st_size / 1024:.1f} KB")
    print()
    print("📤 Upload instructions:")
    print(f"   1. Go to: http://localhost:3000")
    print(f"   2. Login as admin")
    print(f"   3. Go to Settings > Data Upload")
    print(f"   4. Upload: {output_path}")
    print()
    print("⏱️  Expected processing time: 1-2 minutes")
    print("🤖 AUTO_TRAIN is enabled - models will train automatically!")

if __name__ == "__main__":
    main()
