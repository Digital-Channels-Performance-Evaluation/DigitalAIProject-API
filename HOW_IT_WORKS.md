# How It Works — Deep Module Guide

This document explains every module of the Digital Channels Performance Evaluation platform
in depth: what it does, how it works internally, and how the pieces connect.

---

## 1. Authentication & Authorization

### How it works

The platform uses **JWT (JSON Web Tokens)** for stateless authentication and **bcrypt** for
password hashing. There are three roles: Admin, Analyst, Viewer.

**Login flow:**
1. User submits email + password to `POST /api/v1/auth/login/json`
2. Backend looks up the user by email in the `users` table
3. `bcrypt.checkpw()` verifies the plain password against the stored hash
4. If valid, a JWT is created with `{"sub": user_id, "role": user_role, "exp": 8h_from_now}`
5. The token is signed with `SECRET_KEY` using HS256 algorithm
6. Frontend stores the token in `localStorage` and attaches it to every request via
   `Authorization: Bearer <token>` header

**Request protection:**
- Every protected endpoint uses `Depends(get_current_user)` from `app/core/deps.py`
- `get_current_user` decodes the JWT, extracts `sub` (user ID), queries the DB, and returns the user
- `require_analyst` and `require_admin` are wrappers that additionally check the role
- A 401 response clears the token in the frontend and redirects to `/login`

**Frontend auth state:**
- `AuthContext.jsx` holds `user`, `token`, `login()`, `logout()`, `refreshUser()`
- On app load, if a token exists in localStorage, it calls `GET /auth/me` to restore the session
- `ProtectedRoute` in `App.jsx` blocks unauthenticated access and redirects to `/login`
- Admin-only routes (Users, Audit Log) redirect non-admins to `/dashboard`

---

## 2. Data Upload & Feature Engineering

### How it works

**Upload flow:**
1. User drags a CSV/Excel/JSON file onto the `DataUploader` component
2. Frontend sends `POST /api/v1/upload/dataset` as `multipart/form-data`
3. Backend validates the file extension against `ALLOWED_EXTENSIONS`
4. File is saved to `backend/data/raw/` with a timestamp prefix
5. A `Dataset` record is created in MySQL with `status = pending`
6. A **background task** (`BackgroundTasks`) is queued to run feature engineering
7. The API returns immediately with `dataset_id` — the UI polls every 8 seconds

**Feature engineering pipeline (`app/core/feature_engineering.py`):**

The `FeatureEngineer.process_file()` method runs these steps:

```
Raw file (CSV/Excel/JSON)
    ↓ load_raw_data()       — pandas read, date parsing
    ↓ validate_data()       — check required columns, empty data, null dates
    ↓ engineer_features()   — compute 14 derived features (see below)
    ↓ save_processed_data() — write to data/processed/*_featured.csv
    ↓ save validation JSON  — write to data/validation/*.json
    ↓ update DB record      — status=completed, row_count, features_created
```

**14 engineered features:**

| Feature | Formula | Purpose |
|---------|---------|---------|
| `user_growth_rate` | pct_change(total_users) * 100 | User base momentum |
| `transaction_growth_rate` | pct_change(transaction_count) * 100 | Volume momentum |
| `revenue_growth_rate` | pct_change(revenue) * 100 | Financial momentum |
| `failure_rate` | (failed_txn / total_txn) * 100 | Reliability |
| `complaints_per_1000_users` | (complaints / total_users) * 1000 | Service quality |
| `uptime_percentage` | 100 - (downtime_min / 1440) * 100 | Availability |
| `active_user_ratio` | (active_users / total_users) * 100 | Engagement |
| `retention_rate` | prev_active / current_active * 100 | Stickiness |
| `revenue_per_user` | revenue / total_users | Monetization |
| `transaction_value_per_user` | txn_value / active_users | Spend depth |
| `transaction_volume_7d_avg` | 7-day rolling mean of txn_count | Smoothed volume |
| `revenue_7d_avg` | 7-day rolling mean of revenue | Smoothed revenue |
| `fraud_rate` | (fraud_incidents / txn_count) * 100,000 | Risk per 100k txns |
| `operational_risk_score` | failure*0.4 + downtime*0.3 + fraud*0.3 | Composite risk |

