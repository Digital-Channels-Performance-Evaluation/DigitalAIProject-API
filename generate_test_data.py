"""
=============================================================================
AHADU PULSE — Realistic Test Dataset Generator
Generates 3 Excel files covering different performance scenarios.

Products ranked best → worst (based on BRD context):
  1. Mobile Banking   — always best performer (HIGH tier)
  2. Card Banking     — strong second (HIGH tier)
  3. QR Payment       — fast growing (HIGH-MEDIUM transition)
  4. Digital Wallet   — solid (MEDIUM tier)
  5. POS System       — moderate (MEDIUM tier)
  6. ATM Network      — weakest (MEDIUM-LOW, chronic downtime)

File 1: test_data_realistic_jan_jun_2026.xlsx  — current 6-month KPIs (all products)
File 2: test_data_stress_scenario.xlsx         — stress/anomaly month (alerts triggered)
File 3: test_data_improvement_scenario.xlsx    — recovery month after interventions

Run: py generate_test_data.py
=============================================================================
"""

import pandas as pd
import numpy as np
from datetime import date, timedelta
from pathlib import Path

OUT_DIR = Path(__file__).parent / "database"
OUT_DIR.mkdir(exist_ok=True)

rng = np.random.default_rng(seed=2026)

# ── Product profiles ──────────────────────────────────────────────────────────
PRODUCTS = [
    {
        "product_code": "MOBILE_01",
        "product_name": "Ahadu Mobile Banking",
        # Large user base, high engagement, reliable
        "base_users": 1_020_000,
        "user_growth_pct": 0.018,        # 1.8% MoM growth
        "active_rate": 0.71,             # 71% monthly active
        "base_txn_per_active": 6.2,
        "avg_txn_value": 2_450,          # ETB
        "revenue_pct_of_volume": 0.028,
        "failed_txn_rate_base": 4.8,     # %
        "uptime_base": 99.1,             # %
        "downtime_min_base": 51.8,
        "avg_response_ms": 390,
        "api_error_rate": 1.4,
        "complaints_per_1k_users": 0.22,
        "resolution_rate": 0.91,
        "csat_base": 4.3,
        "fraud_per_month": 2,
        "security_incidents": 0,
    },
    {
        "product_code": "CARD_01",
        "product_name": "Ahadu Card Banking",
        "base_users": 760_000,
        "user_growth_pct": 0.014,
        "active_rate": 0.67,
        "base_txn_per_active": 5.1,
        "avg_txn_value": 4_100,
        "revenue_pct_of_volume": 0.058,
        "failed_txn_rate_base": 2.8,
        "uptime_base": 98.3,
        "downtime_min_base": 121.0,
        "avg_response_ms": 470,
        "api_error_rate": 2.0,
        "complaints_per_1k_users": 0.17,
        "resolution_rate": 0.88,
        "csat_base": 4.1,
        "fraud_per_month": 5,
        "security_incidents": 1,
    },
    {
        "product_code": "QR_01",
        "product_name": "Ahadu QR Pay",
        "base_users": 368_000,
        "user_growth_pct": 0.042,        # fastest growing
        "active_rate": 0.82,
        "base_txn_per_active": 7.8,
        "avg_txn_value": 980,
        "revenue_pct_of_volume": 0.022,
        "failed_txn_rate_base": 1.8,     # most reliable
        "uptime_base": 99.5,
        "downtime_min_base": 36.0,
        "avg_response_ms": 310,
        "api_error_rate": 0.8,
        "complaints_per_1k_users": 0.14,
        "resolution_rate": 0.94,
        "csat_base": 4.5,
        "fraud_per_month": 1,
        "security_incidents": 0,
    },
    {
        "product_code": "WALLET_01",
        "product_name": "Ahadu Digital Wallet",
        "base_users": 548_000,
        "user_growth_pct": 0.022,
        "active_rate": 0.74,
        "base_txn_per_active": 5.8,
        "avg_txn_value": 1_620,
        "revenue_pct_of_volume": 0.031,
        "failed_txn_rate_base": 2.3,
        "uptime_base": 99.3,
        "downtime_min_base": 42.5,
        "avg_response_ms": 295,
        "api_error_rate": 1.1,
        "complaints_per_1k_users": 0.19,
        "resolution_rate": 0.89,
        "csat_base": 4.0,
        "fraud_per_month": 2,
        "security_incidents": 0,
    },
    {
        "product_code": "POS_01",
        "product_name": "Ahadu POS System",
        "base_users": 412_000,
        "user_growth_pct": 0.011,
        "active_rate": 0.58,
        "base_txn_per_active": 4.4,
        "avg_txn_value": 3_850,
        "revenue_pct_of_volume": 0.062,
        "failed_txn_rate_base": 3.3,
        "uptime_base": 97.8,
        "downtime_min_base": 158.4,
        "avg_response_ms": 545,
        "api_error_rate": 2.6,
        "complaints_per_1k_users": 0.28,
        "resolution_rate": 0.83,
        "csat_base": 3.6,
        "fraud_per_month": 4,
        "security_incidents": 1,
    },
    {
        "product_code": "ATM_01",
        "product_name": "Ahadu ATM Network",
        "base_users": 558_000,
        "user_growth_pct": 0.006,        # slow growth
        "active_rate": 0.48,
        "base_txn_per_active": 3.2,
        "avg_txn_value": 2_800,
        "revenue_pct_of_volume": 0.041,
        "failed_txn_rate_base": 6.1,     # highest failure
        "uptime_base": 96.4,             # lowest uptime
        "downtime_min_base": 378.0,      # worst downtime
        "avg_response_ms": 680,
        "api_error_rate": 4.2,
        "complaints_per_1k_users": 0.61, # most complaints
        "resolution_rate": 0.74,
        "csat_base": 3.1,
        "fraud_per_month": 8,
        "security_incidents": 2,
    },
]


