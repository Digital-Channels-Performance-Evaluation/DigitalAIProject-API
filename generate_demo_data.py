"""
=============================================================================
AHADU PULSE — Executive Demo Dataset Generator
Generates ONE comprehensive Excel file designed to showcase ALL system
features to higher management across multiple test scenarios.

Demo scenarios:
  Sheet 1: "Executive_Overview"   — Jan-Jun 2026 all 6 products (best/worst mix)
  Sheet 2: "Crisis_ATM_July"      — July 2026 ATM crisis (triggers alerts)
  Sheet 3: "Recovery_August"      — Aug 2026 recovery (shows improvement)
  Sheet 4: "Upload_Ready"         — Clean upload format (exactly what system expects)
  Sheet 5: "Test_Scenarios"       — Narrative guide for management demo

File: database/AHADU_PULSE_Executive_Demo_2026.xlsx
=============================================================================
"""

import pandas as pd
import numpy as np
from datetime import date
from pathlib import Path

OUT = Path(__file__).parent / "database"
OUT.mkdir(exist_ok=True)

rng = np.random.default_rng(seed=2026)

# ── Product profiles (ordered best → worst for demo narrative) ────────────────
PRODUCTS = [
    {
        "product_code": "MOBILE_01", "product_name": "Ahadu Mobile Banking",
        "rank": 1, "category": "mobile_banking",
        "base_users": 1_020_000, "growth": 0.018, "active_rate": 0.71,
        "txn_per_active": 6.2, "avg_txn": 2_450, "rev_pct": 0.028,
        "fail_rate": 4.8, "uptime": 99.1, "downtime_min": 51.8,
        "rt_ms": 390, "api_err": 1.4, "compl_per_1k": 0.22, "resol": 0.91,
        "csat": 4.3, "fraud": 2, "sec": 0,
        "narrative": "Consistent #1 performer. High user engagement, reliable transactions, strong CSAT.",
    },
    {
        "product_code": "CARD_01", "product_name": "Ahadu Card Banking",
        "rank": 2, "category": "card_banking",
        "base_users": 760_000, "growth": 0.014, "active_rate": 0.67,
        "txn_per_active": 5.1, "avg_txn": 4_100, "rev_pct": 0.058,
        "fail_rate": 2.8, "uptime": 98.3, "downtime_min": 121.0,
        "rt_ms": 470, "api_err": 2.0, "compl_per_1k": 0.17, "resol": 0.88,
        "csat": 4.1, "fraud": 5, "sec": 1,
        "narrative": "Strong #2 with highest revenue per transaction. Minor downtime concerns.",
    },
    {
        "product_code": "QR_01", "product_name": "Ahadu QR Pay",
        "rank": 3, "category": "qr_payment",
        "base_users": 368_000, "growth": 0.042, "active_rate": 0.82,
        "txn_per_active": 7.8, "avg_txn": 980, "rev_pct": 0.022,
        "fail_rate": 1.8, "uptime": 99.5, "downtime_min": 36.0,
        "rt_ms": 310, "api_err": 0.8, "compl_per_1k": 0.14, "resol": 0.94,
        "csat": 4.5, "fraud": 1, "sec": 0,
        "narrative": "Fastest growing product. Best reliability. Strong candidate for Tier 1 upgrade.",
    },
    {
        "product_code": "WALLET_01", "product_name": "Ahadu Digital Wallet",
        "rank": 4, "category": "digital_wallet",
        "base_users": 548_000, "growth": 0.022, "active_rate": 0.74,
        "txn_per_active": 5.8, "avg_txn": 1_620, "rev_pct": 0.031,
        "fail_rate": 2.3, "uptime": 99.3, "downtime_min": 42.5,
        "rt_ms": 295, "api_err": 1.1, "compl_per_1k": 0.19, "resol": 0.89,
        "csat": 4.0, "fraud": 2, "sec": 0,
        "narrative": "Solid performer. Steady growth. Revenue per user needs improvement.",
    },
    {
        "product_code": "POS_01", "product_name": "Ahadu POS System",
        "rank": 5, "category": "pos",
        "base_users": 412_000, "growth": 0.011, "active_rate": 0.58,
        "txn_per_active": 4.4, "avg_txn": 3_850, "rev_pct": 0.062,
        "fail_rate": 3.3, "uptime": 97.8, "downtime_min": 158.4,
        "rt_ms": 545, "api_err": 2.6, "compl_per_1k": 0.28, "resol": 0.83,
        "csat": 3.6, "fraud": 4, "sec": 1,
        "narrative": "MEDIUM tier. High merchant revenue but elevated downtime and complaints need attention.",
    },
    {
        "product_code": "ATM_01", "product_name": "Ahadu ATM Network",
        "rank": 6, "category": "atm",
        "base_users": 558_000, "growth": 0.006, "active_rate": 0.48,
        "txn_per_active": 3.2, "avg_txn": 2_800, "rev_pct": 0.041,
        "fail_rate": 6.1, "uptime": 96.4, "downtime_min": 378.0,
        "rt_ms": 680, "api_err": 4.2, "compl_per_1k": 0.61, "resol": 0.74,
        "csat": 3.1, "fraud": 8, "sec": 2,
        "narrative": "MEDIUM/LOW risk. Chronic downtime 6.1hr/month. Urgent infrastructure upgrade needed.",
    },
]


