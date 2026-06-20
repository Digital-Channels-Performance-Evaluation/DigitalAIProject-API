"""
Report Generation Service - PDF and Excel reports with full data.
"""
import io
import logging
from datetime import date, timedelta
from sqlalchemy.orm import Session

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

import xlsxwriter

from app.models.ml_models import Score
from app.models.recommendations import Recommendation
from app.models.alerts import Alert
from app.models.product import Product
from app.models.data import RawData

logger = logging.getLogger(__name__)

# ── Brand colors (Ahadu Bank crimson) ────────────────────────────────────────
CRIMSON       = colors.HexColor("#A01535")
DARK_CRIMSON  = colors.HexColor("#7D1028")
DEEPER_CRIMSON= colors.HexColor("#620D1F")
PALE_CRIMSON  = colors.HexColor("#FDF2F5")
LIGHT_GRAY    = colors.HexColor("#F5F5F5")
MID_GRAY      = colors.HexColor("#E5E7EB")
TEXT_DARK     = colors.HexColor("#1A0A0D")
GREEN_DARK    = colors.HexColor("#166534")
GREEN_PALE    = colors.HexColor("#DCFCE7")
AMBER_DARK    = colors.HexColor("#92400E")
AMBER_PALE    = colors.HexColor("#FEF3C7")
RED_DARK      = colors.HexColor("#991B1B")
RED_PALE      = colors.HexColor("#FEE2E2")
WHITE         = colors.white
BLACK         = colors.black


def _tier_color(tier: str):
    """Return (text_color, bg_color) for a tier."""
    if tier == "HIGH":   return GREEN_DARK, GREEN_PALE
    if tier == "MEDIUM": return AMBER_DARK, AMBER_PALE
    return RED_DARK, RED_PALE


def _get_scores_for_period(db, product_id, period_start, period_end):
    """Get latest score in period; fall back to all-time latest if none found."""
    score = (
        db.query(Score)
        .filter(
            Score.product_id == product_id,
            Score.period_date >= period_start,
            Score.period_date <= period_end,
        )
        .order_by(Score.period_date.desc())
        .first()
    )
    if not score:
        # Fallback: any score ever recorded for this product
        score = (
            db.query(Score)
            .filter(Score.product_id == product_id)
            .order_by(Score.period_date.desc())
            .first()
        )
    return score