**Folder scan:** `POST /api/v1/upload/scan-folder` scans `data/raw/` for files not yet
tracked in the DB and processes them — useful for batch loading.

---

## 3. ML Training Pipeline

### How it works

**Training flow:**
1. User selects a processed dataset and model type on the Model Training page
2. Frontend sends `POST /api/v1/ml/train` with `{dataset_id, model_type, target}`
3. Backend creates an `MLModel` record with `status = training`
4. A **background task** runs `_train_and_save()` — the API returns immediately
5. The UI polls every 10 seconds until `status = ready`

**Inside `MLPipeline.train()` (`app/core/ml_pipeline.py`):**

```
Processed CSV
    ↓ load_processed_data()     — read featured CSV
    ↓ prepare_features()        — select 14 feature columns, fill NaNs with median
    ↓ assign_performance_tier() — compute target label from weighted score formula
    ↓ LabelEncoder              — encode Excellent/Good/Average/Poor → 0/1/2/3
    ↓ StandardScaler            — normalize all features to mean=0, std=1
    ↓ train_test_split(80/20)   — stratified split to preserve tier distribution
    ↓ clf.fit(X_train, y_train) — train chosen algorithm
    ↓ evaluate on X_test        — accuracy, precision, recall, F1 (weighted)
    ↓ extract feature_importances_
    ↓ joblib.dump()             — save model.pkl, scaler.pkl, label_encoder.pkl
    ↓ update DB record          — status=ready, all metrics, model_path
```

**Performance tier scoring formula:**
```
score = (active_user_ratio/100)*0.25
      + (uptime_percentage/100)*0.20
      + (1 - failure_rate.clip(0,100)/100)*0.20
      + (revenue_growth_rate.clip(-50,100)+50)/150*0.15
      + (1 - operational_risk_score.clip(0,100)/100)*0.20

Excellent: score >= 0.75
Good:      score >= 0.55
Average:   score >= 0.35
Poor:      score <  0.35
```

**Three model types:**
- **XGBoost** — gradient boosted trees, best accuracy, handles non-linear patterns
- **Random Forest** — ensemble of decision trees, robust to outliers, interpretable
- **Gradient Boosting** — sklearn's GBM, slower but high accuracy on small datasets

**Prediction flow:**
1. User selects a ready model + processed dataset on the Predictions page
2. `POST /api/v1/ml/predict/{model_id}/{dataset_id}` loads the saved artifacts
3. `scaler.transform(X)` normalizes features using the training-time scaler
4. `clf.predict(X_scaled)` returns encoded labels
5. `le.inverse_transform()` converts back to Excellent/Good/Average/Poor
6. `clf.predict_proba(X_scaled).max(axis=1)` gives confidence per prediction
7. Results are stored in the `predictions` table and returned to the UI

---

## 4. Dashboard & KPIs

### How it works

The Dashboard page loads 5 API calls in parallel on mount:

| Endpoint | What it returns |
|----------|----------------|
| `/dashboard/kpis` | Total datasets, channels, models, predictions, avg accuracy |
| `/dashboard/prediction-distribution` | Count per tier (Excellent/Good/Average/Poor) |
| `/dashboard/model-comparison` | Accuracy + F1 for all ready models |
| `/dashboard/recent-activity` | Last 8 uploads + training events sorted by time |
| `/dashboard/channel-ranking` | All channels ranked by composite score |

The dashboard auto-refreshes every 30 seconds.

**Channel ranking algorithm (`/dashboard/channel-ranking`):**
1. Load all predictions for the selected model
2. Group by `product_id`
3. For each channel: compute average tier score (Excellent=100, Good=75, Average=45, Poor=15)
4. Compute trend: compare first-half vs second-half average score
   - diff > 5 → trend = +1 (improving)
   - diff < -5 → trend = -1 (declining)
   - else → trend = 0 (stable)
5. Sort by score descending, assign rank 1 = best

---

## 5. Channel Ranking Page

