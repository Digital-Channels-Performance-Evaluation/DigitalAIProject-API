# Ahadu Bank — Digital Channel Performance Evaluation Platform
## Complete Technical Documentation

**Version:** 1.0.0  
**Stack:** FastAPI · SQLAlchemy · MySQL · React 18 · MUI v5 · Recharts · XGBoost / Random Forest / Gradient Boosting  
**Last Updated:** June 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Backend — Setup & Configuration](#4-backend--setup--configuration)
5. [Database Models](#5-database-models)
6. [API Reference](#6-api-reference)
7. [ML Pipeline](#7-ml-pipeline)
8. [Feature Engineering](#8-feature-engineering)
9. [Frontend — Application](#9-frontend--application)
10. [Pages & Components](#10-pages--components)
11. [Context Providers](#11-context-providers)
12. [Tier Classification Rules](#12-tier-classification-rules)
13. [Data Format — Production Dataset](#13-data-format--production-dataset)
14. [User Roles & Permissions](#14-user-roles--permissions)
15. [Running the Platform](#15-running-the-platform)
16. [Environment Variables](#16-environment-variables)
17. [Known Design Decisions](#17-known-design-decisions)

---

## 1. System Overview

The platform ingests monthly digital-channel performance data for Ahadu Bank, runs ML classification to assign each channel a performance tier (**High / Medium / Low**), and exposes a full analytics dashboard for business stakeholders.

**Core capabilities:**
- Upload CSV/Excel datasets → automatic feature engineering → store processed file
- Train multiple ML classifiers (XGBoost, Random Forest, Gradient Boosting) with no look-ahead bias
- Run batch predictions (background task, 5 000-row batches) → poll for results
- Dashboard with KPIs, channel rankings, tier distribution, alert notifications
- Analytics: confusion matrix, data profiling, channel trends, EDA histograms, model comparison
- Smart Report: executive narrative, model accuracy summary, trend charts, channels overview
- Audit log with pagination and action filtering
- User management (Admin/Analyst/Viewer roles) with avatar support
- Dark / Light theme toggle persisted in localStorage

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│   React 18 + MUI v5  (Vite dev server :5173)                │
│   Proxy: /api  →  http://localhost:8000                      │
└─────────────────────────┬───────────────────────────────────┘
                          │  HTTP / JSON (JWT Bearer)
┌─────────────────────────▼───────────────────────────────────┐
│              FastAPI  (Uvicorn :8000)                        │
│  /api/v1/auth  /upload  /ml  /dashboard  /analytics  /report│
│                                                             │
│  Background Tasks:                                          │
│    • Feature engineering (on upload)                        │
│    • Model training                                         │
│    • Batch predictions (5 000-row chunks)                   │
│    • Folder watcher (watchdog, daemon thread)               │
└──────┬──────────────────┬──────────────────────────────────┘
       │                  │
  MySQL :3307        data/ directory
  (SQLAlchemy)       ├── raw/          ← uploaded files
                     ├── processed/    ← featured CSVs
                     ├── models/       ← pkl artifacts
                     ├── validation/   ← JSON reports
                     └── avatars/      ← user photos
```

---

## 3. Project Structure

```
ahadu_digital_performance_model/
├── start.bat                          ← one-click startup (backend + frontend)
├── ahadu_bank_train_dataset_v2.csv    ← sample training data
│
├── backend/
│   ├── .env                           ← environment overrides
│   ├── .env.example
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │
│   ├── app/
│   │   ├── main.py                    ← FastAPI app, lifespan, routers, CORS
│   │   ├── config.py                  ← Settings (pydantic-settings)
│   │   ├── database.py                ← SQLAlchemy engine + SessionLocal
│   │   ├── models.py                  ← ORM models
│   │   ├── schemas.py                 ← Pydantic request/response schemas
│   │   │
│   │   ├── api/v1/
│   │   │   ├── auth.py                ← Login, /me, password, avatar upload
│   │   │   ├── users.py               ← Admin CRUD for users
│   │   │   ├── upload.py              ← Dataset upload, process, list, delete
│   │   │   ├── ml.py                  ← Train, predict, list models, delete
│   │   │   ├── dashboard.py           ← KPIs, channel perf, rankings, comparison
│   │   │   ├── analytics.py           ← Confusion matrix, data profile, trends, export, audit
│   │   │   └── report.py              ← Smart report data + PDF/CSV download
│   │   │
│   │   └── core/
│   │       ├── deps.py                ← get_current_user, require_analyst
│   │       ├── security.py            ← JWT create/verify, bcrypt hash
│   │       ├── feature_engineering.py ← FeatureEngineer class
│   │       └── ml_pipeline.py         ← MLPipeline class
│   │
│   └── data/
│       ├── raw/                       ← drop files here for auto-processing
│       ├── processed/
│       ├── models/model_<id>/
│       │   ├── model.pkl
│       │   ├── scaler.pkl
│       │   ├── label_encoder.pkl
│       │   └── imputer.pkl
│       ├── validation/
│       └── avatars/
│
└── frontend/
    ├── vite.config.js                 ← proxy /api → :8000
    ├── package.json
    │
    └── src/
        ├── main.jsx
        ├── App.jsx                    ← routes, context providers
        ├── theme.js                   ← MUI dark/light palette
        │
        ├── api/
        │   ├── axiosConfig.js         ← baseURL, token interceptor, 401 redirect
        │   └── endpoints.js           ← all API call functions
        │
        ├── context/
        │   ├── AuthContext.jsx        ← current user, login/logout
        │   ├── ThemeContext.jsx        ← dark/light toggle + localStorage
        │   ├── ToastContext.jsx        ← success/error/info/warning toasts
        │   └── AlertContext.jsx        ← at-risk channel alerts, bell badge
        │
        ├── components/
        │   ├── common/
        │   │   ├── SectionHeader.jsx
        │   │   ├── StatCard.jsx
        │   │   └── StatusBadge.jsx    ← High=green, Medium=amber, Low=red chips
        │   ├── Layout/
        │   │   ├── Layout.jsx
        │   │   ├── Sidebar.jsx        ← nav links, avatar, role badge
        │   │   └── TopBar.jsx         ← theme toggle, alert bell, role chip
        │   └── ML/
        │       ├── FeatureImportanceChart.jsx
        │       └── ModelDetailDrawer.jsx  ← per-class metrics, bias badge, weights
        │
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── DataManagement.jsx
            ├── ModelTraining.jsx
            ├── Predictions.jsx
            ├── ChannelRanking.jsx
            ├── Analytics.jsx
            ├── SmartReport.jsx
            ├── AuditLog.jsx
            ├── Profile.jsx
            ├── UserManagement.jsx
            └── NotFound.jsx
```

---

## 4. Backend — Setup & Configuration

### Requirements

```
fastapi uvicorn[standard] sqlalchemy pymysql alembic
pydantic pydantic-settings python-jose[cryptography] passlib[bcrypt]
python-multipart pandas numpy scikit-learn xgboost joblib watchdog
```

### config.py — Settings

| Setting | Default | Description |
|---|---|---|
| `APP_NAME` | Digital Channels Performance Evaluation | App title |
| `APP_VERSION` | 1.0.0 | |
| `DATABASE_URL` | `mysql+pymysql://root:@127.0.0.1:3307/digital_channels_db` | MySQL connection |
| `SECRET_KEY` | `change-me-in-production` | JWT signing key |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 480 (8 h) | Token lifetime |
| `ALLOWED_ORIGINS` | localhost:3000, localhost:5173 | CORS origins |
| `DATA_ROOT` | `backend/data/` | Base data directory |
| `RAW_DATA_DIR` | `data/raw/` | Incoming uploads |
| `PROCESSED_DATA_DIR` | `data/processed/` | Featured CSVs |
| `MODELS_DIR` | `data/models/` | Saved model artifacts |
| `ALLOWED_EXTENSIONS` | `.csv .xlsx .json` | Upload file types |
| `WATCH_DATA_FOLDER` | `True` | Enable folder watcher |
| `SCAN_INTERVAL_SECONDS` | 30 | Watcher poll interval |

### Startup sequence

1. `create_tables()` — create all ORM tables if not exist
2. `_seed_admin()` — insert `admin@digitalchannels.com / Admin@1234` if no users
3. Folder watcher daemon thread starts (if `WATCH_DATA_FOLDER=True`)

---

## 5. Database Models

### User
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| full_name | String(150) | |
| email | String(255) unique | |
| hashed_password | String(255) | bcrypt |
| role | Enum | `admin` / `analyst` / `viewer` |
| is_active | Boolean | default True |
| avatar_url | String(512) | path served at `/api/v1/auth/avatar/{filename}` |
| created_at | DateTime | |
| last_login | DateTime | updated on login |

### Dataset
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| filename | String(255) | timestamped filename on disk |
| original_filename | String(255) | user-visible name |
| file_path | String(512) | absolute path to raw file |
| file_size_kb | Float | |
| file_type | String(10) | csv / xlsx / json |
| status | Enum | `pending` / `processing` / `completed` / `failed` |
| row_count | Integer | populated after processing |
| column_count | Integer | populated after processing |
| processed_file_path | String(512) | path to `*_featured.csv` |
| validation_report | JSON | from `FeatureEngineer.validate_data()` |
| features_created | JSON | list of new column names |
| error_message | Text | if status=failed |
| uploaded_at | DateTime | |
| processed_at | DateTime | |

### MLModel
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| name | String(100) | user-supplied |
| model_type | String(50) | `xgboost` / `random_forest` / `gradient_boosting` |
| target | String(100) | `performance_tier` |
| status | Enum | `training` / `ready` / `failed` |
| model_path | String(512) | path to `data/models/model_<id>/` |
| accuracy | Float | weighted, on test split |
| precision_score | Float | weighted |
| recall_score | Float | weighted |
| f1_score | Float | weighted |
| feature_importance | JSON | `{ feature: importance_float }` |
| training_params | JSON | see §7 |
| trained_on_dataset_id | Integer FK → datasets | |
| created_at / updated_at | DateTime | |

### Prediction
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| dataset_id | Integer FK → datasets | |
| model_id | Integer FK → ml_models | |
| product_id | String(100) | e.g. `mobile_banking` |
| metric_date | DateTime | derived from `eval_year` + `eval_month` |
| predicted_value | Float | actual `performance_score` (0–100) |
| actual_value | Float | reserved |
| confidence | Float | max class probability (0–1) |
| prediction_label | String(50) | `High` / `Medium` / `Low` |

---

## 6. API Reference

All endpoints are prefixed `/api/v1`. Authentication is JWT Bearer unless noted as public.

### Auth — `/api/v1/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login/json` | Public | Login → `{ access_token, user }` |
| GET | `/auth/me` | Required | Current user profile |
| PUT | `/auth/me/password` | Required | Change own password |
| POST | `/auth/me/avatar` | Required | Upload profile photo (multipart) |
| DELETE | `/auth/me/avatar` | Required | Remove profile photo |
| GET | `/auth/avatar/{filename}` | Public | Serve avatar image |

### Users — `/api/v1/users` (Admin only)

| Method | Path | Description |
|---|---|---|
| GET | `/users` | List all users |
| POST | `/users` | Create user |
| PUT | `/users/{id}` | Update user (name/email/role/active) |
| PUT | `/users/{id}/reset-password` | Reset password |
| DELETE | `/users/{id}` | Delete user |

### Upload — `/api/v1/upload`

| Method | Path | Description |
|---|---|---|
| POST | `/upload/dataset` | Upload file; `?auto_process=true` triggers FE immediately |
| GET | `/upload/list` | List datasets (paginated: `skip`, `limit`) |
| GET | `/upload/dataset/{id}` | Get single dataset |
| POST | `/upload/process/{id}` | Re-run feature engineering |
| DELETE | `/upload/dataset/{id}` | Delete dataset + cascade predictions |
| POST | `/upload/scan-folder` | Manually scan `data/raw/` |

### ML — `/api/v1/ml`

| Method | Path | Description |
|---|---|---|
| POST | `/ml/train` | Start training (background) → `{ model_id }` |
| GET | `/ml/models` | List all models |
| GET | `/ml/models/{id}` | Get model details + feature importance |
| POST | `/ml/predict/{model_id}/{dataset_id}` | Start predictions (background) → returns immediately |
| GET | `/ml/predictions/{model_id}` | Get predictions (`skip`, `limit`, `product_id`) |
| DELETE | `/ml/models/{id}` | Delete model + cascade predictions |

**Train request body:**
```json
{
  "dataset_id": 5,
  "model_type": "xgboost",
  "target": "performance_tier"
}
```

**training_params JSON stored in MLModel:**
```json
{
  "model_type": "xgboost",
  "n_samples": 1200,
  "n_features": 15,
  "test_size": 0.2,
  "split_method": "chronological",
  "class_weights": { "High": 1.2, "Medium": 0.9, "Low": 1.8 },
  "class_distribution": { "High": 540, "Medium": 480, "Low": 180 },
  "per_class_metrics": {
    "High":   { "precision": 0.91, "recall": 0.89, "f1": 0.90, "support": 108 },
    "Medium": { "precision": 0.85, "recall": 0.87, "f1": 0.86, "support": 96 },
    "Low":    { "precision": 0.88, "recall": 0.83, "f1": 0.85, "support": 36 }
  },
  "imputed_columns": { "complaint_growth_rate": 12 },
  "feature_cols": ["active_user_rate", "revenue_per_txn", "..."],
  "tiers": ["High", "Medium", "Low"]
}
```

### Dashboard — `/api/v1/dashboard`

| Method | Path | Description |
|---|---|---|
| GET | `/dashboard/kpis` | Platform-wide KPI summary |
| GET | `/dashboard/channel-performance` | Per-channel aggregates (`?model_id=`) |
| GET | `/dashboard/prediction-distribution` | Tier counts (`?model_id=`) |
| GET | `/dashboard/model-comparison` | All ready models with metrics + training_params |
| GET | `/dashboard/recent-activity` | Latest uploads + training events (`?limit=`) |
| GET | `/dashboard/channel-ranking` | Sorted channel list with tier + score (`?model_id=`) |

### Analytics — `/api/v1/analytics`

| Method | Path | Description |
|---|---|---|
| GET | `/analytics/confusion-matrix/{model_id}` | Matrix + per-class precision/recall/F1 |
| GET | `/analytics/data-profile/{dataset_id}` | Numeric + categorical statistical profile |
| GET | `/analytics/channel-trend` | Time-series for one channel (`?product_id=&model_id=`) |
| GET | `/analytics/channels-overview` | Per-channel summary (`?model_id=`) |
| GET | `/analytics/export/predictions/{model_id}` | Download predictions CSV |
| GET | `/analytics/export/dataset/{dataset_id}` | Download featured dataset CSV |
| GET | `/analytics/audit-log` | Paginated audit log (`?page=&page_size=&action_filter=`) |
| PUT | `/analytics/model-notes/{model_id}` | Add/update notes on a model |

**Audit log action_filter values:** `dataset_uploaded`, `feature_engineering`, `model_training_started`, `model_ready`, `user_login`

### Report — `/api/v1/report`

| Method | Path | Description |
|---|---|---|
| GET | `/report/data` | Full report payload (`?model_id=`) |
| GET | `/report/download` | Download report as CSV (`?model_id=`) |

---

## 7. ML Pipeline

File: `backend/app/core/ml_pipeline.py`

### Supported Models

| Key | Class | Notes |
|---|---|---|
| `xgboost` | XGBClassifier | 200 estimators, depth 6, lr 0.1, sample_weight |
| `random_forest` | RandomForestClassifier | 200 estimators, depth 10, class_weight='balanced' |
| `gradient_boosting` | GradientBoostingClassifier | 150 estimators, depth 5, sample_weight |

### Feature Columns (15 total)

```
active_user_rate          revenue_per_txn           revenue_per_active_user
downtime_impact_score     operational_efficiency_score  complaint_growth_rate
complaint_resolution_rate user_growth_rate           txn_growth_rate
revenue_growth_rate       churn_rate                 new_user_rate
revenue_per_user          txn_volume_3m_avg          revenue_3m_avg
```

### Pipeline Steps

1. **Load** processed CSV, lowercase column names
2. **prepare_features()** — select 15 feature columns, replace ±inf → NaN, report missing, median-impute with `SimpleImputer(strategy='median')`, extract target from `performance_tier` or derive from `performance_score`
3. **Class weights** — `compute_class_weight('balanced')` → `sample_weight` array for XGBoost/GBM, `class_weight='balanced'` for RF
4. **Chronological split** — sort by `eval_year + eval_month` → train on oldest 80%, test on newest 20% (no look-ahead bias). Falls back to random split if no date columns present
5. **LabelEncoder** — fit on all classes before split to guarantee consistency
6. **StandardScaler** — fit on train, transform both
7. **Train** — with or without `sample_weight` depending on model type
8. **Evaluate** — accuracy, precision, recall, F1 (weighted) + per-class report
9. **Save artifacts** to `data/models/model_<id>/`: `model.pkl`, `scaler.pkl`, `label_encoder.pkl`, `imputer.pkl`
10. **Return** metrics + feature_importance + training_params

### Prediction

1. Load pkl artifacts
2. Call `prepare_features()` on new data
3. Apply saved imputer, then scaler
4. Predict labels + `predict_proba().max()` as confidence
5. **Override label** from actual `performance_score` using business rules (score ≥ 80 = High, ≥ 50 = Medium, < 50 = Low)
6. Return DataFrame with `product_id, metric_date, prediction_label, confidence, actual_score`

---

## 8. Feature Engineering

File: `backend/app/core/feature_engineering.py`

### Required Input Columns (22)

```
product_id         eval_period         eval_year           eval_month
total_users        active_users        monthly_txn_count   txn_value_etb
revenue_etb        complaint_volume    downtime_minutes    performance_score
performance_tier
```
Plus optional: `new_user_registrations`, `churned_users`

### Derived Features

All derived using safe division (`replace(0, np.nan)`) and median imputation — never zero-filled.

| Feature | Formula |
|---|---|
| `active_user_rate` | `active_users / total_users` |
| `revenue_per_txn` | `revenue_etb / monthly_txn_count` |
| `revenue_per_active_user` | `revenue_etb / active_users` |
| `downtime_impact_score` | `downtime_minutes / 1440 × 100` (% of day) |
| `operational_efficiency_score` | `100 − downtime_impact_score` |
| `complaint_growth_rate` | pct_change of `complaint_volume` per product |
| `complaint_resolution_rate` | from dataset, defaults to 75.0 if absent |
| `user_growth_rate` | pct_change of `total_users` per product |
| `txn_growth_rate` | pct_change of `monthly_txn_count` per product |
| `revenue_growth_rate` | pct_change of `revenue_etb` per product |
| `churn_rate` | `churned_users / prev_total_users × 100` |
| `new_user_rate` | `new_user_registrations / total_users × 100` |
| `revenue_per_user` | `revenue_etb / total_users` |
| `txn_volume_3m_avg` | 3-month rolling mean of `monthly_txn_count` |
| `revenue_3m_avg` | 3-month rolling mean of `revenue_etb` |

### Processing Steps

1. Load CSV/Excel/JSON → normalize column names (lowercase, spaces → `_`)
2. `validate_data()` — check required columns, row count; warn on missing values
3. `_coerce_numerics()` — `pd.to_numeric(errors='coerce')` + median fill all numeric cols
4. Normalize `performance_tier` labels → `High / Medium / Low`
5. Sort chronologically by `product_id + eval_year + eval_month`
6. Derive growth features via `groupby('product_id').pct_change()`
7. Derive all 7 pre-computed features if not already in dataset
8. Cap outliers in growth columns at p01–p99
9. Final pass: replace any remaining ±inf/NaN with column median
10. Deduplicate on `(product_id, eval_year, eval_month)` keeping last
11. Save `*_featured.csv` to `data/processed/`, save validation JSON

### Missing Value Policy

- **Never zero-fill**
- All NaN and ±inf filled with **column median** at every stage
- Imputed columns are logged at WARNING level and reported in `training_params.imputed_columns`

---

## 9. Frontend — Application

### Tech Stack

| Package | Version | Use |
|---|---|---|
| React | 18 | UI framework |
| MUI (Material UI) | v5 | Component library |
| Recharts | latest | All charts |
| React Router DOM | v6 | Client-side routing |
| Axios | latest | HTTP client |
| Vite | 5 | Build tool |

### Theme

File: `frontend/src/theme.js`

- **Dark mode** default: background `#0f1117` / paper `#1a1d27` / primary indigo `#6366f1`
- **Light mode**: standard MUI light palette with indigo primary
- Toggled via `ThemeContext`, persisted to `localStorage('themeMode')`

### Routing (`App.jsx`)

| Path | Component | Auth |
|---|---|---|
| `/login` | Login | Public |
| `/` | Dashboard | Required |
| `/data` | DataManagement | Required |
| `/models` | ModelTraining | Required |
| `/predictions` | Predictions | Required |
| `/ranking` | ChannelRanking | Required |
| `/analytics` | Analytics | Required |
| `/report` | SmartReport | Required |
| `/audit` | AuditLog | Required |
| `/profile` | Profile | Required |
| `/users` | UserManagement | Admin only |
| `*` | NotFound | — |

---

## 10. Pages & Components

### Dashboard
Displays platform KPIs, tier distribution pie, channel performance bar chart, top/bottom channel lists, and recent activity feed. Loads channel ranking on mount and feeds Low-tier / declining channels into `AlertContext`.

### DataManagement
Upload datasets via drag-and-drop or file picker. Shows processing status, validation report, features created. Supports reprocess, delete, and folder scan.

### ModelTraining
Select dataset + model type → train. Shows all trained models with status badges. Opens `ModelDetailDrawer` for per-class metrics, class weights, bias badge, imputed columns.

**ModelDetailDrawer** sections:
- Per-Class Evaluation (Precision / Recall / F1 / Support per tier)
- Class Balance (weights + distribution bars)
- No Look-Ahead Bias badge (green = chronological split)
- Imputed Columns alert (lists columns that had missing values)
- Training Info (split method, sample count, feature count)

### Predictions
Select model + dataset → run predictions (background). Polls every 3 s until complete. Results table with score progress bar, tier badge, confidence. Supports product filter.

### ChannelRanking
Full ranked table of all channels: tier badge, score bar, confidence, trend arrow. Distinct per-channel colors via hash function.

### Analytics
Comprehensive analytics page with these sections (in order):

1. **Model Evaluation & Comparison** — grouped bar chart (Accuracy/Precision/Recall/F1 per model), radar chart across metrics, best-per-metric highlight cards, full comparison table with split-method badge. Shown when ≥ 1 model exists.

2. **Confusion Matrix** — heatmap with diagonal highlighting, per-class Precision/Recall/F1/Support table.

3. **Channel Performance Trend** — area chart for selected channel with High ≥ 80 / Medium ≥ 50 reference lines. Channel selector table.

4. **All Channels Overview** — compact table; click row to update trend chart.

5. **Data Profile** — statistical table for all numeric columns: count, missing, mean, std, min, median, max, skewness. Skew > 1 highlighted amber.

6. **EDA — Prediction Distributions**:
   - Score Distribution histogram (bars colored by tier threshold)
   - Confidence Distribution histogram
   - Tier Split donut pie

7. **Feature Importance — What Drives Performance Tier?** — horizontal bar chart (top 15 features), top-3 call-out cards with interpretation note. Shown when model has feature_importance.

8. **Channel Radar — Score vs Confidence** — spider chart for all channels.

9. **Top Features by Variability (Std Dev)** — bars colored by skewness magnitude.

Export buttons: predictions CSV, featured dataset CSV.

### SmartReport
Sections (in display order):
1. Model Accuracy Summary (selector row)
2. Channel Performance Trend (top 3 area charts)
3. Channels Overview table
4. Executive Narrative (at the end)

### AuditLog
Server-side paginated table. Actions: dataset_uploaded, feature_engineering, model_training_started, model_ready, user_login. Per-page selector (5/10/20/50). First/Prev/page numbers/Next/Last navigation.

### Profile
Edit name, email. Change password (current + new). Upload/remove profile photo (camera overlay on avatar). Avatar previewed immediately.

### UserManagement (Admin only)
Create/edit/delete users. Role assignment. Password reset. Avatar shown in table.

---

## 11. Context Providers

All providers are nested in `App.jsx` wrapping all routes.

### AuthContext
```jsx
const { user, login, logout, loading } = useAuth();
```
- `user` — full `UserResponse` object including `avatar_url`, `role`
- `login(email, password)` — calls `/auth/login/json`, stores JWT in `localStorage('token')`
- `logout()` — clears token, redirects to `/login`

### ThemeContext
```jsx
const { mode, toggleTheme } = useThemeMode();
```
- `mode` — `'dark'` | `'light'`
- `toggleTheme()` — flips and persists to `localStorage('themeMode')`

### ToastContext
```jsx
const toast = useToast();
toast.success('Saved');
toast.error('Failed');
toast.info('Info');
toast.warning('Warning');
```
- Auto-dismiss after 4 s
- Stacked toasts supported
- Replaces all inline `<Alert>` components

### AlertContext
```jsx
const { alerts, unseenCount, updateAlerts, markSeen } = useAlerts();
```
- `updateAlerts(rankingData)` — called by Dashboard after loading channel ranking; adds Low-tier and declining channels as alerts
- `unseenCount` — shown as red badge on bell icon in TopBar
- `markSeen()` — clears badge count when popover is opened
- Alert popover lists channel name + tier + reason (Low tier / Declining score)

---

## 12. Tier Classification Rules

| Score Range | Tier | Color | Hex |
|---|---|---|---|
| ≥ 80 | **High** | Green | `#10b981` |
| 50 – 79 | **Medium** | Amber | `#f59e0b` |
| < 50 | **Low** | Red | `#ef4444` |

These thresholds are applied in:
- `ml_pipeline.py` → `predict()` override: label derived from `performance_score`
- `feature_engineering.py` → `TIER_MAP` normalization
- `dashboard.py` → `channels_overview()` avg score → tier
- Frontend `StatusBadge`, `TIER_COLORS`, `ChannelRanking`, `SmartReport`, `Analytics`, `Predictions`, `Dashboard`

---

## 13. Data Format — Production Dataset

### Required Columns (22)

| Column | Type | Description |
|---|---|---|
| `product_id` | string | Channel identifier (e.g. `mobile_banking`) |
| `eval_period` | string | e.g. `2024-01` |
| `eval_year` | int | 4-digit year |
| `eval_month` | int | 1–12 |
| `total_users` | float | Total registered users |
| `active_users` | float | Users active this period |
| `monthly_txn_count` | float | Total transactions |
| `txn_value_etb` | float | Total transaction value (ETB) |
| `revenue_etb` | float | Revenue generated (ETB) |
| `complaint_volume` | float | Number of complaints |
| `downtime_minutes` | float | Minutes of downtime |
| `performance_score` | float | Score 0–100 (ground truth) |
| `performance_tier` | string | `High` / `Medium` / `Low` |

### Optional Columns (improve derived features)

| Column | Description |
|---|---|
| `new_user_registrations` | New signups this period |
| `churned_users` | Users who left |
| `active_user_rate` | Pre-computed (derived if absent) |
| `revenue_per_txn` | Pre-computed (derived if absent) |
| `revenue_per_active_user` | Pre-computed (derived if absent) |
| `downtime_impact_score` | Pre-computed (derived if absent) |
| `operational_efficiency_score` | Pre-computed (derived if absent) |
| `complaint_growth_rate` | Pre-computed (derived if absent) |
| `complaint_resolution_rate` | Pre-computed (defaults to 75.0 if absent) |

> All pre-computed features are **always derived from base columns** during feature engineering if not already present in the dataset, ensuring the pipeline works on both raw and pre-featured inputs.

---

## 14. User Roles & Permissions

| Action | Admin | Analyst | Viewer |
|---|---|---|---|
| View dashboard / analytics / report | ✅ | ✅ | ✅ |
| Upload dataset | ✅ | ✅ | ❌ |
| Train model | ✅ | ✅ | ❌ |
| Run predictions | ✅ | ✅ | ❌ |
| Delete dataset / model | ✅ | ✅ | ❌ |
| Export CSV | ✅ | ✅ | ✅ |
| Manage users | ✅ | ❌ | ❌ |
| Reset passwords | ✅ | ❌ | ❌ |
| View audit log | ✅ | ✅ | ✅ |

---

## 15. Running the Platform

### Quick Start (Windows)

```bat
start.bat
```
This opens two terminals: backend (uvicorn) and frontend (vite).

### Manual Start

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**URLs:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs
- Health check: http://localhost:8000/health

### Database Migrations (Alembic)

```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Default Admin Credentials

```
Email:    admin@digitalchannels.com
Password: Admin@1234
```

---

## 16. Environment Variables

Create `backend/.env` to override defaults:

```env
# Database
DATABASE_URL=mysql+pymysql://root:yourpassword@127.0.0.1:3307/digital_channels_db

# Security — CHANGE THIS IN PRODUCTION
SECRET_KEY=your-random-secret-key-here

# Token lifetime
ACCESS_TOKEN_EXPIRE_MINUTES=480

# CORS
ALLOWED_ORIGINS=["http://localhost:5173","http://yourproductiondomain.com"]

# Data paths (optional — defaults to backend/data/)
# DATA_ROOT=/custom/path/to/data

# Folder watcher
WATCH_DATA_FOLDER=True
SCAN_INTERVAL_SECONDS=30
```

---

## 17. Known Design Decisions

### Why performance_score overrides the ML label on prediction
The ML model classifies using engineered features. However, the ground truth for the current period is the actual `performance_score` from the dataset. Overriding the label ensures the dashboard reflects the known score, not a model approximation. The ML model's value is in predicting future periods or datasets without a score.

### Why chronological split instead of random
Random splitting would let the model train on March 2024 data while testing on January 2024 data — look-ahead bias. Chronological split guarantees the model has never seen future periods during training, producing honest evaluation metrics.

### Why median imputation everywhere
Zero-filling distorts distributions for ratio features (e.g. `active_user_rate = 0` implies a dead channel). Median preserves the central tendency and is robust to outliers. The imputer is saved as `imputer.pkl` and reused at prediction time to prevent data leakage.

### Why background tasks for train and predict
Training and predicting on large datasets can take 30–120 seconds. Background tasks let the API return immediately (`202 Accepted`) while the frontend polls for status changes. Predictions run in 5 000-row batches to stay within memory limits.

### Why complaint_resolution_rate defaults to 75.0
This field is rarely populated in source data. Using NaN would cause the ML pipeline to impute a potentially misleading value based on neighboring records. A fixed 75.0 (indicating ~3/4 resolution) is a conservative neutral assumption and is clearly logged as a warning.

### Alert notifications design
Alerts are computed client-side from the channel ranking response (no extra backend endpoint). `AlertContext` derives Low-tier and score-declining channels and exposes them to `TopBar` via context. The bell badge count clears immediately when the popover is opened, preventing notification fatigue.
