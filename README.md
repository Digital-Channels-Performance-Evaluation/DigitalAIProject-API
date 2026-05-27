# Digital Channels Performance Evaluation — ML Platform

A full-stack machine learning platform for evaluating, ranking, and predicting the performance
of digital banking channels (Mobile Banking, Internet Banking, USSD, ATM, Agent Banking, etc.).

---

## Tech Stack

| Layer    | Technology                                  |
|----------|---------------------------------------------|
| Frontend | React 18 + Vite + MUI v5 + Recharts         |
| Backend  | FastAPI + SQLAlchemy 2 + Alembic            |
| Database | MySQL / MariaDB                             |
| ML       | XGBoost · Random Forest · Gradient Boosting |
| Auth     | JWT (python-jose) + bcrypt                  |

---

## Quick Start (Local — Windows)

### Prerequisites

- Python 3.11+
- Node.js 18+
- MySQL or MariaDB running (XAMPP default port 3307)

### One-click start

Double-click **`start.bat`** at the project root — opens both servers in separate terminal windows.

### Manual start

**Terminal 1 — Backend:**

```cmd
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**

```cmd
cd frontend
npm run dev
```

| Service      | URL                        |
|--------------|----------------------------|
| App          | http://localhost:5173      |
| API          | http://localhost:8000      |
| Swagger docs | http://localhost:8000/docs |

---

## First-time Setup

### Step 1 — Create the database

Open phpMyAdmin or run in MySQL shell:

```sql
CREATE DATABASE digital_channels_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### Step 2 — Backend setup

```powershell
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Tables are created automatically on first startup.
# Optionally seed realistic sample data:
python scripts/generate_sample_data.py

# Start the API server
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
```

### Step 3 — Frontend setup

```powershell
cd frontend
npm install
npm run dev
```

### Default Login

| Email                       | Password     | Role  |
|-----------------------------|--------------|-------|
| `admin@digitalchannels.com` | `Admin@1234` | Admin |

> The default admin account is created automatically on first startup if no users exist.

---

## Environment Variables (`backend/.env`)

```env
DATABASE_URL=mysql+pymysql://root:@127.0.0.1:3307/digital_channels_db
SECRET_KEY=change-me-in-production
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:5173"]
WATCH_DATA_FOLDER=true
SCAN_INTERVAL_SECONDS=30
DEBUG=true
```

> **Important:** Change `SECRET_KEY` to a long random string before deploying to production.

---

## Docker Deployment

```powershell
docker-compose up --build
```

| Service  | URL                   |
|----------|-----------------------|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:8000 |
| Database | localhost:3306        |

---

## Dataset Format

Your CSV / Excel / JSON must include these columns:

| Column                | Type   | Description                              |
|-----------------------|--------|------------------------------------------|
| `product_id`          | string | Channel identifier (e.g. MOBILE_BANKING) |
| `metric_date`         | date   | YYYY-MM-DD                               |
| `total_users`         | number | Total registered users                   |
| `active_users`        | number | Monthly active users                     |
| `transaction_count`   | number | Number of transactions                   |
| `transaction_value`   | number | Total transaction value                  |
| `revenue`             | number | Revenue generated                        |
| `failed_transactions` | number | Failed transaction count                 |
| `complaints`          | number | Customer complaints                      |
| `downtime_minutes`    | number | System downtime in minutes               |
| `fraud_incidents`     | number | Fraud incidents *(optional, default 0)*  |

---

## Performance Tiers

| Tier      | Score | Meaning                                   |
|-----------|-------|-------------------------------------------|
| Excellent | >= 75 | Top performing — maintain and replicate   |
| Good      | 55-74 | Healthy — minor improvements possible     |
| Average   | 35-54 | Needs attention — investigate root causes |
| Poor      | < 35  | Critical — immediate action required      |

**Score formula:** `active_user_ratio (25%) + uptime (20%) + failure_rate (20%) + revenue_growth (15%) + operational_risk (20%)`

---

## User Roles

| Role        | Permissions                                                      |
|-------------|------------------------------------------------------------------|
| **Admin**   | Full access — manage users, train models, upload, view audit log |
| **Analyst** | Upload data, train models, run predictions, view all analytics   |
| **Viewer**  | Read-only — view dashboard, rankings, predictions, reports       |

> Passwords must be at least 8 characters for all roles.

