# Procedures Guide — Digital Channels Performance Evaluation

Step-by-step procedures for every workflow in the platform.

---

## Procedure 1: First-Time Setup

1. Ensure MariaDB/MySQL is running (XAMPP → Start MySQL)
2. Create the database in phpMyAdmin or MySQL shell:
   ```sql
   CREATE DATABASE digital_channels_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Edit `backend/.env` — set `DATABASE_URL` with your host, port, user, password
4. Open PowerShell in the project root:
   ```powershell
   cd backend
   pip install -r requirements.txt
   python -c "from app.database import create_tables; create_tables()"
   python scripts/generate_sample_data.py
   uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
   ```
5. Open a second PowerShell:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
6. Open http://localhost:5173 and log in with your credential

---

## Procedure 2: Upload and Process a Dataset

1. Go to **Data Management** in the sidebar
2. Drag your CSV/Excel/JSON file onto the upload zone, or click to browse
3. The file uploads and feature engineering starts automatically in the background
4. Watch the dataset list — status changes: `pending → processing → completed`
5. Click any dataset row to open the detail drawer showing:
   - Validation report (row count, date range, missing values)
   - All 14 engineered features that were created
6. If status shows `failed`, click the refresh icon to re-process

**Batch processing from folder:**
- Drop files directly into `backend/data/raw/`
- Click **Scan Data Folder** button — the system finds and processes untracked files

---

## Procedure 3: Train an ML Model

1. Go to **Model Training** in the sidebar
2. Ensure at least one dataset shows `completed` status
3. Select a dataset from the dropdown
4. Choose model type:
   - **XGBoost** — recommended for best accuracy
   - **Random Forest** — good for interpretability
   - **Gradient Boosting** — high accuracy, slower training
5. Click **Train Model**
6. The model appears in the table with `training` status
7. Wait for status to change to `ready` (auto-refreshes every 10 seconds)
8. Click the open icon on any model row to see:
   - Accuracy, F1, Precision, Recall with visual bars
   - Feature importance chart showing which metrics matter most
   - Training parameters (samples, features, test split)

---

## Procedure 4: Run Predictions

1. Go to **Predictions** in the sidebar
2. Select a ready model from the Model dropdown
3. Select a processed dataset from the Dataset dropdown
4. Click **Run Predictions**
5. Results appear in the table showing:
   - Product ID
   - Date
   - Performance Tier (Excellent/Good/Average/Poor)
   - Confidence bar
6. Use the tier filter chips to show only specific tiers
7. Use the search box to find a specific channel
8. Click **Export** to download all predictions as CSV

---

## Procedure 5: View Channel Rankings

1. Go to **Channel Ranking** in the sidebar
2. Select a model from the dropdown
3. The ranking loads automatically showing:
   - **Podium** — top 3 channels with scores
   - **Score bar chart** — top 10 channels
   - **Full table** — all channels ranked 1 to N
4. Use tier filter chips to show only specific performance tiers
5. Use the search box to find a specific channel
6. Toggle between **Table** and **Cards** view
7. Trend icons show: ↑ improving, → stable, ↓ declining

---

## Procedure 6: Analyze Model Performance

1. Go to **Analytics** in the sidebar
2. Select a model and dataset from the droppers
3. **Confusion Matrix** — shows predicted vs actual tier distribution
   - Diagonal = correct predictions (highlighted in tier color)
   - Off-diagonal = errors (highlighted in red)
   - Per-class precision, recall, F1 table below
4. **Channel Trend** — select a channel from the dropdown
   - Area chart shows score over time
   - Reference lines mark tier boundaries
   - Click any channel row in the overview table to switch channels
5. **Data Profile** — statistical summary of all numeric features
   - Skewness > 1 highlighted in orange (potential outlier issue)
   - Missing values highlighted in orange
6. **Export buttons** — download predictions or processed dataset as CSV

---

## Procedure 7: Generate a Smart Report

1. Go to **Smart Report** in the sidebar
2. Select a model from the dropdown
3. The report generates automatically showing:
   - Average portfolio score gauge
   - KPI cards (tier counts, improving/declining counts)
   - Tier distribution pie chart
   - Top 10 channel scores bar chart
   - Top 3 performers podium
   - Bottom 3 channels needing attention
   - AI-generated executive narrative with recommendations
   - Full rankings table
4. Click **Download .md** to save the report as a Markdown file
5. Click **Regenerate** to refresh with latest data

---

## Procedure 8: Manage Users (Admin Only)

1. Go to **User Management** in the sidebar (Admin only)
2. **Create a user:**
   - Click **Add User**
   - Enter full name, email, password, and select role
   - Click **Create User**
3. **Edit a user:**
   - Click the edit (pencil) icon on any row
   - Change name, email, role, or toggle active/disabled
   - Click **Save Changes**
4. **Reset a password:**
   - Click the key icon on any row
   - Enter the new password
   - Click **Reset Password**
5. **Delete a user:**
   - Click the delete (trash) icon
   - Confirm the deletion
   - Note: you cannot delete your own account

---

## Procedure 9: Change Your Password

1. Click your avatar or name in the bottom of the sidebar
2. Go to **My Profile**
3. Scroll to **Change Password**
4. Enter your current password
5. Enter and confirm your new password (minimum 6 characters)
6. Click **Update Password**

---

## Procedure 10: View Audit Log (Admin Only)

1. Go to **Audit Log** in the sidebar (Admin only)
2. The log shows all platform events:
   - Dataset uploads and processing completions
   - Model training starts and completions
   - User logins
3. Use the search box to find specific events
4. Use the type filter to show only uploads, processing, training, or logins
5. Use the Show dropdown to load more events (25/50/100/200)
6. Click **Refresh** to load the latest events

---

## Procedure 12: Batch Feature Engineering via CLI

Process a single file:
```powershell
cd backend
python scripts/run_feature_engineering.py --file data/raw/my_data.csv
```

Process all files in a folder:
```powershell
python scripts/run_feature_engineering.py --folder data/raw/
```

Process all unprocessed raw files:
```powershell
python scripts/run_feature_engineering.py --all
```

---

## Procedure 13: Monitor Data Folder (Auto-Processing)

Start the folder watcher — it automatically processes any new file dropped into `data/raw/`:

```powershell
cd backend
python scripts/monitor_data_folder.py
```

Leave this running in a separate terminal. Any CSV/Excel/JSON file copied into
`backend/data/raw/` will be automatically feature-engineered.

---

## Procedure 14: Database Migration (After Code Changes)

If the database schema changes (new columns added to models.py):

```powershell
cd backend

# Generate a new migration
alembic revision --autogenerate -m "describe your change"

# Apply the migration
alembic upgrade head

# Check current migration state
alembic current
```

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| Login returns 401 | Run the emergency password reset (Procedure 11) |
| Dataset stuck at `processing` | Check backend logs; click re-process button |
| Model stuck at `training` | Check backend logs for training errors |
| `ModuleNotFoundError: No module named app` | Run uvicorn from inside the `backend/` directory |
| Port 3000 blocked | Vite uses port 5173 by default in this project |
| MariaDB connection refused | Check XAMPP MySQL is started; verify port in `.env` |
| `password cannot be longer than 72 bytes` | bcrypt version mismatch — run `pip install bcrypt==4.0.1` |
| Frontend shows blank page | Check browser console; ensure backend is running on port 8000 |