def noise(val, pct=0.05):
    return float(val * (1 + rng.normal(0, pct)))


def build_rows(products, periods, scenario="normal",
               stress_code=None, recovery_code=None):
    rows = []
    for p in products:
        code = p["product_code"]
        base = p["base_users"]
        for i, (yr, mo, pd_date) in enumerate(periods):
            gf = (1 + p["growth"]) ** i
            total_u   = int(base * gf * noise(1.0, 0.01))
            active_u  = int(total_u * noise(p["active_rate"], 0.04))
            new_u     = int(total_u * noise(0.038, 0.15))
            churn_u   = int(total_u * noise(0.012, 0.15))
            total_txn = int(active_u * noise(p["txn_per_active"], 0.08))
            txn_vol   = round(total_txn * noise(p["avg_txn"], 0.06), 2)
            revenue   = round(txn_vol * p["rev_pct"], 2)
            fee_rev   = round(revenue * noise(0.13, 0.05), 2)

            fail = p["fail_rate"]
            up   = p["uptime"]
            dm   = p["downtime_min"]
            csat = p["csat"]
            compl_base = p["compl_per_1k"]
            fraud = p["fraud"]
            sec   = p["sec"]

            if scenario == "stress" and code == stress_code:
                fail  = min(fail * noise(2.8, 0.1), 44.9)
                up    = max(up - noise(8.0, 0.1), 80.0)
                dm    = dm * noise(3.5, 0.1)
                csat  = max(1.0, csat - noise(1.1, 0.1))
                compl_base *= noise(2.2, 0.1)
                fraud = max(0, int(fraud * noise(2.5, 0.2)))
                sec   = max(0, sec + int(rng.integers(1, 3)))
            elif scenario == "recovery" and code == recovery_code:
                fail  = max(fail * noise(0.62, 0.05), 0.5)
                up    = min(up + noise(1.5, 0.05), 99.9)
                dm    = dm * noise(0.55, 0.05)
                csat  = min(5.0, csat + noise(0.3, 0.05))
                compl_base *= noise(0.7, 0.08)

            fail_rate = round(max(0.5, min(44.9, noise(fail, 0.08))), 4)
            failed_txn = int(total_txn * fail_rate / 100)
            succ_txn   = total_txn - failed_txn
            uptime_pct = round(min(99.9, max(80.0, noise(up, 0.003))), 2)
            downtime_m = round(max(0, noise(dm, 0.15)), 1)
            downtime_h = round(downtime_m / 60, 2)
            rt_ms      = int(noise(p["rt_ms"], 0.10))
            api_err    = round(max(0.01, noise(p["api_err"], 0.12)), 3)
            total_compl  = int(total_u / 1000 * noise(compl_base, 0.12))
            resolved     = min(int(total_compl * noise(p["resol"], 0.04)), total_compl)
            csat_val     = round(max(1.0, min(5.0, noise(csat, 0.03))), 2)
            fraud_ev     = max(0, int(noise(fraud, 0.3)))
            sec_ev       = max(0, int(noise(sec, 0.5)))

            rows.append({
                "product_code":           code,
                "product_name":           p["product_name"],
                "rank":                   p["rank"],
                "period_date":            pd_date.strftime("%Y-%m-%d"),
                "year":                   yr,
                "month":                  mo,
                "total_users":            total_u,
                "active_users":           active_u,
                "new_users":              new_u,
                "churned_users":          churn_u,
                "total_transactions":     total_txn,
                "successful_transactions":succ_txn,
                "failed_transactions":    failed_txn,
                "failed_txn_rate":        fail_rate,
                "transaction_volume":     txn_vol,
                "total_revenue":          revenue,
                "fee_revenue":            fee_rev,
                "uptime_percentage":      uptime_pct,
                "downtime_minutes":       downtime_m,
                "downtime_hours":         downtime_h,
                "avg_response_time_ms":   rt_ms,
                "api_error_rate":         api_err,
                "total_complaints":       total_compl,
                "resolved_complaints":    resolved,
                "csat_score":             csat_val,
                "fraud_event_count":      fraud_ev,
                "security_incident_count":sec_ev,
                "scenario":               scenario,
            })
    return rows