---

## Folder Watcher

When `WATCH_DATA_FOLDER=true` in `.env`, the app automatically monitors the `data/raw/` folder
on startup. Any new CSV / Excel / JSON file dropped into that folder is:

1. Registered as a `Dataset` record in the database
2. Run through feature engineering
3. Stored in `data/processed/` and the `channel_metrics` table

You can also run the watcher as a standalone script:

```powershell
cd backend
python scripts/monitor_data_folder.py
```

---

## Scripts

| Script                               | Purpose                                           |
|--------------------------------------|---------------------------------------------------|
| `scripts/generate_sample_data.py`    | Generate realistic 8-channel sample dataset       |
| `scripts/monitor_data_folder.py`     | Standalone folder watcher (creates DB records)    |
| `scripts/run_feature_engineering.py` | Manually run feature engineering on a single file |

---

## API Endpoints

| Method | Path                                       | Description                 | Role     |
|--------|--------------------------------------------|-----------------------------|----------|
| POST   | /api/v1/auth/login/json                    | Login (JSON body)           | Public   |
| GET    | /api/v1/auth/me                            | Current user profile        | All      |
| PUT    | /api/v1/auth/me                            | Update own profile          | All      |
| PUT    | /api/v1/auth/me/password                   | Change own password         | All      |
| GET    | /api/v1/users                              | List all users              | Admin    |
| POST   | /api/v1/users                              | Create user                 | Admin    |
| PUT    | /api/v1/users/{id}                         | Update user                 | Admin    |
| PUT    | /api/v1/users/{id}/reset-password          | Reset user password         | Admin    |
| DELETE | /api/v1/users/{id}                         | Delete user                 | Admin    |
| POST   | /api/v1/upload/dataset                     | Upload dataset              | Analyst+ |
| GET    | /api/v1/upload/list                        | List datasets               | All      |
| GET    | /api/v1/upload/dataset/{id}                | Get dataset details         | All      |
| POST   | /api/v1/upload/process/{id}                | Re-run feature engineering  | Analyst+ |
| POST   | /api/v1/upload/scan-folder                 | Scan raw data folder        | Analyst+ |
| DELETE | /api/v1/upload/dataset/{id}                | Delete dataset              | Analyst+ |
| POST   | /api/v1/ml/train                           | Train ML model              | Analyst+ |
| GET    | /api/v1/ml/models                          | List models                 | All      |
| GET    | /api/v1/ml/models/{id}                     | Get model details           | All      |
| DELETE | /api/v1/ml/models/{id}                     | Delete model                | Analyst+ |
| POST   | /api/v1/ml/predict/{model_id}/{dataset_id} | Run predictions             | Analyst+ |
| GET    | /api/v1/ml/predictions/{model_id}          | Get predictions             | All      |
| GET    | /api/v1/dashboard/kpis                     | KPI summary                 | All      |
| GET    | /api/v1/dashboard/channel-ranking          | Channel rankings            | All      |
| GET    | /api/v1/dashboard/channel-performance      | Per-channel metric summary  | All      |
| GET    | /api/v1/dashboard/model-comparison         | Model metrics comparison    | All      |
| GET    | /api/v1/dashboard/prediction-distribution  | Tier count breakdown        | All      |
| GET    | /api/v1/dashboard/recent-activity          | Latest uploads and training | All      |
| GET    | /api/v1/analytics/confusion-matrix/{id}    | Confusion matrix            | All      |
| GET    | /api/v1/analytics/data-profile/{id}        | Dataset statistics          | All      |
| GET    | /api/v1/analytics/channel-trend            | Channel trend over time     | All      |
| GET    | /api/v1/analytics/channels-overview        | All-channels summary        | All      |
| GET    | /api/v1/analytics/export/predictions/{id}  | Download predictions CSV    | All      |
| GET    | /api/v1/analytics/export/dataset/{id}      | Download processed CSV      | All      |
| GET    | /api/v1/analytics/audit-log                | Platform audit log          | All      |
| PUT    | /api/v1/analytics/model-notes/{id}         | Add notes to a model        | Analyst+ |
| GET    | /api/v1/report/data                        | Smart report (JSON)         | All      |
| GET    | /api/v1/report/download                    | Download report (.md)       | All      |
| GET    | /health                                    | Health check (DB status)    | Public   |
