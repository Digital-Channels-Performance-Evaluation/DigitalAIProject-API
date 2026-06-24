# 📋 Email Alert System - Deployment Checklist

Use this checklist to ensure proper setup and deployment of the email alert system.

## 🔧 Pre-Deployment Setup

### 1. Email Provider Configuration
- [ ] Choose email provider (Gmail, Outlook, SendGrid, AWS SES, etc.)
- [ ] Create dedicated email account for system notifications
- [ ] Enable 2-factor authentication on email account (if using Gmail/Outlook)
- [ ] Generate app-specific password (for Gmail/Outlook)
- [ ] Test SMTP connection manually

### 2. Environment Configuration
- [ ] Copy `.env.example` to `.env`
- [ ] Set `EMAIL_ENABLED=true`
- [ ] Configure SMTP settings:
  - [ ] `SMTP_HOST`
  - [ ] `SMTP_PORT` (587 for TLS, 465 for SSL)
  - [ ] `SMTP_USER`
  - [ ] `SMTP_PASSWORD` (app password, not main password!)
  - [ ] `FROM_EMAIL`
- [ ] Set `FRONTEND_URL` to your dashboard URL
- [ ] Configure alert settings:
  - [ ] `SEND_PREDICTION_ALERTS=true`
  - [ ] `ALERT_PRODUCT_MANAGERS_ONLY=true` or `false`

### 3. Database Verification
- [ ] Verify `alerts` table exists (should already exist)
- [ ] Verify `users` table has product managers with valid emails
- [ ] Verify `products` table has test products

```sql
-- Check product managers
SELECT id, full_name, email, role, is_active 
FROM users 
WHERE role = 'product_manager' AND is_active = 1;

-- Should return at least one active product manager
```

### 4. Test User Setup
- [ ] Ensure at least one active product manager exists
- [ ] Verify all product managers have valid email addresses
- [ ] Update test user emails if needed:

```sql
UPDATE users 
SET email = 'your-test-email@gmail.com' 
WHERE role = 'product_manager' 
LIMIT 1;
```

## 🧪 Testing Phase

### 1. SMTP Connection Test
- [ ] Test SMTP connection using Python:

```python
import smtplib
server = smtplib.SMTP('smtp.gmail.com', 587)
server.starttls()
server.login('your-email@gmail.com', 'your-app-password')
server.quit()
print("✅ SMTP connection successful!")
```

### 2. Backend Startup
- [ ] Start backend server: `uvicorn app.main:app --reload`
- [ ] Check logs for any email service errors
- [ ] Verify no startup errors

### 3. Test Endpoints
- [ ] Test recipient endpoint:
```bash
curl -X GET "http://localhost:8000/api/ml/alerts/recipients" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "count": 1,
  "recipients": [...],
  "email_enabled": true,
  "alerts_enabled": true
}
```