def noise(val: float, pct: float = 0.05) -> float:
    """Add ±pct% Gaussian noise."""
    return float(val * (1 + rng.normal(0, pct)))


def build_rows(
    products: list,
    periods: list,         # list of (year, month, period_date) tuples
    scenario: str = "normal",
    stress_product: str = None,
    recovery_product: str = None,
) -> list:
    rows = []
    prev_complaints: dict = {}

    for p in products:
        code = p["product_code"]
        base_users = p["base_users"]

        for i, (year, month, period_date) in enumerate(periods):
            growth_factor = (1 + p["user_growth_pct"]) ** i

            # ── Users ────────────────────────────────────────────────────────
            total_users = int(base_users * growth_factor * noise(1.0, 0.01))
            active_users = int(total_users * noise(p["active_rate"], 0.04))
            new_users    = int(total_users * noise(0.038, 0.15))
            churned_users = int(total_users * noise(0.012, 0.15))

            # ── Transactions ─────────────────────────────────────────────────
            total_txn = int(active_users * noise(p["base_txn_per_active"], 0.08))
            txn_volume = round(total_txn * noise(p["avg_txn_value"], 0.06), 2)
            total_revenue = round(txn_volume * p["revenue_pct_of_volume"], 2)
            fee_revenue   = round(total_revenue * noise(0.13, 0.05), 2)

            # ── Failure rate adjustments by scenario ─────────────────────────
            base_fail = p["failed_txn_rate_base"]
            if scenario == "stress" and code == stress_product:
                base_fail = min(base_fail * noise(2.8, 0.1), 44.9)
            elif scenario == "recovery" and code == recovery_product:
                base_fail = max(base_fail * noise(0.62, 0.05), 0.5)

            failed_txn_rate = round(max(0.5, min(44.9, noise(base_fail, 0.08))), 4)
            failed_txn      = int(total_txn * failed_txn_rate / 100)
            successful_txn  = total_txn - failed_txn

            # ── Operational ──────────────────────────────────────────────────
            base_up = p["uptime_base"]
            if scenario == "stress" and code == stress_product:
                base_up = max(base_up - noise(8.0, 0.1), 80.0)
            elif scenario == "recovery" and code == recovery_product:
                base_up = min(base_up + noise(1.5, 0.05), 99.9)

            uptime_pct    = round(min(99.9, max(80.0, noise(base_up, 0.003))), 2)
            downtime_min  = round(max(0, noise(p["downtime_min_base"], 0.15)), 1)
            downtime_hrs  = round(downtime_min / 60, 2)
            avg_rt_ms     = int(noise(p["avg_response_ms"], 0.10))
            api_err       = round(max(0.01, noise(p["api_error_rate"], 0.12)), 3)

            # ── Complaints ───────────────────────────────────────────────────
            base_compl = p["complaints_per_1k_users"]
            if scenario == "stress" and code == stress_product:
                base_compl *= noise(2.2, 0.1)
            elif scenario == "recovery" and code == recovery_product:
                base_compl *= noise(0.7, 0.08)

            total_complaints = int(total_users / 1000 * noise(base_compl, 0.12))
            resolved_complaints = int(total_complaints * noise(p["resolution_rate"], 0.04))
            resolved_complaints = min(resolved_complaints, total_complaints)

            # ── CSAT ─────────────────────────────────────────────────────────
            csat = p["csat_base"]
            if scenario == "stress" and code == stress_product:
                csat = max(1.0, csat - noise(1.1, 0.1))
            elif scenario == "recovery" and code == recovery_product:
                csat = min(5.0, csat + noise(0.3, 0.05))
            csat = round(noise(csat, 0.03), 2)
            csat = max(1.0, min(5.0, csat))

            # ── Risk ─────────────────────────────────────────────────────────
            fraud  = max(0, int(noise(p["fraud_per_month"], 0.3)))
            sec_inc = max(0, int(noise(p["security_incidents"], 0.5)))
            if scenario == "stress" and code == stress_product:
                fraud  = max(0, int(fraud * noise(2.5, 0.2)))
                sec_inc = max(0, int(sec_inc + rng.integers(1, 3)))

            rows.append({
                "product_code":           code,
                "product_name":           p["product_name"],
                "period_date":            period_date.strftime("%Y-%m-%d"),
                "year":                   year,
                "month":                  month,
                # User metrics
                "total_users":            total_users,
                "active_users":           active_users,
                "new_users":              new_users,
                "churned_users":          churned_users,
                # Transaction metrics
                "total_transactions":     total_txn,
                "successful_transactions": successful_txn,
                "failed_transactions":    failed_txn,
                "failed_txn_rate":        failed_txn_rate,
                "transaction_volume_etb": txn_volume,
                # Revenue
                "total_revenue_etb":      total_revenue,
                "fee_revenue_etb":        fee_revenue,
                # Operational
                "uptime_percentage":      uptime_pct,
                "downtime_minutes":       downtime_min,
                "downtime_hours":         downtime_hrs,
                "avg_response_time_ms":   avg_rt_ms,
                "api_error_rate_pct":     api_err,
                # Complaints / CRM
                "total_complaints":       total_complaints,
                "resolved_complaints":    resolved_complaints,
                "csat_score":             csat,
                # Risk / Security
                "fraud_event_count":      fraud,
                "security_incident_count": sec_inc,
                # Scenario tag
                "scenario":               scenario,
                "data_source":            "test_dataset",
            })

        prev_complaints[code] = total_complaints  # track for MoM

    return rows


