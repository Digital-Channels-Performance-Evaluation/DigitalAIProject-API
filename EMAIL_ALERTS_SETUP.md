# Email Alert System for AI Predictions

This document explains how to set up and use the email alert system that sends notifications to product managers when the AI model makes predictions.

## 📋 Overview

The email alert system automatically sends notifications when:
- A prediction is made via the `/api/ml/predict` endpoint
- 3-month predictions are generated via `/api/ml/predictions/{product_id}`
- Bulk predictions are processed

Alerts include:
- Product name and ID
- Prediction score (0-100)
- Performance tier (Excellent, Good, Average, Poor)
- Trend indicators (improving, declining, stable)
- Comparison with previous scores
- Direct links to product details in the dashboard

## 🚀 Quick Setup

### 1. Configure Email Settings

Edit your `.env` file in the `backend` directory:

```env
# Enable email notifications
EMAIL_ENABLED=true

# SMTP Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Use app-specific password!
FROM_EMAIL=noreply@ahadubank.com

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# Alert Settings
SEND_PREDICTION_ALERTS=true
ALERT_PRODUCT_MANAGERS_ONLY=true  # false = send to all executives
```

### 2. Gmail App Password Setup (if using Gmail)

1. Go to your Google Account settings
2. Navigate to Security → 2-Step Verification
3. Scroll down to "App passwords"
4. Generate a new app password for "Mail"
5. Copy the 16-character password to `SMTP_PASSWORD` in your `.env`

### 3. Other Email Providers

#### **Outlook/Office 365**
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

#### **AWS SES**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-access-key
SMTP_PASSWORD=your-ses-secret-key
```

#### **SendGrid**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

### 4. Restart the Backend

After updating `.env`, restart your FastAPI server:

```bash
cd backend
uvicorn app.main:app --reload
```

## 🎯 Who Receives Alerts?

### Default Behavior (`ALERT_PRODUCT_MANAGERS_ONLY=true`)
- All active users with role `product_manager`

### All Executives (`ALERT_PRODUCT_MANAGERS_ONLY=false`)
- Product Managers
- Executive Management
- Super Admins

## 🧪 Testing the System

### Test Email Configuration

Send a test alert email to verify your setup:

```bash
# Replace 1 with an actual product ID
POST /api/ml/alerts/test-email?product_id=1
```

Using curl:
```bash
curl -X POST "http://localhost:8000/api/ml/alerts/test-email?product_id=1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Check Alert Recipients

See who will receive alert emails:

```bash
GET /api/ml/alerts/recipients
```

Response:
```json
{
  "count": 5,
  "recipients": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@ahadubank.com",
      "role": "product_manager"
    }
  ],
  "email_enabled": true,
  "alerts_enabled": true,
  "product_managers_only": true
}
```

## 📧 Email Templates

### Single Prediction Alert

Beautiful HTML email with:
- Color-coded performance tier badges
- Trend indicators with emojis (📈 📉 ➡️)
- Score comparison table
- Direct link to product dashboard
- Responsive design for mobile devices

### Bulk Prediction Summary

Daily digest email with:
- Summary table of all predictions
- Sortable by product, score, tier
- One-click access to full analytics

## 🔧 Runtime Configuration

### Update Alert Settings (without restarting)

Only Super Admins can change these settings:

```bash
POST /api/ml/alerts/settings
{
  "email_enabled": true,
  "send_alerts": true,
  "product_managers_only": false
}
```

**Note:** Runtime changes don't persist. Update `.env` for permanent changes.

## 📊 Alert Database Records

Each prediction creates an alert record in the `alerts` table with:

- **alert_type**: `score_drop`, `downtime_spike`, etc.
- **severity**: `critical`, `high`, `medium`, `low` (based on tier and trend)
- **title**: Human-readable alert title
- **message**: Detailed alert description
- **metric_name**: `prediction_score`
- **metric_value**: Current prediction score
- **previous_value**: Previous score (if available)
- **is_resolved**: `false` initially

View alerts in the dashboard at `/dashboard/alerts`

## 🎨 Email Customization

### Modify Email Templates

Edit `backend/app/services/email_service.py`:

- `send_prediction_alert()` - Single prediction template
- `send_bulk_prediction_summary()` - Batch summary template

### Custom Alert Logic

Edit `backend/app/services/alert_notification_service.py`:

- `send_prediction_notification()` - When to send, who to notify
- `create_alert_record()` - Alert severity rules

## 🔐 Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use app-specific passwords** - Never use your main email password
3. **Enable 2FA** on your email account
4. **Rotate SMTP credentials** regularly
5. **Use environment variables** in production (not `.env` files)

## 🐛 Troubleshooting

### Emails Not Sending

1. **Check configuration:**
   ```bash
   GET /api/ml/alerts/recipients
   ```
   Verify `email_enabled: true` and `alerts_enabled: true`

2. **Check logs:**
   ```bash
   tail -f backend/logs/app.log
   ```
   Look for email service errors

3. **Test SMTP connection:**
   ```python
   python
   >>> import smtplib
   >>> server = smtplib.SMTP('smtp.gmail.com', 587)
   >>> server.starttls()
   >>> server.login('your-email@gmail.com', 'your-app-password')
   >>> server.quit()
   ```

4. **Common issues:**
   - Gmail: Enable "Less secure app access" or use app password
   - Port 587 blocked: Try port 465 (SSL)
   - Firewall: Allow outbound SMTP connections

### No Recipients Found

1. **Check user roles:**
   ```sql
   SELECT id, full_name, email, role, is_active 
   FROM users 
   WHERE role = 'product_manager' AND is_active = 1;
   ```

2. **Create product manager users** via the admin panel

### Gmail Blocking Emails

If using Gmail and emails are blocked:
1. Check "Recent security activity" in your Google Account
2. Allow the suspicious activity if it's from your app
3. Use an app-specific password instead of your main password

## 📈 Production Deployment

### Environment Variables (Docker/Cloud)

```bash
# Docker Compose
environment:
  - EMAIL_ENABLED=true
  - SMTP_HOST=smtp.sendgrid.net
  - SMTP_PORT=587
  - SMTP_USER=apikey
  - SMTP_PASSWORD=${SENDGRID_API_KEY}

# Kubernetes Secret
kubectl create secret generic email-config \
  --from-literal=smtp-host=smtp.sendgrid.net \
  --from-literal=smtp-user=apikey \
  --from-literal=smtp-password=YOUR_KEY
```

### Recommended Production Settings

```env
EMAIL_ENABLED=true
SMTP_HOST=smtp.sendgrid.net  # Use professional SMTP service
SMTP_PORT=587
SEND_PREDICTION_ALERTS=true
ALERT_PRODUCT_MANAGERS_ONLY=false  # Notify all stakeholders
FRONTEND_URL=https://your-production-domain.com
```

## 🔄 Integration with ML Pipeline

Alerts are automatically sent when:

1. **Manual Predictions**
   ```bash
   POST /api/ml/predict
   ```

2. **3-Month Forecasts**
   ```bash
   GET /api/ml/predictions/{product_id}
   ```

3. **Scheduled Batch Jobs** (if you implement cron/Celery tasks)

## 📱 Future Enhancements

Potential additions:
- SMS alerts via Twilio
- Slack/Teams webhooks
- Custom alert thresholds per product
- Digest emails (daily/weekly summaries)
- Alert escalation rules
- Unsubscribe links for users

## 🤝 Support

For issues or questions:
1. Check the logs: `backend/logs/app.log`
2. Review this documentation
3. Contact the development team
4. File a GitHub issue

---

**Last Updated:** June 2026  
**Version:** 1.0.0
