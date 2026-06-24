"""
Realistic Ahadu Bank Digital Products Dataset
Shows clear performance differences — Mobile Banking BEST, ATM WORST.
6 products × 6 months = 36 rows per file (fast upload).
"""
import pandas as pd
import numpy as np
from datetime import date
from pathlib import Path

OUT = Path(r"a:\ML Model project\AHADU PULSE\database\sample_data")
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(seed=2026)

def n(v, pct=0.03):
    return float(v * (1 + rng.normal(0, pct)))

# 6 months of data
PERIODS = [
    date(2026,1,31), date(2026,2,28), date(2026,3,31),
    date(2026,4,30), date(2026,5,31), date(2026,6,30),
]

# Realistic profiles — clearly different performance levels
# Mobile: BEST (HIGH tier)   Card: HIGH   QR: HIGH   Wallet: MEDIUM   POS: MEDIUM   ATM: LOW
PROFILES = {
    "MOBILE_01": {
        "name":"Ahadu Mobile Banking", "rank":1, "tier":"HIGH",
        "users":1_020_000, "g":0.018, "ar":0.72,
        "txn_per_u":1.8, "avg_txn":2400, "rev_pct":0.029,
        "fail":3.2, "up":99.3, "dm":45, "rt":320, "api":1.1,
        "compl":180, "resol":0.93, "csat":4.5, "fraud":1, "sec":0,
    },
    "CARD_01": {
        "name":"Ahadu Card Banking", "rank":2, "tier":"HIGH",
        "users":760_000, "g":0.012, "ar":0.68,
        "txn_per_u":1.5, "avg_txn":4100, "rev_pct":0.058,
        "fail":2.6, "up":98.5, "dm":110, "rt":420, "api":1.8,
        "compl":120, "resol":0.90, "csat":4.2, "fraud":4, "sec":1,
    },
    "QR_01": {
        "name":"Ahadu QR Pay", "rank":3, "tier":"HIGH",
        "users":368_000, "g":0.042, "ar":0.83,
        "txn_per_u":2.1, "avg_txn":980, "rev_pct":0.022,
        "fail":1.5, "up":99.6, "dm":28, "rt":260, "api":0.7,
        "compl":55, "resol":0.95, "csat":4.6, "fraud":0, "sec":0,
    },
    "WALLET_01": {
        "name":"Ahadu Digital Wallet", "rank":4, "tier":"MEDIUM",
        "users":548_000, "g":0.022, "ar":0.65,
        "txn_per_u":1.4, "avg_txn":1620, "rev_pct":0.031,
        "fail":5.8, "up":97.2, "dm":205, "rt":510, "api":3.2,
        "compl":310, "resol":0.81, "csat":3.6, "fraud":3, "sec":0,
    },
    "POS_01": {
        "name":"Ahadu POS System", "rank":5, "tier":"MEDIUM",
        "users":412_000, "g":0.008, "ar":0.52,
        "txn_per_u":1.2, "avg_txn":3850, "rev_pct":0.062,
        "fail":7.4, "up":96.1, "dm":345, "rt":620, "api":4.5,
        "compl":420, "resol":0.76, "csat":3.2, "fraud":5, "sec":1,
    },
    "ATM_01": {
        "name":"Ahadu ATM Network", "rank":6, "tier":"LOW",
        "users":558_000, "g":0.003, "ar":0.41,
        "txn_per_u":0.9, "avg_txn":2800, "rev_pct":0.041,
        "fail":11.8, "up":93.5, "dm":860, "rt":890, "api":8.2,
        "compl":820, "resol":0.62, "csat":2.4, "fraud":12, "sec":3,
    },
}

COLS = ["product_code","period_date","total_users","active_users","new_users","churned_users",
        "total_transactions","successful_transactions","failed_transactions","failed_txn_rate",
        "transaction_volume","total_revenue","fee_revenue","uptime_percentage",
        "downtime_minutes","downtime_hours","avg_response_time_ms","api_error_rate",
        "total_complaints","resolved_complaints","csat_score","fraud_event_count",
        "security_incident_count"]