# ─────────────────────────────────────────────────────────────────────────────
# File 1 — Realistic 6-month KPI data (Jan–Jun 2026)
# ─────────────────────────────────────────────────────────────────────────────

periods_6mo = [
    (2026, 1, date(2026, 1, 31)),
    (2026, 2, date(2026, 2, 28)),
    (2026, 3, date(2026, 3, 31)),
    (2026, 4, date(2026, 4, 30)),
    (2026, 5, date(2026, 5, 31)),
    (2026, 6, date(2026, 6, 30)),
]

rows_realistic = build_rows(PRODUCTS, periods_6mo, scenario="normal")
df_realistic = pd.DataFrame(rows_realistic)


# ─────────────────────────────────────────────────────────────────────────────
# File 2 — Stress scenario: ATM catastrophic month (July 2026)
#           + POS degradation, while Mobile/QR remain strong
# ─────────────────────────────────────────────────────────────────────────────

periods_stress = [(2026, 7, date(2026, 7, 31))]
rows_stress_atm = build_rows(PRODUCTS, periods_stress, scenario="stress",
                              stress_product="ATM_01")
rows_stress_pos = build_rows(
    [p for p in PRODUCTS if p["product_code"] != "ATM_01"],
    periods_stress, scenario="stress", stress_product="POS_01"
)
# Combine — ATM rows from stress_atm, others from stress_pos
df_stress = pd.DataFrame(
    [r for r in rows_stress_atm if r["product_code"] == "ATM_01"] +
    [r for r in rows_stress_pos if r["product_code"] != "ATM_01"]
)
df_stress["scenario"] = "stress_july_2026"
df_stress["scenario_notes"] = df_stress["product_code"].map({
    "ATM_01":    "ATM CRISIS: hardware failure nationwide — downtime spike, fraud surge",
    "POS_01":    "POS DEGRADED: merchant connectivity issues — failure rate elevated",
    "MOBILE_01": "Mobile Banking STABLE — absorbing users from ATM disruption",
    "CARD_01":   "Card Banking STABLE",
    "QR_01":     "QR Pay STABLE — transaction volume increase (ATM users migrating)",
    "WALLET_01": "Digital Wallet STABLE",
})


# ─────────────────────────────────────────────────────────────────────────────
# File 3 — Recovery scenario: Aug 2026 after interventions
#           ATM recovers, POS improves, QR accelerates
# ─────────────────────────────────────────────────────────────────────────────

periods_recovery = [(2026, 8, date(2026, 8, 31))]
rows_recovery = build_rows(PRODUCTS, periods_recovery, scenario="recovery",
                            recovery_product="ATM_01")
df_recovery = pd.DataFrame(rows_recovery)
df_recovery["scenario"] = "recovery_aug_2026"
df_recovery["scenario_notes"] = df_recovery["product_code"].map({
    "ATM_01":    "ATM RECOVERY: firmware patched, downtime reduced, fraud resolved",
    "POS_01":    "POS RECOVERING: connectivity fix deployed",
    "MOBILE_01": "Mobile Banking HIGH PERFORMER — sustained growth trajectory",
    "CARD_01":   "Card Banking HIGH PERFORMER — stable",
    "QR_01":     "QR Pay BEST GROWTH — expanded merchant network",
    "WALLET_01": "Digital Wallet STABLE GROWTH",
})


# ─────────────────────────────────────────────────────────────────────────────
# Build Excel files with multiple sheets each
# ─────────────────────────────────────────────────────────────────────────────

