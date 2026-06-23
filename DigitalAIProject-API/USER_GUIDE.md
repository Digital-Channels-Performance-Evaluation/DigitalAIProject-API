# User Guide - AHADU PULSE Platform

**Digital Banking Product Evaluation Platform**  
**Version**: 1.0.0  
**Date**: June 21, 2026

---

## 📍 Quick Access

### Login Portal
- **URL**: http://localhost:3000
- **Status**: ✅ Ready (all 7 users pre-configured)

### Test Accounts (All Active & Ready)

Copy-paste ready credentials:

```
👑 SUPER ADMIN
   Email: admin@ahadubank.com
   Pass:  Admin@123

📊 EXECUTIVE
   Email: exec@ahadubank.com
   Pass:  Exec@123

📱 PRODUCT MANAGER
   Email: pm@ahadubank.com
   Pass:  PM@12345

🔧 DATA ENGINEER
   Email: de@ahadubank.com
   Pass:  DE@12345

🤖 ML ENGINEER
   Email: ml@ahadubank.com
   Pass:  ML@12345

⚠️ RISK TEAM
   Email: risk@ahadubank.com
   Pass:  Risk@123

✔️ COMPLIANCE
   Email: compliance@ahadubank.com
   Pass:  Comp@123
```

---

## 🚀 Getting Started

### Step 1: Start the Platform

**Option A: Docker (Recommended)**
```bash
docker-compose up
```

