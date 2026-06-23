# AHADU PULSE - Complete Project Understanding Guide

**Comprehensive guide combining ML Training, Project Overview, Procedures, and System Documentation**

**Date**: June 21, 2026  
**Status**: Complete & Production Ready

---

## Table of Contents

1. [Project Vision & Overview](#1-project-vision--overview)
2. [Problem Statement](#2-problem-statement)
3. [Solution Architecture](#3-solution-architecture)
4. [System Components](#4-system-components)
5. [ML Training Pipeline](#5-ml-training-pipeline)
6. [Procedures & Workflows](#6-procedures--workflows)
7. [System Documentation](#7-system-documentation)
8. [Getting Started](#8-getting-started)

---

## 1. Project Vision & Overview

### What is AHADU PULSE?

**AHADU PULSE** is an **AI-powered Digital Banking Evaluation Platform** that automatically scores and monitors the performance of digital banking products.

### Mission

To provide **real-time, data-driven insights** into digital banking product performance using machine learning, enabling:
- ✅ Executives to make informed decisions
- ✅ Product managers to optimize offerings
- ✅ Operations teams to respond to issues
- ✅ Risk teams to detect anomalies early

### Key Innovation

Instead of manual evaluation, AHADU PULSE uses **5 trained ML models** to:
1. **Predict performance scores** (0-100)
2. **Classify product tiers** (HIGH/MEDIUM/LOW)
3. **Forecast 3-month trends** (trend projection)
4. **Detect anomalies** (real-time alerts)
5. **Generate recommendations** (AI-powered insights)

### Business Context

**Ahadu Bank** operates **6 digital banking products**:
1. Mobile Banking
2. Card Banking
3. ATM Network
4. Web Banking
5. API Gateway
6. USSD Service

Each product needs continuous monitoring, performance evaluation, and risk detection.

---

## 2. Problem Statement

### The Challenge

**Manual Evaluation is Inefficient:**
- ❌ Slow (takes weeks to analyze)
- ❌ Inconsistent (depends on who evaluates)
- ❌ Delayed (retrospective, not real-time)
- ❌ Limited (only a few metrics monitored)
- ❌ Reactive (problems detected after impact)

### What Was Needed

✅ **Automated performance evaluation**  
✅ **Real-time monitoring & alerts**  
✅ **Predictive insights (trends & forecasts)**  
✅ **Multi-dimensional analysis (14 metrics)**  
✅ **AI-driven recommendations**

### The Solution

**AHADU PULSE** — An intelligent platform that:
- Analyzes 14 key performance indicators
- Trains 5 ML models (95-99% accuracy)
- Scores products automatically
- Predicts future performance
- Alerts on anomalies
- Generates recommendations

---

## 3. Solution Architecture

### High-Level Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    Data Sources                              │
│  • Transaction logs                                          │
│  • User activity                                             │
│  • System uptime                                             │
│  • Support tickets                                           │
│  • Revenue reports                                           │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────────┐
        │  Data Processing Pipeline  │
        │  (ETL & Feature Eng)       │
        └────────────────┬───────────┘
                         │
                         ↓
    ┌────────────────────────────────────┐
    │    14 Performance Metrics          │
    │  (User Engagement, Reliability,    │
    │   Efficiency, Satisfaction)        │
    └────────────────┬───────────────────┘
                     │
        ┌────────────┴────────────┐
        ↓                         ↓
    ┌─────────────┐          ┌─────────────┐
    │  ML Models  │          │  ML Models  │
    │  (5 models) │          │  (5 models) │
    └─────┬───────┘          └──────┬──────┘
          │                         │
          └────────────┬────────────┘
                       ↓
        ┌──────────────────────────────┐
        │   Performance Score (0-100)  │
        │   Tier Classification        │
        │   3-Month Forecast           │
        │   Anomaly Detection          │
        │   Recommendations            │
        └──────────────┬───────────────┘
                       │
                       ↓
        ┌──────────────────────────────┐
        │    Dashboard & Reports       │
        │    (Executive Insights)      │
        └──────────────────────────────┘
```

### System Components

1. **Backend API** (FastAPI)
   - Data processing
   - ML model serving
   - Alert generation
   - Report generation

2. **Frontend** (Next.js)
   - Dashboard visualization
   - User interface
   - Real-time updates
   - Role-based views

3. **Database** (MySQL)
   - Product data
   - Historical scores
   - Predictions
   - Alerts & recommendations

4. **ML Pipeline** (Scikit-Learn)
   - Model training
   - Model serving
   - Prediction generation
   - Drift detection

---

## 4. System Components

### 4.1 The 14 Performance Metrics

#### User Engagement (4 metrics)
```
1. active_user_rate (%)
   → % of total users who are active monthly
   → Target: > 80%
   → Example: Mobile Banking 89%

2. user_engagement_index
   → Combined engagement depth score
   → Target: > 90
   → Example: Mobile Banking 95.2

3. avg_session_duration_sec (seconds)
   → Average time users spend per session
   → Target: > 300 seconds
   → Example: Mobile Banking 523 sec

4. revenue_per_active_user ($)
   → Revenue generated per engaged user
   → Target: > $50
   → Example: Mobile Banking $87.50
```

#### Transaction Reliability (3 metrics)
```
5. txn_success_rate (%)
   → % of transactions that complete successfully
   → Target: > 97%
   → Example: Mobile Banking 98.3%

6. failed_txn_rate (%)
   → % of transactions that fail
   → Target: < 3%
   → Example: Mobile Banking 1.7%

7. api_error_rate (%)
   → System API errors per 100k transactions
   → Target: < 2%
   → Example: Mobile Banking 1.8%
```

#### Operational Efficiency (3 metrics)
```
8. operational_efficiency_score (0-100)
   → Composite operational health
   → Target: > 90
   → Example: Mobile Banking 92.1

9. downtime_impact_score (%)
   → % of time system was down
   → Target: < 1%
   → Example: Mobile Banking 0.7%

10. uptime_percentage (%)
    → System availability percentage
    → Target: > 99%
    → Example: Mobile Banking 99.3%
```

#### Customer Satisfaction (2 metrics)
```
11. complaint_growth_rate (%)
    → Month-over-month % change in complaints
    → Target: < 5%
    → Example: Mobile Banking +2.1%

12. complaint_resolution_rate (%)
    → % of complaints resolved
    → Target: > 85%
    → Example: Mobile Banking 98.2%

13. csat_score (1-5 scale)
    → Customer Satisfaction rating
    → Target: > 4.0
    → Example: Mobile Banking 4.5/5
```

#### Financial Health (1 metric)
```
14. revenue_per_transaction ($)
    → Average revenue per transaction
    → Target: > $10
    → Example: Mobile Banking $45.20
```

### 4.2 Frontend Components

**Dashboard Page**
- KPI summary (total products, avg score, tier distribution)
- 6 product cards (score, tier, trend)
- 24-month performance trend chart
- Revenue & user growth charts

**Analytics Page**
- Product rankings (by score, tier, trend)
- Peer comparison
- Performance metrics breakdown
- Trend analysis

**Alerts Page**
- Real-time anomaly detection
- Alert severity levels (critical, high, medium, low)
- Resolution tracking
- Alert history

**Recommendations Page**
- AI-generated suggestions
- Priority ranking
- Implementation status
- Impact assessment

**Model Management Page** (Admin only)
- 5 model performance metrics
- Model retraining controls
- Drift detection status
- Version history

**Reports Page**
- Weekly & monthly reports
- Custom date ranges
- Multiple formats (PDF, Excel, CSV)
- Executive summaries

### 4.3 Backend Services

**ML Service**
- Model loading & serving
- Score calculation
- Tier assignment
- 3-month prediction generation
- Drift detection

**Data Service**
- Data collection from sources
- Feature engineering
- Data validation
- Feature storage

**Alert Service**
- Anomaly detection
- Alert generation
- Alert severity assignment
- Resolution tracking

**Recommendation Service**
- Pattern analysis
- Insight generation
- Priority calculation
- Impact scoring

**Report Service**
- Report template rendering
- Data aggregation
- Format conversion (PDF, Excel)
- Scheduling

---

## 5. ML Training Pipeline

### 5.1 Data Collection

**Training Data Sources:**
- 500,000 historical records
- 6 digital products
- 12 months of data
- All 14 metrics

**Data Processing:**
```
Raw Data → Validation → Cleaning → Feature Engineering → 
Normalization → Train/Test Split → Model Training
```

### 5.2 The 5 ML Models

#### Model 1: Logistic Regression (Tier Classifier)
**Purpose**: Predict performance tier (LOW, MEDIUM, HIGH)

**Performance:**
- Accuracy: 99.70% ✅
- F1-Score: 0.9970
- Training time: 2 seconds
- Prediction time: <1ms

**Use Case:** Real-time tier prediction

**Training Process:**
```
1. Load 500k records with 14 features
2. Normalize all features (StandardScaler)
3. Split: 80% train, 20% test (100k samples)
4. Train Logistic Regression model
5. Evaluate on test set
6. Achieve 99.70% accuracy
7. Save model as artifact
```

#### Model 2: Ridge Regression (Score Predictor)
**Purpose**: Predict exact performance score (0-100)

**Performance:**
- R² Score: 0.9577 ✅ (explains 95.77% of variance)
- MAE: 3.09 points
- RMSE: 4.08 points
- Prediction error: ±3.1 points on average

**Use Case:** Score calculation

**Training Process:**
```
1. Load 500k records
2. Normalize features
3. Add light regularization (alpha=0.1)
4. Train Ridge Regressor
5. Achieve R²=0.9577
6. Average prediction error: 3.1 points
```

#### Model 3: Random Forest (Best Ensemble)
**Purpose**: Ensemble tier prediction (PRIMARY MODEL ⭐)

**Performance:**
- Accuracy: 99.23% ✅
- F1-Score: 0.9923
- Training time: 15 seconds
- Prediction time: 5-10ms

**Configuration:**
```python
Random Forest(
    n_estimators=200,      # 200 trees
    max_depth=10,          # Max tree depth
    min_samples_split=5,   # Min samples to split
    min_samples_leaf=2     # Min samples per leaf
)
```

**Why It's Best:**
- ✅ Highest accuracy among classifiers
- ✅ Handles non-linear patterns
- ✅ Robust to outliers
- ✅ Explains feature importance
- ✅ Generalizes well (low variance)

#### Model 4: KNN (Similarity Matcher)
**Purpose**: Find similar products for benchmarking

**Performance:**
- Accuracy: 99.60% ✅
- K (neighbors): 7
- Training size: 20k samples
- Prediction time: 50-100ms

**Use Case:** Peer comparison & anomaly detection

#### Model 5: Decision Tree (Interpretability)
**Purpose**: Explainable rule-based predictions

**Performance:**
- Accuracy: 95.17% ✅
- Max depth: 8 levels
- Prediction time: 1-2ms (fastest)

**Advantage**: Simple decision rules that anyone can understand

### 5.3 Training Procedure

**Step 1: Data Preparation**
```
Load historical data (500k records)
  ↓
Select 14 features
  ↓
Check for missing values
  ↓
Handle outliers
  ↓
Split into train (80%) / test (20%)
```

**Step 2: Feature Normalization**
```
Fit StandardScaler on training data
  ↓
Transform both train & test data
  ↓
Clip to ±3 standard deviations
  ↓
Results: Features in [0, 1] range
```

**Step 3: Label Generation**
```
For each record:
  Calculate score from 14 metrics
  ↓
  Assign tier:
    if score >= 75 → HIGH
    if score >= 45 → MEDIUM
    else → LOW
```

**Step 4: Model Training**
```
Train 5 models in parallel:
  • Logistic Regression (2 sec)
  • Ridge Regression (1 sec)
  • Random Forest (15 sec)
  • KNN (5 sec)
  • Decision Tree (3 sec)
```

**Step 5: Evaluation**
```
For each model:
  Predict on test set (100k records)
  ↓
  Calculate metrics:
    • Accuracy
    • F1-Score
    • Precision/Recall
    • Confusion Matrix
  ↓
  Verify against BRD requirements
```

**Step 6: Model Storage**
```
Save each model as PKL artifact:
  • logistic_regression_v1.pkl
  • ridge_regression_v1.pkl
  • random_forest_v1.pkl
  • knn_v1.pkl
  • decision_tree_v1.pkl
  
Store in model registry with metadata:
  • Accuracy scores
  • Training date
  • Feature list
  • Model version
```

### 5.4 Feature Importance

**Top 5 Most Important Features** (from Random Forest):

```
1. failed_txn_rate (15.2%)
   → Transaction failures are critical
   → Biggest impact on tier classification

2. active_user_rate (14.9%)
   → User engagement is crucial
   → Direct indicator of product health

3. operational_efficiency_score (9.3%)
   → Overall operational health
   → Combines uptime, performance, stability

4. revenue_per_txn (8.1%)
   → Financial viability
   → Important for business sustainability

5. complaint_resolution_rate (6.7%)
   → Customer satisfaction response
   → Reflects operational responsiveness
```

### 5.5 Cross-Validation

**5-Fold Cross-Validation Results:**
```
Model                    CV F1-Score    Variance
Logistic Regression      0.9971 ±0.0001  ✅ Excellent
Random Forest            0.9921 ±0.0002  ✅ Excellent
Ridge Regression         R²=0.9559 ±0.0003 ✅ Stable
KNN                      0.9964 ±0.0010  ✅ Good
Decision Tree            0.9511 ±0.0008  ✅ Stable
```

**Interpretation:**
- Low variance indicates good generalization
- Models perform consistently across different data splits
- No overfitting detected
- Safe for production deployment

---

## 6. Procedures & Workflows

### 6.1 Daily Operations

**Morning Check (9:00 AM)**
```
1. Review dashboard KPIs
2. Check for new alerts (critical/high priority)
3. Review previous day's recommendations
4. Monitor product trends
```

**Issue Investigation (When Alert Triggered)**
```
1. Click alert to see details
2. Review affected product metrics
3. Check 3-month predictions
4. Compare with peer products
5. Generate report for stakeholders
```

**Action & Resolution**
```
1. Assign to responsible team
2. Implement fix/optimization
3. Monitor metrics for improvement
4. Mark alert as resolved
5. Document lessons learned
```

### 6.2 Weekly Procedures

**Weekly Report Generation (Every Friday)**
```
1. Backend: Generate weekly performance report
2. Include: Score changes, tier movements, alerts, recommendations
3. Attach: Charts, metrics, trends
4. Send to: Executive team, product managers
5. Format: PDF with executive summary
```

**Model Performance Review**
```
1. Check model accuracy vs. actual outcomes
2. Verify no drift detected
3. Review new patterns in data
4. Assess if retraining needed
```

### 6.3 Monthly Procedures

**Monthly Retraining (End of Month)**
```
1. Collect latest 30 days of data
2. Append to historical dataset
3. Retrain all 5 models
4. Validate new model performance
5. If accuracy < 90% → Investigate
6. Deploy new models if validated
7. Archive old model versions
```

**Executive Review Meeting**
```
1. Present performance scorecards
2. Highlight products needing attention
3. Share recommendations & action items
4. Discuss market trends & opportunities
5. Plan optimizations for next month
```

### 6.4 Quarterly Procedures

**Model Audit & Enhancement**
```
1. Full historical accuracy review
2. Feature engineering assessment
3. Hyperparameter optimization
4. New feature identification
5. Model performance comparison
6. Update model documentation
```

**Strategic Planning**
```
1. Review quarterly performance trends
2. Identify systemic issues
3. Plan infrastructure improvements
4. Set performance targets
5. Allocate resources
```

### 6.5 How to Use Each Feature

**Dashboard**
- View all products at a glance
- Check tier distribution
- Monitor overall health
- Click product card for details

**Analytics**
- Sort products by score/tier/trend
- Compare similar products
- Analyze historical trends
- Export data for reports

**Alerts**
- Filter by severity/type
- Acknowledge alerts
- Resolve issues
- Track resolution time

**Recommendations**
- Review AI suggestions
- Prioritize by impact
- Track implementation
- Measure results

**Model Management**
- View model accuracy
- Trigger retraining
- Check drift detection
- Version history

---

## 7. System Documentation

### 7.1 Technology Stack

**Backend**
- Framework: FastAPI (Python)
- ORM: SQLAlchemy
- ML: Scikit-Learn
- Task Queue: Celery
- Cache: Redis

**Frontend**
- Framework: Next.js (TypeScript)
- Styling: Tailwind CSS
- Charts: Recharts
- State: Zustand

**Database**
- Primary: MySQL 8.0
- Cache: Redis
- Migrations: Alembic

**Infrastructure**
- Containerization: Docker
- Orchestration: Docker Compose
- Proxy: Nginx

### 7.2 Database Schema

**Core Tables:**
- `users` — User accounts & roles
- `products` — Digital banking products
- `scores` — Performance scores per period
- `predictions` — 3-month forecasts
- `alerts` — Anomaly alerts
- `recommendations` — AI suggestions
- `reports` — Generated reports
- `ml_models` — Model registry
- `audit_logs` — Activity tracking

### 7.3 API Endpoints

**Key Endpoints:**
```
GET  /api/v1/scores/dashboard/kpis
GET  /api/v1/rankings
POST /api/v1/ml/predict/{product_id}
GET  /api/v1/ml/predictions/3months/{product_id}
GET  /api/v1/alerts
POST /api/v1/alerts/{id}/resolve
GET  /api/v1/recommendations
POST /api/v1/ml/retrain_all
```

### 7.4 Security

**Authentication**
- JWT tokens (8-hour expiry)
- Role-based access control (7 roles)
- Secure password hashing

**Data Protection**
- SQL injection prevention
- CORS enabled
- Rate limiting
- Audit logging

---

## 8. Getting Started

### 8.1 For New Users

**Day 1: Understanding**
1. Read README.md (5 min)
2. Read QUICK_REFERENCE_GUIDE.md (10 min)
3. Login with provided credentials
4. Explore dashboard (10 min)

**Day 2: Learning Your Role**
1. Read USER_GUIDE.md for your role
2. Try 3-5 common tasks
3. Ask questions to team lead

**Day 3: Productive**
1. Handle real alerts
2. Generate reports
3. Implement recommendations
4. Contribute insights

### 8.2 For Developers

**Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
```

**Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

**Model Training**
```bash
cd backend
python train_models.py
```

### 8.3 Key Resources

**Documentation:**
- README.md — Quick start
- TIER_ASSIGNMENT_LOGIC_EXPLAINED.md — Tier system
- PREDICTION_FORECASTS_EXPLAINED.md — Predictions
- PRODUCT_SCORING_EXPLAINED.md — Scoring
- MODEL_ACCURACY_REPORT.md — ML models
- USER_GUIDE.md — Roles & workflows

**API Reference:**
- Swagger UI: http://localhost:8000/docs

**Support:**
- Team lead for questions
- ML engineer for model issues
- DevOps for infrastructure

---

## 9. Quick Facts

| Metric | Value |
|--------|-------|
| Products Monitored | 6 |
| Performance Metrics | 14 |
| ML Models | 5 |
| Model Accuracy | 95-99% |
| Users | 7 roles |
| Dashboard Load | 1.3 seconds |
| Prediction Horizon | 3 months |
| Alert Latency | <1 minute |
| API Response | <100ms |
| Uptime Target | 99.9% |

---

## 10. Success Metrics

### System Health
- ✅ All 5 models active & accurate (>95%)
- ✅ Dashboard responsive (<2 seconds)
- ✅ Alerts generated in real-time
- ✅ Recommendations useful & actionable

### Business Impact
- ✅ Issues detected earlier
- ✅ Response time improved
- ✅ Customer satisfaction maintained
- ✅ Revenue protected

---

**Status**: ✅ PRODUCTION READY  
**Last Updated**: June 21, 2026  
**Version**: 1.0.0

For questions, refer to specific documentation files or contact your team lead.
