# 📧 Email Alerts - Quick Reference Card

## 🚀 5-Minute Setup

### 1. Edit `.env` file
```bash
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@ahadubank.com
FRONTEND_URL=http://localhost:3000
SEND_PREDICTION_ALERTS=true
ALERT_PRODUCT_MANAGERS_ONLY=true
```

### 2. Get Gmail App Password
1. Google Account → Security
2. 2-Step Verification → App passwords
3. Generate for "Mail"
4. Copy to `SMTP_PASSWORD`

### 3. Restart Backend
```bash
uvicorn app.main:app --reload
```

### 4. Test
```bash
POST /api/ml/alerts/test-email?product_id=1
```

---

## 📌 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ml/alerts/test-email` | POST | Send test email |
| `/api/ml/alerts/recipients` | GET | View recipients |
| `/api/ml/alerts/settings` | POST | Update settings |

---

## ⚙️ Configuration Quick Reference

```env
# Master Switches
EMAIL_ENABLED=true/false          # Enable/disable all emails
SEND_PREDICTION_ALERTS=true/false # Enable/disable prediction alerts

# Recipients
ALERT_PRODUCT_MANAGERS_ONLY=true  # Only PMs
ALERT_PRODUCT_MANAGERS_ONLY=false # PMs + Execs + Admins

# SMTP Ports
SMTP_PORT=587  # TLS (recommended)
SMTP_PORT=465  # SSL (alternative)
```

---

## 🔧 Common SMTP Settings

**Gmail:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

**Outlook:**
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
```

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
```

---

## 🐛 Quick Troubleshooting

**No emails sending?**
```bash
# Check config
GET /api/ml/alerts/recipients

# Verify shows:
# email_enabled: true
# alerts_enabled: true
```

**No recipients?**
```sql
UPDATE users SET role='product_manager' 
WHERE email='your-test@email.com';
```

**Gmail blocking?**
- Use app password (not main password!)
- Enable 2FA first
- Check "Recent security activity"

**Test SMTP:**
```python
import smtplib
s = smtplib.SMTP('smtp.gmail.com', 587)
s.starttls()
s.login('email', 'app-password')
s.quit()  # Should succeed
```

---

## 📊 Alert Severity Colors

| Tier | Trend | Color |
|------|-------|-------|
| Poor | Declining | 🔴 Red (Critical) |
| Poor | Stable | 🟠 Orange (High) |
| Average | Declining | 🟡 Yellow (Medium) |
| Good | Any | 🟢 Green (Low) |
| Excellent | Any | 🟢 Green (Low) |

---

## ✅ Pre-Launch Checklist

- [ ] `.env` configured
- [ ] Test email works
- [ ] Recipients verified
- [ ] Links work
- [ ] Logs clean

---

## 📞 Emergency Contacts

**Emails not working:**
1. Check logs: `backend/logs/app.log`
2. Test endpoint: `/api/ml/alerts/test-email`
3. Disable temporarily: `EMAIL_ENABLED=false`

---

## 💡 Pro Tips

✅ **DO:**
- Use app passwords for Gmail
- Test before production
- Monitor logs regularly
- Keep credentials secret

❌ **DON'T:**
- Commit `.env` file
- Use main email password
- Ignore bounce notifications
- Skip testing

---

## 📱 When Alerts are Sent

✅ Single prediction: `POST /api/ml/predict`  
✅ 3-month forecast: `GET /api/ml/predictions/{id}`  
✅ Bulk predictions: `GET /api/ml/predictions/bulk`  

---

## 🔄 Runtime Settings Change

```bash
POST /api/ml/alerts/settings
{
  "email_enabled": true,
  "send_alerts": true,
  "product_managers_only": false
}
```

*Note: Changes don't persist - update `.env` for permanent*

---

**Print this page and keep it handy! 📄**