def style_writer(df: pd.DataFrame, path: Path, sheet_configs: list):
    """Write multi-sheet Excel with styling.
    Always writes a clean 'Upload_Ready' sheet as the FIRST sheet (row 1 = headers)
    so the file can be directly uploaded via the Settings page without skiprows issues.
    """
    with pd.ExcelWriter(path, engine="xlsxwriter") as writer:
        wb = writer.book

        # Formats
        hdr_fmt   = wb.add_format({"bold": True, "bg_color": "#A01535", "font_color": "#FFFFFF",
                                   "border": 1, "border_color": "#7D1028", "font_size": 10})
        num_fmt   = wb.add_format({"num_format": "#,##0", "border": 1, "border_color": "#E5E7EB"})
        dec2_fmt  = wb.add_format({"num_format": "0.00",  "border": 1, "border_color": "#E5E7EB"})
        text_fmt  = wb.add_format({"border": 1, "border_color": "#E5E7EB"})
        alt_fmt   = wb.add_format({"bg_color": "#FDF2F5", "border": 1, "border_color": "#E5E7EB"})
        title_fmt = wb.add_format({"bold": True, "font_size": 14, "font_color": "#7D1028"})
        sub_fmt   = wb.add_format({"font_size": 10, "font_color": "#666666", "italic": True})
        good_fmt  = wb.add_format({"bg_color": "#DCFCE7", "font_color": "#166534",
                                   "border": 1, "border_color": "#BBF7D0", "bold": True})
        warn_fmt  = wb.add_format({"bg_color": "#FEF3C7", "font_color": "#92400E",
                                   "border": 1, "border_color": "#FDE68A", "bold": True})
        bad_fmt   = wb.add_format({"bg_color": "#FEE2E2", "font_color": "#991B1B",
                                   "border": 1, "border_color": "#FECACA", "bold": True})

        # ── Sheet 0: Upload_Ready (clean, no title rows — row 1 = headers) ──
        # Pull the first KPI data sheet from configs
        kpi_cfg = next((c for c in sheet_configs if "product_code" in c["df"].columns), None)
        if kpi_cfg is not None:
            # Only keep upload-relevant columns
            upload_cols = [
                "product_code", "period_date",
                "total_users", "active_users", "new_users", "churned_users",
                "total_transactions", "successful_transactions", "failed_transactions",
                "failed_txn_rate", "transaction_volume_etb",
                "total_revenue_etb", "fee_revenue_etb",
                "uptime_percentage", "downtime_minutes", "downtime_hours",
                "avg_response_time_ms", "api_error_rate_pct",
                "total_complaints", "resolved_complaints", "csat_score",
                "fraud_event_count", "security_incident_count",
            ]
            avail_cols = [c for c in upload_cols if c in kpi_cfg["df"].columns]
            upload_df  = kpi_cfg["df"][avail_cols].copy()

            # Rename api_error_rate_pct → api_error_rate to match backend expectation
            upload_df = upload_df.rename(columns={
                "transaction_volume_etb": "transaction_volume",
                "total_revenue_etb":      "total_revenue",
                "fee_revenue_etb":        "fee_revenue",
                "api_error_rate_pct":     "api_error_rate",
            })

            upload_df.to_excel(writer, sheet_name="Upload_Ready", startrow=0, index=False)
            ws_u = writer.sheets["Upload_Ready"]
            # Style header row
            for ci, col in enumerate(upload_df.columns):
                ws_u.write(0, ci, col, hdr_fmt)
                ws_u.set_column(ci, ci, max(len(col) + 2, 12))
            ws_u.freeze_panes(1, 2)
            ws_u.autofilter(0, 0, len(upload_df), len(upload_df.columns) - 1)

        # ── Remaining sheets with styled title rows ──
        for cfg in sheet_configs:
            sheet_df   = cfg["df"]
            sheet_name = cfg["name"]
            title_text = cfg.get("title", sheet_name)
            subtitle   = cfg.get("subtitle", "")
            start_row  = 3

            sheet_df.to_excel(writer, sheet_name=sheet_name,
                              startrow=start_row, index=False)
            ws = writer.sheets[sheet_name]

            ws.write(0, 0, title_text, title_fmt)
            ws.write(1, 0, subtitle, sub_fmt)
            ws.write(2, 0, f"Generated: {date.today()} | AHADU PULSE v1.0.0 | Ahadu Bank S.C.", sub_fmt)

            for ci, col in enumerate(sheet_df.columns):
                col_lower = col.lower()
                max_len = max(len(col) + 2,
                              sheet_df[col].astype(str).str.len().max() + 2)
                max_len = min(max_len, 32)
                ws.set_column(ci, ci, max_len)
                ws.write(start_row, ci, col, hdr_fmt)

                for ri, val in enumerate(sheet_df[col]):
                    row = start_row + 1 + ri
                    alt = (ri % 2 == 1)

                    if col_lower in ("total_users","active_users","new_users","churned_users",
                                     "total_transactions","successful_transactions",
                                     "failed_transactions","total_complaints","resolved_complaints",
                                     "fraud_event_count","security_incident_count",
                                     "transaction_volume_etb","total_revenue_etb","fee_revenue_etb",
                                     "user_engagement_index","unresolved_complaints"):
                        ws.write(row, ci, val, num_fmt)
                    elif col_lower in ("failed_txn_rate","uptime_percentage","csat_score",
                                       "downtime_minutes","downtime_hours","avg_response_time_ms",
                                       "api_error_rate_pct","revenue_per_txn_etb",
                                       "revenue_per_active_user_etb","downtime_impact_pct",
                                       "active_user_rate","txn_success_rate","complaint_resolution_rate"):
                        if col_lower == "uptime_percentage":
                            fmt = good_fmt if val >= 99 else warn_fmt if val >= 97 else bad_fmt
                        elif col_lower == "failed_txn_rate":
                            fmt = good_fmt if val <= 3 else warn_fmt if val <= 6 else bad_fmt
                        elif col_lower == "csat_score":
                            fmt = good_fmt if val >= 4.0 else warn_fmt if val >= 3.0 else bad_fmt
                        else:
                            fmt = dec2_fmt
                        ws.write(row, ci, val, fmt)
                    else:
                        ws.write(row, ci, val, alt_fmt if alt else text_fmt)

            ws.freeze_panes(start_row + 1, 2)
            ws.autofilter(start_row, 0, start_row + len(sheet_df),
                          len(sheet_df.columns) - 1)

        print(f"  Saved: {path.name}")


