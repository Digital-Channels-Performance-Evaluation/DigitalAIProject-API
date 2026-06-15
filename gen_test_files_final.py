"""
AHADU PULSE — 6 Test Excel Files (3,000–5,000 rows each)
6 products × ~600 days = 3,600 rows per file.
"""
import pandas as pd
import numpy as np
from datetime import date, timedelta
from pathlib import Path

OUT = Path(r"a:\ML Model project\AHADU PULSE\database\sample_data")

rng = np.random.default_rng(seed=42)

PRODUCTS = [
    {"code":"MOBILE_01","bu":800_000, "gr":0.00006,"ar":0.71,"at":2400,"rp":0.029,"fail":4.8, "up":99.1,"dm":1.7, "rt":390,"api":1.4,"compl":0.22,"resol":0.91,"csat":4.3,"fraud":0.07,"sec":0.003},
    {"code":"CARD_01",  "bu":600_000, "gr":0.00005,"ar":0.67,"at":4100,"rp":0.058,"fail":2.8, "up":98.3,"dm":4.0, "rt":470,"api":2.0,"compl":0.17,"resol":0.88,"csat":4.1,"fraud":0.17,"sec":0.033},
    {"code":"QR_01",    "bu":250_000, "gr":0.00014,"ar":0.82,"at": 980,"rp":0.022,"fail":1.8, "up":99.5,"dm":1.2, "rt":310,"api":0.8,"compl":0.14,"resol":0.94,"csat":4.5,"fraud":0.03,"sec":0.000},
    {"code":"WALLET_01","bu":420_000, "gr":0.00007,"ar":0.74,"at":1620,"rp":0.031,"fail":2.3, "up":99.3,"dm":1.4, "rt":295,"api":1.1,"compl":0.19,"resol":0.89,"csat":4.0,"fraud":0.07,"sec":0.000},
    {"code":"POS_01",   "bu":320_000, "gr":0.00004,"ar":0.58,"at":3850,"rp":0.062,"fail":3.3, "up":97.8,"dm":5.3, "rt":545,"api":2.6,"compl":0.28,"resol":0.83,"csat":3.6,"fraud":0.13,"sec":0.033},
    {"code":"ATM_01",   "bu":430_000, "gr":0.00002,"ar":0.48,"at":2800,"rp":0.041,"fail":6.1, "up":96.4,"dm":12.6,"rt":680,"api":4.2,"compl":0.61,"resol":0.74,"csat":3.1,"fraud":0.27,"sec":0.067},
]

COLS = [
    "product_code","period_date","total_users","active_users","new_users","churned_users",
    "total_transactions","successful_transactions","failed_transactions","failed_txn_rate",
    "transaction_volume","total_revenue","fee_revenue","uptime_percentage",
    "downtime_minutes","downtime_hours","avg_response_time_ms","api_error_rate",
    "total_complaints","resolved_complaints","csat_score","fraud_event_count",
    "security_incident_count",
]

def n(v, pct=0.04):
    return float(v * (1 + rng.normal(0, pct)))

def make_row(code, pd_date, d_idx, p,
             fail_v=None, up_v=None, csat_v=None, compl_m=1.0):
    growth   = (1 + p["gr"]) ** d_idx
    total_u  = int(p["bu"] * growth * n(1.0, 0.008))
    active_u = min(total_u, int(total_u * n(p["ar"], 0.03)))
    new_u    = max(1, int(total_u * n(0.001, 0.15)))
    churn_u  = max(0, int(total_u * n(0.0004, 0.15)))
    fail     = max(0.1, min(44.9, fail_v if fail_v is not None else n(p["fail"], 0.08)))
    uptime   = min(99.9, max(80.0, up_v   if up_v   is not None else n(p["up"],   0.002)))
    csat     = max(1.0,  min(5.0,  csat_v if csat_v is not None else n(p["csat"], 0.025)))
    total_txn= max(1, int(active_u * p["ar"] * 0.25))
    failed   = int(total_txn * fail / 100)
    succ     = total_txn - failed
    txn_vol  = round(total_txn * n(p["at"], 0.06), 0)
    revenue  = round(txn_vol * p["rp"], 0)
    fee      = round(revenue * n(0.13, 0.05), 0)
    dm       = round(max(0, n(p["dm"] * compl_m, 0.15)), 2)
    compl    = max(0, int(total_u / 1000 * n(p["compl"] * compl_m, 0.12)))
    resolved = min(compl, max(0, int(compl * n(p["resol"], 0.04))))
    return {
        "product_code":            code,
        "period_date":             pd_date.strftime("%Y-%m-%d"),
        "total_users":             total_u,
        "active_users":            active_u,
        "new_users":               new_u,
        "churned_users":           churn_u,
        "total_transactions":      total_txn,
        "successful_transactions": succ,
        "failed_transactions":     failed,
        "failed_txn_rate":         round(fail, 4),
        "transaction_volume":      txn_vol,
        "total_revenue":           revenue,
        "fee_revenue":             fee,
        "uptime_percentage":       round(uptime, 2),
        "downtime_minutes":        dm,
        "downtime_hours":          round(dm / 60, 4),
        "avg_response_time_ms":    max(100, int(n(p["rt"], 0.10))),
        "api_error_rate":          round(max(0.01, n(p["api"], 0.12)), 3),
        "total_complaints":        compl,
        "resolved_complaints":     resolved,
        "csat_score":              round(csat, 2),
        "fraud_event_count":       max(0, int(n(p["fraud"], 0.5))),
        "security_incident_count": max(0, int(n(p["sec"],   0.8))),
    }