# ── Build datasets ─────────────────────────────────────────────────────────────
periods_6mo = [
    (2026, i, date(2026, i, [31,28,31,30,31,30][i-1]))
    for i in range(1, 7)
]
periods_jul = [(2026, 7, date(2026, 7, 31))]
periods_aug = [(2026, 8, date(2026, 8, 31))]

df_normal   = pd.DataFrame(build_rows(PRODUCTS, periods_6mo))
df_stress   = pd.DataFrame(build_rows(PRODUCTS, periods_jul, "stress",   stress_code="ATM_01"))
df_recovery = pd.DataFrame(build_rows(PRODUCTS, periods_aug, "recovery", recovery_code="ATM_01"))

# ── Upload-ready sheet (exact columns system expects) ─────────────────────────
UPLOAD_COLS = [
    "product_code", "period_date",
    "total_users", "active_users", "new_users", "churned_users",
    "total_transactions", "successful_transactions", "failed_transactions",
    "failed_txn_rate", "transaction_volume",
    "total_revenue", "fee_revenue",
    "uptime_percentage", "downtime_minutes", "downtime_hours",
    "avg_response_time_ms", "api_error_rate",
    "total_complaints", "resolved_complaints", "csat_score",
    "fraud_event_count", "security_incident_count",
]
df_upload = pd.concat([df_normal, df_stress, df_recovery], ignore_index=True)[UPLOAD_COLS]


