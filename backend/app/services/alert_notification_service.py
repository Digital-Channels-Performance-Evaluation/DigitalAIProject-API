"""
Alert notification service for sending email alerts when predictions are made.
"""
import logging
from typing import List, Optional
from datetime import datetime, date
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.product import Product
from app.models.alerts import Alert
from app.services.email_service import email_service
from app.core.config import settings

logger = logging.getLogger(__name__)


class AlertNotificationService:
    """Service for managing and sending alert notifications."""
    
    def get_product_managers(self, db: Session) -> List[User]:
        """Get all active product managers."""
        return (
            db.query(User)
            .filter(
                User.role == UserRole.PRODUCT_MANAGER,
                User.is_active == True
            )
            .all()
        )
    
    def get_all_notification_recipients(self, db: Session) -> List[User]:
        """
        Get all users who should receive prediction notifications.
        Includes product managers, executives, and super admins.
        """
        if settings.ALERT_PRODUCT_MANAGERS_ONLY:
            return self.get_product_managers(db)
        
        return (
            db.query(User)
            .filter(
                User.role.in_([
                    UserRole.PRODUCT_MANAGER,
                    UserRole.EXECUTIVE_MANAGEMENT,
                    UserRole.SUPER_ADMIN
                ]),
                User.is_active == True
            )
            .all()
        )
    
    def create_alert_record(
        self,
        db: Session,
        product_id: int,
        alert_type: str,
        severity: str,
        title: str,
        message: str,
        metric_name: Optional[str] = None,
        metric_value: Optional[float] = None,
        threshold_value: Optional[float] = None,
        previous_value: Optional[float] = None,
        period_date: Optional[date] = None
    ) -> Alert:
        """
        Create an alert record in the database.
        
        Args:
            db: Database session
            product_id: ID of the product
            alert_type: Type of alert (score_drop, etc.)
            severity: Alert severity (critical, high, medium, low)
            title: Alert title
            message: Alert message
            metric_name: Name of the metric
            metric_value: Current metric value
            threshold_value: Threshold value
            previous_value: Previous metric value
            period_date: Period date for the alert
        
        Returns:
            Created Alert object
        """
        alert = Alert(
            product_id=product_id,
            alert_type=alert_type,
            severity=severity,
            title=title,
            message=message,
            metric_name=metric_name,
            metric_value=metric_value,
            threshold_value=threshold_value,
            previous_value=previous_value,
            period_date=period_date or date.today(),
            is_resolved=False
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert
    
    def send_prediction_notification(
        self,
        db: Session,
        product_id: int,
        prediction_score: float,
        prediction_tier: str,
        period_date: str,
        previous_score: Optional[float] = None,
        create_alert: bool = True
    ) -> bool:
        """
        Send email notification when a prediction is made.
        
        Args:
            db: Database session
            product_id: ID of the product
            prediction_score: Predicted score (0-100)
            prediction_tier: Performance tier
            period_date: Date of the prediction period
            previous_score: Previous score for comparison
            create_alert: Whether to create an alert record
        
        Returns:
            True if notification was sent successfully
        """
        if not settings.SEND_PREDICTION_ALERTS:
            logger.info("Prediction alerts are disabled in settings")
            return False
        
        # Get product details
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            logger.error(f"Product {product_id} not found")
            return False
        
        # Determine trend and severity
        trend = None
        alert_severity = "low"
        alert_type = "score_drop"  # Default alert type
        
        if previous_score is not None:
            score_diff = prediction_score - previous_score
            if score_diff > 5:
                trend = "improving"
                alert_severity = "low"
            elif score_diff < -10:
                trend = "declining"
                alert_severity = "high"
                alert_type = "score_drop"
            elif score_diff < -5:
                trend = "declining"
                alert_severity = "medium"
                alert_type = "score_drop"
            else:
                trend = "stable"
                alert_severity = "low"
        
        # Adjust severity based on tier
        if prediction_tier == "Poor":
            alert_severity = "critical" if alert_severity in ["medium", "high"] else "high"
        elif prediction_tier == "Average" and alert_severity == "low":
            alert_severity = "medium"
        
        # Create alert record if requested
        if create_alert:
            alert_title = f"{product.name} - {prediction_tier} Performance Predicted"
            alert_message = (
                f"AI model predicted {prediction_tier} performance for {product.name}. "
                f"Score: {prediction_score:.1f}/100."
            )
            if trend:
                alert_message += f" Trend: {trend.capitalize()}."
            
            try:
                self.create_alert_record(
                    db=db,
                    product_id=product_id,
                    alert_type=alert_type,
                    severity=alert_severity,
                    title=alert_title,
                    message=alert_message,
                    metric_name="prediction_score",
                    metric_value=prediction_score,
                    threshold_value=previous_score,
                    previous_value=previous_score,
                    period_date=datetime.strptime(period_date, "%Y-%m-%d").date() if isinstance(period_date, str) else period_date
                )
                logger.info(f"Created alert record for product {product_id}")
            except Exception as e:
                logger.error(f"Failed to create alert record: {e}")
        
        # Get recipients
        recipients = self.get_all_notification_recipients(db)
        if not recipients:
            logger.warning("No recipients found for prediction alerts")
            return False
        
        recipient_emails = [user.email for user in recipients if user.email]
        if not recipient_emails:
            logger.warning("No valid email addresses found for recipients")
            return False
        
        # Send email notification
        try:
            success = email_service.send_prediction_alert(
                product_name=product.name,
                product_id=product_id,
                prediction_score=prediction_score,
                prediction_tier=prediction_tier,
                period_date=period_date,
                to_emails=recipient_emails,
                trend=trend,
                previous_score=previous_score,
                alert_severity=alert_severity
            )
            
            if success:
                logger.info(f"Sent prediction alert for product {product_id} to {len(recipient_emails)} recipients")
            else:
                logger.warning(f"Failed to send prediction alert for product {product_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending prediction notification: {e}")
            return False
    
    def send_batch_prediction_notifications(
        self,
        db: Session,
        predictions: List[dict]
    ) -> bool:
        """
        Send a batch summary of predictions to recipients.
        
        Args:
            db: Database session
            predictions: List of prediction dictionaries with:
                - product_id
                - product_name
                - score
                - tier
                - date
        
        Returns:
            True if notification was sent successfully
        """
        if not settings.SEND_PREDICTION_ALERTS or not predictions:
            return False
        
        recipients = self.get_all_notification_recipients(db)
        if not recipients:
            logger.warning("No recipients found for batch prediction alerts")
            return False
        
        recipient_emails = [user.email for user in recipients if user.email]
        if not recipient_emails:
            logger.warning("No valid email addresses found for recipients")
            return False
        
        try:
            success = email_service.send_bulk_prediction_summary(
                predictions_summary=predictions,
                to_emails=recipient_emails
            )
            
            if success:
                logger.info(f"Sent batch prediction summary to {len(recipient_emails)} recipients")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending batch prediction notification: {e}")
            return False


# Singleton instance
alert_notification_service = AlertNotificationService()