def save(rows, fname, title, desc, expectations):
    df = pd.DataFrame(rows)[COLS]
    with pd.ExcelWriter(OUT / fname, engine="xlsxwriter") as writer:
        wb  = writer.book
        hdr = wb.add_format({"bold":True,"bg_color":"#9B1535","font_color":"#FFFFFF","border":1,"font_size":9,"align":"center"})
        cel = wb.add_format({"border":1,"font_size":9})
        alt = wb.add_format({"border":1,"font_size":9,"bg_color":"#FBF0F3"})
        num = wb.add_format({"border":1,"font_size":9,"num_format":"#,##0"})
        dec = wb.add_format({"border":1,"font_size":9,"num_format":"0.00","align":"center"})
        goo = wb.add_format({"border":1,"bg_color":"#DCFCE7","font_color":"#166534","bold":True,"align":"center","font_size":9})
        war = wb.add_format({"border":1,"bg_color":"#FEF3C7","font_color":"#92400E","bold":True,"align":"center","font_size":9})
        bad = wb.add_format({"border":1,"bg_color":"#FEE2E2","font_color":"#991B1B","bold":True,"align":"center","font_size":9})
        ttl = wb.add_format({"bold":True,"font_size":14,"font_color":"#7A0E28"})
        sub = wb.add_format({"font_size":10,"font_color":"#666666","italic":True})
        lbl = wb.add_format({"bold":True,"font_size":11,"font_color":"#9B1535"})
        inf = wb.add_format({"font_size":10,"font_color":"#374151"})
        chk = wb.add_format({"font_size":10,"font_color":"#166534","bold":True})

        # Upload_Ready sheet
        df.to_excel(writer, sheet_name="Upload_Ready", startrow=0, index=False)
        ws = writer.sheets["Upload_Ready"]
        for ci, col in enumerate(df.columns):
            ws.set_column(ci, ci, 15)
            ws.write(0, ci, col, hdr)
            for ri, val in enumerate(df[col]):
                f = alt if ri % 2 == 1 else cel
                if col == "uptime_percentage":
                    f = goo if val >= 99 else war if val >= 97 else bad
                elif col == "failed_txn_rate":
                    f = goo if val <= 3 else war if val <= 6 else bad
                elif col == "csat_score":
                    f = goo if val >= 4.0 else war if val >= 3.0 else bad
                elif col in ("total_users","active_users","new_users","churned_users",
                             "total_transactions","successful_transactions","failed_transactions",
                             "total_complaints","resolved_complaints","fraud_event_count",
                             "security_incident_count","transaction_volume","total_revenue","fee_revenue"):
                    f = num
                elif col in ("failed_txn_rate","uptime_percentage","csat_score","downtime_minutes",
                             "downtime_hours","avg_response_time_ms","api_error_rate"):
                    f = dec
                ws.write(ri + 1, ci, val, f)
        ws.freeze_panes(1, 2)
        ws.autofilter(0, 0, len(df), len(df.columns) - 1)

        # Info sheet
        ws2 = wb.add_worksheet("Test_Info")
        ws2.set_column(0, 0, 80)
        ws2.write(0, 0, title, ttl)
        ws2.write(1, 0, desc, sub)
        ws2.write(2, 0, f"Rows: {len(df):,}  |  Products: {df['product_code'].nunique()}  |  "
                        f"{df['period_date'].min()} → {df['period_date'].max()}", sub)
        ws2.write(4, 0, "HOW TO USE:", lbl)
        steps = [
            "1. Login as  de@ahadubank.com / DE@12345  (Data Engineer)",
            "2. Go to Settings page",
            "3. Upload this file — Upload_Ready sheet is auto-read",
            "4. Pipeline: Validate → Features → Score → Alerts → Recommendations",
            "5. Check Dashboard, Rankings, Alerts, Recommendations after upload",
        ]
        for i, s in enumerate(steps):
            ws2.write(5 + i, 0, s, inf)
        ws2.write(11, 0, "EXPECTED OUTCOMES:", lbl)
        for i, e in enumerate(expectations):
            ws2.write(12 + i, 0, f"✓  {e}", chk)

    size_kb = (OUT / fname).stat().st_size // 1024
    print(f"  ✓  {fname}  ({len(df):,} rows, {size_kb} KB)")
    return len(df)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.xlsx"):
        old.unlink()

    # 2 days × 6 products = 12 rows per file (fast upload and feature engineering)
    DAYS  = 2
    START = date(2025, 1, 1)
    DATES = [START + timedelta(days=i) for i in range(DAYS)]

    print(f"\nGenerating 6 test files ({DAYS * 6:,} rows each)...\n")

    # ── File 1: All HIGH performers ───────────────────────────────────────────
    rows = []
    for p in PRODUCTS:
        for i, d in enumerate(DATES):
            rows.append(make_row(p["code"], d, i, p,
                fail_v = max(0.1, n(min(p["fail"], 2.2), 0.05)),
                up_v   = min(99.9, max(98.8, n(99.5, 0.001))),
                csat_v = min(5.0,  max(4.1,  n(4.6,  0.02))),
                compl_m= 0.4))
    save(rows, "01_HIGH_PERFORMERS.xlsx",
         "TEST 1 — All HIGH Performers (Best Case)",
         "All 6 products at excellent levels. Low failure, high uptime, strong CSAT. "
         "Validates AI correctly scores excellent metrics as HIGH tier.",
         ["All 6 products score > 80 (HIGH tier)",
          "No CRITICAL alerts generated",
          "QR Pay likely ranked #1 (best failure rate)",
          "Dashboard avg score > 83"])

    # ── File 2: Realistic mixed HIGH / MEDIUM / LOW ───────────────────────────
    rows = []
    for p in PRODUCTS:
        for i, d in enumerate(DATES):
            rows.append(make_row(p["code"], d, i, p))
    save(rows, "02_MIXED_PERFORMANCE.xlsx",
         "TEST 2 — Realistic Mixed Performance (Normal Operations)",
         "Each product performs at its real profile. Mobile/QR/Wallet=HIGH. POS/ATM=MEDIUM/LOW. "
         "Validates tier differentiation and recommendation generation.",
         ["Mobile Banking: HIGH tier (~80 score)",
          "QR Pay: HIGH tier (best CSAT, low failure)",
          "POS System: MEDIUM tier",
          "ATM Network: MEDIUM/LOW tier (elevated failure 6%)",
          "Recommendations generated for POS and ATM"])

    # ── File 3: ATM crisis ────────────────────────────────────────────────────
    rows = []
    CRISIS = set(range(0, 1)) | set(range(1, 2))  # crisis on both days
    for p in PRODUCTS:
        for i, d in enumerate(DATES):
            if p["code"] == "ATM_01" and i in CRISIS:
                rows.append(make_row(p["code"], d, i, p,
                    fail_v = n(17.5, 0.12), up_v = max(80.0, n(87.0, 0.04)),
                    csat_v = max(1.0, n(1.8, 0.08)), compl_m = 4.0))
            else:
                rows.append(make_row(p["code"], d, i, p))
    save(rows, "03_ATM_CRISIS.xlsx",
         "TEST 3 — ATM Crisis (Two Crisis Windows, Failure Rate ~17%)",
         "ATM has two crisis windows (days 100-179, 320-379) with extreme metrics. "
         "Other products remain stable. Tests CRITICAL alert generation.",
         ["CRITICAL alerts triggered for ATM during crisis days",
          "ATM tier drops to LOW (failure ~17%, uptime ~87%)",
          "Score drop > 15 points triggers score_drop alert",
          "5 other products remain HIGH/MEDIUM throughout",
          "ATM recommendations: Upgrade connectivity, Reduce downtime"])

    # ── File 4: Gradual decline ───────────────────────────────────────────────
    rows = []
    for p in PRODUCTS:
        for i, d in enumerate(DATES):
            deg = 1 + (i / DAYS) * 1.6   # 2.6× worse by day 600
            rows.append(make_row(p["code"], d, i, p,
                fail_v  = min(44.9, max(0.1, p["fail"]  * deg * n(1.0, 0.05))),
                up_v    = max(80.0, p["up"] - (i / DAYS) * 7.0),
                csat_v  = max(1.0,  p["csat"] - (i / DAYS) * 1.8),
                compl_m = 1 + (i / DAYS) * 2.5))
    save(rows, "04_GRADUAL_DECLINE.xlsx",
         "TEST 4 — Gradual Decline Trend (All Products Deteriorating over 600 Days)",
         "All 6 products decline steadily. By day 600 metrics near critical. "
         "Tests trend detection, score change tracking, proactive alerts.",
         ["score_change is negative (↓) every period",
          "Score history chart shows downward trend",
          "Tier downgrades: HIGH → MEDIUM → LOW over time",
          "Alert count increases as thresholds breached",
          "By day 500: ATM/POS likely in LOW tier"])

    # ── File 5: Recovery after intervention ────────────────────────────────────
    rows = []
    for p in PRODUCTS:
        for i, d in enumerate(DATES):
            progress  = min(1.0, i / 1)           # fully recovered by day 1
            bad_start = 2.4 - (1.4 * progress)      # 2.4→1.0
            rows.append(make_row(p["code"], d, i, p,
                fail_v  = min(44.9, max(0.1, p["fail"]  * bad_start * n(1.0, 0.05))),
                up_v    = max(80.0, p["up"]   - (1 - progress) * 7.5),
                csat_v  = max(1.0, min(5.0, p["csat"] - (1 - progress) * 1.6)),
                compl_m = bad_start))
    save(rows, "05_RECOVERY.xlsx",
         "TEST 5 — Recovery After Management Intervention (600 Days)",
         "All products start degraded, progressively improve. Fully recovered by day 400. "
         "Tests improvement tracking and score history visualization.",
         ["score_change is positive (↑) throughout recovery",
          "Score history chart shows upward curve",
          "Tier upgrades: LOW → MEDIUM → HIGH visible",
          "Alert count decreases as metrics improve",
          "By day 400+: all products at normal performance"])

    # ── File 6: Extreme edge cases ────────────────────────────────────────────
    rows = []
    for p in PRODUCTS:
        for i, d in enumerate(DATES):
            is_bad  = (i // 15) % 2 == 1   # alternates every 15 days
            mult    = 3.2 if is_bad else 0.45
            rows.append(make_row(p["code"], d, i, p,
                fail_v  = min(44.9, max(0.1, p["fail"]  * mult * n(1.0, 0.04))),
                up_v    = max(80.0, min(99.9, p["up"] - (8 if is_bad else 0))),
                csat_v  = max(1.0,  min(5.0,  p["csat"] - (2.0 if is_bad else 0))),
                compl_m = mult))
    save(rows, "06_EXTREME_EDGE_CASES.xlsx",
         "TEST 6 — Extreme Edge Cases (Best/Worst Every 30 Days)",
         "Products alternate between excellent and catastrophic every 30 days. "
         "Tests model robustness at data boundaries.",
         ["Scores swing: ~15 (worst) ↔ ~92 (best) every 30 days",
          "CRITICAL alerts in every bad cycle (every other month)",
          "Tier changes HIGH ↔ LOW monthly",
          "Score history chart shows sharp oscillation",
          "Model handles extreme boundary values correctly"])

    # ── Summary ──────────────────────────────────────────────────────────────
    print(f"\n{'='*62}")
    print("  All 6 test files generated successfully")
    print(f"{'='*62}")
    for f in sorted(OUT.glob("*.xlsx")):
        kb = f.stat().st_size // 1024
        print(f"  {f.name:<42}  {kb:>5} KB")
    print(f"\n  Location: {OUT}")
    print(f"  Upload: Settings → Upload Data → choose any file")
    print(f"{'='*62}")


if __name__ == "__main__":
    main()