### How it works

Extends the dashboard ranking with full interactivity:

- **Model selector** — switch between trained models to see how rankings change
- **Tier filter chips** — filter to show only Excellent/Good/Average/Poor channels
- **Search** — filter by channel name
- **Podium** — visual 1st/2nd/3rd place display with scores
- **Score bar chart** — horizontal bars for top 10, color-coded by tier
- **Table view** — full ranking with rank medal, score bar, confidence, tier breakdown mini-bar, trend icon
- **Cards view** — toggle to card layout

The `tier_breakdown` field shows how many predictions fell into each tier for that channel,
displayed as a color-coded mini progress bar.

---

## 6. Analytics Page

### How it works

**Confusion Matrix (`/analytics/confusion-matrix/{model_id}`):**
- Groups predictions by label
- Uses confidence to simulate actual vs predicted:
  - confidence >= 0.75 → actual = predicted (correct)
  - confidence < 0.75 → actual shifts one tier down (simulated error)
- Builds a 4x4 matrix (Excellent/Good/Average/Poor)
- Computes per-class precision, recall, F1 from the matrix
- Diagonal cells (correct predictions) are highlighted in tier color
- Off-diagonal cells (errors) are highlighted in red

**Data Profile (`/analytics/data-profile/{dataset_id}`):**
- Reads the processed CSV with pandas
- For each numeric column: count, missing, mean, std, min, Q25, median, Q75, max, skewness
- For each categorical column: unique count, missing, top 10 values
- Skewness > 1 is highlighted in warning color (indicates outliers)

**Channel Trend (`/analytics/channel-trend`):**
- Filters predictions for a specific `product_id`
- Returns time-series of `{date, tier, score, confidence}` sorted by date
- Displayed as an area chart with reference lines at tier boundaries (75, 55, 35)
- Score line (solid) + confidence line (dashed) overlaid

**Export:**
- Predictions CSV: streams the predictions table for a model as CSV download
- Dataset CSV: streams the processed (featured) file from disk

---

## 7. Smart Report

### How it works

`GET /api/v1/report/data` generates a complete structured report:

1. Loads all predictions for the selected model
2. Groups by channel, computes score, tier, confidence, trend for each
3. Sorts channels by score (rank 1 = best)
4. Identifies: top 3 performers, bottom 3, improving channels, declining channels
5. Generates an **executive narrative** — plain English paragraphs describing:
   - Portfolio health summary
   - Top performers with scores
   - Channels needing attention
   - Improving and declining trends
   - Specific recommendations based on the data
6. Returns all data as JSON for the UI to render

**UI sections:**
- Score gauge (circular progress showing average portfolio score)
- KPI cards (Excellent/Good/Average/Poor counts, improving/declining counts)
- Tier distribution pie chart
- Channel scores bar chart (top 10)
- Top performers podium
- Needs attention list
- Executive narrative (rendered as formatted text)
- Full rankings table

**Download:** `GET /api/v1/report/download` returns a Markdown file with the full report
including a complete channel rankings table — ready to share or paste into a document.

---

## 8. Audit Log

### How it works

`GET /api/v1/analytics/audit-log` builds a unified activity timeline by querying:

1. **Dataset uploads** — from the `datasets` table (`uploaded_at`)
2. **Feature engineering completions** — from `datasets.processed_at`
3. **Model training starts** — from `ml_models.created_at`
4. **Model ready events** — from `ml_models.updated_at` where status=ready
5. **User logins** — from `users.last_login`

All events are merged, sorted by timestamp descending, and returned as a flat list.

The UI provides:
- Search by event detail text
- Filter by event type (Upload / Processing / Training / Login)
- Configurable limit (25 / 50 / 100 / 200 events)
- Summary count chips per event type

---

## 9. User Management

### How it works

Admin-only CRUD for platform users:

- **Create** — hashes password with bcrypt, stores in `users` table
- **List** — paginated list with role, status, last login
- **Update** — change name, email, role, or enable/disable account
- **Reset password** — admin sets a new password for any user
- **Delete** — removes user (cannot delete own account)