- [ ] Send test email:
```bash
curl -X POST "http://localhost:8000/api/ml/alerts/test-email?product_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

- [ ] Check recipient inbox for test email
- [ ] Verify email formatting looks correct
- [ ] Test email links work correctly

### 4. Live Prediction Test
- [ ] Make actual prediction:
```bash
curl -X POST "http://localhost:8000/api/ml/predict" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 1, "features": {...}}'
```

- [ ] Verify email was sent
- [ ] Check alert record in database:
```sql
SELECT * FROM alerts ORDER BY created_at DESC LIMIT 1;
```

- [ ] Verify dashboard shows new alert

## 🔐 Security Checklist

- [ ] **Never commit `.env` file** (verify it's in `.gitignore`)
- [ ] Use app-specific passwords, not main account passwords
- [ ] Store production secrets in secure vault (AWS Secrets Manager, Azure Key Vault, etc.)
- [ ] Rotate SMTP credentials regularly (quarterly recommended)
- [ ] Limit SMTP account permissions (send-only if possible)
- [ ] Enable logging for email send attempts
- [ ] Monitor for failed login attempts on email account

## 🚀 Production Deployment

### 1. Environment Variables (Cloud/Docker)
- [ ] Set environment variables in production (don't use `.env` files)
- [ ] Use secrets management service
- [ ] Verify `FRONTEND_URL` points to production domain
- [ ] Set `EMAIL_ENABLED=true` in production

### 2. Email Provider Setup
- [ ] Use professional email service (SendGrid, AWS SES) for production
- [ ] Configure SPF/DKIM/DMARC records for your domain
- [ ] Verify domain ownership with email provider
- [ ] Set up email bounce handling
- [ ] Configure rate limits

### 3. Monitoring Setup
- [ ] Set up logging for email service
- [ ] Configure alerts for email failures
- [ ] Monitor SMTP connection health
- [ ] Track email delivery rates
- [ ] Set up dashboard for email metrics

### 4. Load Testing
- [ ] Test with multiple concurrent predictions
- [ ] Verify email queue doesn't block API responses
- [ ] Test with 10+ recipients
- [ ] Monitor memory usage during email sends

## 📊 Post-Deployment Verification

### Day 1
- [ ] Monitor logs for email send errors
- [ ] Verify first production emails arrive
- [ ] Check spam folders if emails missing
- [ ] Verify alert records created in database
- [ ] Check dashboard alerts page

### Week 1
- [ ] Review email delivery success rate
- [ ] Check for bounce notifications
- [ ] Verify no complaints from recipients
- [ ] Monitor system performance impact
- [ ] Review alert severity distribution

### Month 1
- [ ] Analyze email open rates (if tracking enabled)
- [ ] Gather feedback from product managers
- [ ] Review alert accuracy vs. actual issues
- [ ] Check for false positive alerts
- [ ] Optimize severity thresholds if needed

## 🐛 Troubleshooting Checklist

### Emails Not Sending

- [ ] Check `EMAIL_ENABLED=true` in configuration
- [ ] Verify `SEND_PREDICTION_ALERTS=true`
- [ ] Check logs for SMTP errors
- [ ] Verify SMTP credentials are correct
- [ ] Test SMTP connection manually
- [ ] Check firewall allows outbound SMTP (ports 587/465)
- [ ] Verify email account not locked/suspended

### No Recipients Found

- [ ] Check users table for product managers
- [ ] Verify users have `is_active=true`
- [ ] Check email addresses are valid
- [ ] Verify role enum values match
- [ ] Test recipients endpoint directly

### Emails in Spam

- [ ] Configure SPF record for your domain
- [ ] Set up DKIM signing
- [ ] Add DMARC policy
- [ ] Use professional email provider
- [ ] Avoid spam trigger words in subject
- [ ] Include unsubscribe link (future enhancement)

### Performance Issues

- [ ] Check if emails are blocking API responses (should not)
- [ ] Monitor email send duration
- [ ] Consider async email sending (Celery queue)
- [ ] Check SMTP server response times
- [ ] Limit concurrent SMTP connections

## 📝 Documentation Checklist

- [ ] Share setup guide with team
- [ ] Document SMTP credentials location (secrets vault)
- [ ] Update runbook with troubleshooting steps
- [ ] Train team on alert management
- [ ] Document email template customization
- [ ] Create alert severity guidelines
- [ ] Document recipient management process

## 🎯 Success Criteria

System is ready for production when:

- ✅ Test emails send successfully
- ✅ All product managers receive notifications
- ✅ Emails have correct formatting and links
- ✅ Alert records created in database
- ✅ No errors in logs
- ✅ Dashboard shows alerts correctly
- ✅ Email delivery rate > 95%
- ✅ Zero security issues identified
- ✅ Performance impact < 100ms per request
- ✅ Team trained on system usage

## 📞 Support Contacts

- **SMTP Issues:** Email provider support
- **Application Issues:** Development team
- **User Management:** System administrators
- **Security Concerns:** Security team

## 📅 Maintenance Schedule

### Daily
- Monitor email logs
- Check delivery success rate

### Weekly
- Review bounce reports
- Update recipient lists if needed

### Monthly
- Review alert effectiveness
- Gather user feedback
- Update email templates if needed

### Quarterly
- Rotate SMTP credentials
- Review security configuration
- Audit email logs
- Performance optimization

---

## ✅ Final Sign-Off

- [ ] All checklist items completed
- [ ] System tested end-to-end
- [ ] Team trained and ready
- [ ] Documentation complete
- [ ] Monitoring in place
- [ ] Production deployment approved

**Deployed By:** _________________  
**Date:** _________________  
**Approved By:** _________________  

---

**Version:** 1.0.0  
**Last Updated:** June 23, 2026