# ─────────────────────────────────────────────────────────────────────────────
# Build per-product summary sheets
# ─────────────────────────────────────────────────────────────────────────────

def make_summary(df: pd.DataFrame) -> pd.DataFrame:
    """Compute derived KPI summary per product per period."""
    d = df.copy()
    d["active_user_rate"]            = (d["active_users"] / d["total_users"]).round(4)
    d["txn_success_rate"]            = ((d["total_transactions"] - d["failed_transactions"]) /
                                         d["total_transactions"]).round(4)
    d["revenue_per_txn_etb"]         = (d["total_revenue_etb"] / d["total_transactions"]).round(2)
    d["revenue_per_active_user_etb"] = (d["total_revenue_etb"] / d["active_users"]).round(2)
    d["downtime_impact_pct"]         = (d["downtime_minutes"] / (30*24*60) * 100).round(4)
    d["complaint_resolution_rate"]   = (d["resolved_complaints"] / d["total_complaints"]).round(4)
    d["unresolved_complaints"]       = d["total_complaints"] - d["resolved_complaints"]
    d["user_engagement_index"]       = (d["active_user_rate"] * d["total_transactions"]).round(0)
    return d


# ─────────────────────────────────────────────────────────────────────────────
# Activity log — system-level events
# ─────────────────────────────────────────────────────────────────────────────