def make_rows():
    rows = []
    for mo_idx, pd_date in enumerate(PERIODS):
        for code, p in PROFILES.items():
            gf = (1 + p["g"] / 12) ** mo_idx
            total_u  = int(p["users"] * gf * n(1.0, 0.005))
            active_u = int(total_u * n(p["ar"], 0.02))
            new_u    = max(1, int(total_u * n(0.002, 0.1)))
            churn_u  = max(0, int(total_u * n(0.001, 0.1)))
            total_txn = max(1, int(active_u * n(p["txn_per_u"], 0.05)))
            fail_v    = max(0.1, min(44.9, n(p["fail"], 0.06)))
            failed    = int(total_txn * fail_v / 100)
            succ      = total_txn - failed
            txn_vol   = round(total_txn * n(p["avg_txn"], 0.05), 0)
            revenue   = round(txn_vol * p["rev_pct"], 0)
            fee_rev   = round(revenue * n(0.13, 0.04), 0)
            uptime    = round(min(99.9, max(80.0, n(p["up"], 0.002))), 2)
            dm        = round(max(0, n(p["dm"], 0.12)), 1)
            compl     = max(0, int(n(p["compl"], 0.10)))
            resolved  = min(compl, max(0, int(compl * n(p["resol"], 0.03))))
            csat      = round(max(1.0, min(5.0, n(p["csat"], 0.02))), 2)
            rows.append({
                "product_code":            code,
                "period_date":             pd_date.strftime("%Y-%m-%d"),
                "total_users":             total_u,
                "active_users":            active_u,
                "new_users":               new_u,
                "churned_users":           churn_u,
                "total_transactions":      total_txn,
                "successful_transactions": succ,
                "failed_transactions":     failed,
                "failed_txn_rate":         round(fail_v, 4),
                "transaction_volume":      txn_vol,
                "total_revenue":           revenue,
                "fee_revenue":             fee_rev,
                "uptime_percentage":       uptime,
                "downtime_minutes":        dm,
                "downtime_hours":          round(dm / 60, 4),
                "avg_response_time_ms":    max(100, int(n(p["rt"], 0.08))),
                "api_error_rate":          round(max(0.01, n(p["api"], 0.10)), 3),
                "total_complaints":        compl,
                "resolved_complaints":     resolved,
                "csat_score":              csat,
                "fraud_event_count":       max(0, int(n(p["fraud"], 0.4))),
                "security_incident_count": max(0, int(n(p["sec"], 0.5))),
            })
    return rows


