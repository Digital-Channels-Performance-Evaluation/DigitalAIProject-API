# 📧 Email Alerts for AI Predictions - Quick Start

## What's New?

Your Digital AI Project now sends **automatic email notifications** to product managers when the AI model makes predictions!

## ✨ Features

✅ **Automatic email alerts** when predictions are made  
✅ **Beautiful HTML email templates** with color-coded performance tiers  
✅ **Trend indicators** (📈 improving, 📉 declining, ➡️ stable)  
✅ **Alert database records** for audit trail  
✅ **Configurable recipients** (product managers only or all executives)  
✅ **Test email functionality** to verify setup  
✅ **Runtime configuration** via API (no restart needed)  

## 🎯 Quick Setup (5 minutes)

### 1. Update `.env` file

```bash
cd backend
nano .env  # or use any text editor
```

Add these lines:

```env
# Enable email alerts
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Get from Google Account settings
FROM_EMAIL=noreply@ahadubank.com
FRONTEND_URL=http://localhost:3000

# Alert settings
SEND_PREDICTION_ALERTS=true
ALERT_PRODUCT_MANAGERS_ONLY=true
```

### 2. Gmail App Password (if using Gmail)

1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Search for "App passwords"
4. Create password for "Mail"
5. Copy the 16-character password to `SMTP_PASSWORD`

### 3. Restart Backend

```bash
# Stop current server (Ctrl+C)
uvicorn app.main:app --reload
```

### 4. Test It!

```bash
# Send test email (replace 1 with a real product ID)
curl -X POST "http://localhost:8000/api/ml/alerts/test-email?product_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📬 New API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ml/alerts/test-email` | POST | Send test alert email |
| `/api/ml/alerts/recipients` | GET | View who receives alerts |
| `/api/ml/alerts/settings` | POST | Update alert settings |

## 🎨 Email Preview

When a prediction is made, recipients receive a professional email with:

```
╔══════════════════════════════════════╗
║  🔔 AI Model Prediction Alert        ║
║  Ahadu Bank Evaluation Platform      ║
╚══════════════════════════════════════╝

Product: Mobile Banking App
Prediction Score: 85.5/100
Performance Tier: ⭐ Good
Trend: 📈 Improving (+5.3 points)
Period: 2026-06-23

[View Product Details] (clickable button)
```

## 🔧 Configuration Options

### Who Receives Alerts?

**Option 1:** Product Managers Only (default)
```env
ALERT_PRODUCT_MANAGERS_ONLY=true
```

**Option 2:** All Executives
```env
ALERT_PRODUCT_MANAGERS_ONLY=false
```
Sends to: Product Managers + Executive Management + Super Admins

### When Are Alerts Sent?

Alerts are triggered when:
- ✅ Single prediction: `POST /api/ml/predict`
- ✅ 3-month forecast: `GET /api/ml/predictions/{product_id}`
- ✅ Bulk predictions: `GET /api/ml/predictions/bulk`

### Disable Alerts Temporarily

```env
SEND_PREDICTION_ALERTS=false  # Still creates database records
EMAIL_ENABLED=false           # Completely disables email
```

## 📊 Alert Severity Levels

Emails are color-coded by severity:

| Tier | Previous Score | Trend | Severity | Color |
|------|----------------|-------|----------|-------|
| Poor | Any | Declining | 🔴 Critical | Red |
| Poor | Any | Stable | 🟠 High | Orange |
| Average | Lower | Declining | 🟡 Medium | Yellow |
| Good | Higher | Improving | 🟢 Low | Green |
| Excellent | Higher | Improving | 🟢 Low | Green |

## 🗂️ Files Added

```
backend/
├── app/
│   ├── services/
│   │   ├── email_service.py                    # Email sending logic
│   │   └── alert_notification_service.py       # Alert management
│   └── api/v1/
│       └── ml.py                               # Updated with alert endpoints
├── .env.example                                # Updated with email config
└── requirements.txt                            # Already has dependencies

docs/
├── EMAIL_ALERTS_SETUP.md                       # Detailed documentation
└── EMAIL_ALERTS_README.md                      # This file
```

## 🚨 Troubleshooting

### Problem: Emails not sending

**Solution:**
```bash
# 1. Check configuration
GET /api/ml/alerts/recipients

# 2. Verify settings show:
{
  "email_enabled": true,
  "alerts_enabled": true
}

# 3. Test SMTP connection in Python
python
>>> import smtplib
>>> server = smtplib.SMTP('smtp.gmail.com', 587)
>>> server.starttls()
>>> server.login('email', 'password')  # Should succeed
```

### Problem: No recipients found

**Solution:** Ensure you have users with `product_manager` role:
```sql
UPDATE users SET role='product_manager' WHERE email='manager@example.com';
```

### Problem: Gmail blocking

**Solution:** Use app-specific password, NOT your regular Gmail password!

## 📖 Full Documentation

See `EMAIL_ALERTS_SETUP.md` for:
- Detailed setup instructions
- Email provider configurations (Outlook, SendGrid, AWS SES)
- Security best practices
- Production deployment guide
- Customization options

## 🎉 That's It!

You're all set! Every time the AI makes a prediction, your product managers will receive a beautiful email alert.

**Questions?** Check the logs or see full documentation.

---

**Quick Links:**
- 📄 Full Setup Guide: `EMAIL_ALERTS_SETUP.md`
- 🔧 Email Service: `backend/app/services/email_service.py`
- 📨 Alert Logic: `backend/app/services/alert_notification_service.py`
- 🎯 API Endpoints: `backend/app/api/v1/ml.py`
