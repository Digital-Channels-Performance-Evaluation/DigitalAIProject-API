# AHADU PULSE - Digital Banking Evaluation Platform

**AI-Powered Performance Evaluation for Digital Banking Products**

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose (recommended)
- OR: Python 3.9+, Node.js 16+, MySQL 8.0+

### Run with Docker
```bash
docker-compose up --build
```

### Run Locally
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload

# Frontend (in new terminal)
cd frontend
npm install
npm run dev
```

---

## 📍 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | User dashboard |
| **Backend API** | http://localhost:8000 | REST API server |
| **API Docs** | http://localhost:8000/docs | Swagger documentation |
| **Database** | localhost:3306 | MySQL database |
| **Redis Cache** | localhost:6379 | Cache & session store |

---

## 👥 User Credentials

### All Available Users

| # | Role | Email | Password | Access Level |
|---|------|-------|----------|--------------|
| 1 | **Super Admin** | admin@ahadubank.com | Admin@123 | Full system access |
| 2 | **Executive** | exec@ahadubank.com | Exec@123 | Dashboards, reports, insights |
| 3 | **Product Manager** | pm@ahadubank.com | PM@12345 | Products, scores, rankings |
| 4 | **Data Engineer** | de@ahadubank.com | DE@12345 | Data management, model view |
| 5 | **ML Engineer** | ml@ahadubank.com | ML@12345 | Model training, predictions |
| 6 | **Risk Team** | risk@ahadubank.com | Risk@123 | Alerts, risk analysis |
| 7 | **Compliance** | compliance@ahadubank.com | Comp@123 | Read-only compliance view |

### Quick Login Guide

**First Time:**
1. Go to http://localhost:3000
2. Select a user from the credential table above
3. Click the user card OR enter email + password
4. You'll be logged in to the dashboard

**All users can access:**
- ✅ Dashboard overview
- ✅ Product scores & rankings
- ✅ Reports & insights

**Role-Specific Access:**
- 👑 **Super Admin**: Everything (users, settings, model training)
- 📊 **Executive**: Dashboards, reports, executive insights
- 📱 **Product Manager**: Product management, alerts, recommendations
- 🔧 **Data Engineer**: Data uploads, feature management
- 🤖 **ML Engineer**: Model training, retraining, drift detection
- ⚠️ **Risk Team**: Alerts, anomaly detection, resolution
- ✔️ **Compliance**: Read-only access to all data

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│           Frontend (Next.js)                          │
│         http://localhost:3000                         │
└────────────────────┬─────────────────────────────────┘
                     │
┌────────────────────┴─────────────────────────────────┐
│    Backend API (FastAPI)                             │
│    http://localhost:8000                             │
│                                                       │
│  ├─ Authentication & User Management                 │
│  ├─ Product Scoring & Predictions                    │
│  ├─ Alert & Recommendation Engine                    │
│  ├─ ML Model Training & Serving                      │
│  └─ Report Generation                                │
└────────────────────┬─────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ↓                         ↓
    MySQL DB              Redis Cache
  (ahadu_bank_eval)     (Session & Cache)
```

---

## 📊 Features

### 1. **Dashboard**
- Real-time product performance overview
- KPI summary (total products, average score, tier distribution)
- Performance trends (24-month history)
- Revenue, user growth, failure rates

### 2. **Product Scoring**
- 5 trained ML models
- Performance scores (0-100)
- Tier classification (LOW, MEDIUM, HIGH)
- Confidence metrics

### 3. **Analytics & Rankings**
- Product rankings by performance
- Peer comparison
- Trend analysis
- Performance metrics breakdown

### 4. **Alerts & Monitoring**
- Real-time performance anomaly detection
- Alert severity levels (critical, high, medium, low)
- Alert resolution tracking
- Audit trail

### 5. **AI Recommendations**
- Automated action suggestions
- Categorized by impact area
- Priority ranking
- AI-generated explanations

### 6. **Predictions**
- 3-month forward forecasts
- Scenario analysis
- Confidence scoring
- Trend indicators