# ── Demo test scenarios guide ─────────────────────────────────────────────────
SCENARIOS = [
    {
        "test_id": "TEST-01",
        "sheet_to_upload": "Upload_Ready (Jan–Aug 2026 all products)",
        "test_name": "Full Pipeline — Upload & Auto-Score",
        "role": "Data Engineer",
        "steps": "1. Login as de@ahadubank.com / DE@12345\n2. Go to Settings\n3. Upload this Excel file (Upload_Ready sheet)\n4. Watch pipeline: validate → features → score → alerts",
        "expected_result": "6 products auto-scored. Dashboard, Rankings, Alerts, Recommendations all updated instantly.",
        "kpi_to_verify": "Dashboard avg score updates. Products show tier badges.",
        "wow_factor": "Full AI pipeline runs in seconds after upload — zero manual steps.",
    },
    {
        "test_id": "TEST-02",
        "sheet_to_upload": "Executive_Overview",
        "test_name": "Executive Dashboard — Rankings & Scores",
        "role": "Executive Management",
        "steps": "1. Login as exec@ahadubank.com / Exec@123\n2. Go to Dashboard\n3. Review score trend chart\n4. Check Rankings page",
        "expected_result": "Rankings: QR Pay #1 (HIGH), Mobile Banking #2 (HIGH), ATM Network #6 (MEDIUM). Charts show 6-month trend.",
        "kpi_to_verify": "Performance scores, tier badges, score change arrows.",
        "wow_factor": "Real-time AI ranking of all 6 products — no manual spreadsheets.",
    },
    {
        "test_id": "TEST-03",
        "sheet_to_upload": "Crisis_ATM_July",
        "test_name": "Crisis Detection — ATM Failure Month",
        "role": "Risk Team",
        "steps": "1. Login as risk@ahadubank.com / Risk@123\n2. Upload Crisis_ATM_July data via Settings\n3. Go to Alerts page immediately after",
        "expected_result": "CRITICAL alert triggered: ATM downtime >15%. ATM score drops to LOW tier. Recommendations generated automatically.",
        "kpi_to_verify": "Alerts show critical severity. ATM tier changes to LOW. Score drop >15 points.",
        "wow_factor": "System detects the crisis and generates specific action recommendations within seconds.",
    },
    {
        "test_id": "TEST-04",
        "sheet_to_upload": "Recovery_August",
        "test_name": "Recovery Tracking — ATM Improvement",
        "role": "Product Manager",
        "steps": "1. Login as pm@ahadubank.com / PM@12345\n2. Upload Recovery_August data\n3. Go to Products → Ahadu ATM Network\n4. Check score history chart",
        "expected_result": "ATM score recovers +12 points. Tier moves back to MEDIUM. Score history chart shows dip and recovery curve.",
        "kpi_to_verify": "Score change is positive (+). Tier changed indicator appears. Recommendations updated.",
        "wow_factor": "Visual proof that management actions worked — tracked automatically by AI.",
    },
    {
        "test_id": "TEST-05",
        "sheet_to_upload": "None needed",
        "test_name": "AI Model Training — Live Demo",
        "role": "ML Engineer",
        "steps": "1. Login as ml@ahadubank.com / ML@12345\n2. Go to Model Management\n3. Click 'Train Random Forest'\n4. Watch accuracy meter update",
        "expected_result": "Random Forest trains on DB data. Accuracy shown: 92-96%. Feature importance chart updates (failed_txn_rate #1).",
        "kpi_to_verify": "Model version updates in registry. Active badge moves to new version.",
        "wow_factor": "Management can see the AI learning from real bank data in real-time.",
    },
    {
        "test_id": "TEST-06",
        "sheet_to_upload": "None needed",
        "test_name": "Report Generation — PDF Download",
        "role": "Executive Management",
        "steps": "1. Login as exec@ahadubank.com / Exec@123\n2. Go to Reports page\n3. Click Monthly Report → PDF\n4. Open downloaded file",
        "expected_result": "PDF contains: product scores table (colour-coded), KPI summary, alerts, top recommendations. Branded with Ahadu Bank crimson.",
        "kpi_to_verify": "PDF has data in all 4 sections. Tier colours match dashboard.",
        "wow_factor": "Board-ready report generated in 2 seconds — replaces 3-day manual process.",
    },
    {
        "test_id": "TEST-07",
        "sheet_to_upload": "None needed",
        "test_name": "Role-Based Access Control",
        "role": "Compliance Team",
        "steps": "1. Login as compliance@ahadubank.com / Comp@123\n2. Try accessing all menu items\n3. Note: Users page is hidden\n4. Try resolving an alert",
        "expected_result": "Compliance role can view all data but cannot add users. Alert resolve button visible. Model training buttons hidden.",
        "kpi_to_verify": "Menu shows correct items for role. Permissions enforced silently.",
        "wow_factor": "7 distinct roles with automatic access control — no manual permission management.",
    },
    {
        "test_id": "TEST-08",
        "sheet_to_upload": "Upload_Ready (use 1 product, 1 month only)",
        "test_name": "Real-Time Search & Notifications",
        "role": "Any user",
        "steps": "1. Login as any user\n2. Click search bar in header, type 'ATM'\n3. Click bell icon — review active alerts\n4. Click your name → settings",
        "expected_result": "Search shows 'Ahadu ATM Network' instantly. Bell shows count badge. Profile dropdown shows user info + role.",
        "kpi_to_verify": "Navigation works from search. Alerts load in dropdown. Logout works.",
        "wow_factor": "Full navigation from any page via search — no need to scroll the sidebar.",
    },
]
df_scenarios = pd.DataFrame(SCENARIOS)


# ── Write Excel ───────────────────────────────────────────────────────────────
path = OUT / "AHADU_PULSE_Executive_Demo_2026.xlsx"

