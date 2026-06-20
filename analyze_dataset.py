import pandas as pd
import numpy as np
import sys

FULL  = r"A:\ML Model project\ahadu_bank_full_dataset.csv"
TRAIN = r"A:\ML Model project\ahadu_bank_train_dataset.csv"
TEST  = r"A:\ML Model project\ahadu_bank_test_dataset.csv"

print("Loading datasets...")
full  = pd.read_csv(FULL)
train = pd.read_csv(TRAIN)
test  = pd.read_csv(TEST)

# ── 1. Sizes & columns ───────────────────────────────────────────────────────
print("\n==== DATASET SIZES ====")
print(f"  Full  : {len(full):,} rows x {len(full.columns)} cols")
print(f"  Train : {len(train):,} rows x {len(train.columns)} cols")
print(f"  Test  : {len(test):,} rows x {len(test.columns)} cols")
print(f"\n  Columns: {' | '.join(full.columns.tolist())}")

# ── 2. Dtypes ────────────────────────────────────────────────────────────────
print("\n==== COLUMN DTYPES ====")
for col, dt in full.dtypes.items():
    print(f"  {col:<38} {dt}")

# ── 3. Tier distribution ─────────────────────────────────────────────────────
print("\n==== TIER DISTRIBUTION (Full) ====")
for tier, cnt in full['performance_tier'].value_counts().sort_index().items():
    pct = cnt / len(full) * 100
    print(f"  {tier:<8}: {cnt:>7,}  ({pct:.1f}%)")

# ── 4. Product distribution ──────────────────────────────────────────────────
print("\n==== PRODUCT DISTRIBUTION ====")
for prod, cnt in full['product_id'].value_counts().items():
    print(f"  {prod:<22}: {cnt:>7,}")

# ── 5. Year distribution ─────────────────────────────────────────────────────
print("\n==== YEAR DISTRIBUTION ====")
for yr, cnt in full['eval_year'].value_counts().sort_index().items():
    print(f"  Year {yr}: {cnt:>7,} rows")

# ── 6. Performance score stats ───────────────────────────────────────────────
print("\n==== PERFORMANCE SCORE STATISTICS ====")
s = full['performance_score']
print(f"  Min={s.min()}  Max={s.max()}  Mean={s.mean():.2f}  "
      f"Std={s.std():.2f}  P25={s.quantile(0.25)}  "
      f"Median={s.median()}  P75={s.quantile(0.75)}")

# ── 7. Full numeric stats ────────────────────────────────────────────────────
print("\n==== NUMERIC FEATURE STATISTICS ====")
num_cols = [
    'total_users','active_users','monthly_txn_count','txn_value_etb','revenue_etb',
    'failed_txn_rate','complaint_volume','downtime_minutes',
    'active_user_rate','revenue_per_txn','revenue_per_active_user',
    'txn_success_rate','user_engagement_index','downtime_impact_score',
    'operational_efficiency_score','complaint_growth_rate',
    'fraud_incidents','security_incidents','api_error_rate',
    'avg_session_duration_sec','complaint_resolution_rate',
    'new_user_registrations','churned_users','csat_score','performance_score'
]
for col in num_cols:
    if col in full.columns:
        c = full[col]
        print(f"  {col:<38} min={c.min():>14.4f}  max={c.max():>14.4f}  "
              f"avg={c.mean():>14.4f}  std={c.std():>10.4f}  null={c.isna().sum()}")

# ── 8. Missing values ────────────────────────────────────────────────────────
print("\n==== MISSING VALUES ====")
missing = full.isnull().sum()
missing = missing[missing > 0]
if len(missing) == 0:
    print("  No missing values.")
else:
    for col, cnt in missing.items():
        print(f"  {col:<38}: {cnt:,} missing ({cnt/len(full)*100:.2f}%)")

# ── 9. Duplicate check ───────────────────────────────────────────────────────
print("\n==== DUPLICATE ROWS ====")
dups = full.duplicated().sum()
print(f"  Duplicate rows: {dups:,}")

# ── 10. Tier per product ─────────────────────────────────────────────────────
print("\n==== TIER DISTRIBUTION PER PRODUCT ====")
crosstab = pd.crosstab(full['product_id'], full['performance_tier'])
crosstab['total'] = crosstab.sum(axis=1)
print(crosstab.to_string())

# ── 11. Tier per product per year ────────────────────────────────────────────
print("\n==== TIER DISTRIBUTION PER PRODUCT x YEAR ====")
ct2 = pd.crosstab(
    [full['product_id'], full['eval_year']],
    full['performance_tier']
)
print(ct2.to_string())

# ── 12. Correlation with performance_score ───────────────────────────────────
print("\n==== CORRELATION WITH performance_score (top features) ====")
corr_cols = [c for c in num_cols if c != 'performance_score' and c in full.columns]
corrs = full[corr_cols].corrwith(full['performance_score']).sort_values(key=abs, ascending=False)
for col, val in corrs.items():
    print(f"  {col:<38}: {val:>8.4f}")

# ── 13. Model version ────────────────────────────────────────────────────────
print("\n==== MODEL VERSION DISTRIBUTION ====")
for ver, cnt in full['model_version'].value_counts().items():
    print(f"  {ver}: {cnt:,}")

# ── 14. Sample rows ──────────────────────────────────────────────────────────
print("\n==== SAMPLE ROW (index 0) ====")
for col, val in full.iloc[0].items():
    print(f"  {col:<38}= {val}")

# ── 15. Train/Test overlap check ─────────────────────────────────────────────
print("\n==== TRAIN/TEST OVERLAP CHECK (on record_id) ====")
if 'record_id' in train.columns and 'record_id' in test.columns:
    overlap = set(train['record_id']) & set(test['record_id'])
    print(f"  Overlapping record_ids: {len(overlap)}")
else:
    print("  No record_id column found.")

print("\nAnalysis complete.")