**Option B: Local Development**
```bash
# Terminal 1 - Backend
cd backend
python -m uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 2: Access Login Page

Open browser to: **http://localhost:3000**

You'll see the login page with:
- 💡 All 7 user credentials displayed
- 🖱️ Click any credential to auto-fill
- ✨ Modern, responsive design

### Step 3: Login

**Option A: Quick Click**
1. See a credential in the credentials list
2. Click on the row
3. Email and password auto-fill
4. Click "Sign In"
5. Dashboard loads

**Option B: Manual Entry**
1. Type email: `admin@ahadubank.com`
2. Type password: `Admin@123`
3. Click "Sign In"

---

## 👥 User Roles & Permissions

### 1. 👑 Super Admin
**Email**: admin@ahadubank.com | **Password**: Admin@123

**Access Level**: Full system access

**Features**:
- ✅ All dashboards & reports
- ✅ All products & scores
- ✅ All alerts & recommendations
- ✅ User management
- ✅ Model training & management
- ✅ System settings & configuration
- ✅ Audit logs

**Use For**: System administration, full platform control

---

### 2. 📊 Executive Management
**Email**: exec@ahadubank.com | **Password**: Exec@123

**Access Level**: Executive dashboards

**Features**:
- ✅ Executive dashboard overview
- ✅ Executive insights
- ✅ Reports & analytics
- ✅ Performance trends
- ✅ 3-month predictions
- ✅ Read-only scores & rankings

**Use For**: Executive reports, strategic insights

---

### 3. 📱 Product Manager
**Email**: pm@ahadubank.com | **Password**: PM@12345

**Access Level**: Product management

**Features**:
- ✅ Product management
- ✅ Performance scores
- ✅ Rankings & comparisons
- ✅ Alerts (view & resolve)
- ✅ Recommendations
- ✅ Product settings

**Use For**: Product oversight, alert management

---

### 4. 🔧 Data Engineer
**Email**: de@ahadubank.com | **Password**: DE@12345

**Access Level**: Data management

**Features**:
- ✅ Data uploads & validation
- ✅ Feature engineering
- ✅ Data quality checks
- ✅ Raw data access
- ✅ Model view (read-only)
- ✅ Report generation

**Use For**: Data pipeline management

---

### 5. 🤖 ML Engineer
**Email**: ml@ahadubank.com | **Password**: ML@12345

**Access Level**: Model training & management

**Features**:
- ✅ Model training
- ✅ Model retraining
- ✅ Model performance metrics
- ✅ Drift detection
- ✅ 3-month predictions
- ✅ Model registry
- ✅ Auto-select best model

**Use For**: ML model training and optimization

---

### 6. ⚠️ Risk Team
**Email**: risk@ahadubank.com | **Password**: Risk@123

**Access Level**: Risk monitoring

**Features**:
- ✅ Alert dashboard
- ✅ Alert filtering (severity, status)
- ✅ Resolve alerts
- ✅ Alert history & tracking
- ✅ Risk analysis
- ✅ Anomaly detection

**Use For**: Risk monitoring and alert resolution

---

### 7. ✔️ Compliance Team
**Email**: compliance@ahadubank.com | **Password**: Comp@123

**Access Level**: Compliance monitoring

**Features**:
- ✅ Read-only dashboard access
- ✅ Audit logs
- ✅ Compliance reports
- ✅ User activity tracking
- ✅ Data access logs

**Use For**: Compliance verification and auditing

---

## 🎯 Common Tasks

### View Dashboard

1. Login with any user credential
2. You'll be on the Dashboard by default
3. See KPI summary:
   - Total products
   - Average performance score
   - Tier distribution (LOW/MEDIUM/HIGH)
4. View trend charts:
   - Performance trend
   - Revenue trend
   - User growth
   - Failure rate trend
   - Complaint trend

### Check Product Scores

1. Go to **Scores** in sidebar
2. See all products with latest scores
3. **Filter**:
   - By tier (LOW, MEDIUM, HIGH)
   - By product
   - By date range
4. **Pagination**: 25 rows per page
5. **Export**: Download as CSV/Excel

### View Rankings

1. Go to **Rankings** in sidebar
2. See products ranked by performance (best to worst)
3. For each product:
   - Current score
   - Score trend (up/down/stable)
   - Tier classification
   - Recommendation count
4. Use for peer comparison

### Monitor Alerts

1. Go to **Alerts** in sidebar
2. **Filter** by:
   - Severity (critical, high, medium, low)
   - Status (resolved, unresolved)
   - Product
   - Alert type
3. **Resolve** an alert:
   - Click alert row
   - Click "Resolve"
   - Add resolution notes
   - Click confirm
4. Alert moves to "resolved" status

### Review Recommendations

1. Go to **Recommendations** in sidebar
2. See AI-generated suggestions for each product
3. **Filter** by:
   - Priority (critical, high, medium, low)
   - Category (infrastructure, user adoption, etc.)
   - Product
4. **Acknowledge** recommendations:
   - Click recommendation
   - Review AI explanation
   - Click "Acknowledge"
5. Acknowledged recs tracked in history

### View 3-Month Predictions

1. Go to **Predictions** in sidebar
2. Select a product
3. See three months of forward predictions:
   - Month 1 prediction
   - Month 2 prediction
   - Month 3 prediction
4. View:
   - Predicted score
   - Predicted tier
   - Confidence level
   - Trend direction

### Generate Reports

1. Go to **Reports** in sidebar
2. Click "Generate Report"
3. Select:
   - Report type (weekly, monthly)
   - Format (PDF, Excel, CSV)
   - Date range
4. Click "Generate"
5. Report queued for background processing
6. Download when ready

### Train Models (ML Engineer Only)

1. Login as ML Engineer (ml@ahadubank.com)
2. Go to **Model Management** in sidebar
3. View current models:
   - Logistic Regression (99.70% accuracy)
   - Random Forest (99.23% accuracy - best)
   - Ridge Regression (R²=0.9577)
   - KNN (99.60% accuracy)
   - Decision Tree (95.17% accuracy)
4. Click "Retrain All Models" to start training
5. View training progress
6. See updated metrics when complete

---

## 🔐 Login Tips

### Auto-Fill Feature
On the login page, you'll see all 7 user credentials listed at the bottom. Simply:
1. Click on any credential line
2. Email and password automatically fill in
3. Press "Sign In"

### Password Visibility Toggle
- Click the 👁️ eye icon to show/hide password
- Helpful for verification before login

### Session Management
- Sessions last 24 hours
- You'll need to login again after 24 hours
- Sessions are stored securely in Redis cache

### Multi-Factor Authentication (MFA)
- MFA is optional (disabled for testing)
- If enabled, you'll be prompted for a 6-digit code
- Check your MFA app (e.g., Google Authenticator)

---

## 📊 Dashboard Overview

### Key Performance Indicators (KPIs)

```
┌─────────────────────────────────────────────┐
│ PERFORMANCE SCORE (Main Metric)             │
│                95.0                         │
│ MEDIUM tier, Stable trend                   │
└─────────────────────────────────────────────┘