def write_excel(rows, fname, title, desc, expectations):
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

        df.to_excel(writer, sheet_name="Upload_Ready", startrow=0, index=False)
        ws = writer.sheets["Upload_Ready"]
        for ci, col in enumerate(df.columns):
            ws.set_column(ci, ci, 16)
            ws.write(0, ci, col, hdr)
            for ri, val in enumerate(df[col]):
                f = alt if ri%2==1 else cel
                if col=="uptime_percentage":
                    f = goo if val>=99 else war if val>=97 else bad
                elif col=="failed_txn_rate":
                    f = goo if val<=3 else war if val<=7 else bad
                elif col=="csat_score":
                    f = goo if val>=4.0 else war if val>=3.0 else bad
                elif col in ("total_users","active_users","new_users","churned_users","total_transactions",
                             "successful_transactions","failed_transactions","total_complaints",
                             "resolved_complaints","fraud_event_count","security_incident_count",
                             "transaction_volume","total_revenue","fee_revenue"):
                    f = num
                elif col in ("failed_txn_rate","uptime_percentage","csat_score","downtime_minutes",
                             "downtime_hours","avg_response_time_ms","api_error_rate"):
                    f = dec
                ws.write(ri+1, ci, val, f)
        ws.freeze_panes(1, 2)
        ws.autofilter(0, 0, len(df), len(df.columns)-1)

        ws2 = wb.add_worksheet("Product_Performance_Guide")
        ws2.set_column(0, 0, 25); ws2.set_column(1, 1, 70)
        ws2.write(0, 0, title, ttl)
        ws2.write(1, 0, desc, sub)
        ws2.write(2, 0, f"Rows: {len(df)}  |  6 products × 6 months  |  Jan–Jun 2026", sub)

        ws2.write(4, 0, "EXPECTED PRODUCT RANKINGS:", lbl)
        rankings = [
            ("🥇 #1 Mobile Banking",  "HIGH tier  | Score ~82-88 | fail 3.2% | CSAT 4.5 | Best performer"),
            ("🥈 #2 Card Banking",    "HIGH tier  | Score ~79-85 | fail 2.6% | CSAT 4.2 | Strong revenue"),
            ("🥉 #3 QR Pay",          "HIGH tier  | Score ~85-92 | fail 1.5% | CSAT 4.6 | Fastest growing"),
            ("   #4 Digital Wallet",  "MEDIUM tier | Score ~62-70 | fail 5.8% | CSAT 3.6 | Needs improvement"),
            ("   #5 POS System",      "MEDIUM tier | Score ~55-65 | fail 7.4% | CSAT 3.2 | High downtime"),
            ("   #6 ATM Network",     "LOW tier    | Score ~35-48 | fail 11.8% | CSAT 2.4 | Urgent action needed"),
        ]
        for i, (rank, detail) in enumerate(rankings):
            ws2.write(5+i, 0, rank, wb.add_format({"bold":True,"font_size":10}))
            ws2.write(5+i, 1, detail, inf)

        ws2.write(12, 0, "HOW TO USE:", lbl)
        for i, s in enumerate([
            "1. Login as de@ahadubank.com / DE@12345",
            "2. Go to Settings → Upload Data → choose this file",
            "3. After import: check Dashboard Rankings page",
            "4. Click each product to see detailed score and recommendations",
        ]):
            ws2.write(13+i, 0, s, inf)

        ws2.write(18, 0, "EXPECTED OUTCOMES:", lbl)
        for i, e in enumerate(expectations):
            ws2.write(19+i, 0, f"✓  {e}", chk)

        # Product profile summary table
        ws2.write(26, 0, "PRODUCT PROFILE REFERENCE:", lbl)
        p_hdrs = ["Product", "Expected Tier", "Failure Rate", "Uptime", "CSAT", "Key Issue"]
        for ci, h in enumerate(p_hdrs):
            ws2.write(27, ci, h, hdr)
            ws2.set_column(ci, ci, 22)
        profile_data = [
            ("Mobile Banking",  "HIGH",   "~3.2%",  "~99.3%", "4.5", "None — best performer"),
            ("Card Banking",    "HIGH",   "~2.6%",  "~98.5%", "4.2", "Minor downtime"),
            ("QR Pay",          "HIGH",   "~1.5%",  "~99.6%", "4.6", "None — fastest growing"),
            ("Digital Wallet",  "MEDIUM", "~5.8%",  "~97.2%", "3.6", "Failure rate above 5%"),
            ("POS System",      "MEDIUM", "~7.4%",  "~96.1%", "3.2", "High downtime & failure"),
            ("ATM Network",     "LOW",    "~11.8%", "~93.5%", "2.4", "CRITICAL: downtime, failure, complaints"),
        ]
        tier_fmts = {"HIGH":goo,"MEDIUM":war,"LOW":bad}
        for ri, (prod, tier, fail, up, cs, issue) in enumerate(profile_data):
            row = 28 + ri
            ws2.write(row, 0, prod, cel)
            ws2.write(row, 1, tier, tier_fmts[tier])
            ws2.write(row, 2, fail, bad if float(fail.strip("~%"))>7 else war if float(fail.strip("~%"))>4 else goo)
            ws2.write(row, 3, up,   bad if float(up.strip("~%"))<96 else war if float(up.strip("~%"))<98 else goo)
            ws2.write(row, 4, cs,   bad if float(cs)<3.0 else war if float(cs)<4.0 else goo)
            ws2.write(row, 5, issue, bad if tier=="LOW" else war if tier=="MEDIUM" else cel)

    kb = (OUT / fname).stat().st_size // 1024
    print(f"  ✓  {fname}  ({len(df)} rows, {kb} KB)")


# Generate the one realistic dataset
rows = make_rows()
write_excel(rows, "REALISTIC_AHADU_PRODUCTS_2026.xlsx",
    "AHADU PULSE — Realistic Product Performance Data (Jan–Jun 2026)",
    "Shows real-world performance differences: Mobile/Card/QR = HIGH, Wallet/POS = MEDIUM, ATM = LOW. "
    "Upload this file to see if the AI model correctly classifies each product.",
    [
        "Rankings: QR Pay #1, Mobile Banking #2, Card Banking #3",
        "Digital Wallet and POS System: MEDIUM tier",
        "ATM Network: LOW tier — triggers CRITICAL alerts",
        "AI recommendations generated for Wallet, POS, ATM",
        "Score spread: ~88 (QR) down to ~42 (ATM) — wide range validates model",
        "ATM alerts: downtime spike, high failure rate, complaint surge",
    ])

print(f"\n  Saved to: {OUT}")
print(f"  Upload via: Settings → Upload Data → REALISTIC_AHADU_PRODUCTS_2026.xlsx")
