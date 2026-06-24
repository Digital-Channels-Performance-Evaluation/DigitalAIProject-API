"""
Email notification service — sends alert emails to managers via SMTP.
Configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM in .env.
If SMTP_HOST is not set, email sending is silently skipped (dev-friendly).
"""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List

from app.core.config import settings

logger = logging.getLogger(__name__)

# Roles that receive alert emails
MANAGER_ROLES = {"super_admin", "executive_management", "product_manager", "risk_team"}


def _smtp_enabled() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)


def send_alert_emails(
    recipient_emails: List[str],
    product_name: str,
    alerts: List[dict],
) -> None:
    """
    Send a single digest email to each recipient listing all new alerts
    for the given product. Silently skips if SMTP is not configured.
    """
    if not _smtp_enabled():
        logger.info("SMTP not configured — skipping alert email notification")
        return

    if not recipient_emails or not alerts:
        return

    # Only email for critical / high severity
    important = [a for a in alerts if a.get("severity") in ("critical", "high")]
    if not important:
        return

    subject = f"[Ahadu Pulse] Alert: {product_name} — {len(important)} issue(s) detected"
    body_html = _build_html(product_name, important)
    body_text = _build_text(product_name, important)

    from_addr = settings.SMTP_FROM or settings.SMTP_USER

    for email in recipient_emails:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Ahadu Pulse <{from_addr}>"
            msg["To"] = email
            msg.attach(MIMEText(body_text, "plain"))
            msg.attach(MIMEText(body_html, "html"))

            if settings.SMTP_TLS:
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as s:
                    s.starttls()
                    s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    s.sendmail(from_addr, email, msg.as_string())
            else:
                with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as s:
                    s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    s.sendmail(from_addr, email, msg.as_string())

            logger.info(f"Alert email sent to {email} for product '{product_name}'")
        except Exception as e:
            logger.warning(f"Failed to send alert email to {email}: {e}")


def _severity_color(severity: str) -> str:
    return {"critical": "#B91C1C", "high": "#D97706", "medium": "#2563EB", "low": "#6B7280"}.get(severity, "#6B7280")


def _build_html(product_name: str, alerts: List[dict]) -> str:
    rows = ""
    for a in alerts:
        color = _severity_color(a["severity"])
        rows += f"""
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">
            <span style="display:inline-block;padding:2px 8px;border-radius:4px;
                         background:{color};color:#fff;font-size:11px;font-weight:600;
                         text-transform:uppercase;">{a["severity"]}</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#111;">{a["title"]}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#555;font-size:13px;">{a["message"]}</td>
        </tr>"""

    return f"""
    <html><body style="font-family:Arial,sans-serif;background:#f9f9f9;margin:0;padding:0;">
      <div style="max-width:620px;margin:32px auto;background:#fff;border-radius:10px;
                  box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden;">
        <div style="background:linear-gradient(135deg,#9B1535,#7A0E28);padding:24px 28px;">
          <h1 style="margin:0;color:#fff;font-size:18px;">⚠ Ahadu Pulse Alert</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,.75);font-size:14px;">
            New issues detected for <strong>{product_name}</strong>
          </p>
        </div>
        <div style="padding:24px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#f5f5f5;">
                <th style="padding:10px 12px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;">Severity</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;">Title</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;">Detail</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
        <div style="padding:16px 28px;background:#f9f9f9;border-top:1px solid #eee;
                    font-size:12px;color:#aaa;text-align:center;">
          Ahadu Bank Digital Banking Evaluation Platform — automated notification
        </div>
      </div>
    </body></html>"""


def _build_text(product_name: str, alerts: List[dict]) -> str:
    lines = [f"Ahadu Pulse Alert — {product_name}\n{'='*50}"]
    for a in alerts:
        lines.append(f"\n[{a['severity'].upper()}] {a['title']}\n{a['message']}")
    lines.append("\n-- Ahadu Bank Digital Banking Evaluation Platform")
    return "\n".join(lines)