ACTIVITY_LOG = [
    # Realistic 2026 system activities
    {"date": "2026-01-02", "event_type": "REPORT_GENERATED",   "product_code": "ALL",       "user": "exec@ahadubank.com",  "description": "Monthly December 2025 executive report generated (PDF + Excel)", "status": "success"},
    {"date": "2026-01-03", "event_type": "MODEL_RETRAINED",    "product_code": "ALL",       "user": "ml@ahadubank.com",    "description": "Monthly model retraining — LR, Ridge, RF, DT, KNN. All BRD thresholds passed.", "status": "success"},
    {"date": "2026-01-05", "event_type": "DATA_UPLOAD",        "product_code": "ALL",       "user": "de@ahadubank.com",    "description": "January 2026 KPI data uploaded — 6 products, 6 rows, all validated.", "status": "success"},
    {"date": "2026-01-05", "event_type": "SCORING_RUN",        "product_code": "ALL",       "user": "SYSTEM",             "description": "Automatic scoring run completed. Mobile=HIGH, QR=HIGH, Card=HIGH, Wallet=HIGH, POS=MEDIUM, ATM=MEDIUM", "status": "success"},
    {"date": "2026-01-06", "event_type": "ALERT_TRIGGERED",    "product_code": "ATM_01",    "user": "SYSTEM",             "description": "Downtime spike alert: ATM uptime 96.2% — below 97.5% SLA threshold.", "status": "warning"},
    {"date": "2026-01-06", "event_type": "RECOMMENDATION",     "product_code": "ATM_01",    "user": "SYSTEM",             "description": "AI Recommendation (HIGH priority): Upgrade ATM connectivity to reduce downtime.", "status": "info"},
    {"date": "2026-01-08", "event_type": "ALERT_RESOLVED",     "product_code": "ATM_01",    "user": "risk@ahadubank.com", "description": "ATM downtime alert resolved. IT team deployed connectivity patch to 12 rural ATMs.", "status": "success"},
    {"date": "2026-01-15", "event_type": "USER_LOGIN",         "product_code": "N/A",       "user": "exec@ahadubank.com", "description": "Executive dashboard accessed. Performance review session.", "status": "success"},
    {"date": "2026-02-04", "event_type": "DATA_UPLOAD",        "product_code": "ALL",       "user": "de@ahadubank.com",   "description": "February 2026 KPI data uploaded — 6 products, all validated.", "status": "success"},
    {"date": "2026-02-04", "event_type": "SCORING_RUN",        "product_code": "ALL",       "user": "SYSTEM",             "description": "Scoring complete. QR Pay score +2.1 improvement. ATM score +0.8 recovery.", "status": "success"},
    {"date": "2026-02-10", "event_type": "RECOMMENDATION_ACK", "product_code": "ATM_01",    "user": "pm@ahadubank.com",   "description": "Recommendation acknowledged: Improve ATM Complaint Resolution to 90%.", "status": "success"},
    {"date": "2026-02-28", "event_type": "REPORT_GENERATED",   "product_code": "ALL",       "user": "exec@ahadubank.com", "description": "Monthly February 2026 report generated.", "status": "success"},
    {"date": "2026-03-04", "event_type": "DATA_UPLOAD",        "product_code": "ALL",       "user": "de@ahadubank.com",   "description": "March 2026 KPI data uploaded.", "status": "success"},
    {"date": "2026-03-04", "event_type": "FEATURE_ENGINEERING","product_code": "ALL",       "user": "SYSTEM",             "description": "Feature engineering re-run. 6 records processed. All features computed.", "status": "success"},
    {"date": "2026-03-05", "event_type": "SCORING_RUN",        "product_code": "ALL",       "user": "SYSTEM",             "description": "Scoring complete. Mobile Banking tier confirmed HIGH. QR Pay nearing tier upgrade.", "status": "success"},
    {"date": "2026-03-12", "event_type": "MODEL_DRIFT_CHECK",  "product_code": "ALL",       "user": "SYSTEM",             "description": "Weekly drift check. All models within acceptable range. No retraining triggered.", "status": "success"},
    {"date": "2026-04-03", "event_type": "DATA_UPLOAD",        "product_code": "ALL",       "user": "de@ahadubank.com",   "description": "April 2026 KPI data uploaded.", "status": "success"},
    {"date": "2026-04-03", "event_type": "SCORING_RUN",        "product_code": "ALL",       "user": "SYSTEM",             "description": "QR Pay tier upgraded to HIGH. Alert: POS failure rate 3.5% approaching threshold.", "status": "warning"},
    {"date": "2026-04-04", "event_type": "ALERT_TRIGGERED",    "product_code": "POS_01",    "user": "SYSTEM",             "description": "Failure rate alert: POS transaction failure at 3.5%, approaching 5% critical threshold.", "status": "warning"},
    {"date": "2026-04-10", "event_type": "RECOMMENDATION_ACK", "product_code": "POS_01",    "user": "pm@ahadubank.com",   "description": "Recommendation acknowledged: Expand POS to Tier-2 cities to offset failure rate.", "status": "success"},
    {"date": "2026-05-02", "event_type": "DATA_UPLOAD",        "product_code": "ALL",       "user": "de@ahadubank.com",   "description": "May 2026 KPI data uploaded.", "status": "success"},
    {"date": "2026-05-02", "event_type": "SCORING_RUN",        "product_code": "ALL",       "user": "SYSTEM",             "description": "Scoring complete. Mobile Banking avg score 80.3 — highest ever. ATM stable MEDIUM.", "status": "success"},
    {"date": "2026-05-10", "event_type": "SECURITY_EVENT",     "product_code": "CARD_01",   "user": "SYSTEM",             "description": "Security incident detected — 1 Card Banking API anomaly. Investigated and closed.", "status": "warning"},
    {"date": "2026-05-15", "event_type": "MODEL_RETRAINED",    "product_code": "ALL",       "user": "ml@ahadubank.com",   "description": "Quarterly model retraining with latest data. Accuracy improved: DT 95.4%→96.1%.", "status": "success"},
    {"date": "2026-06-02", "event_type": "DATA_UPLOAD",        "product_code": "ALL",       "user": "de@ahadubank.com",   "description": "June 2026 KPI data uploaded.", "status": "success"},
    {"date": "2026-06-02", "event_type": "SCORING_RUN",        "product_code": "ALL",       "user": "SYSTEM",             "description": "H1 2026 scoring complete. Rankings: 1.Mobile 2.QR 3.Card 4.Wallet 5.POS 6.ATM", "status": "success"},
    {"date": "2026-06-30", "event_type": "REPORT_GENERATED",   "product_code": "ALL",       "user": "exec@ahadubank.com", "description": "H1 2026 comprehensive executive report generated — PDF + Excel + CSV.", "status": "success"},
    # Stress month
    {"date": "2026-07-01", "event_type": "CRITICAL_ALERT",     "product_code": "ATM_01",    "user": "SYSTEM",             "description": "CRITICAL: ATM Network mass hardware failure. Uptime dropped to 88.2%. 847 ATMs offline.", "status": "critical"},
    {"date": "2026-07-01", "event_type": "CRITICAL_ALERT",     "product_code": "ATM_01",    "user": "SYSTEM",             "description": "CRITICAL: ATM fraud spike — 19 fraud events in 24 hours. Security team notified.", "status": "critical"},
    {"date": "2026-07-02", "event_type": "ALERT_TRIGGERED",    "product_code": "POS_01",    "user": "SYSTEM",             "description": "POS failure rate elevated to 8.9% — connectivity issues following ATM network strain.", "status": "warning"},
    {"date": "2026-07-03", "event_type": "EMERGENCY_REVIEW",   "product_code": "ATM_01",    "user": "exec@ahadubank.com", "description": "Emergency executive review of ATM crisis. IT escalation team deployed.", "status": "info"},
    {"date": "2026-07-05", "event_type": "DATA_UPLOAD",        "product_code": "ALL",       "user": "de@ahadubank.com",   "description": "July 2026 KPI data uploaded (partial — crisis month data).", "status": "success"},
    {"date": "2026-07-05", "event_type": "SCORING_RUN",        "product_code": "ALL",       "user": "SYSTEM",             "description": "Scoring: ATM score dropped to LOW tier (-18.3 points). POS score declined. Mobile/QR stable.", "status": "warning"},
    {"date": "2026-07-15", "event_type": "INCIDENT_UPDATE",    "product_code": "ATM_01",    "user": "risk@ahadubank.com", "description": "ATM hardware replacement 60% complete. 509 ATMs restored. Fraud incidents contained.", "status": "info"},
    # Recovery month
    {"date": "2026-08-01", "event_type": "INCIDENT_RESOLVED",  "product_code": "ATM_01",    "user": "risk@ahadubank.com", "description": "ATM hardware replacement complete. All ATMs online. Firmware updated to v3.2.1.", "status": "success"},
    {"date": "2026-08-03", "event_type": "DATA_UPLOAD",        "product_code": "ALL",       "user": "de@ahadubank.com",   "description": "August 2026 KPI data uploaded.", "status": "success"},
    {"date": "2026-08-03", "event_type": "SCORING_RUN",        "product_code": "ALL",       "user": "SYSTEM",             "description": "ATM tier recovered to MEDIUM (+12.8 points). POS improved. QR Pay acceleration confirmed.", "status": "success"},
    {"date": "2026-08-10", "event_type": "MODEL_RETRAINED",    "product_code": "ALL",       "user": "ml@ahadubank.com",   "description": "Post-crisis model retraining with July+August data. Models updated.", "status": "success"},
    {"date": "2026-08-31", "event_type": "REPORT_GENERATED",   "product_code": "ALL",       "user": "exec@ahadubank.com", "description": "August 2026 recovery report generated. ATM crisis post-mortem included.", "status": "success"},
]

