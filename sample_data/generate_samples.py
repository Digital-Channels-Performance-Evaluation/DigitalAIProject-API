"""
Ahadu Pulse — Sample Dataset Generator
Generates 4 CSV files with dates ALWAYS newer than the latest date in the DB.
Reads the DB to find the current max period_date, then adds 1-4 months.

Usage:
  py generate_samples.py
  (run from the sample_data directory or anywhere — uses absolute paths)

Expected tier spread per dataset:
  B_crisis         → ATM=LOW  POS=LOW  others=MEDIUM
  C_recovery       → ATM=LOW  POS=LOW  QR=HIGH  Wallet=HIGH  Mobile/Card=MEDIUM
  D_realistic_mixed→ ATM=LOW  POS=MEDIUM  Card=HIGH  QR=HIGH  Mobile/Wallet=MEDIUM
  A_high_performance→ all HIGH/MEDIUM, QR leads at ~88
"""
import csv, os, sys, random
from datetime import date

# ── resolve backend path for DB access ───────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
BACKEND_DIR  = os.path.join(PROJECT_ROOT, "backend")
sys.path.insert(0, BACKEND_DIR)

PRODUCTS = ["MOBILE_01", "CARD_01", "ATM_01", "POS_01", "QR_01", "WALLET_01"]

HEADERS = [
    "product_code", "period_date",
    "total_users", "active_users", "new_users", "churned_users",
    "total_transactions", "successful_transactions", "failed_transactions", "failed_txn_rate",
    "transaction_volume", "total_revenue", "fee_revenue",
    "uptime_percentage", "downtime_minutes",
    "avg_response_time_ms", "api_error_rate",
    "total_complaints", "resolved_complaints", "csat_score",
    "fraud_event_count", "security_incident_count",
]


def get_db_latest_period() -> date:
    """Return the latest period_date in raw_data, or today if DB unreachable."""
    try:
        from app.core.database import SessionLocal
        from app.models.data import RawData
        from sqlalchemy import func
        db = SessionLocal()
        latest = db.query(func.max(RawData.period_date)).scalar()
        db.close()
        if latest:
            return latest
    except Exception as e:
        print(f"  [warn] Could not read DB: {e} — using today as base")
    return date.today()


def add_months(d: date, n: int) -> str:
    """Add n months to date d, return YYYY-MM-01 string."""
    m = d.month + n
    y = d.year + (m - 1) // 12
    m = ((m - 1) % 12) + 1
    return f"{y}-{m:02d}-01"


def rv(lo, hi, dp=1):
    return round(random.uniform(lo, hi), dp)


def make_row(code, period, s):
    tu  = s["total_users"]
    au  = int(tu * rv(*s["aur"]) / 100)
    tt  = int(au * rv(3, 9))
    fr  = round(rv(*s["fail"]), 2)
    ft  = int(tt * fr / 100)
    st  = tt - ft
    rev = s["rev"]
    up  = round(rv(*s["up"]), 2)
    dm  = round(max(0.0, (100.0 - up) / 100.0 * 43200), 1)
    ae  = round(rv(*s["api"]), 2)
    tc  = s["comp"]
    res = int(tc * rv(*s["res_pct"]) / 100)
    cs  = round(rv(*s["csat"]), 2)
    return {
        "product_code":          code,
        "period_date":           period,
        "total_users":           tu,
        "active_users":          au,
        "new_users":             int(tu * rv(1, 4) / 100),
        "churned_users":         int(tu * rv(0.5, 2.5) / 100),
        "total_transactions":    tt,
        "successful_transactions": st,
        "failed_transactions":   ft,
        "failed_txn_rate":       fr,
        "transaction_volume":    int(rev * rv(7, 12)),
        "total_revenue":         rev,
        "fee_revenue":           int(rev * 0.12),
        "uptime_percentage":     up,
        "downtime_minutes":      dm,
        "avg_response_time_ms":  int(rv(180, 1100)),
        "api_error_rate":        ae,
        "total_complaints":      tc,
        "resolved_complaints":   res,
        "csat_score":            cs,
        "fraud_event_count":     int(rv(*s["fraud"])),
        "security_incident_count": int(rv(0, 2)),
    }


# ── Scenario definitions ──────────────────────────────────────────────────────
# offset = months to add to DB latest date
# Expected scores after scoring formula:
#   HIGH   ≥75 : uptime>99%,  fail<3%,  CSAT>4.0, resolution>85%, api<3%
#   MEDIUM 45-74: uptime 95-98%, fail 4-10%, CSAT 3.0-3.9, resolution 60-84%
#   LOW    <45  : uptime<90%, fail>15%, CSAT<2.5, resolution<50%, api>12%

