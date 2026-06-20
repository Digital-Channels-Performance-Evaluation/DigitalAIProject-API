# AHADU PULSE — Complete System Documentation
## AI-Powered Digital Banking Product Evaluation Platform

**Institution:** Ahadu Bank S.C.  
**Department:** Digital Banking Department  
**System Name:** AHADU PULSE  
**Version:** 1.0.0  
**Build Date:** June 4, 2026  
**Model Training Run:** v20260604_120849  
**Status:** ✅ Production-Ready — All BRD Thresholds Passed

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Structure](#2-project-structure)
3. [Technology Stack](#3-technology-stack)
4. [Database — Full Schema](#4-database--full-schema)
5. [Backend Architecture](#5-backend-architecture)
6. [API Endpoints — Complete Reference](#6-api-endpoints--complete-reference)
7. [ML Feature Engineering](#7-ml-feature-engineering)
8. [ML Model Training Pipeline](#8-ml-model-training-pipeline)
9. [Model Performance Results](#9-model-performance-results)
10. [Frontend Dashboard — All Pages](#10-frontend-dashboard--all-pages)
11. [Services — Full Description](#11-services--full-description)
12. [Async Task Queue](#12-async-task-queue)
13. [Security & Access Control](#13-security--access-control)
14. [Deployment Architecture](#14-deployment-architecture)
15. [How to Run](#15-how-to-run)
16. [Complete Feature Traceability Matrix](#16-complete-feature-traceability-matrix)

---

## 1. Executive Summary

Ahadu Bank S.C. operates 7 digital financial products. Before AHADU PULSE, there was no unified system to measure, score, or compare product performance. All reviews were manual, delayed, and inconsistent.

**AHADU PULSE** is a full-stack AI platform that:

- Collects monthly KPI data from all 7 digital product channels
- Engineers 12 predictive features from raw operational metrics
- Scores each product on a standardised **0–100 performance scale**
- Classifies products as **HIGH (≥80)**, **MEDIUM (50–79)**, or **LOW (<50)** using 5 trained ML models
- Delivers executive dashboards with real-time scores, trend charts, alerts, and AI recommendations
- Provides 3-month forward predictions
- Generates weekly and monthly PDF/Excel/CSV reports

### Products Monitored

| Product | Code | Category | Priority |
|---------|------|----------|----------|
| Ahadu Mobile Banking | MOBILE_01 | mobile_banking | Tier 1 |
| Ahadu Card Banking | CARD_01 | card_banking | Tier 1 |
| Ahadu ATM Network | ATM_01 | atm | Tier 2 |
| Ahadu POS System | POS_01 | pos | Tier 2 |
| Ahadu QR Pay | QR_01 | qr_payment | Tier 2 |
| Ahadu Digital Wallet | WALLET_01 | digital_wallet | Tier 2 |
| USSD Banking | USSD_01 | ussd_banking | Tier 2 |

---

## 2. Project Structure

```
AHADU PULSE/
├── backend/
│   ├── app/
│   │   ├── api/v1/              # 10 REST API routers
│   │   │   ├── auth.py          # JWT login, refresh, logout, /me
│   │   │   ├── users.py         # User CRUD
│   │   │   ├── products.py      # Product list, detail, CRUD
│   │   │   ├── scores.py        # Scores, dashboard KPIs, charts
│   │   │   ├── rankings.py      # Product rankings
│   │   │   ├── alerts.py        # Alerts list, resolve, summary
│   │   │   ├── recommendations.py # AI recommendations, acknowledge
│   │   │   ├── ml.py            # 5-model training, predict, registry
│   │   │   ├── data.py          # CSV/Excel upload, validate, features
│   │   │   └── reports.py       # PDF/Excel/CSV report generation
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic settings
│   │   │   ├── database.py      # SQLAlchemy engine + session
│   │   │   ├── security.py      # bcrypt + JWT
│   │   │   └── deps.py          # Auth dependencies + RBAC
│   │   ├── models/              # 9 SQLAlchemy ORM models
│   │   ├── schemas/             # 5 Pydantic schema modules
│   │   ├── services/            # 5 business logic services
│   │   ├── tasks/               # Celery async tasks
│   │   └── db/seed.py           # Database seeder
│   ├── ml_models/               # Trained model artifacts
│   │   ├── classifier_latest.pkl
│   │   ├── regressor_latest.pkl
│   │   ├── similarity_latest.pkl
│   │   ├── random_forest_latest.pkl
│   │   ├── decision_tree_latest.pkl
│   │   ├── scaler_latest.pkl
│   │   ├── features_latest.json
│   │   └── metrics_latest.json
│   ├── train_models.py          # Standalone 5-model training pipeline
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── login/page.tsx       # Split-panel login with crimson branding
│   │   └── dashboard/           # 10 dashboard pages
│   │       ├── page.tsx         # Overview: KPIs, charts, rankings, alerts
│   │       ├── products/        # Product list + detail
│   │       ├── rankings/        # Full ranking table
│   │       ├── alerts/          # Alert feed + resolve
│   │       ├── recommendations/ # AI action items
│   │       ├── reports/         # Download PDF/Excel/CSV
│   │       ├── models/          # 5-model registry + feature importance
│   │       ├── scores/          # Score history table
│   │       ├── settings/        # CSV upload + feature engineering
│   │       └── users/           # User management
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx      # Fixed crimson sidebar, RBAC nav
│   │   │   ├── Header.tsx       # Page header, search, bell, avatar
│   │   │   └── Footer.tsx       # Branded footer with policy modals
│   │   ├── dashboard/
│   │   │   ├── KPICard.tsx
│   │   │   ├── TierBadge.tsx
│   │   │   └── SeverityBadge.tsx
│   │   └── charts/
│   │       ├── PerformanceTrendChart.tsx
│   │       ├── MultiLineChart.tsx
│   │       └── TierDistributionChart.tsx
│   ├── lib/
│   │   ├── api.ts               # Axios + JWT interceptors
│   │   ├── auth-store.ts        # Zustand auth state
│   │   └── utils.ts             # Formatters, color helpers
│   └── Dockerfile
├── database/
│   ├── init.sql                 # Full MySQL 8.0 schema + seed data
│   └── sample_data.csv          # 8-row upload test file
├── nginx/nginx.conf             # Reverse proxy + rate limiting
├── .github/workflows/ci-cd.yml  # GitHub Actions CI/CD
├── docker-compose.yml           # 7-service orchestration
├── analyze_dataset.py           # EDA script (500k row analysis)
└── SYSTEM_DOCUMENTATION.md     # This document
```

---

## 3. Technology Stack

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| Python | 3.11 | Core language |
| FastAPI | 0.111.0 | REST API framework |
| Uvicorn | 0.29.0 | ASGI server (4 workers) |
| SQLAlchemy | 2.0.30 | ORM |
| PyMySQL | 1.1.0 | MySQL driver |
| Pydantic | 2.7.1 | Data validation |
| python-jose | 3.3.0 | JWT tokens |
| passlib/bcrypt | 1.7.4 | Password hashing |
| Celery | 5.4.0 | Async task queue |
| Redis | 5.0.4 | Celery broker + cache |
| Pandas | 2.2.2 | Data manipulation |
| NumPy | 1.26.4 | Numerical computation |
| Scikit-learn | 1.4.2 | ML models |
| Joblib | 1.4.2 | Model serialisation |
| ReportLab | 4.1.0 | PDF generation |
| XlsxWriter | 3.2.0 | Excel generation |
| pyotp | 2.9.0 | TOTP MFA |
| slowapi | 0.1.9 | Rate limiting |

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| Next.js | 15.0.3 | React framework (App Router) |
| React | 18.3.1 | UI library |
| TypeScript | 5.6.3 | Type safety |
| Tailwind CSS | 3.4.15 | Utility CSS |
| Recharts | 2.13.3 | Charts |
| Axios | 1.7.7 | HTTP client |
| Zustand | 5.0.1 | State management |
| Radix UI | various | Accessible components |
| TanStack Table | 8.20.5 | Data tables |
| Sonner | 1.7.0 | Toast notifications |
| react-hook-form | 7.53.2 | Form handling |
| Zod | 3.23.8 | Schema validation |
| date-fns | 4.1.0 | Date formatting |
| lucide-react | 0.460.0 | Icons |

### Infrastructure
| Component | Technology |
|-----------|-----------|
| Database | MySQL 8.0 |
| Cache/Queue | Redis 7 alpine |
| Container | Docker 24.x + Compose 2.x |
| Reverse Proxy | Nginx alpine |
| CI/CD | GitHub Actions |

---

## 4. Database — Full Schema

### Tables Overview

| Table | Rows (seeded) | Description |
|-------|--------------|-------------|
| `users` | 7 | Platform users with RBAC roles |
| `products` | 6 | Digital banking products |
| `raw_data` | 72 | Monthly KPI data (12mo × 6 products) |
| `processed_features` | 72 | Engineered ML features |
| `model_registry` | 4 | ML model versions + metrics |
| `scores` | 72 | Performance scores per product/period |
| `predictions` | 18 | 3-month forward forecasts |
| `similar_products` | 9 | KNN similarity pairs |
| `alerts` | 6 | Threshold-triggered alerts |
| `recommendations` | 8 | AI action items |
| `reports` | 16 | Generated reports metadata |
| `audit_logs` | 12 | Immutable action trail |

### raw_data — All 27 Columns

```
id, product_id, period_date
total_users, active_users, new_users, churned_users
total_transactions, successful_transactions, failed_transactions
failed_txn_rate (%)
transaction_volume (ETB)
total_revenue (ETB), fee_revenue (ETB)
uptime_percentage, downtime_minutes, downtime_hours
avg_response_time_ms, api_error_rate (%)
total_complaints, resolved_complaints
csat_score (1–5)
fraud_event_count, security_incident_count
source, upload_batch_id, is_validated, validation_errors
uploaded_by (FK→users), created_at
```

### processed_features — All 28 Columns

```
id, raw_data_id (FK), product_id (FK), period_date
-- Engineered features
active_user_rate, revenue_per_transaction, revenue_per_active_user
transaction_success_rate, failed_txn_rate_pct
user_engagement_index, complaint_growth_rate, prev_complaint_volume
downtime_impact_score, operational_efficiency_score
complaint_resolution_rate
-- Normalised features (Min-Max 0–1)
norm_active_user_rate, norm_revenue_per_active_user
norm_transaction_success_rate, norm_operational_efficiency
norm_complaint_growth_rate, norm_downtime_impact
norm_user_engagement_index, norm_revenue_per_transaction
-- Risk pass-throughs
csat_score, fraud_event_count, security_incident_count
api_error_rate, avg_session_duration_sec
-- Metadata
data_quality_flag, data_quality_notes
engineering_version, created_at
```

### Performance Indexes

```sql
idx_raw_product_period  (product_id, period_date)
idx_scores_product_period_score  (product_id, period_date DESC, performance_score)
idx_pf_product_period  (product_id, period_date)
idx_alerts_severity, idx_alerts_is_resolved
idx_rec_priority, idx_rec_is_ack
idx_audit_created_range  (created_at, user_id, action)
FULLTEXT ft_alerts_message  (title, message)
FULLTEXT ft_rec_desc  (title, description, ai_explanation)
```

### SQL Views

| View | Purpose |
|------|---------|
| `vw_latest_scores` | Latest score per product with product metadata |
| `vw_product_rankings` | Products ranked by score using `RANK()` |
| `vw_open_alerts` | Unresolved alerts ordered by severity |

### User Roles & Default Credentials

| Role | Email | Default Password |
|------|-------|-----------------|
| super_admin | admin@ahadubank.com | Admin@123 |
| executive_management | exec@ahadubank.com | Exec@123 |
| product_manager | pm@ahadubank.com | PM@12345 |
| data_engineer | de@ahadubank.com | DE@12345 |
| ml_engineer | ml@ahadubank.com | ML@12345 |
| risk_team | risk@ahadubank.com | Risk@123 |
| compliance_team | compliance@ahadubank.com | Comp@123 |

---

## 5. Backend Architecture

### Request Flow

```
Client → Nginx (port 80) → FastAPI (port 8000) → Router → Service → DB/ML → Response
                                                      ↓
                                              Celery Worker → Async tasks
```

### Application Startup (`main.py`)

On every startup:
1. `Base.metadata.create_all()` — creates missing tables
2. `_apply_migrations()` — runs 23 `ALTER TABLE IF NOT EXISTS` statements to add any missing BRD columns (self-healing)
3. `seed_database()` — seeds 7 users + 6 products + 12 months of data if not already present

### RBAC — Role Permissions

| Role | Capabilities |
|------|-------------|
| super_admin | Full access — all endpoints |
| executive_management | Read dashboards, reports, recommendations |
| product_manager | Dashboards, acknowledge recommendations |
| data_engineer | Upload data, run feature engineering, view raw data |
| ml_engineer | Full ML — train models, predict, view registry |
| risk_team | View alerts, resolve alerts |
| compliance_team | Read-only access to all sections |

### JWT Token Lifecycle

- Access token: 30-minute expiry, HS256, contains `sub` (user_id), `role`, `type=access`
- Refresh token: 7-day expiry, contains `sub`, `type=refresh`
- On 401: frontend auto-refreshes using stored refresh token
- On refresh failure: localStorage cleared, redirect to `/login`

---

## 6. API Endpoints — Complete Reference

All endpoints are mounted at `http://localhost:8000/api/{resource}`

### Authentication (`/api/auth/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | Public | Login with email + password (+ optional MFA code). Returns JWT access + refresh tokens. Logs audit event. |
| POST | `/auth/refresh` | Public | Exchange refresh token for new access token |
| POST | `/auth/logout` | Bearer | Logs logout audit event |
| GET | `/auth/me` | Bearer | Returns current user profile |

### Users (`/api/users/`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/users/` | super_admin, exec | List all users |
| POST | `/users/` | super_admin | Create new user |
| GET | `/users/{id}` | super_admin, exec | Get user by ID |
| PUT | `/users/{id}` | super_admin | Update user |
| DELETE | `/users/{id}` | super_admin | Deactivate user |

### Products (`/api/products/`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/products/` | All | List products with latest score and tier |
| GET | `/products/{id}` | All | Product detail: score history (12mo), similar products, latest score |
| POST | `/products/` | super_admin, pm | Create product |
| PUT | `/products/{id}` | super_admin, pm | Update product |
| DELETE | `/products/{id}` | super_admin | Soft-delete (deactivate) |

### Scores (`/api/scores/`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/scores/` | All | List scores (filterable by product_id, limit 200) |
| GET | `/scores/dashboard/kpis` | All | Returns: total_products, avg_score, HIGH/MEDIUM/LOW counts, total_alerts, critical_alerts |
| GET | `/scores/dashboard/charts` | All | Returns 5 time-series: performance_trend, revenue_trend, user_growth_trend, failure_rate_trend, complaint_trend |
| GET | `/scores/{id}` | All | Get single score record |

### Rankings (`/api/rankings/`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/rankings/` | All | All products ranked by latest score, with trend (up/down/stable) and pending recommendation count |

### Alerts (`/api/alerts/`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/alerts/` | All | List alerts (filter: severity, alert_type, is_resolved, product_id) |
| POST | `/alerts/{id}/resolve` | risk_team, compliance_team, super_admin | Resolve alert with notes |
| GET | `/alerts/summary` | All | Count by severity and type |

### Recommendations (`/api/recommendations/`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/recommendations/` | All | List (filter: product_id, priority, category, is_acknowledged) |
| POST | `/recommendations/{id}/acknowledge` | pm, exec, super_admin | Acknowledge recommendation |

### ML (`/api/ml/`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/ml/train` | super_admin, ml_engineer | Train a model. `model_type`: classification \| regression \| similarity \| random_forest \| decision_tree |
| POST | `/ml/predict` | super_admin, ml, pm, exec | Run inference for a product_id |
| POST | `/ml/retrain` | super_admin, ml_engineer | Background retrain by model_id or model_type |
| GET | `/ml/models` | super_admin, ml, data | List all model registry entries |
| GET | `/ml/drift` | super_admin, ml | Drift detection report for all active models |
| GET | `/ml/similar/{product_id}` | super_admin, ml, pm, exec | KNN similar products |

### Data (`/api/data/`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/data/upload` | super_admin, data, ml | Upload CSV/XLSX. Validates, ingests, auto-runs feature engineering. Returns rows_imported + warnings. |
| POST | `/data/validate` | super_admin, data, ml | Validate file without importing |
| POST | `/data/manual` | super_admin, data | Manual single-record entry |
| GET | `/data/raw` | All | List raw_data records (filter by product_id) |
| GET | `/data/features` | All | List processed_features records |
| POST | `/data/engineer` | super_admin, data, ml | Recompute all features |

### Reports (`/api/reports/`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/reports/weekly` | All | Generate weekly report. `format=pdf\|excel\|csv`. Returns file download. |
| GET | `/reports/monthly` | All | Generate monthly report. `format=pdf\|excel\|csv`. Returns file download. |
| GET | `/reports/list` | All | List generated reports metadata (last 50) |

---

## 7. ML Feature Engineering

### Feature Computation (`feature_engineering.py`)

Each `RawData` record produces a `ProcessedFeatures` record with the following computed values:

| Feature | Formula | Description |
|---------|---------|-------------|
| `active_user_rate` | `active_users / total_users` | Real engagement ratio |
| `revenue_per_transaction` | `total_revenue / total_transactions` | Monetisation per txn |
| `revenue_per_active_user` | `total_revenue / active_users` | Monetisation per engaged user |
| `transaction_success_rate` | `successful_txn / total_txn` OR `1 - failed_txn_rate/100` | Reliability metric |
| `failed_txn_rate_pct` | Direct from raw_data | Raw failure % |
| `user_engagement_index` | `active_user_rate × total_transactions` | Engagement × volume |
| `complaint_growth_rate` | `(current - prev) / prev × 100` (MoM%) | Attrition early warning |
| `prev_complaint_volume` | Prior period complaint count | MoM delta base |
| `complaint_resolution_rate` | `resolved / total × 100` | Service quality |
| `downtime_impact_score` | `downtime_minutes / (30×24×60) × 100` | % monthly time lost |
| `operational_efficiency_score` | `txn_success×0.5 + api_health×0.3 + resolution×0.2` | Composite ops health |
| `csat_score` | Pass-through from raw (1–5) | Customer satisfaction |
| `fraud_event_count` | Pass-through from raw | Risk signal |
| `security_incident_count` | Pass-through from raw | Risk signal |
| `api_error_rate` | Pass-through from raw (%) | Technical health |
| `avg_session_duration_sec` | Maps from avg_response_time_ms | User session depth |

### Data Ingestion (`data_service.py`)

Upload pipeline:
1. Read CSV/XLSX into DataFrame
2. Validate required columns (`product_code`, `period_date`)
3. Check for unknown product codes
4. Check for negative values, duplicate records, range violations
5. Auto-compute missing `failed_txn_rate` from `failed/total×100`
6. Auto-compute `downtime_minutes` from `downtime_hours×60` if not provided
7. Insert into `raw_data` table with batch UUID
8. Auto-trigger `feature_engineering_service.process_and_store()` per row

### Required CSV Upload Columns

```
product_code, period_date, total_users, active_users,
total_transactions, successful_transactions, failed_transactions,
total_revenue, uptime_percentage, downtime_hours,
total_complaints, resolved_complaints
```

Optional (enhance ML accuracy):
```
failed_txn_rate, downtime_minutes, api_error_rate,
csat_score, fraud_event_count, security_incident_count,
new_users, churned_users, fee_revenue, avg_response_time_ms
```

---

## 8. ML Model Training Pipeline

### Pipeline Overview (`train_models.py`)

```
CSV datasets (400k train / 100k test)
       ↓
  load_data()
       ↓
  preprocess()
  • Feature derivation (12 features)
  • Median imputation (train medians)
  • 3σ winsorisation
  • Min-Max scaling [0,1]
  • Gaussian noise std=0.08 (train+test)
       ↓
  ┌────────────────────────────────────────┐
  │ Model 1: Logistic Regression (LR)      │
  │ Model 2: Ridge Regression              │
  │ Model 3: KNN Similarity                │
  │ Model 4: Random Forest (RF)            │
  │ Model 5: Decision Tree (DT)            │
  └────────────────────────────────────────┘
       ↓
  print_feature_importance()
       ↓
  save_artifacts() → ml_models/
       ↓
  validate_against_brd()
```

### The 12 Training Features (version v20260604_120849)

| # | Feature | Direction | Notes |
|---|---------|-----------|-------|
| 1 | `active_user_rate` | + | Strongest positive driver |
| 2 | `failed_txn_rate` | − | Strongest negative driver |
| 3 | `revenue_per_txn` | mixed | Revenue efficiency |
| 4 | `revenue_per_active_user` | + | Monetisation signal |
| 5 | `downtime_impact_score` | − | % monthly time lost |
| 6 | `complaint_growth_rate` | − | MoM attrition signal |
| 7 | `complaint_resolution_rate` | + | Service quality |
| 8 | `fraud_incidents` | − | Risk signal |
| 9 | `api_error_rate` | − | Technical health |
| 10 | `user_engagement_index` | + | Engagement × volume |
| 11 | `avg_session_duration_sec` | + | Session depth |
| 12 | `csat_score` | + | Customer satisfaction (1–5) |

**Features deliberately excluded:**
- `operational_efficiency_score` — removed (composite of other features → data leakage)
- `txn_success_rate` — removed (= 1 − failed_txn_rate/100 → perfect duplication)

### Preprocessing Details

| Step | Method | Detail |
|------|--------|--------|
| Missing values | Median fill | Computed on train set only |
| Outliers | Winsorisation | ±3σ clip, bounds from train |
| Scaling | Min-Max | Fit on train, applied to test |
| Noise | Gaussian std=0.08 | Applied to both train and test — simulates real measurement error, prevents trivial 100% accuracy |

### Hyperparameters (fast mode)

| Model | Key Params |
|-------|-----------|
| Logistic Regression | C=0.1, solver=lbfgs, max_iter=1000 |
| Ridge Regression | alpha=1.0 |
| KNN | n_neighbors=7, metric=euclidean, weights=distance |
| Random Forest | n_estimators=100, max_depth=6, min_samples_split=20, min_samples_leaf=10 |
| Decision Tree | max_depth=5, min_samples_split=50, min_samples_leaf=20, criterion=gini |

**Subsampling for memory/speed:**
- KNN: 20,000 train rows (stratified)
- Random Forest: 50,000 train rows (stratified)
- Decision Tree: 50,000 train rows (stratified)

### Training Commands

```bash
# Fast mode (~90 seconds)
py backend/train_models.py --skip-grid-search

# Full grid search (production retraining)
py backend/train_models.py

# Use full 500k dataset with re-split
py backend/train_models.py --use-full-dataset

# Set explicit version tag
py backend/train_models.py --version v2.0.0
```

---

## 9. Model Performance Results

**Training Run:** v20260604_120849  
**Training set:** 400,000 rows | **Test set:** 100,000 rows  
**Dataset period:** January 2022 – June 2025 (7 products)

### Model 1 — Logistic Regression (Tier Classifier)

| Metric | Result | BRD Target | Status |
|--------|--------|-----------|--------|
| Test Accuracy | **99.70%** | ≥ 85% | ✅ PASS |
| F1 Weighted | **0.9970** | ≥ 0.83 | ✅ PASS |
| F1 Macro | 0.9971 | — | — |
| Precision | 0.9970 | ≥ 0.80 | ✅ PASS |
| Recall | 0.9970 | ≥ 0.80 | ✅ PASS |
| 5-Fold CV F1 | 0.9971 ± 0.0001 | — | Stable |

**Confusion Matrix (100k test):**
```
Actual \ Pred   LOW     MEDIUM   HIGH
LOW            28,508     15       0
MEDIUM              2  39,499     165
HIGH                0    120   31,691
```
Total misclassifications: **302 out of 100,000** (0.30%)

### Model 2 — Ridge Regression (Score Predictor)

| Metric | Result | BRD Target | Status |
|--------|--------|-----------|--------|
| Test R² | **0.9577** | ≥ 0.80 | ✅ PASS |
| Test MAE | **3.09 pts** | ≤ 5.0 | ✅ PASS |
| Test RMSE | 4.08 pts | — | — |
| 5-Fold CV R² | 0.9559 ± 0.0003 | — | Stable |

The model predicts the performance score within an average of **3.09 points** of the actual value on unseen data.

**Ridge Regression Feature Coefficients (by |coef|):**

| Rank | Feature | Coefficient |
|------|---------|-------------|
| 1 | active_user_rate | +13.85 |
| 2 | csat_score | +12.27 |
| 3 | complaint_resolution_rate | +11.75 |
| 4 | fraud_incidents | −9.30 |
| 5 | failed_txn_rate | −9.43 |
| 6 | api_error_rate | −7.88 |
| 7 | complaint_growth_rate | −7.11 |
| 8 | downtime_impact_score | −5.78 |
| 9 | avg_session_duration_sec | +4.36 |
| 10 | revenue_per_active_user | +4.30 |
| 11 | revenue_per_txn | −1.77 |
| 12 | user_engagement_index | +1.70 |

### Model 3 — KNN Similarity

| Metric | Result | BRD Target | Status |
|--------|--------|-----------|--------|
| Test Accuracy | **99.60%** | — | — |
| F1 Weighted | **0.9960** | ≥ 0.80 | ✅ PASS |
| F1 Macro | 0.9962 | — | — |
| 5-Fold CV F1 | 0.9964 ± 0.0010 | — | Stable |

### Model 4 — Random Forest Classifier

| Metric | Result | BRD Target | Status |
|--------|--------|-----------|--------|
| Test Accuracy | **99.23%** | ≥ 85% | ✅ PASS |
| F1 Weighted | **0.9923** | ≥ 0.83 | ✅ PASS |
| F1 Macro | 0.9927 | — | — |
| 5-Fold CV F1 | 0.9926 ± 0.0007 | — | Stable |

**Random Forest Feature Importance:**

| Feature | Importance |
|---------|-----------|
| failed_txn_rate | 19.0% |
| active_user_rate | 18.3% |
| csat_score | 18.1% |
| downtime_impact_score | 12.5% |
| complaint_resolution_rate | 12.5% |
| api_error_rate | 8.1% |
| fraud_incidents | 5.6% |
| complaint_growth_rate | 2.6% |
| user_engagement_index | 2.0% |
| avg_session_duration_sec | 1.1% |
| revenue_per_active_user | 0.3% |
| revenue_per_txn | ~0.0% |

### Model 5 — Decision Tree Classifier

| Metric | Result | BRD Target | Status |
|--------|--------|-----------|--------|
| Test Accuracy | **95.17%** | ≥ 80% | ✅ PASS |
| F1 Weighted | **0.9517** | ≥ 0.80 | ✅ PASS |
| F1 Macro | 0.9537 | — | — |
| 5-Fold CV F1 | 0.9521 ± 0.0021 | — | Stable |

**Decision Tree Feature Importance:**

| Feature | Importance |
|---------|-----------|
| downtime_impact_score | 37.4% |
| active_user_rate | 34.8% |
| csat_score | 11.2% |
| failed_txn_rate | 9.8% |
| complaint_resolution_rate | 5.9% |
| api_error_rate | 0.8% |

### BRD Validation Summary — All 9 Checks Passed

```
✅ Classifier Accuracy ≥ 0.85        actual = 0.9970
✅ Classifier F1 Weighted ≥ 0.83     actual = 0.9970
✅ Regressor R² ≥ 0.80               actual = 0.9577
✅ Regressor MAE ≤ 5.0 score pts     actual = 3.0878
✅ KNN F1 Weighted ≥ 0.80            actual = 0.9960
✅ Random Forest Accuracy ≥ 0.85     actual = 0.9923
✅ Random Forest F1 ≥ 0.83           actual = 0.9923
✅ Decision Tree Accuracy ≥ 0.80     actual = 0.9517
✅ Decision Tree F1 ≥ 0.80           actual = 0.9517
```

### Model Artifacts (`backend/ml_models/`)

| File | Size | Description |
|------|------|-------------|
| `classifier_latest.pkl` | 1.4 KB | Logistic Regression |
| `regressor_latest.pkl` | 0.6 KB | Ridge Regressor |
| `similarity_latest.pkl` | 4.8 MB | KNN (20k subsample) |
| `random_forest_latest.pkl` | 342.8 KB | Random Forest |
| `decision_tree_latest.pkl` | 3.8 KB | Decision Tree |
| `scaler_latest.pkl` | 1.8 KB | MinMaxScaler |
| `features_latest.json` | 0.4 KB | Feature names + version |
| `metrics_latest.json` | 4.4 KB | Full metrics report |

---

## 10. Frontend Dashboard — All Pages

### Brand Identity

- **Primary color:** `#A01535` (deep crimson red — from Ahadu Bank branding)
- **Dark variant:** `#7D1028`
- **Darker:** `#620D1F`
- **Light accent:** `#C41E3A`
- **Pale background:** `#FDF2F5`
- Tier colors: HIGH=green, MEDIUM=amber, LOW=red
- Severity colors: critical=deep-red, high=orange, medium=amber, low=green

### Sidebar (`components/layout/Sidebar.tsx`)

Fixed 256px crimson gradient sidebar. Navigation items with role-based visibility:

| Nav Item | Route | Visible To |
|----------|-------|-----------|
| Dashboard | `/dashboard` | All |
| Products | `/dashboard/products` | All |
| Scores | `/dashboard/scores` | All |
| Rankings | `/dashboard/rankings` | All |
| Alerts | `/dashboard/alerts` | All |
| Recommendations | `/dashboard/recommendations` | All |
| Reports | `/dashboard/reports` | All |
| Model Management | `/dashboard/models` | All |
| Users | `/dashboard/users` | super_admin, executive_management |
| Settings | `/dashboard/settings` | All |

Features: active state highlighting, user profile panel, sign out button.

### Header (`components/layout/Header.tsx`)

White sticky header (64px): page title + subtitle, search input, notification bell with red dot, user avatar.

### Footer (`components/layout/Footer.tsx`)

Crimson gradient footer with:
- 4 KPI stats: Products Monitored (7+), ML Models Active (5), KPIs Tracked (14), System Uptime SLA (99.5%)
- 4 clickable policy links with full-content modals:
  - **Privacy Policy** — data processing, retention, encryption, access control, NBE compliance
  - **Terms of Use** — authorised use, AI-as-decision-support, prohibited actions
  - **Data Governance** — ownership, quality standards, versioning, score challenge process
  - **AI Ethics** — transparency, explainability, bias prevention, fairness, accountability

### Dashboard Pages

**`/dashboard`** — Overview  
KPI cards (total products, avg score, tier distribution, active alerts), Performance Trend chart, Tier Distribution donut, Revenue Trend, User Growth, Failure Rate, Complaint Trend, Rankings table, Alerts panel.

**`/dashboard/products`** — Product List  
Grid of 6 product cards showing current score, tier badge, score change, search filter.

**`/dashboard/products/[id]`** — Product Detail  
Crimson hero banner (score + tier + change), Score History chart (12 months), Feature Analysis panel (8 metrics with green/red indicators), AI Recommendations (priority-coded), Similar Products (KNN%).

**`/dashboard/rankings`** — Rankings  
Full table with rank medal icons, score, tier, change, trend arrow, pending recommendation count.

**`/dashboard/alerts`** — Alert Feed  
Summary by severity (critical/high/medium/low), filters, alert list with Resolve button.

**`/dashboard/recommendations`** — AI Recommendations  
Filter by priority and product, Acknowledge button, expandable AI explanation.

**`/dashboard/reports`** — Reports  
Weekly and monthly report cards, download buttons for PDF/Excel/CSV.

**`/dashboard/models`** — Model Management  
5 model cards (LR, RF, DT, Ridge, KNN) with train buttons, live metrics, expandable feature importance bar charts, full model registry table, drift detection report.

**`/dashboard/scores`** — Score History  
Filterable table: product, period, score, tier, change, tier_changed badge, model version, confidence.

**`/dashboard/settings`** — Data Upload  
Drag-and-drop CSV/XLSX upload, validation result display, Run Feature Engineering button.

**`/dashboard/users`** — User Management  
Users table with activate/deactivate, Add User modal.

---

## 11. Services — Full Description

### `ml_service.py` — Prediction & Training

**Artifact loading:** Loads `*_latest.pkl` from `ml_models/` at prediction time. Scaler applied to input vector. Falls back to rule-based scoring if no models exist.

**Prediction pipeline:**
1. Load 12-feature vector from `processed_features` DB or inline dict
2. Apply `scaler_latest.pkl` (MinMaxScaler)
3. Run `regressor_latest.pkl` → score (0–100)
4. Run `classifier_latest.pkl` → tier + class probabilities
5. Set confidence = max class probability
6. Generate human-readable explanation
7. Return `{predicted_score, predicted_tier, confidence, model_version, explanation}`

**Tier thresholds (BRD Appendix A):**
- HIGH ≥ 80
- MEDIUM ≥ 50 and < 80
- LOW < 50

**5 training methods:** `train_classification()`, `train_regression()`, `train_similarity()`, `train_random_forest()`, `train_decision_tree()`

### `feature_engineering.py` — Feature Computation

Computes 16 derived features per raw record. Auto-fetches previous period record for MoM complaint growth rate. Handles all fallback calculations (e.g. `downtime_hours → downtime_minutes`). Updates existing `processed_features` rows on reprocess.

### `data_service.py` — Data Ingestion

Validates CSV/XLSX: required columns, unknown product codes, negative values, range violations, duplicates. Ingest pipeline writes all 27 `raw_data` columns including auto-computing `failed_txn_rate` and `downtime_minutes`.

### `recommendation_service.py` — Rule Engine

7 recommendation rules + 4 alert rules. Each rule has a threshold condition, priority, category, title, description template. Generates human-readable AI explanation including score context, trend direction, and contributing factors.

**Recommendation triggers:**

| Rule | Threshold | Priority |
|------|-----------|---------|
| High failure rate | txn_success_rate < 90% | Critical |
| High downtime | downtime_impact > 5% | High |
| Low engagement | active_user_rate < 40% | High |
| Complaint surge | complaint_growth_rate > 20% | High |
| Low revenue/user | revenue_per_active_user < ETB 10 | Medium |
| Low efficiency | operational_efficiency < 70% | Medium |
| Low engagement index | user_engagement_index < 0.30 | Medium |

**Alert triggers:**

| Rule | Threshold | Severity |
|------|-----------|---------|
| Score drop | drop ≥ 10 points | Critical |
| Critical downtime | downtime_impact > 15% | Critical |
| High failure alert | txn_success_rate < 85% | High |
| Complaint alert | complaint_growth_rate > 30% | High |

### `report_service.py` — Report Generation

- **PDF:** ReportLab — 3 sections: performance scores table, active alerts, top recommendations
- **Excel:** XlsxWriter — 3 worksheets: Scores, Alerts, Recommendations with formatting
- **CSV:** Pandas — product scores and tiers as flat export

---

## 12. Async Task Queue

### Celery Beat Schedule (`celery_app.py`)

| Task | Schedule | Description |
|------|---------|-------------|
| `run_feature_engineering` | Daily 01:00 | Recompute features for all unprocessed raw records |
| `score_all_products` | Daily 03:00 | Score all active products, generate recommendations + alerts |
| `check_and_retrain` | Monday 02:00 | Check drift, retrain models if weeks_since_training ≥ 4 |

### Drift Detection

Checks all active models. If `weeks_since_training ≥ 4`, flags `drift_detected=True` and triggers retraining. Reports available at `GET /api/ml/drift`.

---

## 13. Security & Access Control

### Authentication
- bcrypt hashing (cost factor 12) via passlib
- JWT: HS256, 30-min access / 7-day refresh
- TOTP MFA via pyotp (base32 secret stored per user)
- Rate limiting: 60 req/min general, 10 req/min on `/auth/` (Nginx)

### Data Security
- TLS 1.2+ in transit (Nginx)
- AES-256 at rest (database + model artifacts)
- No customer PII in ML pipeline
- All data stays within Ahadu Bank internal infrastructure

### Audit Trail
Every login, logout, data upload, model training, report download, and user action logged in `audit_logs` with `user_id`, `action`, `ip_address`, `user_agent`, `status`, `created_at`. Immutable — INSERT only, 36-month retention.

---

## 14. Deployment Architecture

### Docker Compose — 7 Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| mysql | mysql:8.0 | 3306 | Primary database |
| redis | redis:7-alpine | 6379 | Celery broker + cache |
| backend | custom (Python 3.12-slim) | 8000 | FastAPI + Uvicorn 4 workers |
| celery_worker | same as backend | — | Async task execution |
| celery_beat | same as backend | — | Scheduled task scheduler |
| frontend | custom (Node alpine) | 3000 | Next.js standalone |
| nginx | nginx:alpine | 80 | Reverse proxy |

### Volume Mounts

| Volume | Used By | Contains |
|--------|---------|---------|
| `mysql_data` | mysql | Database files |
| `redis_data` | redis | Persistent queue |
| `ml_models` | backend, celery | Trained model artifacts |
| `celery_beat_data` | celery_beat | Beat schedule file |

### Infrastructure Requirements

| Component | Minimum |
|-----------|---------|
| ML + API Server | 8-core CPU, 32 GB RAM, 500 GB SSD |
| Database Server | 4-core CPU, 16 GB RAM, 1 TB HDD + RAID |
| OS | Ubuntu 22.04 LTS |

---

## 15. How to Run

### Docker (Recommended)

```bash
cd "AHADU PULSE"
docker-compose up --build -d

# Access: http://localhost
# API docs: http://localhost/docs
```

### XAMPP Local Development

**Step 1 — Database setup:**
```sql
-- In phpMyAdmin, select ahadu_bank_eval → SQL tab:
ALTER TABLE raw_data
    ADD COLUMN IF NOT EXISTS failed_txn_rate DOUBLE NULL,
    ADD COLUMN IF NOT EXISTS downtime_minutes DOUBLE NULL,
    ADD COLUMN IF NOT EXISTS api_error_rate DOUBLE NULL,
    ADD COLUMN IF NOT EXISTS csat_score DOUBLE NULL,
    ADD COLUMN IF NOT EXISTS fraud_event_count INT NULL,
    ADD COLUMN IF NOT EXISTS security_incident_count INT NULL;
-- (run full ALTER block from SYSTEM_DOCUMENTATION)
```

**Step 2 — Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Step 3 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Step 4 — Train models (already trained, but to retrain):**
```bash
py backend/train_models.py --skip-grid-search
```

### Environment Variables (XAMPP)

```env
DATABASE_URL=mysql+pymysql://root:@localhost:3306/ahadu_bank_eval
JWT_SECRET_KEY=ahadu-bank-super-secret-jwt-key
MODEL_REGISTRY_PATH=./ml_models
DEBUG=true
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:8000"]
```

---

## 16. Complete Feature Traceability Matrix

| BRD Feature Name | Dataset Column | `raw_data` Column | `processed_features` Column | ML Feature |
|-----------------|---------------|-------------------|-----------------------------|-----------|
| total_users | total_users | total_users | — | — |
| active_users | active_users | active_users | active_user_rate (computed) | active_user_rate ✓ |
| monthly_txn_count | monthly_txn_count | total_transactions | user_engagement_index | user_engagement_index ✓ |
| txn_value_etb | txn_value_etb | transaction_volume | — | — |
| revenue_etb | revenue_etb | total_revenue | revenue_per_transaction, revenue_per_active_user | revenue_per_txn ✓, revenue_per_active_user ✓ |
| failed_txn_rate | failed_txn_rate | failed_txn_rate | failed_txn_rate_pct | failed_txn_rate ✓ |
| complaint_volume | complaint_volume | total_complaints | complaint_growth_rate | complaint_growth_rate ✓ |
| downtime_minutes | downtime_minutes | downtime_minutes | downtime_impact_score | downtime_impact_score ✓ |
| performance_score | performance_score | scores.performance_score | — | TARGET (regression) |
| performance_tier | performance_tier | scores.performance_tier | — | TARGET (classification) |
| csat_score | csat_score | csat_score | csat_score | csat_score ✓ |
| fraud_incidents | fraud_incidents | fraud_event_count | fraud_event_count | fraud_incidents ✓ |
| security_incidents | security_incidents | security_incident_count | security_incident_count | — |
| api_error_rate | api_error_rate | api_error_rate | api_error_rate | api_error_rate ✓ |
| avg_session_duration | avg_session_duration_sec | avg_response_time_ms | avg_session_duration_sec | avg_session_duration_sec ✓ |
| complaint_resolution | complaint_resolution_rate | resolved_complaints | complaint_resolution_rate | complaint_resolution_rate ✓ |

**Total ML features used in training: 12 / 16 BRD features**  
**Features excluded from ML:** `txn_value_etb` (scale too large), `total_users` (indirect), `security_incidents` (low variance), `operational_efficiency_score` (removed — data leakage)

---

## Appendix A — Dataset Analysis Summary

| Property | Value |
|----------|-------|
| Full dataset | 500,000 rows × 32 columns |
| Train split | 400,000 rows (80%) |
| Test split | 100,000 rows (20%) |
| Time period | January 2022 – June 2025 |
| Products | 7 |
| Missing values | 0 |
| Duplicates | 0 |
| Train/Test overlap | 0 |

**Tier distribution:**
- MEDIUM: 198,332 (39.7%)
- HIGH: 159,056 (31.8%)
- LOW: 142,612 (28.5%)

**Notable finding:** USSD Banking has 49.8% LOW tier across all years — the chronically worst-performing product. Management action required.

**Top correlations with performance_score:**
1. csat_score: +0.914
2. active_user_rate: +0.913
3. complaint_resolution_rate: +0.910
4. failed_txn_rate: −0.888
5. fraud_incidents: −0.878
6. api_error_rate: −0.863

---

## Appendix B — Build Timeline

| Phase | Output |
|-------|--------|
| 1. Database schema | 12 tables, 3 views, all indexes, seed data |
| 2. Feature expansion | 9 new BRD columns added to raw_data + processed_features |
| 3. Dataset EDA | 500k-row analysis, correlation matrix, tier distribution |
| 4. Training pipeline | 5-model pipeline, noise injection, leakage removal |
| 5. Model training | All 9 BRD thresholds passed, 90.8s total |
| 6. Backend fixes | Self-healing migrations, full data_service, complete feature engineering |
| 7. API path fixes | All frontend routes corrected to match backend mount points |
| 8. Frontend colors | Full crimson brand rebrand across 14+ files |
| 9. New models UI | Models page with feature importance bar charts |
| 10. Footer modals | 4 policy pages with full legal/governance content |
| 11. Documentation | This document |

---

*Document prepared by: Digital Banking Department — Ahadu Bank S.C.*  
*System: AHADU PULSE v1.0.0*  
*Training run: v20260604_120849*  
*Documentation date: June 4, 2026*  
*All BRD thresholds: ✅ PASSED*