df_activity = pd.DataFrame(ACTIVITY_LOG)


# ─────────────────────────────────────────────────────────────────────────────
# Write File 1 — Normal 6-month KPI data
# ─────────────────────────────────────────────────────────────────────────────

df_r_summary = make_summary(df_realistic)
path1 = OUT_DIR / "test_data_01_realistic_jan_jun_2026.xlsx"

style_writer(df_r_summary, path1, [
    {
        "df":       df_r_summary.drop(columns=["scenario","data_source","product_name"], errors="ignore"),
        "name":     "KPI_Data",
        "title":    "AHADU PULSE — Realistic KPI Data (Jan–Jun 2026)",
        "subtitle": "6 Products × 6 Months = 36 records | All BRD primary + derived features",
    },
    {
        "df": df_r_summary.groupby("product_code").agg({
            "total_users":          "max",
            "active_users":         "mean",
            "total_transactions":   "sum",
            "total_revenue_etb":    "sum",
            "failed_txn_rate":      "mean",
            "uptime_percentage":    "mean",
            "downtime_minutes":     "mean",
            "total_complaints":     "sum",
            "csat_score":           "mean",
            "fraud_event_count":    "sum",
            "active_user_rate":     "mean",
            "txn_success_rate":     "mean",
            "revenue_per_txn_etb":  "mean",
            "downtime_impact_pct":  "mean",
        }).round(2).reset_index(),
        "name":     "Product_Summary",
        "title":    "Product Performance Summary — Jan–Jun 2026 Average",
        "subtitle": "Aggregated 6-month KPIs per product",
    },
    {
        "df":       df_activity,
        "name":     "System_Activity_Log",
        "title":    "AHADU PULSE System Activity Log (2026)",
        "subtitle": "All system events: scoring runs, alerts, model training, data uploads, reports",
    },
])


# ─────────────────────────────────────────────────────────────────────────────
# Write File 2 — Stress scenario
# ─────────────────────────────────────────────────────────────────────────────

df_s_summary = make_summary(df_stress.drop(columns=["scenario","scenario_notes"], errors="ignore"))
df_s_summary["scenario"]       = df_stress["scenario"].values
df_s_summary["scenario_notes"] = df_stress["scenario_notes"].values