SCENARIOS = {

    # ── Dataset B: CRISIS ──────────────────────────────────────────────────
    "B_crisis": {
        "offset": 1,
        "label": "CRISIS — ATM & POS in LOW tier, others fall to MEDIUM",
        "MOBILE_01": dict(total_users=960000, rev=31000000,
            aur=(40,52), fail=(10.0,16.0), up=(93.0,95.5), api=(7.0,12.0),
            comp=5500, res_pct=(45,62), csat=(2.2,2.8), fraud=(20,40)),
        "CARD_01":   dict(total_users=710000, rev=44000000,
            aur=(42,55), fail=(8.0,14.0), up=(93.5,96.0), api=(6.0,11.0),
            comp=4200, res_pct=(48,65), csat=(2.4,3.0), fraud=(15,30)),
        "ATM_01":    dict(total_users=510000, rev=16000000,
            aur=(22,32), fail=(28.0,38.0), up=(74.0,82.0), api=(22.0,32.0),
            comp=14000, res_pct=(20,35), csat=(1.2,1.7), fraud=(60,95)),
        "POS_01":    dict(total_users=385000, rev=12000000,
            aur=(24,35), fail=(22.0,32.0), up=(78.0,85.0), api=(18.0,28.0),
            comp=11000, res_pct=(25,40), csat=(1.4,2.0), fraud=(45,75)),
        "QR_01":     dict(total_users=325000, rev=10000000,
            aur=(55,68), fail=(4.0,7.5), up=(96.5,98.5), api=(2.5,5.5),
            comp=800, res_pct=(72,86), csat=(3.4,3.9), fraud=(4,10)),
        "WALLET_01": dict(total_users=520000, rev=12000000,
            aur=(50,63), fail=(5.0,9.0), up=(95.0,97.5), api=(3.5,7.0),
            comp=2500, res_pct=(62,78), csat=(3.0,3.6), fraud=(8,18)),
    },

    # ── Dataset C: RECOVERY ────────────────────────────────────────────────
    "C_recovery": {
        "offset": 2,
        "label": "RECOVERY — QR & Wallet HIGH, Mobile/Card MEDIUM, ATM/POS LOW",
        "MOBILE_01": dict(total_users=965000, rev=35000000,
            aur=(52,62), fail=(7.0,11.0), up=(95.0,97.0), api=(4.5,8.0),
            comp=3500, res_pct=(60,75), csat=(2.8,3.4), fraud=(12,25)),
        "CARD_01":   dict(total_users=715000, rev=50000000,
            aur=(54,64), fail=(6.0,10.0), up=(95.5,97.5), api=(4.0,7.5),
            comp=2800, res_pct=(62,78), csat=(2.9,3.5), fraud=(10,22)),
        "ATM_01":    dict(total_users=512000, rev=18000000,
            aur=(25,35), fail=(24.0,33.0), up=(76.0,84.0), api=(19.0,27.0),
            comp=12000, res_pct=(22,38), csat=(1.3,1.8), fraud=(55,88)),
        "POS_01":    dict(total_users=388000, rev=14000000,
            aur=(28,38), fail=(19.0,28.0), up=(80.0,87.0), api=(15.0,25.0),
            comp=9500, res_pct=(28,44), csat=(1.5,2.1), fraud=(40,68)),
        "QR_01":     dict(total_users=335000, rev=13500000,
            aur=(75,86), fail=(1.0,2.2), up=(99.2,99.7), api=(0.5,1.5),
            comp=280, res_pct=(90,97), csat=(4.3,4.7), fraud=(1,3)),
        "WALLET_01": dict(total_users=535000, rev=15000000,
            aur=(72,83), fail=(1.5,3.0), up=(98.8,99.5), api=(0.8,2.0),
            comp=420, res_pct=(88,96), csat=(4.1,4.6), fraud=(2,5)),
    },

    # ── Dataset D: REALISTIC MIXED ─────────────────────────────────────────
    "D_realistic_mixed": {
        "offset": 3,
        "label": "REALISTIC MIXED — Card/QR HIGH, Mobile/Wallet MEDIUM, ATM/POS LOW",
        "MOBILE_01": dict(total_users=975000, rev=40000000,
            aur=(62,72), fail=(4.5,7.5), up=(96.5,98.2), api=(3.0,5.5),
            comp=2200, res_pct=(70,83), csat=(3.3,3.9), fraud=(8,18)),
        "CARD_01":   dict(total_users=718000, rev=66000000,
            aur=(72,82), fail=(1.5,3.2), up=(98.5,99.4), api=(0.8,2.2),
            comp=650, res_pct=(88,96), csat=(4.0,4.5), fraud=(2,6)),
        "ATM_01":    dict(total_users=515000, rev=20000000,
            aur=(32,42), fail=(17.0,24.0), up=(84.0,89.5), api=(13.0,20.0),
            comp=8500, res_pct=(35,52), csat=(1.8,2.4), fraud=(35,60)),
        "POS_01":    dict(total_users=392000, rev=24000000,
            aur=(48,60), fail=(9.0,14.0), up=(93.0,95.5), api=(6.5,11.0),
            comp=3500, res_pct=(55,72), csat=(2.7,3.3), fraud=(14,28)),
        "QR_01":     dict(total_users=348000, rev=14000000,
            aur=(76,87), fail=(1.2,2.5), up=(99.0,99.6), api=(0.6,1.8),
            comp=310, res_pct=(89,96), csat=(4.2,4.6), fraud=(1,4)),
        "WALLET_01": dict(total_users=542000, rev=15500000,
            aur=(64,75), fail=(3.5,6.5), up=(96.8,98.5), api=(2.2,4.5),
            comp=1100, res_pct=(76,88), csat=(3.6,4.2), fraud=(5,12)),
    },

    # ── Dataset A: HIGH PERFORMANCE ────────────────────────────────────────
    "A_high_performance": {
        "offset": 4,
        "label": "HIGH PERFORMANCE — QR leads, all products in HIGH/MEDIUM tier",
        "MOBILE_01": dict(total_users=970000, rev=44000000,
            aur=(72,82), fail=(1.0,2.5), up=(99.1,99.7), api=(0.4,1.2),
            comp=800, res_pct=(90,97), csat=(4.2,4.6), fraud=(1,4)),
        "CARD_01":   dict(total_users=720000, rev=68000000,
            aur=(70,80), fail=(0.8,2.0), up=(99.2,99.8), api=(0.3,1.0),
            comp=500, res_pct=(92,98), csat=(4.1,4.5), fraud=(1,3)),
        "ATM_01":    dict(total_users=510000, rev=40000000,
            aur=(60,72), fail=(3.5,6.0), up=(97.5,98.8), api=(1.5,3.0),
            comp=1200, res_pct=(80,90), csat=(3.6,4.1), fraud=(3,8)),
        "POS_01":    dict(total_users=395000, rev=34000000,
            aur=(66,78), fail=(2.5,4.5), up=(98.0,99.2), api=(1.0,2.5),
            comp=700, res_pct=(85,94), csat=(3.8,4.3), fraud=(2,6)),
        "QR_01":     dict(total_users=355000, rev=15500000,
            aur=(80,92), fail=(0.4,1.2), up=(99.5,99.95), api=(0.2,0.8),
            comp=200, res_pct=(94,99), csat=(4.5,4.9), fraud=(0,2)),
        "WALLET_01": dict(total_users=550000, rev=17000000,
            aur=(78,88), fail=(0.8,1.8), up=(99.3,99.8), api=(0.4,1.2),
            comp=350, res_pct=(91,97), csat=(4.2,4.7), fraud=(1,3)),
    },
}


