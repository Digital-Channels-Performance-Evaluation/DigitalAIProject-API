"""
Email service for sending alerts and notifications to product managers.
Uses SMTP to send emails with configurable templates.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from datetime import datetime

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending email notifications."""
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.FROM_EMAIL
        self.enabled = settings.EMAIL_ENABLED
    
    def _create_smtp_connection(self):
        """Create and return an SMTP connection."""
        try:
            if self.smtp_port == 465:
                # Use SSL
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, timeout=10)
            else:
                # Use TLS
                server = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10)
                if self.smtp_port == 587:
                    server.starttls()
            
            if self.smtp_user and self.smtp_password:
                server.login(self.smtp_user, self.smtp_password)
            
            return server
        except Exception as e:
            logger.error(f"Failed to connect to SMTP server: {e}")
            raise
    
    def send_email(
        self,
        to_emails: List[str],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None
    ) -> bool:
        """
        Send an email to one or more recipients.
        
        Args:
            to_emails: List of recipient email addresses
            subject: Email subject line
            html_body: HTML content of the email
            text_body: Plain text fallback (optional)
        
        Returns:
            True if email was sent successfully, False otherwise
        """
        if not self.enabled:
            logger.info(f"Email sending is disabled. Would have sent: {subject} to {to_emails}")
            return False
        
        if not to_emails:
            logger.warning("No recipients provided for email")
            return False
        
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = self.from_email
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = subject
            
            # Attach text and HTML parts
            if text_body:
                part1 = MIMEText(text_body, 'plain')
                msg.attach(part1)
            
            part2 = MIMEText(html_body, 'html')
            msg.attach(part2)
            
            # Send email
            with self._create_smtp_connection() as server:
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_emails}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_emails}: {e}")
            return False
    
    def send_prediction_alert(
        self,
        product_name: str,
        product_id: int,
        prediction_score: float,
        prediction_tier: str,
        period_date: str,
        to_emails: List[str],
        trend: Optional[str] = None,
        previous_score: Optional[float] = None,
        alert_severity: Optional[str] = None
    ) -> bool:
        """
        Send an alert email when a model makes a prediction.
        
        Args:
            product_name: Name of the product
            product_id: ID of the product
            prediction_score: Predicted performance score (0-100)
            prediction_tier: Performance tier (Excellent, Good, Average, Poor)
            period_date: Date of the prediction period
            to_emails: List of recipient email addresses
            trend: Trend indicator (improving, declining, stable)
            previous_score: Previous score for comparison
            alert_severity: Alert severity level
        
        Returns:
            True if email was sent successfully
        """
        subject = f"🔔 Prediction Alert: {product_name} - {prediction_tier} Performance"
        
        # Determine severity styling
        severity_color = {
            "critical": "#dc2626",
            "high": "#ea580c",
            "medium": "#ca8a04",
            "low": "#16a34a"
        }.get(alert_severity, "#6366f1")
        
        tier_color = {
            "Excellent": "#16a34a",
            "Good": "#84cc16",
            "Average": "#eab308",
            "Poor": "#ef4444"
        }.get(prediction_tier, "#6366f1")
        
        # Build trend section
        trend_html = ""
        if trend and previous_score is not None:
            trend_emoji = {"improving": "📈", "declining": "📉", "stable": "➡️"}.get(trend, "")
            score_change = prediction_score - previous_score
            change_text = f"{'+' if score_change > 0 else ''}{score_change:.1f}"
            trend_html = f"""
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                    <strong>Trend:</strong>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                    {trend_emoji} {trend.capitalize()} ({change_text} points)
                </td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                    <strong>Previous Score:</strong>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                    {previous_score:.1f}
                </td>
            </tr>
            """
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, {severity_color} 0%, {tier_color} 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">AI Model Prediction Alert</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Ahadu Bank Digital Banking Evaluation Platform</p>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; color: #374151; margin-top: 0;">
                    Hello,
                </p>
                <p style="font-size: 16px; color: #374151;">
                    The AI model has generated a new prediction for <strong>{product_name}</strong>.
                </p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
                            <strong>Product Name:</strong>
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                            {product_name}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
                            <strong>Product ID:</strong>
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                            {product_id}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
                            <strong>Prediction Score:</strong>
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                            <span style="font-size: 18px; font-weight: bold; color: {tier_color};">
                                {prediction_score:.1f}/100
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
                            <strong>Performance Tier:</strong>
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                            <span style="display: inline-block; padding: 4px 12px; background: {tier_color}; color: white; border-radius: 20px; font-weight: bold;">
                                {prediction_tier}
                            </span>
                        </td>
                    </tr>
                    {trend_html}
                    <tr>
                        <td style="padding: 10px; background: #f9fafb;">
                            <strong>Period Date:</strong>
                        </td>
                        <td style="padding: 10px;">
                            {period_date}
                        </td>
                    </tr>
                </table>
                
                <div style="margin: 25px 0; padding: 15px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                    <p style="margin: 0; color: #1e40af; font-size: 14px;">
                        <strong>💡 Action Required:</strong> Review the prediction details in the dashboard and take appropriate action based on the performance tier.
                    </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{settings.FRONTEND_URL}/dashboard/products/{product_id}" 
                       style="display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        View Product Details
                    </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #6b7280; text-align: center; margin: 0;">
                    This is an automated notification from Ahadu Bank Digital Banking Evaluation Platform.<br>
                    Generated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} UTC
                </p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