path2 = OUT_DIR / "test_data_02_stress_scenario_jul_2026.xlsx"

style_writer(df_s_summary, path2, [
    {
        "df":       df_s_summary,
        "name":     "KPI_Stress_Month",
        "title":    "AHADU PULSE — Stress Scenario (July 2026): ATM Crisis + POS Degradation",
        "subtitle": "ATM: hardware failure nationwide | POS: connectivity issues | Mobile/QR: stable",
    },
    {
        "df": df_activity[df_activity["date"].str.startswith("2026-07")].reset_index(drop=True),
        "name": "Alerts_and_Events",
        "title": "Crisis Month Activity Log — July 2026",
        "subtitle": "System alerts, incident tracking, and management response events",
    },
])


# ─────────────────────────────────────────────────────────────────────────────
# Write File 3 — Recovery scenario
# ─────────────────────────────────────────────────────────────────────────────

df_rv_summary = make_summary(df_recovery.drop(columns=["scenario","scenario_notes"], errors="ignore"))
df_rv_summary["scenario"]       = df_recovery["scenario"].values
df_rv_summary["scenario_notes"] = df_recovery["scenario_notes"].values

path3 = OUT_DIR / "test_data_03_recovery_scenario_aug_2026.xlsx"

# Compare stress vs recovery
stress_cols  = ["product_code","failed_txn_rate","uptime_percentage","csat_score",
                "total_complaints","fraud_event_count","downtime_minutes"]
compare_df = pd.merge(
    df_s_summary[stress_cols].rename(columns={c: f"jul_{c}" for c in stress_cols if c != "product_code"}),
    df_rv_summary[stress_cols].rename(columns={c: f"aug_{c}" for c in stress_cols if c != "product_code"}),
    on="product_code",
)
compare_df["failure_rate_change"]  = (compare_df["aug_failed_txn_rate"]    - compare_df["jul_failed_txn_rate"]).round(2)
compare_df["uptime_change"]        = (compare_df["aug_uptime_percentage"]  - compare_df["jul_uptime_percentage"]).round(2)
compare_df["csat_change"]          = (compare_df["aug_csat_score"]         - compare_df["jul_csat_score"]).round(2)
compare_df["complaint_change"]     = (compare_df["aug_total_complaints"]   - compare_df["jul_total_complaints"])
compare_df["downtime_reduction_min"] = (compare_df["jul_downtime_minutes"] - compare_df["aug_downtime_minutes"]).round(1)

style_writer(df_rv_summary, path3, [
    {
        "df":       df_rv_summary,
        "name":     "KPI_Recovery_Month",
        "title":    "AHADU PULSE — Recovery Scenario (August 2026)",
        "subtitle": "ATM restored | POS improved | QR Pay accelerating | Mobile Banking sustained HIGH",
    },
    {
        "df":       compare_df,
        "name":     "Jul_vs_Aug_Comparison",
        "title":    "Stress vs Recovery Comparison (July → August 2026)",
        "subtitle": "Negative failure_rate_change = improvement | Positive uptime_change = improvement",
    },
    {
        "df": df_activity[df_activity["date"].str.startswith("2026-08")].reset_index(drop=True),
        "name": "Recovery_Activity_Log",
        "title": "Recovery Month Activity Log — August 2026",
        "subtitle": "Incident resolution, scoring runs, model retraining, executive report",
    },
])


# ─────────────────────────────────────────────────────────────────────────────
# Print summary
# ─────────────────────────────────────────────────────────────────────────────

print()
print("=" * 60)
print("  AHADU PULSE Test Datasets Generated")
print("=" * 60)
print(f"  File 1: {path1.name}")
print(f"    - KPI_Data:         {len(df_r_summary)} rows (36 product×month records)")
print(f"    - Product_Summary:  6 rows (aggregated per product)")
print(f"    - System_Activity_Log: {len(df_activity)} events")
print()
print(f"  File 2: {path2.name}")
print(f"    - KPI_Stress_Month: 6 rows (crisis month Jul 2026)")
print(f"    - Alerts_and_Events: crisis log")
print()
print(f"  File 3: {path3.name}")
print(f"    - KPI_Recovery_Month: 6 rows (recovery Aug 2026)")
print(f"    - Jul_vs_Aug_Comparison: 6 rows")
print(f"    - Recovery_Activity_Log: recovery log")
print()
print("  Rankings (H1 2026 average score):")
avg_scores = df_r_summary.groupby(["product_code","product_name"])["txn_success_rate"].mean().reset_index()
for _, row in df_realistic.groupby("product_code")["failed_txn_rate"].mean().sort_values().reset_index().iterrows():
    name = next(p["product_name"] for p in PRODUCTS if p["product_code"] == row["product_code"])
    print(f"    {row['product_code']:12s}  {name:30s}  avg_fail_rate={row['failed_txn_rate']:.2f}%")
print()
print("  Upload test data via:")
print("  Settings page -> Upload Data -> choose any file above")
print("=" * 60)