with pd.ExcelWriter(path, engine="xlsxwriter") as writer:
    wb = writer.book

    # ── Format library ────────────────────────────────────────────────────────
    hdr      = wb.add_format({"bold":True,"bg_color":"#9B1535","font_color":"#FFFFFF","border":1,"font_size":9,"valign":"vcenter","align":"center"})
    cell     = wb.add_format({"border":1,"font_size":9,"valign":"vcenter"})
    alt      = wb.add_format({"border":1,"font_size":9,"valign":"vcenter","bg_color":"#FBF0F3"})
    num      = wb.add_format({"border":1,"font_size":9,"num_format":"#,##0","valign":"vcenter"})
    dec2     = wb.add_format({"border":1,"font_size":9,"num_format":"0.00","valign":"vcenter","align":"center"})
    title    = wb.add_format({"bold":True,"font_size":15,"font_color":"#7A0E28"})
    subtitle = wb.add_format({"font_size":10,"font_color":"#666666","italic":True})
    good     = wb.add_format({"border":1,"bg_color":"#DCFCE7","font_color":"#166534","bold":True,"align":"center","font_size":9})
    warn     = wb.add_format({"border":1,"bg_color":"#FEF3C7","font_color":"#92400E","bold":True,"align":"center","font_size":9})
    bad      = wb.add_format({"border":1,"bg_color":"#FEE2E2","font_color":"#991B1B","bold":True,"align":"center","font_size":9})
    rank1    = wb.add_format({"border":1,"bg_color":"#7A0E28","font_color":"#FFFFFF","bold":True,"align":"center","font_size":10})
    rank2    = wb.add_format({"border":1,"bg_color":"#9B1535","font_color":"#FFFFFF","bold":True,"align":"center","font_size":9})
    rank3    = wb.add_format({"border":1,"bg_color":"#BE1B3C","font_color":"#FFFFFF","bold":True,"align":"center","font_size":9})
    scenario_hdr = wb.add_format({"bold":True,"bg_color":"#5E0B1E","font_color":"#FFFFFF","border":1,"font_size":10,"valign":"vcenter"})
    scenario_alt = wb.add_format({"border":1,"font_size":9,"valign":"top","text_wrap":True,"bg_color":"#FBF0F3"})
    scenario_cel = wb.add_format({"border":1,"font_size":9,"valign":"top","text_wrap":True})
    wow_fmt      = wb.add_format({"border":1,"font_size":9,"valign":"top","text_wrap":True,"bg_color":"#FEF3C7","font_color":"#7A0E28","bold":True})

    def write_kpi_sheet(df_data, sheet_name, title_text, subtitle_text):
        df = df_data.copy()
        df.to_excel(writer, sheet_name=sheet_name, startrow=3, index=False)
        ws = writer.sheets[sheet_name]
        ws.write(0, 0, title_text, title)
        ws.write(1, 0, subtitle_text, subtitle)
        ws.write(2, 0, f"Generated: {date.today()} | AHADU PULSE v1.0.0 | Ahadu Bank S.C.", subtitle)
        # Column widths
        col_widths = {
            "product_code":15, "product_name":28, "rank":6,
            "period_date":12, "year":6, "month":6,
            "total_users":14, "active_users":14, "new_users":12, "churned_users":12,
            "total_transactions":16, "successful_transactions":18, "failed_transactions":16,
            "failed_txn_rate":14, "transaction_volume":18, "total_revenue":16,
            "fee_revenue":14, "uptime_percentage":14, "downtime_minutes":16,
            "downtime_hours":14, "avg_response_time_ms":18, "api_error_rate":14,
            "total_complaints":16, "resolved_complaints":18, "csat_score":12,
            "fraud_event_count":14, "security_incident_count":18, "scenario":12,
        }
        for ci, col in enumerate(df.columns):
            ws.set_column(ci, ci, col_widths.get(col, 14))
            ws.write(3, ci, col, hdr)
            for ri, val in enumerate(df[col]):
                row = 4 + ri
                is_alt = ri % 2 == 1
                # Conditional formatting for key metrics
                if col == "uptime_percentage":
                    f = good if val >= 99 else warn if val >= 97 else bad
                elif col == "failed_txn_rate":
                    f = good if val <= 3 else warn if val <= 6 else bad
                elif col == "csat_score":
                    f = good if val >= 4.0 else warn if val >= 3.0 else bad
                elif col == "rank":
                    f = rank1 if val == 1 else rank2 if val == 2 else rank3 if val == 3 else (alt if is_alt else cell)
                elif col in ("total_users","active_users","new_users","churned_users",
                             "total_transactions","successful_transactions","failed_transactions",
                             "total_complaints","resolved_complaints","fraud_event_count",
                             "security_incident_count","transaction_volume","total_revenue","fee_revenue"):
                    f = num
                elif col in ("failed_txn_rate","downtime_minutes","downtime_hours",
                             "avg_response_time_ms","api_error_rate","csat_score","uptime_percentage"):
                    f = dec2
                else:
                    f = alt if is_alt else cell
                ws.write(row, ci, val, f)
        ws.freeze_panes(4, 2)
        ws.autofilter(3, 0, 3 + len(df), len(df.columns) - 1)

    # ── Sheet 1: Executive Overview Jan-Jun 2026 ──────────────────────────────
    write_kpi_sheet(
        df_normal,
        "Executive_Overview",
        "AHADU PULSE — H1 2026 Digital Banking Performance (Jan–Jun 2026)",
        "6 products × 6 months = 36 records | Rankings: QR Pay #1, ATM Network #6 | Upload to see live scores",
    )

    # ── Sheet 2: ATM Crisis July 2026 ────────────────────────────────────────
    write_kpi_sheet(
        df_stress,
        "Crisis_ATM_July",
        "AHADU PULSE — CRISIS SCENARIO: ATM Hardware Failure (July 2026)",
        "ATM: uptime ~88%, failure rate ~17%, fraud doubled | Upload this to trigger CRITICAL alerts",
    )

    # ── Sheet 3: Recovery August 2026 ────────────────────────────────────────
    write_kpi_sheet(
        df_recovery,
        "Recovery_August",
        "AHADU PULSE — RECOVERY SCENARIO: ATM Restored (August 2026)",
        "ATM: uptime recovered >97%, failure reduced, CSAT improving | Upload after crisis to show improvement",
    )

    # ── Sheet 4: Upload Ready ─────────────────────────────────────────────────
    df_upload.to_excel(writer, sheet_name="Upload_Ready", startrow=0, index=False)
    ws_u = writer.sheets["Upload_Ready"]
    ws_u.write_row(0, 0, list(df_upload.columns), hdr)
    for ci, col in enumerate(df_upload.columns):
        ws_u.set_column(ci, ci, 16)
    ws_u.freeze_panes(1, 2)
    ws_u.autofilter(0, 0, len(df_upload), len(df_upload.columns) - 1)
    # Add note at top
    note_fmt = wb.add_format({"bold":True,"font_color":"#9B1535","font_size":11})
    ws_u.write(len(df_upload)+2, 0,
               "⬆ Upload this sheet directly to Settings page to test the full pipeline.",
               note_fmt)

    # ── Sheet 5: Test Scenarios Guide ─────────────────────────────────────────
    ws_s = wb.add_worksheet("Test_Scenarios_Guide")
    ws_s.set_column(0, 0, 10)   # Test ID
    ws_s.set_column(1, 1, 28)   # Test Name
    ws_s.set_column(2, 2, 20)   # Role
    ws_s.set_column(3, 3, 35)   # Sheet to upload
    ws_s.set_column(4, 4, 50)   # Steps
    ws_s.set_column(5, 5, 50)   # Expected result
    ws_s.set_column(6, 6, 35)   # KPI to verify
    ws_s.set_column(7, 7, 45)   # Wow factor
    ws_s.set_row(0, 24)
    ws_s.set_row(1, 16)

    ws_s.write(0, 0, "AHADU PULSE — Executive Demo Test Scenarios", title)
    ws_s.write(1, 0, f"8 test scenarios designed to showcase all system features to management | {date.today()}", subtitle)

    hdrs_s = ["Test ID","Test Name","Role","Data to Upload","Steps","Expected Result","KPI to Verify","WOW Factor for Management"]
    ws_s.write_row(3, 0, hdrs_s, scenario_hdr)
    ws_s.set_row(3, 22)

    for ri, row_data in df_scenarios.iterrows():
        ws_s.set_row(4+ri, 90)
        f = scenario_alt if ri % 2 == 1 else scenario_cel
        ws_s.write(4+ri, 0, row_data["test_id"], f)
        ws_s.write(4+ri, 1, row_data["test_name"], f)
        ws_s.write(4+ri, 2, row_data["role"], f)
        ws_s.write(4+ri, 3, row_data["sheet_to_upload"], f)
        ws_s.write(4+ri, 4, row_data["steps"], f)
        ws_s.write(4+ri, 5, row_data["expected_result"], f)
        ws_s.write(4+ri, 6, row_data["kpi_to_verify"], f)
        ws_s.write(4+ri, 7, row_data["wow_factor"], wow_fmt)

    ws_s.freeze_panes(4, 1)

    # ── Sheet 6: Product Profiles ─────────────────────────────────────────────
    ws_p = wb.add_worksheet("Product_Profiles")
    ws_p.set_column(0, 0, 8)
    ws_p.set_column(1, 1, 28)
    ws_p.set_column(2, 2, 30)
    ws_p.set_column(3, 9, 16)
    ws_p.write(0, 0, "Product Performance Profiles — Expected Scores & Tiers", title)
    ws_p.write(1, 0, "Reference guide for validating AI scoring against known profiles", subtitle)
    p_hdrs = ["Rank","Product","Profile Summary","Expected Score","Expected Tier",
              "Failure Rate","Uptime","CSAT","Growth Rate","Key Risk"]
    ws_p.write_row(3, 0, p_hdrs, hdr)
    ws_p.set_row(3, 20)

    tier_scores = {1:"HIGH(82-88)",2:"HIGH(79-85)",3:"HIGH(85-92)",
                   4:"HIGH(76-82)",5:"MEDIUM(65-72)",6:"MEDIUM(55-62)"}
    tier_names  = {1:"HIGH",2:"HIGH",3:"HIGH",4:"HIGH",5:"MEDIUM",6:"MEDIUM"}
    risks = {
        1:"Low engagement growth ceiling",
        2:"Downtime incidents, fraud risk",
        3:"Merchant network capacity",
        4:"Revenue per user plateau",
        5:"Failure rate approaching threshold",
        6:"Chronic downtime — upgrade URGENT",
    }

    for ri, p in enumerate(PRODUCTS):
        ws_p.set_row(4+ri, 30)
        r_fmt = rank1 if p["rank"]==1 else rank2 if p["rank"]==2 else rank3 if p["rank"]==3 else cell
        t_fmt = good if tier_names[p["rank"]]=="HIGH" else warn if tier_names[p["rank"]]=="MEDIUM" else bad
        ws_p.write(4+ri, 0, p["rank"], r_fmt)
        ws_p.write(4+ri, 1, p["product_name"], cell)
        ws_p.write(4+ri, 2, p["narrative"], cell)
        ws_p.write(4+ri, 3, tier_scores[p["rank"]], t_fmt)
        ws_p.write(4+ri, 4, tier_names[p["rank"]], t_fmt)
        f_fmt = good if p["fail_rate"]<=3 else warn if p["fail_rate"]<=6 else bad
        u_fmt = good if p["uptime"]>=99 else warn if p["uptime"]>=97 else bad
        c_fmt = good if p["csat"]>=4.0 else warn if p["csat"]>=3.0 else bad
        ws_p.write(4+ri, 5, f"{p['fail_rate']:.1f}%", f_fmt)
        ws_p.write(4+ri, 6, f"{p['uptime']:.1f}%", u_fmt)
        ws_p.write(4+ri, 7, f"{p['csat']:.1f}/5", c_fmt)
        ws_p.write(4+ri, 8, f"{p['growth']*100:.1f}% MoM", cell)
        ws_p.write(4+ri, 9, risks[p["rank"]], warn)