class ReportService:

    # ─────────────────────────────────────────────────────────────────────────
    # PDF Report
    # ─────────────────────────────────────────────────────────────────────────

    def generate_pdf_report(
        self, db: Session, period_start: date, period_end: date, report_type: str
    ) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            topMargin=0.6 * inch, bottomMargin=0.6 * inch,
            leftMargin=0.75 * inch, rightMargin=0.75 * inch,
        )

        styles = getSampleStyleSheet()

        def style(name, **kw):
            return ParagraphStyle(name, parent=styles["Normal"], **kw)

        title_s    = style("T", fontSize=22, textColor=DARK_CRIMSON, spaceAfter=2, alignment=TA_CENTER, fontName="Helvetica-Bold")
        sub_s      = style("S", fontSize=11, textColor=CRIMSON, spaceAfter=3, alignment=TA_CENTER)
        rtype_s    = style("R", fontSize=14, textColor=DARK_CRIMSON, spaceAfter=2, alignment=TA_CENTER, fontName="Helvetica-Bold")
        period_s   = style("P", fontSize=10, textColor=colors.HexColor("#666666"), spaceAfter=4, alignment=TA_CENTER, fontName="Helvetica-Oblique")
        heading_s  = style("H", fontSize=13, textColor=DARK_CRIMSON, spaceBefore=14, spaceAfter=6, fontName="Helvetica-Bold")
        body_s     = style("B", fontSize=9,  spaceAfter=3, leading=14)
        footer_s   = style("F", fontSize=8,  textColor=colors.gray, alignment=TA_CENTER, fontName="Helvetica-Oblique")
        note_s     = style("N", fontSize=8,  textColor=colors.HexColor("#666666"), fontName="Helvetica-Oblique")

        elems = []

        # ── Page header ────────────────────────────────────────────────────────
        elems.append(Spacer(1, 4))
        elems.append(Paragraph("AHADU BANK S.C.", title_s))
        elems.append(Paragraph("Digital Banking Evaluation Platform — AHADU PULSE", sub_s))
        elems.append(Paragraph(f"{report_type.upper()} PERFORMANCE REPORT", rtype_s))
        elems.append(Paragraph(
            f"Reporting Period: {period_start.strftime('%B %d, %Y')} — {period_end.strftime('%B %d, %Y')}",
            period_s,
        ))
        elems.append(Paragraph(
            f"Generated: {date.today().strftime('%B %d, %Y')} | Confidential — Internal Use Only",
            note_s,
        ))
        elems.append(HRFlowable(width="100%", thickness=2, color=CRIMSON, spaceAfter=10, spaceBefore=4))

        # ── Product scores table ───────────────────────────────────────────────
        products = db.query(Product).filter(Product.is_active == True).all()
        elems.append(Paragraph("1. Product Performance Scores", heading_s))

        score_rows = [["#", "Product", "Category", "Score", "Tier", "Change", "Period"]]
        all_scores = []
        for p in products:
            s = _get_scores_for_period(db, p.id, period_start, period_end)
            if s:
                all_scores.append((p, s))

        # Sort by score descending (ranking)
        all_scores.sort(key=lambda x: x[1].performance_score, reverse=True)

        for rank, (p, s) in enumerate(all_scores, 1):
            change_str = f"{s.score_change:+.1f}" if s.score_change is not None else "N/A"
            score_rows.append([
                str(rank),
                p.name,
                p.category.replace("_", " ").title(),
                f"{s.performance_score:.1f}",
                s.performance_tier,
                change_str,
                s.period_date.strftime("%Y-%m"),
            ])

        if len(score_rows) > 1:
            col_w = [0.35*inch, 1.9*inch, 1.3*inch, 0.7*inch, 0.8*inch, 0.7*inch, 0.8*inch]
            t = Table(score_rows, colWidths=col_w)
            style_cmds = [
                ("BACKGROUND",  (0,0), (-1,0), DARK_CRIMSON),
                ("TEXTCOLOR",   (0,0), (-1,0), WHITE),
                ("FONTNAME",    (0,0), (-1,0), "Helvetica-Bold"),
                ("FONTSIZE",    (0,0), (-1,-1), 8.5),
                ("ALIGN",       (0,0), (-1,-1), "CENTER"),
                ("ALIGN",       (1,1), (2,-1), "LEFT"),
                ("VALIGN",      (0,0), (-1,-1), "MIDDLE"),
                ("TOPPADDING",  (0,0), (-1,-1), 5),
                ("BOTTOMPADDING",(0,0),(-1,-1), 5),
                ("GRID",        (0,0), (-1,-1), 0.4, MID_GRAY),
                ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, PALE_CRIMSON]),
            ]
            # Tier color coding
            for i, (_, s) in enumerate(all_scores, 1):
                tc, bc = _tier_color(s.performance_tier)
                style_cmds.append(("BACKGROUND", (4,i), (4,i), bc))
                style_cmds.append(("TEXTCOLOR",  (4,i), (4,i), tc))
                style_cmds.append(("FONTNAME",   (4,i), (4,i), "Helvetica-Bold"))
            t.setStyle(TableStyle(style_cmds))
            elems.append(t)
            elems.append(Spacer(1, 8))
        else:
            elems.append(Paragraph("No score data found for this period.", body_s))

        # ── Raw KPI summary ────────────────────────────────────────────────────
        elems.append(Paragraph("2. Key Performance Indicators Summary", heading_s))
        kpi_rows = [["Product", "Active Users", "Txn Count", "Revenue (ETB)", "Failure %", "Uptime %", "Complaints", "CSAT"]]
        for p in products:
            raw = (
                db.query(RawData)
                .filter(
                    RawData.product_id == p.id,
                    RawData.period_date >= period_start,
                    RawData.period_date <= period_end,
                )
                .order_by(RawData.period_date.desc())
                .first()
            )
            if not raw:
                raw = db.query(RawData).filter(RawData.product_id == p.id).order_by(RawData.period_date.desc()).first()
            if raw:
                kpi_rows.append([
                    p.name,
                    f"{int(raw.active_users or 0):,}",
                    f"{int(raw.total_transactions or 0):,}",
                    f"ETB {(raw.total_revenue or 0)/1_000_000:.2f}M",
                    f"{raw.failed_txn_rate or 0:.1f}%",
                    f"{raw.uptime_percentage or 0:.1f}%",
                    f"{int(raw.total_complaints or 0):,}",
                    f"{raw.csat_score or 0:.1f}/5",
                ])

        if len(kpi_rows) > 1:
            kpi_t = Table(kpi_rows, colWidths=[1.6*inch, 0.9*inch, 0.85*inch, 1.0*inch, 0.7*inch, 0.7*inch, 0.85*inch, 0.65*inch])
            kpi_t.setStyle(TableStyle([
                ("BACKGROUND",   (0,0), (-1,0), CRIMSON),
                ("TEXTCOLOR",    (0,0), (-1,0), WHITE),
                ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
                ("FONTSIZE",     (0,0), (-1,-1), 8),
                ("ALIGN",        (1,0), (-1,-1), "CENTER"),
                ("ALIGN",        (0,1), (0,-1), "LEFT"),
                ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
                ("TOPPADDING",   (0,0), (-1,-1), 4),
                ("BOTTOMPADDING",(0,0), (-1,-1), 4),
                ("GRID",         (0,0), (-1,-1), 0.4, MID_GRAY),
                ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, PALE_CRIMSON]),
            ]))
            elems.append(kpi_t)
            elems.append(Spacer(1, 8))

        # ── Alerts ────────────────────────────────────────────────────────────
        alerts = (
            db.query(Alert)
            .filter(Alert.period_date >= period_start - timedelta(days=30),
                    Alert.period_date <= period_end)
            .order_by(Alert.severity, Alert.created_at.desc())
            .limit(10)
            .all()
        )
        if not alerts:
            alerts = db.query(Alert).order_by(Alert.created_at.desc()).limit(8).all()

        if alerts:
            elems.append(Paragraph("3. Alerts", heading_s))
            alert_rows = [["Severity", "Type", "Product", "Title", "Period"]]
            for a in alerts:
                prod = db.query(Product).filter(Product.id == a.product_id).first()
                alert_rows.append([
                    a.severity.upper(),
                    a.alert_type.replace("_", " ").title(),
                    prod.name if prod else "N/A",
                    a.title[:55],
                    a.period_date.strftime("%Y-%m"),
                ])
            at = Table(alert_rows, colWidths=[0.7*inch, 1.2*inch, 1.5*inch, 2.7*inch, 0.7*inch])
            at.setStyle(TableStyle([
                ("BACKGROUND",   (0,0), (-1,0), CRIMSON),
                ("TEXTCOLOR",    (0,0), (-1,0), WHITE),
                ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
                ("FONTSIZE",     (0,0), (-1,-1), 8),
                ("ALIGN",        (0,0), (-1,-1), "LEFT"),
                ("ALIGN",        (0,0), (0,-1), "CENTER"),
                ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
                ("TOPPADDING",   (0,0), (-1,-1), 4),
                ("BOTTOMPADDING",(0,0), (-1,-1), 4),
                ("GRID",         (0,0), (-1,-1), 0.4, MID_GRAY),
                ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, PALE_CRIMSON]),
            ]))
            elems.append(at)
            elems.append(Spacer(1, 8))

        # ── Recommendations ───────────────────────────────────────────────────
        recs = (
            db.query(Recommendation)
            .filter(
                Recommendation.period_date >= period_start - timedelta(days=30),
                Recommendation.period_date <= period_end,
                Recommendation.priority.in_(["critical", "high"]),
            )
            .order_by(Recommendation.priority, Recommendation.created_at.desc())
            .limit(8)
            .all()
        )
        if not recs:
            recs = (
                db.query(Recommendation)
                .filter(Recommendation.priority.in_(["critical", "high"]))
                .order_by(Recommendation.created_at.desc())
                .limit(6)
                .all()
            )

        if recs:
            elems.append(Paragraph("4. Top Recommendations", heading_s))
            for i, rec in enumerate(recs, 1):
                prod = db.query(Product).filter(Product.id == rec.product_id).first()
                pname = prod.name if prod else "N/A"
                # Use direct hex strings instead of color.hexval() to avoid format issues
                priority_hex = "#991B1B" if rec.priority == "critical" else "#92400E"
                elems.append(Paragraph(
                    f"<font color='{priority_hex}'>"
                    f"[{rec.priority.upper()}]</font> <b>{pname}</b>: {rec.title}",
                    body_s,
                ))
                elems.append(Paragraph(rec.description, note_s))
                elems.append(Spacer(1, 4))

        # ── Page footer ────────────────────────────────────────────────────────
        elems.append(HRFlowable(width="100%", thickness=1, color=CRIMSON, spaceBefore=16, spaceAfter=4))
        elems.append(Paragraph(
            f"AHADU PULSE — Ahadu Bank S.C. Digital Banking Department | "
            f"Generated {date.today().strftime('%B %d, %Y')} | CONFIDENTIAL",
            footer_s,
        ))

        doc.build(elems)
        return buffer.getvalue()

    # ─────────────────────────────────────────────────────────────────────────
    # Excel Report
    # ─────────────────────────────────────────────────────────────────────────

    def generate_excel_report(
        self, db: Session, period_start: date, period_end: date, report_type: str
    ) -> bytes:
        buffer = io.BytesIO()
        wb = xlsxwriter.Workbook(buffer)

        # ── Formats ───────────────────────────────────────────────────────────
        hdr = wb.add_format({"bold": True, "bg_color": "#A01535", "font_color": "#FFFFFF",
                              "border": 1, "align": "center", "valign": "vcenter", "font_size": 10})
        cell     = wb.add_format({"border": 1, "valign": "vcenter", "font_size": 9})
        alt_cell = wb.add_format({"border": 1, "bg_color": "#FDF2F5", "valign": "vcenter", "font_size": 9})
        title    = wb.add_format({"bold": True, "font_size": 16, "font_color": "#7D1028"})
        subtitle = wb.add_format({"font_size": 10, "font_color": "#666666", "italic": True})
        num_fmt  = wb.add_format({"border": 1, "num_format": "#,##0", "font_size": 9})
        dec_fmt  = wb.add_format({"border": 1, "num_format": "0.00", "align": "center", "font_size": 9})
        pct_fmt  = wb.add_format({"border": 1, "num_format": "0.00%", "align": "center", "font_size": 9})
        good_fmt = wb.add_format({"border": 1, "bg_color": "#DCFCE7", "font_color": "#166534",
                                   "bold": True, "align": "center", "font_size": 9})
        warn_fmt = wb.add_format({"border": 1, "bg_color": "#FEF3C7", "font_color": "#92400E",
                                   "bold": True, "align": "center", "font_size": 9})
        bad_fmt  = wb.add_format({"border": 1, "bg_color": "#FEE2E2", "font_color": "#991B1B",
                                   "bold": True, "align": "center", "font_size": 9})

        products = db.query(Product).filter(Product.is_active == True).all()

        def fmt(r): return alt_cell if r % 2 == 0 else cell

        # ── Sheet 1: Performance Scores ────────────────────────────────────────
        ws1 = wb.add_worksheet("Performance Scores")
        ws1.set_column(0, 0, 28)
        ws1.set_column(1, 1, 20)
        ws1.set_column(2, 7, 16)
        ws1.write(0, 0, "Ahadu Bank — AHADU PULSE Digital Banking Evaluation Platform", title)
        ws1.write(1, 0, f"{report_type.upper()} Report  |  {period_start} — {period_end}  |  Generated {date.today()}", subtitle)
        ws1.set_row(0, 22); ws1.set_row(1, 16)
        headers = ["Product", "Category", "Score", "Tier", "Prev Score", "Change", "Model", "Period"]
        for c, h in enumerate(headers):
            ws1.write(3, c, h, hdr)
        ws1.set_row(3, 20)

        all_scores = []
        for p in products:
            s = _get_scores_for_period(db, p.id, period_start, period_end)
            if s:
                all_scores.append((p, s))
        all_scores.sort(key=lambda x: x[1].performance_score, reverse=True)

        for row_i, (p, s) in enumerate(all_scores, 4):
            f = fmt(row_i)
            tier_f = good_fmt if s.performance_tier == "HIGH" else warn_fmt if s.performance_tier == "MEDIUM" else bad_fmt
            ws1.write(row_i, 0, p.name, f)
            ws1.write(row_i, 1, p.category.replace("_", " ").title(), f)
            ws1.write(row_i, 2, round(s.performance_score, 1), dec_fmt)
            ws1.write(row_i, 3, s.performance_tier, tier_f)
            ws1.write(row_i, 4, round(s.previous_score, 1) if s.previous_score else "—", dec_fmt)
            ws1.write(row_i, 5, round(s.score_change, 2) if s.score_change is not None else "—", dec_fmt)
            ws1.write(row_i, 6, s.model_version or "—", f)
            ws1.write(row_i, 7, str(s.period_date), f)

        ws1.autofilter(3, 0, 3 + len(all_scores), 7)
        ws1.freeze_panes(4, 1)

        # ── Sheet 2: KPI Data ──────────────────────────────────────────────────
        ws2 = wb.add_worksheet("KPI Data")
        ws2.set_column(0, 0, 26); ws2.set_column(1, 20, 16)
        ws2.write(0, 0, "Product KPI Data", title)
        ws2.write(1, 0, f"Period: {period_start} — {period_end}", subtitle)
        kpi_headers = [
            "Product", "Period", "Total Users", "Active Users", "New Users", "Churned Users",
            "Total Txn", "Successful Txn", "Failed Txn", "Failed Rate %",
            "Volume (ETB)", "Revenue (ETB)", "Fee Revenue",
            "Uptime %", "Downtime Min", "Avg RT (ms)", "API Error %",
            "Complaints", "Resolved", "CSAT Score", "Fraud Events",
        ]
        for c, h in enumerate(kpi_headers):
            ws2.write(3, c, h, hdr)
        ws2.set_row(3, 20)

        row_i = 4
        for p in products:
            raws = (
                db.query(RawData)
                .filter(RawData.product_id == p.id,
                        RawData.period_date >= period_start,
                        RawData.period_date <= period_end)
                .order_by(RawData.period_date.desc())
                .all()
            )
            if not raws:
                raws = [db.query(RawData).filter(RawData.product_id == p.id)
                        .order_by(RawData.period_date.desc()).first()]
                raws = [r for r in raws if r]

            for raw in raws:
                if not raw: continue
                f = fmt(row_i)
                uptime_f = good_fmt if (raw.uptime_percentage or 0) >= 99 else warn_fmt if (raw.uptime_percentage or 0) >= 97 else bad_fmt
                fail_f   = good_fmt if (raw.failed_txn_rate or 0) <= 3 else warn_fmt if (raw.failed_txn_rate or 0) <= 6 else bad_fmt
                csat_f   = good_fmt if (raw.csat_score or 0) >= 4.0 else warn_fmt if (raw.csat_score or 0) >= 3.0 else bad_fmt

                vals = [
                    (p.name, f), (str(raw.period_date), f),
                    (int(raw.total_users or 0), num_fmt), (int(raw.active_users or 0), num_fmt),
                    (int(raw.new_users or 0), num_fmt), (int(raw.churned_users or 0), num_fmt),
                    (int(raw.total_transactions or 0), num_fmt), (int(raw.successful_transactions or 0), num_fmt),
                    (int(raw.failed_transactions or 0), num_fmt), (round(raw.failed_txn_rate or 0, 2), fail_f),
                    (round(raw.transaction_volume or 0, 0), num_fmt), (round(raw.total_revenue or 0, 0), num_fmt),
                    (round(raw.fee_revenue or 0, 0), num_fmt),
                    (round(raw.uptime_percentage or 0, 2), uptime_f), (round(raw.downtime_minutes or 0, 1), dec_fmt),
                    (int(raw.avg_response_time_ms or 0), num_fmt), (round(raw.api_error_rate or 0, 2), dec_fmt),
                    (int(raw.total_complaints or 0), num_fmt), (int(raw.resolved_complaints or 0), num_fmt),
                    (round(raw.csat_score or 0, 2), csat_f), (int(raw.fraud_event_count or 0), num_fmt),
                ]
                for c, (v, fmt_) in enumerate(vals):
                    ws2.write(row_i, c, v, fmt_)
                row_i += 1

        ws2.autofilter(3, 0, row_i - 1, len(kpi_headers) - 1)
        ws2.freeze_panes(4, 1)

        # ── Sheet 3: Alerts ────────────────────────────────────────────────────
        ws3 = wb.add_worksheet("Alerts")
        ws3.set_column(0, 0, 12); ws3.set_column(1, 1, 22); ws3.set_column(2, 2, 26)
        ws3.set_column(3, 3, 44); ws3.set_column(4, 5, 14)
        ws3.write(0, 0, "Alerts", title)
        a_hdrs = ["Severity", "Type", "Product", "Title", "Period", "Resolved"]
        for c, h in enumerate(a_hdrs):
            ws3.write(2, c, h, hdr)
        ws3.set_row(2, 20)

        alerts = (
            db.query(Alert)
            .filter(Alert.period_date >= period_start - timedelta(days=60),
                    Alert.period_date <= period_end)
            .order_by(Alert.severity, Alert.created_at.desc())
            .limit(50)
            .all()
        )
        if not alerts:
            alerts = db.query(Alert).order_by(Alert.created_at.desc()).limit(20).all()

        for i, a in enumerate(alerts, 3):
            prod = db.query(Product).filter(Product.id == a.product_id).first()
            sev_f = bad_fmt if a.severity == "critical" else warn_fmt if a.severity == "high" else fmt(i)
            f = fmt(i)
            ws3.write(i, 0, a.severity.upper(), sev_f)
            ws3.write(i, 1, a.alert_type.replace("_", " ").title(), f)
            ws3.write(i, 2, prod.name if prod else "N/A", f)
            ws3.write(i, 3, a.title, f)
            ws3.write(i, 4, str(a.period_date), f)
            ws3.write(i, 5, "Yes" if a.is_resolved else "Open", good_fmt if a.is_resolved else bad_fmt)

        # ── Sheet 4: Recommendations ───────────────────────────────────────────
        ws4 = wb.add_worksheet("Recommendations")
        ws4.set_column(0, 0, 26); ws4.set_column(1, 1, 14); ws4.set_column(2, 2, 22)
        ws4.set_column(3, 3, 42); ws4.set_column(4, 4, 16)
        ws4.write(0, 0, "AI Recommendations", title)
        r_hdrs = ["Product", "Priority", "Category", "Title", "Period"]
        for c, h in enumerate(r_hdrs):
            ws4.write(2, c, h, hdr)
        ws4.set_row(2, 20)

        recs = (
            db.query(Recommendation)
            .filter(Recommendation.period_date >= period_start - timedelta(days=60),
                    Recommendation.period_date <= period_end)
            .order_by(Recommendation.priority, Recommendation.created_at.desc())
            .limit(50)
            .all()
        )
        if not recs:
            recs = db.query(Recommendation).order_by(Recommendation.created_at.desc()).limit(20).all()

        for i, r in enumerate(recs, 3):
            prod = db.query(Product).filter(Product.id == r.product_id).first()
            pri_f = bad_fmt if r.priority == "critical" else warn_fmt if r.priority == "high" else fmt(i)
            f = fmt(i)
            ws4.write(i, 0, prod.name if prod else "N/A", f)
            ws4.write(i, 1, r.priority.upper(), pri_f)
            ws4.write(i, 2, r.category.replace("_", " ").title(), f)
            ws4.write(i, 3, r.title, f)
            ws4.write(i, 4, str(r.period_date), f)


        # ── Sheet 5: Engineered Features ─────────────────────────────────────────
        self._add_features_sheet(wb, db, products, period_start, period_end,
                                  hdr, cell, alt_cell, title, subtitle,
                                  num_fmt, dec_fmt, good_fmt, warn_fmt)

        wb.close()
        return buffer.getvalue()

    def _add_features_sheet(self, wb, db, products, period_start, period_end,
                             hdr, cell, alt_cell, title, subtitle, num_fmt, dec_fmt,
                             good_fmt, warn_fmt):
        """Sheet 5 — Engineered Features for all products."""
        from app.models.data import ProcessedFeatures
        ws5 = wb.add_worksheet("Engineered Features")
        ws5.set_column(0, 0, 26)
        ws5.set_column(1, 1, 14)
        ws5.set_column(2, 16, 18)
        ws5.write(0, 0, "Engineered / Derived ML Features", title)
        ws5.write(1, 0, f"All computed features used by ML scoring models", subtitle)
        feat_hdrs = [
            "Product", "Period",
            "Active User Rate", "Txn Success Rate", "Failed Rate %",
            "Revenue/Txn (ETB)", "Revenue/User (ETB)",
            "Downtime Impact %", "Complaint Growth %", "Resolution Rate %",
            "User Engagement Idx", "Avg Session (sec)", "CSAT Score",
            "Fraud Events", "API Error Rate %", "Op. Efficiency Score",
        ]
        for c, h in enumerate(feat_hdrs):
            ws5.write(3, c, h, hdr)
        ws5.set_row(3, 20)

        def fmt(r):
            return alt_cell if r % 2 == 0 else cell

        row_i = 4
        for p in products:
            pfs = (
                db.query(ProcessedFeatures)
                .filter(ProcessedFeatures.product_id == p.id,
                        ProcessedFeatures.period_date >= period_start,
                        ProcessedFeatures.period_date <= period_end)
                .order_by(ProcessedFeatures.period_date.desc())
                .all()
            )
            if not pfs:
                pfs = (
                    db.query(ProcessedFeatures)
                    .filter(ProcessedFeatures.product_id == p.id)
                    .order_by(ProcessedFeatures.period_date.desc())
                    .limit(3)
                    .all()
                )
            for pf in pfs:
                if not pf:
                    continue
                f = fmt(row_i)
                aur_f = good_fmt if (pf.active_user_rate or 0) >= 0.5 else warn_fmt
                tsr_f = good_fmt if (pf.transaction_success_rate or 0) >= 0.9 else warn_fmt
                ws5.write(row_i, 0,  p.name, f)
                ws5.write(row_i, 1,  str(pf.period_date), f)
                ws5.write(row_i, 2,  round(pf.active_user_rate or 0, 4), aur_f)
                ws5.write(row_i, 3,  round(pf.transaction_success_rate or 0, 4), tsr_f)
                ws5.write(row_i, 4,  round(pf.failed_txn_rate_pct or 0, 2), dec_fmt)
                ws5.write(row_i, 5,  round(pf.revenue_per_transaction or 0, 2), dec_fmt)
                ws5.write(row_i, 6,  round(pf.revenue_per_active_user or 0, 2), dec_fmt)
                ws5.write(row_i, 7,  round(pf.downtime_impact_score or 0, 4), dec_fmt)
                ws5.write(row_i, 8,  round(pf.complaint_growth_rate or 0, 2), dec_fmt)
                ws5.write(row_i, 9,  round(pf.complaint_resolution_rate or 0, 2), dec_fmt)
                ws5.write(row_i, 10, round(pf.user_engagement_index or 0, 0), num_fmt)
                ws5.write(row_i, 11, round(pf.avg_session_duration_sec or 0, 1), dec_fmt)
                ws5.write(row_i, 12, round(pf.csat_score or 0, 2), dec_fmt)
                ws5.write(row_i, 13, int(pf.fraud_event_count or 0), num_fmt)
                ws5.write(row_i, 14, round(pf.api_error_rate or 0, 2), dec_fmt)
                ws5.write(row_i, 15, round(pf.operational_efficiency_score or 0, 2), dec_fmt)
                row_i += 1

        ws5.autofilter(3, 0, row_i - 1, len(feat_hdrs) - 1)
        ws5.freeze_panes(4, 1)


report_service = ReportService()