def generate_all():
    base_date = get_db_latest_period()
    print(f"  DB latest period: {base_date}")
    print(f"  Generating 4 datasets with periods +1 to +4 months from {base_date}\n")

    results = []
    for key in ["B_crisis", "C_recovery", "D_realistic_mixed", "A_high_performance"]:
        sc     = SCENARIOS[key]
        period = add_months(base_date, sc["offset"])
        random.seed(hash(key + period))

        rows = [make_row(code, period, sc[code])
                for code in PRODUCTS if code in sc]

        fname = os.path.join(SCRIPT_DIR, f"test_dataset_{key}.csv")
        with open(fname, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=HEADERS)
            w.writeheader()
            w.writerows(rows)

        results.append((key, fname, period, sc["label"]))
        print(f"  ✓ test_dataset_{key}.csv  [period: {period}]")
        print(f"    {sc['label']}\n")

    return results


if __name__ == "__main__":
    print("=" * 60)
    print("  Ahadu Pulse — Sample Dataset Generator")
    print("=" * 60)
    results = generate_all()

    print("Upload order (start with B, end with A):")
    for i, (key, fname, period, label) in enumerate(results, 1):
        print(f"  {i}. {os.path.basename(fname)}  [{period}]")

    print(f"\n  Path: {SCRIPT_DIR}")
    print("  How: Settings → Upload CSV → Run Feature Engineering")
    print("  Each upload immediately updates:")
    print("    Dashboard · Products · Scores · Rankings · Alerts")
    print("    Recommendations · Predictions · Reports · Insights")