print(f"\n{'='*60}")
print("  AHADU PULSE Executive Demo Dataset Generated")
print(f"{'='*60}")
print(f"  File: {path.name}")
print(f"  Size: {path.stat().st_size/1024:.1f} KB")
print(f"\n  Sheets:")
print(f"    1. Executive_Overview      — H1 2026 (36 rows, 6 products)")
print(f"    2. Crisis_ATM_July         — Crisis month (6 rows, triggers alerts)")
print(f"    3. Recovery_August         — Recovery month (6 rows, shows improvement)")
print(f"    4. Upload_Ready            — {len(df_upload)} rows ready to paste into system")
print(f"    5. Test_Scenarios_Guide    — 8 demo scenarios with steps & expected results")
print(f"    6. Product_Profiles        — Expected scores & tier reference")
print(f"\n  Login credentials:")
print(f"    admin@ahadubank.com   / Admin@123  (Super Admin)")
print(f"    exec@ahadubank.com    / Exec@123   (Executive)")
print(f"    pm@ahadubank.com      / PM@12345   (Product Manager)")
print(f"    de@ahadubank.com      / DE@12345   (Data Engineer — upload data)")
print(f"    ml@ahadubank.com      / ML@12345   (ML Engineer — train models)")
print(f"    risk@ahadubank.com    / Risk@123   (Risk Team — resolve alerts)")
print(f"{'='*60}")