The `is_active` flag allows disabling accounts without deleting them.
Disabled accounts receive a 403 on login.

---

## 10. Profile Page

### How it works

Available to all roles. Uses two endpoints:

- `PUT /api/v1/auth/me` — update own name and email (checks for email uniqueness)
- `PUT /api/v1/auth/me/password` — change own password (requires current password verification)

After a successful profile update, `refreshUser()` from `AuthContext` re-fetches `/auth/me`
to update the sidebar display name and role badge.

---

## 11. Data Flow — End to End

```
User uploads CSV
    │
    ▼
FastAPI saves to data/raw/
    │
    ▼
Background task: FeatureEngineer.process_file()
    │  ├─ validate columns & data quality
    │  ├─ engineer 14 features per row
    │  └─ save to data/processed/*_featured.csv
    │
    ▼
Dataset status → completed in MySQL
    │
    ▼
User trains model (XGBoost / RF / GBM)
    │
    ▼
Background task: MLPipeline.train()
    │  ├─ load processed CSV
    │  ├─ assign performance tier labels
    │  ├─ scale features (StandardScaler)
    │  ├─ train/test split (80/20 stratified)
    │  ├─ fit classifier
    │  ├─ evaluate (accuracy, F1, precision, recall)
    │  └─ save model.pkl + scaler.pkl + label_encoder.pkl
    │
    ▼
MLModel status → ready in MySQL
    │
    ▼
User runs predictions
    │
    ▼
MLPipeline.predict()
    │  ├─ load saved artifacts
    │  ├─ scale features with saved scaler
    │  ├─ predict labels + confidence
    │  └─ store in predictions table
    │
    ▼
Dashboard / Ranking / Analytics / Smart Report
    └─ all read from predictions table in MySQL
```

---

## 12. Database Schema

```
users
  id, full_name, email, hashed_password, role, is_active,
  created_at, updated_at, last_login

datasets
  id, filename, original_filename, file_path, file_size_kb,
  file_type, status, row_count, column_count,
  processed_file_path, validation_report (JSON),
  features_created (JSON), error_message,
  uploaded_at, processed_at

channel_metrics
  id, dataset_id, product_id, metric_date,
  [raw metrics: total_users, active_users, ...],
  [engineered: user_growth_rate, failure_rate, ...]

ml_models
  id, name, model_type, target, status, model_path,
  accuracy, precision_score, recall_score, f1_score,
  feature_importance (JSON), training_params (JSON),
  trained_on_dataset_id, created_at, updated_at

predictions
  id, dataset_id, model_id, product_id, metric_date,
  predicted_value, actual_value, confidence,
  prediction_label, created_at
```

---

## 13. Folder Monitor (Background Script)

`backend/scripts/monitor_data_folder.py` uses the **Watchdog** library to watch
`data/raw/` for new files. When a CSV/Excel/JSON appears, it automatically triggers
`feature_engineer.process_file()` — useful for automated data pipelines that drop
files into the folder without using the web UI.

Run it separately:
```powershell
cd backend
python scripts/monitor_data_folder.py
```

---

## 14. Sample Data Generator

`backend/scripts/generate_sample_data.py` creates realistic synthetic data for 8 channels
across 90 days with tier-appropriate noise profiles:

| Channel | Tier | Base Users |
|---------|------|-----------|
| MOBILE_BANKING | Excellent | 120,000 |
| WALLET_APP | Excellent | 95,000 |
| INTERNET_BANKING | Good | 85,000 |
| USSD_SERVICE | Good | 200,000 |
| CORPORATE_PORTAL | Good | 12,000 |
| AGENT_BANKING | Average | 60,000 |
| ATM_NETWORK | Average | 150,000 |
| POS_TERMINALS | Poor | 40,000 |

Each tier has different ranges for failure rate, downtime, fraud rate, complaint rate,
and growth rate — producing realistic variation for ML training.

```powershell
# Default: 8 products x 90 days = 720 rows
python scripts/generate_sample_data.py

# Custom
python scripts/generate_sample_data.py --days 180 --products 5 --output my_data.csv
```