┌─────────────┬─────────────┬─────────────────┐
│ Total       │ Avg Score   │ Tier Breakdown  │
│ Products: 6 │ 75.3        │ HIGH:  25%      │
│             │             │ MED:   45%      │
│             │             │ LOW:   30%      │
└─────────────┴─────────────┴─────────────────┘
```

### Trend Charts

**Performance Trend**: 24-month historical performance  
**Revenue Trend**: Monthly revenue changes  
**User Growth**: Active user changes over time  
**Failure Rate**: Transaction failure trends  
**Complaint Trend**: Customer complaint volume  

---

## 🎨 Navigation Guide

### Sidebar Menu (Left)
- 🏠 **Dashboard** - Overview
- 📱 **Products** - All digital products
- 📊 **Scores** - Detailed performance scores
- 🏆 **Rankings** - Products ranked by performance
- 🚨 **Alerts** - Performance anomalies
- 💡 **Recommendations** - AI suggestions
- 📈 **Predictions** - 3-month forecasts
- 📄 **Reports** - Automated reports
- 🤖 **Model Management** - ML models (ML Engineer only)
- ✨ **Executive Insights** - Executive summary
- 👥 **Users** - User management (Admin only)
- ⚙️ **Settings** - Configuration

### Top Navigation (Right)
- 🔔 **Notifications** - Real-time alerts
- 👤 **Profile** - User account settings
- 🚪 **Logout** - Sign out

---

## 🔧 Troubleshooting

### Can't Login?

**Problem**: Login fails with "Invalid credentials"  
**Solution**:
1. Check email is spelled correctly
2. Check password is exact (case-sensitive)
3. Reset database: `mysql -u root -p ahadu_bank_eval < database/init.sql`
4. Restart backend service

**Problem**: Login page won't load  
**Solution**:
1. Check frontend is running: `npm run dev` in frontend directory
2. Check backend is running: `python -m uvicorn app.main:app --reload`
3. Clear browser cache (Ctrl+Shift+Delete)
4. Try incognito/private window

### Dashboard Loads Slowly?

**Problem**: Dashboard takes >2 seconds to load  
**Solution**:
1. Expected: After optimization, should be ~1.3 seconds
2. Check database indexes: `SHOW INDEX FROM scores;`
3. Check Redis is running: `redis-cli ping`
4. Clear browser cache
5. Check network: DevTools → Network tab

### Models Not Training?

**Problem**: Model training fails or shows errors  
**Solution**:
1. Check Celery/Redis: `redis-cli ping` (should return PONG)
2. Check model directory exists: `mkdir -p ml_models`
3. Try manual training: `python train_models.py --skip-grid-search`
4. Check backend logs for errors

### Recommendations Not Showing?

**Problem**: Recommendations page is empty  
**Solution**:
1. Check at least one alert exists
2. Recommendations are generated from alerts
3. Generate sample data if needed
4. Wait a few seconds for generation
5. Refresh page

---

## 📈 Performance Expectations

### Load Times
- **Dashboard**: <2 seconds (optimized to 1.3s)
- **API Response**: <100ms average
- **Model Prediction**: <200ms
- **Report Generation**: 10-30 seconds (background job)

### Model Accuracy
- **Best Model** (Random Forest): 99.23% accuracy
- **Logistic Regression**: 99.70% accuracy
- **Ridge Regression**: R²=0.9577 (95.77% variance explained)
- **All models**: >95% accuracy ✅

### System Capacity
- **Concurrent Users**: 100+
- **Products**: 6 (expandable to 1000+)
- **Data Points**: 500k+ (scalable to millions)
- **Database**: MySQL 8.0 (optimized with 10 indexes)

---

## 📞 Getting Help

### Support Contacts

| Role | Contact | Purpose |
|------|---------|---------|
| **Admin** | admin@ahadubank.com | General support |
| **ML Questions** | ml@ahadubank.com | Model issues |
| **Data Issues** | de@ahadubank.com | Data problems |
| **Product Help** | pm@ahadubank.com | Feature questions |

### Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| **Complete Guide** | COMPLETE_PROJECT_DOCUMENTATION.md | Full system guide |
| **Model Metrics** | MODEL_ACCURACY_REPORT.md | Detailed model info |
| **Project Concept** | PROJECT_OVERVIEW.md | Architecture & design |
| **API Docs** | http://localhost:8000/docs | Interactive API |

---

## 🎓 Quick Reference

### URLs
```
Frontend:   http://localhost:3000
Backend:    http://localhost:8000
API Docs:   http://localhost:8000/docs
```

### Sample Users
```
Admin:      admin@ahadubank.com / Admin@123
Executive:  exec@ahadubank.com / Exec@123
ML Eng:     ml@ahadubank.com / ML@12345
Data Eng:   de@ahadubank.com / DE@12345
```

### Common Keyboard Shortcuts
```
Ctrl+K      - Search products
Ctrl+/      - Show help
Ctrl+,      - Open settings
Esc         - Close modals
```

---

## ✅ Checklist for First Time Use

- [ ] Started Docker or local services
- [ ] Frontend loaded at http://localhost:3000
- [ ] Can see login page with all credentials
- [ ] Successfully logged in with one credential
- [ ] Dashboard displays KPI metrics
- [ ] Can navigate to other pages (Scores, Rankings, etc.)
- [ ] Can see sample data (6 products, 72 months of history)
- [ ] Model metrics visible (5 models, 95-99% accuracy)
- [ ] Alerts and recommendations show data

**All checked?** ✅ You're ready to use AHADU PULSE!

---

**Last Updated**: June 21, 2026  
**Version**: 1.0.0  
**Status**: Production Ready ✅