AI Model Prediction Alert
Ahadu Bank Digital Banking Evaluation Platform

Hello,

The AI model has generated a new prediction for {product_name}.

Product Details:
- Product Name: {product_name}
- Product ID: {product_id}
- Prediction Score: {prediction_score:.1f}/100
- Performance Tier: {prediction_tier}
- Period Date: {period_date}
{'- Trend: ' + trend.capitalize() if trend else ''}
{'- Previous Score: ' + str(previous_score) if previous_score else ''}

Action Required: Review the prediction details in the dashboard.

View Product: {settings.FRONTEND_URL}/dashboard/products/{product_id}

---
This is an automated notification.
Generated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} UTC
        """
        
        return self.send_email(to_emails, subject, html_body, text_body)
    
    def send_bulk_prediction_summary(
        self,
        predictions_summary: List[dict],
        to_emails: List[str]
    ) -> bool:
        """
        Send a summary email with multiple predictions.
        
        Args:
            predictions_summary: List of prediction dictionaries with product details
            to_emails: List of recipient email addresses
        
        Returns:
            True if email was sent successfully
        """
        total_products = len(predictions_summary)
        subject = f"📊 Daily Prediction Summary - {total_products} Products Updated"
        
        # Build product rows
        product_rows = ""
        for pred in predictions_summary:
            tier_color = {
                "Excellent": "#16a34a",
                "Good": "#84cc16",
                "Average": "#eab308",
                "Poor": "#ef4444"
            }.get(pred.get("tier", ""), "#6366f1")
            
            product_rows += f"""
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{pred.get('product_name', 'N/A')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                    <strong>{pred.get('score', 0):.1f}</strong>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                    <span style="display: inline-block; padding: 2px 8px; background: {tier_color}; color: white; border-radius: 12px; font-size: 12px;">
                        {pred.get('tier', 'N/A')}
                    </span>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">{pred.get('date', 'N/A')}</td>
            </tr>
            """
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Daily Prediction Summary</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">{total_products} Products Updated</p>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; color: #374151; margin-top: 0;">
                    Hello,
                </p>
                <p style="font-size: 16px; color: #374151;">
                    Here's your daily summary of AI model predictions for digital banking products.
                </p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <thead>
                        <tr style="background: #f3f4f6;">
                            <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Product</th>
                            <th style="padding: 12px 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">Score</th>
                            <th style="padding: 12px 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">Tier</th>
                            <th style="padding: 12px 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {product_rows}
                    </tbody>
                </table>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{settings.FRONTEND_URL}/dashboard/analytics" 
                       style="display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        View Full Dashboard
                    </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #6b7280; text-align: center; margin: 0;">
                    This is an automated notification from Ahadu Bank Digital Banking Evaluation Platform.<br>
                    Generated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} UTC
                </p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_emails, subject, html_body)


# Singleton instance
email_service = EmailService()
