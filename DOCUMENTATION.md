# Ahadu Bank — Digital Channels Performance Evaluation Platform
## Comprehensive Technical Documentation

**Version:** 1.0.0
**Date:** June 2026
**Repository:** GitHub (version-controlled)
**Prepared by:** Platform Engineering Team

---

## Table of Contents

1. [BRD & SRS — Business + System Requirements](#1-brd--srs)
2. [System Architecture](#2-system-architecture)
3. [Model & Data Management](#3-model--data-management)
4. [Operational Documentation](#4-operational-documentation)
5. [Security, Compliance & Governance](#5-security-compliance--governance)

---

# 1. BRD & SRS

## 1.1 Business Requirements Document (BRD)

### Business Goals

Ahadu Bank operates multiple digital channels — Mobile Banking, Internet Banking, USSD, ATM Network, Agent Banking, and the Corporate Portal. Monitoring performance across these channels manually is fragmented, delayed, and inconsistent. The platform was built to:

- Provide a **single source of truth** for digital channel performance
- Replace manual reporting with **automated ML-powered evaluation**
- Enable proactive decisions by surfacing channels needing intervention
- Rank channels objectively using a **data-driven scoring framework**
- Support strategic planning with trend analysis and predictive insights

### Use Cases

| # | Actor | Use Case |
|---|-------|----------|
| UC-01 | Analyst | Upload monthly channel metrics CSV and trigger feature engineering |
| UC-02 | Analyst | Train an XGBoost / Random Forest / Gradient Boosting model |
| UC-03 | Analyst | Run predictions on a processed dataset and view tier classifications |
| UC-04 | Viewer | Browse the channel ranking leaderboard and compare performance |
| UC-05 | Viewer | Download the AI-generated Smart Report as Markdown |
| UC-06 | Admin | Create and manage platform users with role-based access |
| UC-07 | Admin | Review audit log of all uploads, training events, and logins |
| UC-08 | All | Toggle dark / light UI theme; view live KPI dashboard |

### Target Users

| Role | Description | Permissions |
|------|-------------|-------------|
| **Admin** | IT/System administrator | Full access — user management, audit log, all features |
| **Analyst** | Business/data analyst | Upload data, train models, run predictions, export reports |
| **Viewer** | Executive / branch manager | Read-only dashboard, rankings, predictions, smart report |

### KPIs / Success Metrics

| KPI | Target |
|----|--------|
| Model accuracy on test set | ≥ 85% |
| Prediction latency (API) | < 2 seconds |
| Dashboard load time | < 3 seconds |
| Data processing time (1,000 rows) | < 30 seconds |
| System uptime | 99.5% |
| Audit trail completeness | 100% of write operations logged |

---

## 1.2 Software Requirements Specification (SRS)

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | System shall accept CSV, Excel (.xlsx), and JSON file uploads |
| FR-02 | System shall validate uploaded data for required columns before processing |
| FR-03 | System shall engineer 14 features from 10 raw input columns automatically |
| FR-04 | System shall support training XGBoost, Random Forest, and Gradient Boosting models |
| FR-05 | System shall classify each channel-date record into one of four tiers: Excellent, Good, Average, Poor |
| FR-06 | System shall rank all channels by composite score and display a leaderboard |
| FR-07 | System shall generate a narrative Smart Report with top/bottom performers and recommendations |
| FR-08 | System shall export predictions as CSV with id, product_id, date, label, score, and confidence |
| FR-09 | System shall provide paginated audit log of all platform events |
| FR-10 | System shall auto-watch the raw data folder and process new files when `WATCH_DATA_FOLDER=true` |
| FR-11 | System shall support dark and light UI themes, persisted per user in localStorage |
| FR-12 | System shall enforce role-based access control on all API endpoints |
| FR-13 | System shall auto-seed a default admin account on first startup |

### Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | API response time < 500ms for read endpoints under normal load |
| NFR-02 | Scalability | Stateless backend allows horizontal scaling behind a load balancer |
| NFR-03 | Reliability | Auto-reload on code change (dev); graceful error handling in all endpoints |
| NFR-04 | Security | All passwords hashed with bcrypt (cost factor 12); JWT tokens expire in 8 hours |
| NFR-05 | Usability | Responsive UI works on desktop and tablet; mobile drawer navigation |
| NFR-06 | Maintainability | All foreign key cascades handled explicitly; no orphan records |
| NFR-07 | Portability | Fully containerised with Docker Compose; runs on Windows, Linux, macOS |
| NFR-08 | Observability | All write operations recorded in audit log; backend structured logging |

---

# 2. System Architecture

## 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Browser                           │
│              React 18 + Vite + MUI v5 + Recharts               │
│                     http://localhost:5173                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP / REST (JSON)
                            │ Vite dev proxy → :8000
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                             │
│              Python 3.11+ · Uvicorn ASGI server                │
│                     http://localhost:8000                        │
│                                                                 │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌────────────┐  │
│  │   Auth   │  │  Upload   │  │  ML/Train  │  │  Analytics │  │
│  │  /auth   │  │  /upload  │  │    /ml     │  │ /analytics │  │
│  └──────────┘  └───────────┘  └────────────┘  └────────────┘  │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐                   │
│  │  Users   │  │ Dashboard │  │   Report   │                   │
│  │  /users  │  │/dashboard │  │  /report   │                   │
│  └──────────┘  └───────────┘  └────────────┘                   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Core ML & Feature Engineering                │  │
│  │   FeatureEngineer · MLPipeline · assign_performance_tier  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────────┐    ┌──────────────────────────────┐    │
│  │  Background Tasks  │    │       File Watcher           │    │
│  │  (feature eng,     │    │  watchdog · daemon thread    │    │
│  │   model training)  │    │  monitors data/raw/          │    │
│  └────────────────────┘    └──────────────────────────────┘    │
└─────────────────────┬───────────────────────┬───────────────────┘
                      │ SQLAlchemy 2           │ joblib / pickle
                      ▼                        ▼
┌──────────────────────────┐   ┌───────────────────────────────┐
│   MySQL / MariaDB        │   │   File System                 │
│   digital_channels_db   │   │   data/raw/        (uploads)  │
│                          │   │   data/processed/  (features) │
│   users                  │   │   data/models/     (pkl)      │
│   datasets               │   │   data/validation/ (reports) │
│   channel_metrics        │   └───────────────────────────────┘
│   ml_models              │
│   predictions            │
└──────────────────────────┘
```

## 2.2 Server Infrastructure

| Component | Technology | Port | Notes |
|-----------|-----------|------|-------|
| Frontend (dev) | Vite dev server | 5173 | Hot module replacement |
| Frontend (prod) | Nginx | 3000 | SPA routing, reverse proxy |
| Backend | Uvicorn / FastAPI | 8000 | ASGI, `--reload` in dev |
| Database | MySQL / MariaDB | 3307 (XAMPP) / 3306 (Docker) | utf8mb4 charset |

## 2.3 Multi-tenancy

Current version is **single-tenant** — one bank, one database instance. The role system (Admin / Analyst / Viewer) provides access control within the tenant. Multi-tenancy can be added by introducing a `tenant_id` foreign key on all entity tables.

## 2.4 Integration Points

| Integration | Method | Direction |
|-------------|--------|-----------|
| File upload | Multipart HTTP POST | Client → Backend |
| Model artifacts | Local filesystem (joblib pkl) | Backend → Disk |
| Raw data folder watch | OS filesystem events (watchdog) | Disk → Backend |
| Frontend → API | Axios with JWT Bearer token | Frontend → Backend |
| Report download | Streaming HTTP response | Backend → Client |

## 2.5 Scalability & Availability

- **Backend** is stateless — sessions stored in JWT, not server memory. Horizontal scaling is supported by placing multiple Uvicorn instances behind a load balancer (e.g. Nginx upstream).
- **ML training** runs in FastAPI `BackgroundTasks` — long-running jobs do not block the API.
- **File watcher** runs as a daemon thread inside the application process.
- **Database** uses connection pooling via SQLAlchemy. For high load, migrate to a managed RDS or PlanetScale instance.
- **Docker Compose** definition supports adding replicas for the backend service.

---

# 3. Model & Data Management

## 3.1 Data Management

### Data Sources

Data is sourced from Ahadu Bank's internal operational systems and uploaded manually (or auto-watched) as flat files.

| Source | Format | Frequency |
|--------|--------|-----------|
| Core Banking System exports | CSV / Excel | Monthly |
| Channel operations reports | CSV / JSON | Weekly |
| Manual uploads via UI | CSV / Excel / JSON | On demand |
| Auto-watched folder (`data/raw/`) | CSV / Excel / JSON | Real-time |

### Data Schema (Raw Input)

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `product_id` | string | ✅ | Channel identifier (e.g. MOBILE_BANKING, USSD_SERVICE) |
| `metric_date` | date (YYYY-MM-DD) | ✅ | Measurement date |
| `total_users` | float | ✅ | Total registered users |
| `active_users` | float | ✅ | Monthly active users |
| `transaction_count` | float | ✅ | Number of transactions |
| `transaction_value` | float | ✅ | Total transaction value (ETB) |
| `revenue` | float | ✅ | Revenue generated (ETB) |
| `failed_transactions` | float | ✅ | Failed transaction count |
| `complaints` | float | ✅ | Customer complaints received |
| `downtime_minutes` | float | ✅ | System downtime in minutes |
| `fraud_incidents` | float | ❌ optional | Fraud incidents (default 0) |

### Data Preprocessing

The `FeatureEngineer` class performs these transformations in order:

1. **Load** — reads CSV / Excel / JSON via pandas
2. **Validate** — checks required columns, empty data, null dates
3. **Sort** — by `product_id` + `metric_date` for correct rolling calculations
4. **Engineer features** — 14 derived columns (see section 3.4)
5. **Fill NaNs** — growth rates → 0, retention → 100, user ratio → 0
6. **Cap outliers** — `failure_rate`, `fraud_rate`, `operational_risk_score` clipped at 99th percentile
7. **Save** — processed CSV to `data/processed/`, validation JSON to `data/validation/`

### Data Storage & Governance

| Layer | Storage | Contents |
|-------|---------|----------|
| Raw files | `data/raw/` | Original uploaded files, timestamped |
| Processed files | `data/processed/` | Feature-engineered CSVs |
| Validation reports | `data/validation/` | JSON quality reports per file |
| Model artifacts | `data/models/{name}/` | `model.pkl`, `scaler.pkl`, `label_encoder.pkl` |
| Metadata | MySQL `datasets` table | File info, status, row/column counts |
| Metrics | MySQL `channel_metrics` table | Per-row engineered features |
| Predictions | MySQL `predictions` table | Label, score, confidence per row |

---

## 3.2 Exploratory Data Analysis (EDA)

### Data Insights

Based on the 8-channel, 1,095-row sample dataset:

- **8 digital channels**: Mobile Banking, Internet Banking, USSD Service, ATM Network, Agent Banking, Corporate Portal, POS Network, E-Commerce Gateway
- **Date range**: ~2.5 years of daily metrics (2023–2025)
- **Tier distribution**: Approximately 25% Excellent, 35% Good, 28% Average, 12% Poor across channels

### Feature Analysis

Top predictive features (by XGBoost feature importance):

1. `operational_risk_score` — composite of failure rate, downtime, and fraud (highest weight)
2. `revenue_growth_rate` — month-over-month revenue change
3. `active_user_ratio` — active users as % of total users
4. `fraud_rate` — fraud incidents per 100,000 transactions
5. `uptime_percentage` — system availability

### Data Quality Checks

The validation pipeline checks for:
- Missing required columns → **error** (blocks processing)
- Empty dataset → **error**
- Null dates → **warning**
- Missing values per column → **reported** (filled during engineering)
- Outlier values → **capped** at 99th percentile

---

## 3.3 Model Development

### Training Process

1. Load processed CSV from `data/processed/`
2. Select 14 feature columns (drop rows with all-NaN features)
3. Derive target labels using `assign_performance_tier()` scoring function
4. Encode labels with `LabelEncoder`
5. Scale features with `StandardScaler`
6. Split 80% train / 20% test (stratified by tier)
7. Train chosen algorithm
8. Evaluate on test set
9. Extract feature importances
10. Save `model.pkl`, `scaler.pkl`, `label_encoder.pkl` to `data/models/{name}/`

### Algorithms

| Algorithm | Library | Key Hyperparameters |
|-----------|---------|---------------------|
| XGBoost | xgboost | n_estimators=200, max_depth=6, learning_rate=0.1, eval_metric=mlogloss |
| Random Forest | scikit-learn | n_estimators=200, max_depth=10, n_jobs=-1 |
| Gradient Boosting | scikit-learn | n_estimators=150, max_depth=5, learning_rate=0.1 |

All models use `random_state=42` for reproducibility.

### Engineered Features (14 total)

| Feature | Formula | Category |
|---------|---------|----------|
| `user_growth_rate` | `pct_change(total_users) × 100` | Growth |
| `transaction_growth_rate` | `pct_change(transaction_count) × 100` | Growth |
| `revenue_growth_rate` | `pct_change(revenue) × 100` | Growth |
| `failure_rate` | `failed_transactions / transaction_count × 100` | Operations |
| `complaints_per_1000_users` | `complaints / total_users × 1000` | Operations |
| `uptime_percentage` | `100 − (downtime_minutes / 1440 × 100)` | Operations |
| `active_user_ratio` | `active_users / total_users × 100` | Adoption |
| `retention_rate` | `prev_active_users / current_active_users × 100` | Adoption |
| `revenue_per_user` | `revenue / total_users` | Financial |
| `transaction_value_per_user` | `transaction_value / active_users` | Financial |
| `transaction_volume_7d_avg` | 7-day rolling mean of `transaction_count` | Rolling |
| `revenue_7d_avg` | 7-day rolling mean of `revenue` | Rolling |
| `fraud_rate` | `fraud_incidents / transaction_count × 100,000` | Risk |
| `operational_risk_score` | `failure_rate × 0.4 + downtime × 0.3 + fraud_rate × 0.3` | Risk |

### Performance Tier Scoring Formula

```
score = (active_user_ratio / 100) × 0.25
      + (uptime_percentage / 100) × 0.20
      + (1 − failure_rate / 100) × 0.20
      + (revenue_growth_rate + 50) / 150 × 0.15
      + (1 − operational_risk_score / 100) × 0.20

Tier assignment:
  score ≥ 0.75 → Excellent  (numeric score: 100)
  score ≥ 0.55 → Good       (numeric score: 75)
  score ≥ 0.35 → Average    (numeric score: 45)
  score  < 0.35 → Poor      (numeric score: 15)
```

---

## 3.4 Model Evaluation

### Metrics

| Metric | Description | Reported as |
|--------|-------------|-------------|
| Accuracy | Correct predictions / total | % (e.g. 91.2%) |
| Precision (weighted) | TP / (TP + FP) averaged by class weight | % |
| Recall (weighted) | TP / (TP + FN) averaged by class weight | % |
| F1 Score (weighted) | Harmonic mean of precision & recall | % |

All metrics computed on the 20% held-out test set.

### Validation Results (Sample Dataset)

| Model | Accuracy | F1 Score | Precision | Recall |
|-------|----------|----------|-----------|--------|
| XGBoost | ~92% | ~91% | ~92% | ~91% |
| Random Forest | ~90% | ~89% | ~90% | ~89% |
| Gradient Boosting | ~89% | ~88% | ~89% | ~88% |

*Results vary per dataset. Retrain on latest data for current metrics.*

### Bias / Fairness Checks

- The scoring formula applies identical weights to all channels — no channel-specific biases in labelling
- Class imbalance is handled via stratified train/test split
- `zero_division=0` prevents division errors on unseen classes in test set
- Feature importance is reviewed per model to detect spurious correlations

---

## 3.5 Model Versioning

### Tracking Updates

Each trained model is stored in a timestamped directory:
```
data/models/xgboost_20260528_143022/
    model.pkl
    scaler.pkl
    label_encoder.pkl
```

The database `ml_models` table records:
- Model name, type, status, training parameters
- Accuracy, F1, precision, recall scores
- Feature importance dictionary
- Link to the dataset used for training (`trained_on_dataset_id`)
- Created/updated timestamps

### Model Registry

All models are listed in the Model Training page with full metrics. Analysts can:
- Compare multiple models side-by-side (Model Comparison dashboard)
- Add notes to any model via the API
- Delete obsolete models (cascade-deletes all associated predictions)
- Select any ready model for running new predictions

---

# 4. Operational Documentation

## 4.1 API Documentation

### Base URL
```
http://localhost:8000/api/v1
```

### Authentication

All protected endpoints require a JWT Bearer token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

Obtain a token:
```http
POST /api/v1/auth/login/json
Content-Type: application/json

{ "email": "user@bank.com", "password": "yourpassword" }
```

Response:
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "user": { "id": 1, "email": "...", "role": "admin" }
}
```

Token expiry: **8 hours**. Expired tokens trigger a 401 response and automatic redirect to login.

### Key Endpoints

#### Upload Dataset
```http
POST /api/v1/upload/dataset
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
auto_process: true
```
Response: `{ "dataset_id": 5, "status": "processing", "size_kb": 142.3 }`

#### Train Model
```http
POST /api/v1/ml/train
Authorization: Bearer <token>
Content-Type: application/json

{ "dataset_id": 5, "model_type": "xgboost", "target": "performance_tier" }
```
Response: `{ "model_id": 3, "status": "training", "message": "..." }`

#### Run Predictions
```http
POST /api/v1/ml/predict/{model_id}/{dataset_id}
Authorization: Bearer <token>
```
Response: `{ "predictions": [...], "total": 1095, "model_id": 3 }`

#### Export Predictions CSV
```http
GET /api/v1/analytics/export/predictions/{model_id}
Authorization: Bearer <token>
```
Returns a downloadable CSV with columns: `id, product_id, metric_date, prediction_label, performance_score, confidence_pct`

#### Audit Log (paginated)
```http
GET /api/v1/analytics/audit-log?page=1&page_size=20&action_filter=model
Authorization: Bearer <token>
```
Response: `{ "events": [...], "total": 87, "page": 1, "total_pages": 5 }`

Full endpoint reference: **http://localhost:8000/docs** (Swagger UI, auto-generated)

---

## 4.2 Deployment Guide

### Local Development

**Prerequisites:** Python 3.11+, Node.js 18+, MySQL/MariaDB

```cmd
# 1. Create database
mysql -u root -e "CREATE DATABASE digital_channels_db CHARACTER SET utf8mb4;"

# 2. Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. Frontend
cd frontend
npm install
npm run dev
```

One-click: double-click **`start.bat`** in the project root.

### Docker Deployment

```cmd
docker-compose up --build
```

Services started:
- `db` — MariaDB on port 3306
- `backend` — FastAPI on port 8000
- `frontend` — Nginx serving React build on port 3000

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `mysql+pymysql://root:@127.0.0.1:3307/digital_channels_db` | MySQL connection string |
| `SECRET_KEY` | `change-me-in-production` | JWT signing secret — **must change in production** |
| `ALLOWED_ORIGINS` | `["http://localhost:5173"]` | CORS origins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | JWT expiry (8 hours) |
| `WATCH_DATA_FOLDER` | `true` | Enable auto file watcher |
| `SCAN_INTERVAL_SECONDS` | `30` | Watcher polling interval |

### CI/CD Pipeline (Recommended)

```
Push to main branch
    → GitHub Actions: run tests, build Docker image
    → Push image to container registry
    → Deploy to server via SSH / docker-compose pull + up
```

No CI/CD is currently configured — manual deployment is used.

---

## 4.3 MLOps Guide

### Model Deployment Workflow

```
1. Upload dataset (CSV/Excel/JSON)
        ↓
2. Feature engineering runs automatically (background task)
        ↓
3. Analyst selects processed dataset → chooses algorithm → clicks Train
        ↓
4. Training runs in background (MLPipeline.train())
        ↓
5. Model artifacts saved to data/models/{name}/
        ↓
6. Model status → "ready" in database
        ↓
7. Analyst runs predictions → results stored in DB
        ↓
8. Dashboard, rankings, and smart report refresh automatically
```

### Monitoring & Logging

| What | Where | How |
|------|-------|-----|
| Backend request logs | Uvicorn stdout | INFO level, every request logged |
| Training events | `ml_models` table | Status transitions: training → ready / failed |
| Upload events | `datasets` table | Status: pending → processing → completed / failed |
| User logins | `users.last_login` | Updated on every successful login |
| Audit events | `/api/v1/analytics/audit-log` | Aggregated from datasets, models, users |

### Retraining Pipeline

Models should be retrained when:
- New monthly data is uploaded (recommended cadence: monthly)
- Accuracy drops below 85% on recent data
- A new channel is introduced to the system

Steps:
1. Upload new dataset via Data Management page
2. Wait for feature engineering to complete (status: Completed)
3. Go to Model Training → select new dataset → train
4. Compare new model vs previous in Model Comparison dashboard
5. Use new model for predictions if metrics improved

---

## 4.4 User Manual

### Workflow for Analysts

1. **Login** at `http://localhost:5173` with your Analyst credentials
2. **Upload data** — go to Data Management → drag & drop your CSV file
3. **Wait** for the status to change from "Processing" to "Completed" (auto-polls every 5 seconds)
4. **Train model** — go to Model Training → select dataset → choose algorithm → click Train
5. **Run predictions** — go to Predictions → select model + dataset → click Run Predictions
6. **Explore results** — filter by tier, search by channel, export as CSV
7. **View rankings** — go to Channel Ranking to see the leaderboard
8. **Read report** — go to Smart Report → select model → view AI narrative → download .md

### Workflow for Viewers

1. Login → go to **Dashboard** for KPI overview
2. Go to **Channel Ranking** to see which channels are performing well or poorly
3. Go to **Smart Report** to read the executive narrative
4. Go to **Analytics** to explore confusion matrix, data profile, and channel trends

### Developer Integration

The backend exposes a full REST API at `http://localhost:8000`. Use the Swagger UI at `/docs` for interactive testing. All endpoints return JSON. Authentication uses standard Bearer token pattern — integrate with any HTTP client.

---

## 4.5 Maintenance Plan

### Regular Updates

| Task | Frequency | Who |
|------|-----------|-----|
| Upload new channel data | Monthly | Analyst |
| Retrain models | Monthly or on data change | Analyst |
| Review audit log for anomalies | Weekly | Admin |
| Rotate `SECRET_KEY` | Quarterly | Admin/IT |
| Update Python dependencies | Quarterly | Developer |
| Update Node.js dependencies | Quarterly | Developer |

### Issue Handling

| Issue | Resolution |
|-------|------------|
| Dataset upload fails | Check column names match required schema; view validation report in Data Management |
| Model training stuck | Check backend logs; delete failed model and retrain |
| 500 error on delete | Ensure backend is running latest code (check if uvicorn reloaded after code change) |
| Login fails | Reset password via Python script or phpMyAdmin (see README) |
| Predictions empty | Ensure dataset status is "Completed" before running predictions |
| Backend crash on startup | Check `DATABASE_URL` in `.env`; ensure MySQL is running |

### Model Retraining Schedule

- **Trigger-based**: retrain immediately when new data covering a new time period is uploaded
- **Scheduled**: at minimum, retrain once per quarter with the latest 12 months of data
- **Performance-based**: retrain if accuracy on a validation holdout drops below 82%

---

# 5. Security, Compliance & Governance

## 5.1 Security

### Encryption

| Data | Encryption | Details |
|------|-----------|---------|
| Passwords at rest | bcrypt (cost 12) | Hashed before storage; plaintext never stored |
| JWT tokens | HMAC-SHA256 | Signed with `SECRET_KEY`; 8-hour expiry |
| Data in transit (dev) | HTTP (plaintext) | **Must use HTTPS/TLS in production** |
| Data in transit (prod) | TLS 1.2+ via Nginx | Configure SSL certificate on Nginx proxy |
| Database | MySQL at-rest encryption | Optional; configure at DB layer |

### Access Control

Role-based access control is enforced on every API endpoint via FastAPI dependencies:

| Dependency | Restriction |
|-----------|-------------|
| `get_current_user` | Requires valid JWT token (all authenticated users) |
| `require_analyst` | Requires role = analyst or admin |
| `require_admin` | Requires role = admin only |

Additional controls:
- Users cannot delete their own account
- Password reset for other users requires admin role
- Passwords must be minimum 8 characters (validated in both frontend and backend)

### API Security

- **CORS**: configured via `ALLOWED_ORIGINS` — only whitelisted origins can send requests
- **Input validation**: all request bodies validated by Pydantic schemas before processing
- **SQL injection prevention**: all DB queries use SQLAlchemy ORM with parameterised statements
- **Password in URL**: the `reset-password` endpoint accepts password in JSON body, not query string
- **Rate limiting**: not currently implemented — recommended for production (e.g. `slowapi`)

---

## 5.2 Compliance

### Data Privacy

| Principle | Implementation |
|-----------|---------------|
| Data minimisation | Only channel performance metrics are collected — no personal user data from bank customers |
| Access control | Role-based access limits who can view, upload, and export data |
| Data retention | No automated retention policy — datasets and predictions persist until manually deleted |
| Audit trail | All write operations (uploads, training, logins, deletes) are logged with timestamp and actor |
| Export controls | CSV exports are available only to authenticated users |

### Data Handling Policies

- Uploaded files are stored on the server filesystem with timestamped filenames
- Processed feature files are retained for model retraining purposes
- Prediction data is stored in the database and linked to the source dataset and model
- Deleting a dataset cascades to delete all related predictions and channel metrics
- No data is transmitted to external third-party services

### Ethiopia-Specific Compliance

- Ahadu Bank operates under **National Bank of Ethiopia (NBE)** regulations
- Digital channel performance data is internal operational data and is not subject to customer data privacy laws (GDPR/PDPB) as it contains no PII
- Any future integration with customer-level data would require a Data Protection Impact Assessment (DPIA)

---

## 5.3 AI Governance

### Ethics — Bias & Fairness

| Concern | Mitigation |
|---------|-----------|
| Channel bias in scoring | All channels use identical scoring formula with no channel-specific adjustments |
| Temporal bias | Models trained on historical data may not reflect structural changes — retrain regularly |
| Feature bias | Features derived from operational data only — no demographic or geographic attributes |
| Class imbalance | Stratified train/test split ensures all tiers are represented proportionally |

### Explainability

- **Feature importance** is extracted from every trained model and displayed in the Model Detail drawer
- The **performance tier scoring formula** is documented and transparent — stakeholders can verify how each tier is assigned
- The **Smart Report** narrative explains which channels are top/bottom performers and why in plain language
- The **Confusion Matrix** in the Analytics page shows model error patterns per tier

### Responsible AI Usage

| Principle | Implementation |
|-----------|---------------|
| Human oversight | Analysts review predictions before acting; no automated actions are taken based on model output |
| Transparency | All model metrics (accuracy, F1, precision, recall) are visible to all users |
| Auditability | Full audit log of all model training, predictions, and user actions |
| No automated decisions | The platform provides insights and rankings — final decisions remain with human operators |
| Model provenance | Every prediction is linked to the model and dataset used to generate it |

---

## Version Control

This platform is managed with **Git** and hosted on **GitHub**.

### Repository Structure
```
ahadu_digital_performance_model/
├── backend/                  # FastAPI application
│   ├── app/                  # Core application code
│   │   ├── api/v1/           # Route handlers
│   │   ├── core/             # ML pipeline, feature engineering, security
│   │   └── models.py         # Database models
│   ├── scripts/              # Utility scripts
│   ├── alembic/              # Database migrations
│   └── requirements.txt
├── frontend/                 # React application
│   └── src/
│       ├── pages/            # UI pages
│       ├── components/       # Shared components
│       ├── context/          # Theme, Auth, Toast contexts
│       └── api/              # Axios config and endpoints
├── docker-compose.yml
├── start.bat
├── README.md
└── DOCUMENTATION.md          # This file
```

### Branching Strategy (Recommended)

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `develop` | Integration branch |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `release/*` | Release preparation |

### Commit Convention

```
feat: add pagination to audit log
fix: resolve FK constraint on dataset delete
docs: update API endpoint table in README
refactor: replace inline alerts with toast notifications
```

---

*Document maintained in the project repository. Update after each significant feature release or architecture change.*