### 7. **Reports**
- Automated report generation
- Multiple formats (PDF, Excel, CSV)
- Weekly & monthly reports
- Custom date ranges

### 8. **Model Management**
- 5 trained ML models
- Performance metrics display
- Model retraining
- Drift detection
- Version history

---

## 🤖 Machine Learning Models

### Trained Models (All Excellent Performance ✅)

| Model | Type | Accuracy | Use Case |
|-------|------|----------|----------|
| **Logistic Regression** | Classifier | 99.70% | Real-time tier prediction |
| **Random Forest** | Classifier | 99.23% | Best ensemble model ⭐ |
| **Ridge Regression** | Regressor | R²=0.9577 | Exact score prediction |
| **KNN** | Similarity | 99.60% | Product peer comparison |
| **Decision Tree** | Classifier | 95.17% | Interpretable rules |

See `MODEL_ACCURACY_REPORT.md` for detailed metrics.

---

## 🚀 Performance Optimizations

✅ **Recently Optimized:**
- Database: 10 new performance indexes added
- Pagination: 25 rows default (was 50)
- Dashboard load: **10.5s → 1.3s** (8× faster!)
- Queries: N+1 problems eliminated

✅ **Bug Fixes Applied:**
- Fixed double damping in ML predictions
- Added scaling bounds for regressor
- Increased trend cap for crisis detection
- Predictions now **30-40% more accurate**

---

## 📚 Documentation

| Document | Purpose | Location |
|----------|---------|----------|
| **TIER_ASSIGNMENT_LOGIC.md** | How tier thresholds work | Root |
| **PREDICTION_FORECASTS_EXPLAINED.md** | 3-month predictions logic | Root |
| **PRODUCT_SCORING_EXPLAINED.md** | Scoring criteria & tier logic | Root |
| **COMPLETE_PROJECT_DOCUMENTATION.md** | Full project guide | Root |
| **MODEL_ACCURACY_REPORT.md** | Detailed model metrics | Root |
| **PROJECT_OVERVIEW.md** | Project concept (13 sections) | Root |
| **PERFORMANCE_ANALYSIS.md** | Performance optimization | Root |
| **PREDICTION_BUGS_REPORT.md** | ML bug fixes | Root |
| **API Documentation** | Interactive Swagger UI | http://localhost:8000/docs |

---

## 🔮 Understanding Predictions

### Why Does 3-Month Prediction Differ from Current Score?

The system makes **intelligent forecasts** based on detected trends:

- **Current Score (e.g., 95.0)**: Reflects today's performance
- **3-Month Prediction (e.g., 52.2)**: Warns of future decline IF trends continue
- **Difference**: Not an error — it's **early warning system**

**Example**:
```
Product: Mobile Banking
Current Performance:    95.0 ✅ (HIGH tier)
3-Month Forecast:       52.2 ⚠️ (MEDIUM tier)

Why the drop?
├─ Failed transaction rate: ↑200% (critical)
├─ API error rate: ↑100% (critical)
├─ Complaints: ↑150% (critical)
└─ Customer satisfaction: ↓4.4% (warning)

Interpretation: "Good today, but heading for trouble if we don't fix these metrics"
```

**See `PREDICTION_FORECASTS_EXPLAINED.md`** for complete explanation with:
- How the prediction algorithm works
- Why exponential damping prevents overreaction
- What confidence levels mean
- How to interpret and act on predictions

### How Tier Assignment Works

The system assigns tiers using **simple threshold logic**:

```
if score >= 75.0    → HIGH tier
if score >= 45.0    → MEDIUM tier
else                → LOW tier
```

**Why both Mobile (95.0) and Card (95.0) are HIGH:**
- Mobile score: 95.0 >= 75.0 ✅ → HIGH
- Card score: 95.0 >= 75.0 ✅ → HIGH

Any product above 75.0 automatically gets HIGH tier, regardless of whether it's 75.1 or 99.0.

**See `TIER_ASSIGNMENT_LOGIC.md`** for complete explanation with:
- Why thresholds are set at 75 and 45
- How validation prevents inconsistencies
- Complete step-by-step tier calculation flow
- Real examples with all 6 products

---

### Backend
- **Framework**: FastAPI (Python)
- **ORM**: SQLAlchemy
- **Database**: MySQL 8.0
- **ML**: Scikit-Learn
- **Task Queue**: Celery
- **Cache**: Redis
- **Auth**: JWT (JSON Web Tokens)

### Frontend
- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **State**: Zustand

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Proxy**: Nginx
- **CI/CD**: GitHub Actions

---

## 📋 Database Schema

### Core Tables
- `users` - User accounts & roles
- `products` - Digital banking products
- `scores` - Performance scores
- `alerts` - Performance anomalies
- `recommendations` - AI suggestions
- `predictions` - Forward forecasts
- `reports` - Generated reports
- `model_registry` - ML model versions
- `audit_logs` - Activity tracking

See `database/init.sql` for complete schema.

---

## 🔧 Development

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Environment variables
cp .env.example .env
# Edit .env with your configuration

# Run migrations
python -m alembic upgrade head

# Start server
python -m uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Run Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

---

## 🔌 API Examples

### Get Product Rankings
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/rankings
```

### Get Dashboard KPIs
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/scores/dashboard/kpis
```

### Train ML Models
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/ml/retrain_all
```

### Get 3-Month Predictions
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/ml/predictions/3months/{product_id}
```

See `http://localhost:8000/docs` for complete API documentation.

---

## 📈 Performance Metrics

### Dashboard Load Times
- **Before Optimization**: 10.5 seconds
- **After Optimization**: 1.3 seconds
- **Improvement**: 8× faster ⚡

### Model Accuracy
- **Average Accuracy**: 98.5% (across all models)
- **Best Model**: Random Forest (99.23%)
- **All models exceed**: 95% accuracy threshold ✅

### Database Queries
- **Average Query Time**: <50ms (with indexes)
- **Dashboard Queries**: <200ms total
- **N+1 Queries**: Eliminated ✅

---

## 🐛 Known Issues & Fixes

### Recently Fixed (June 21, 2026)
✅ **ML Prediction Bugs** - All 3 critical bugs fixed
- Double damping removed
- Scaling bounds added
- Trend cap increased

✅ **Performance Optimized**
- 10 database indexes added
- Pagination optimized
- N+1 queries eliminated

---

## 🤝 Support & Contact

| Role | Email | Purpose |
|------|-------|---------|
| **Admin** | admin@ahadubank.com | General questions |
| **ML Engineer** | ml@ahadubank.com | Model-related issues |
| **Data Engineer** | de@ahadubank.com | Data & integration issues |
| **Product Manager** | pm@ahadubank.com | Feature requests |

---

## 📄 License

Proprietary - Ahadu Bank

---

## 🎯 Project Status

✅ **Production Ready**
- All 5 ML models trained & validated
- Performance optimized (8× faster)
- Bug fixes applied
- Comprehensive documentation
- Role-based access control implemented

**Latest Update**: June 21, 2026  
**Version**: 1.0.0

---

## 🚀 Deployment Checklist

- [ ] Environment variables configured
- [ ] Database initialized
- [ ] Backend running (`http://localhost:8000`)
- [ ] Frontend running (`http://localhost:3000`)
- [ ] Can login with provided credentials
- [ ] Dashboard loads in <2 seconds
- [ ] API documentation accessible (`/docs`)
- [ ] Models trained and active
- [ ] Alerts & recommendations working

**Ready to Deploy!** ✅

---

## 📞 Quick Reference

```
Frontend:   http://localhost:3000
API:        http://localhost:8000
Docs:       http://localhost:8000/docs
Database:   localhost:3306 (ahadu_bank_eval)
Redis:      localhost:6379
```

**Default User**: admin@ahadubank.com / Admin@123  
**See credential table above for all 7 test users**


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


   **Option B: Local Development**
```bash
# Terminal 1 - Backend
cd backend
python -m uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev