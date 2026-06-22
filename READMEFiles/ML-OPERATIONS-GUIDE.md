# 🤖 Machine Learning Operations Guide

## Ahadu Bank Digital Product Evaluation Platform - ML Pipeline

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [ML Pipeline Phases](#ml-pipeline-phases)
3. [API Endpoints](#api-endpoints)
4. [Quick Start Guide](#quick-start-guide)
5. [Production Workflow](#production-workflow)
6. [Model Management](#model-management)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## 🏗️ Architecture Overview

### **Professional ML Pipeline Design**

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRAINING PHASE (Rare)                        │
│                  Manual or Scheduled Trigger                     │
├─────────────────────────────────────────────────────────────────┤
│  Upload Historical Data → Train Models → Validate → Deploy      │
│                                                                  │
│  Frequency: Initial setup, weekly/monthly, or on-demand         │
│  Duration: ~26 seconds (6 models)                               │
│  Endpoint: POST /api/ml/train-all                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  INFERENCE PHASE (Frequent)                     │
│                    On Every Data Upload                          │
├─────────────────────────────────────────────────────────────────┤
│  Upload Data → Feature Engineering → Predict → Score → Alert    │
│                                                                  │
│  Frequency: Multiple times daily                                │
│  Duration: ~2-5 seconds                                         │
│  Endpoint: POST /api/data/upload                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 RETRAINING PHASE (Periodic)                     │
│              When Performance Degrades or Drift                  │
├─────────────────────────────────────────────────────────────────┤
│  Detect Drift → Evaluate Need → Retrain → A/B Test → Deploy    │
│                                                                  │
│  Frequency: Monthly or when model performance drops             │
│  Duration: ~26 seconds                                          │
│  Endpoint: POST /api/ml/retrain                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 ML Pipeline Phases

### **Phase 1: Initial Training** (One-time Setup)

**Purpose:** Train models on historical data for first-time deployment

**Steps:**
1. Collect 3-6 months of historical data
2. Upload via `/api/data/upload`
3. Manually trigger training via `/api/ml/train-all`
4. Validate model performance
5. Deploy to production

**When to Run:**
- ✅ First-time system setup
- ✅ After major data schema changes
- ✅ After adding new features

**Roles Required:** `super_admin` or `ml_engineer`

---

### **Phase 2: Daily Operations** (Production Use)

**Purpose:** Process new data and generate predictions using trained models

**What Happens:**
```
User Upload → Feature Engineering → Load Pre-trained Model → Predict → Score
```

**Automatic Actions:**
1. ✅ Feature engineering (derives 23 features)
2. ✅ Scoring with pre-trained models
3. ✅ Recommendations generation
4. ✅ Alert detection
5. ❌ NO model training (uses existing models)

**Performance:**
- Upload processing: ~2-5 seconds
- No model training overhead
- Instant predictions

**Roles Required:** `super_admin`, `data_engineer`, `ml_engineer`

---

### **Phase 3: Periodic Retraining** (Maintenance)

**Purpose:** Update models with accumulated new data

**Triggers:**
- 📅 **Scheduled**: Weekly/monthly via cron job
- 📊 **Data-driven**: After accumulating 1000+ new records
- 📉 **Performance-driven**: When model accuracy drops
- 🎯 **Manual**: Admin decision

**How to Trigger:**
```bash
# Method 1: Train all models
POST /api/ml/train-all

# Method 2: Train specific model type
POST /api/ml/retrain
{
  "model_type": "random_forest",
  "reason": "Monthly scheduled retrain"
}
```

**Roles Required:** `super_admin` or `ml_engineer`

---

## 🔌 API Endpoints

### **Data Upload Endpoints**

#### `POST /api/data/upload`
**Purpose:** Upload new data for inference (NO training)

**Request:**
```bash
curl -X POST "http://localhost:8000/api/data/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@channel_data.csv"
```

**Response:**
```json
{
  "status": "success",
  "filename": "channel_data.csv",
  "rows_imported": 150,
  "rows_failed": 0,
  "products_in_upload": [1, 2, 3, 4, 5, 6],
  "message": "Imported 150 row(s) for 6 channel(s). Feature engineering, scoring, and alerts running in background using pre-trained models."
}
```

**What Happens:**
- ✅ Data validation
- ✅ Feature engineering
- ✅ Prediction with existing model
- ✅ Scoring and alerts
- ❌ NO model training

---

### **Model Training Endpoints**

#### `POST /api/ml/train-all`
**Purpose:** Train all 6 model types from scratch

**Request:**
```bash
curl -X POST "http://localhost:8000/api/ml/train-all" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "message": "Full retrain queued via Celery.",
  "task_id": "abc-123-def",
  "mode": "celery"
}
```

**Models Trained:**
1. Logistic Regression Classifier
2. Random Forest Classifier
3. Decision Tree Classifier
4. Gradient Boosting Classifier
5. Ridge Regressor
6. KNN Similarity Model

**Duration:** ~26 seconds

---

#### `POST /api/ml/train`
**Purpose:** Train a specific model type

**Request:**
```bash
curl -X POST "http://localhost:8000/api/ml/train" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model_type": "random_forest",
    "hyperparameters": {
      "n_estimators": 100,
      "max_depth": 8
    },
    "dataset_version": "1.0.0"
  }'
```

**Available Model Types:**
- `classification` - Logistic Regression
- `random_forest` - Random Forest
- `decision_tree` - Decision Tree
- `gradient_boosting` - Gradient Boosting
- `regression` - Ridge Regression
- `similarity` - KNN Similarity

---

#### `POST /api/ml/retrain`
**Purpose:** Smart retraining with conditions

**Request:**
```bash
curl -X POST "http://localhost:8000/api/ml/retrain" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model_type": "random_forest",
    "reason": "Weekly scheduled retrain"
  }'
```

---

#### `GET /api/ml/models`
**Purpose:** List all trained models

**Response:**
```json
[
  {
    "id": 15,
    "model_name": "RandomForest_Classifier",
    "model_type": "random_forest",
    "version": "20260620114853",
    "accuracy": 0.95,
    "f1_score": 0.93,
    "is_active": true,
    "created_at": "2026-06-20T11:48:53"
  }
]
```

---

#### `POST /api/ml/select-best`
**Purpose:** Auto-select best performing models

**What it Does:**
- Compares all trained models
- Selects best classifier (lowest log_loss)
- Selects best regressor (lowest MAE)
- Promotes them to active

---

#### `GET /api/ml/drift`
**Purpose:** Check for model drift

**Response:**
```json
{
  "drift_detected": false,
  "feature_drift": {},
  "performance_degradation": 0.02,
  "recommendation": "No retraining needed"
}
```

---

## 🚀 Quick Start Guide

### **Step 1: Initial Setup (First Time Only)**

```bash
# 1. Start the backend
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 2. Login and get token
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@ahadubank.com", "password": "admin123"}'

# Save the access_token from response

# 3. Upload historical data (3-6 months)
curl -X POST "http://localhost:8000/api/data/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@historical_data.csv"

# 4. Train all models (IMPORTANT!)
curl -X POST "http://localhost:8000/api/ml/train-all" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. Wait ~26 seconds, then verify models
curl -X GET "http://localhost:8000/api/ml/models" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### **Step 2: Daily Operations**

```bash
# Upload new data (fast, uses pre-trained models)
curl -X POST "http://localhost:8000/api/data/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@daily_data.csv"

# Get predictions
curl -X GET "http://localhost:8000/api/ml/predictions/1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check scores
curl -X GET "http://localhost:8000/api/scores/product/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### **Step 3: Weekly Maintenance**

```bash
# Check model health
curl -X GET "http://localhost:8000/api/ml/drift" \
  -H "Authorization: Bearer YOUR_TOKEN"

# If drift detected, retrain
curl -X POST "http://localhost:8000/api/ml/train-all" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🏭 Production Workflow

### **Development Environment**
```
Train: Multiple times per day (iterate quickly)
Data: Sample/synthetic data
Focus: Feature development, experimentation
```

### **Staging Environment**
```
Train: When testing new features
Data: Production-like data
Focus: Validation, integration testing
```

### **Production Environment**
```
Train: Weekly/monthly scheduled
Data: Real production data
Focus: Stability, performance, monitoring
```

---

## 📊 Model Management

### **Model Artifacts Location**
```
backend/ml_models/
├── classifier_latest.pkl          # Current best classifier
├── regressor_latest.pkl           # Current best regressor
├── similarity_latest.pkl          # Current similarity model
├── scaler_latest.pkl              # Feature scaler
├── features_latest.json           # Feature list
├── classifier_v20260620114845.pkl # Versioned backups
└── ...
```

### **Model Versioning**
- Models are versioned by timestamp: `YYYYMMDD_HHMMSS`
- Latest models are symlinked for fast access
- Old versions retained for rollback

### **Model Comparison**
```bash
# List all models with metrics
curl -X GET "http://localhost:8000/api/ml/models" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Compare performance
{
  "logistic_regression": {"accuracy": 0.92, "f1": 0.89},
  "random_forest": {"accuracy": 0.95, "f1": 0.93},
  "gradient_boosting": {"accuracy": 0.94, "f1": 0.91}
}
```

---

## 🔧 Troubleshooting

### **Problem: Upload succeeds but no predictions**
**Solution:** Models not trained yet
```bash
# Check if models exist
curl -X GET "http://localhost:8000/api/ml/models"

# If empty, train models
curl -X POST "http://localhost:8000/api/ml/train-all"
```

---

### **Problem: "Not enough data for training"**
**Solution:** Need more historical data
- Minimum: 50 records
- Recommended: 500+ records
- Ideal: 3-6 months of data across all products

---

### **Problem: Poor prediction accuracy**
**Solution:**
1. Upload more diverse historical data
2. Check class balance (LOW/MEDIUM/HIGH)
3. Retrain with hyperparameter tuning
4. Verify feature quality

---

### **Problem: Training takes too long**
**Solution:**
- Normal: 26 seconds for 6 models
- If longer: Check dataset size
- Consider training only needed models:
```bash
# Train only one model type
POST /api/ml/train
{
  "model_type": "random_forest"
}
```

---

### **Problem: Model drift detected**
**Solution:**
```bash
# 1. Check drift metrics
GET /api/ml/drift

# 2. If significant drift, retrain
POST /api/ml/train-all

# 3. Compare old vs new model
GET /api/ml/models

# 4. If new model is better, it's auto-promoted
```

---

## ✅ Best Practices

### **Data Upload**
- ✅ Upload complete, validated datasets
- ✅ Include all required columns
- ✅ Use consistent date formats (YYYY-MM-DD)
- ✅ Check for missing values
- ❌ Don't upload incomplete or partial data

### **Model Training**
- ✅ Train on comprehensive historical data (3-6 months)
- ✅ Train during low-traffic periods
- ✅ Validate model performance before deployment
- ✅ Keep previous model versions for rollback
- ❌ Don't train on every upload (inference-only in production)
- ❌ Don't train with insufficient data (<50 records)

### **Retraining Schedule**
- 📅 **Weekly**: For rapidly changing environments
- 📅 **Bi-weekly**: Standard production schedule
- 📅 **Monthly**: Stable environments
- 🚨 **On-demand**: When drift detected or accuracy drops

### **Monitoring**
- 📊 Check model drift weekly
- 📊 Track prediction accuracy
- 📊 Monitor training metrics
- 📊 Log all training events

---

## 🎯 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Upload Processing | < 5 seconds | ~3 seconds |
| Feature Engineering | < 10 seconds | ~8 seconds |
| Model Training (all 6) | < 60 seconds | ~26 seconds |
| Prediction Latency | < 1 second | ~0.5 seconds |
| Model Accuracy | > 85% | ~95% |
| Model F1 Score | > 0.80 | ~0.93 |

---

## 📞 Support

**For ML-related issues:**
- Email: ml-team@ahadubank.com
- Slack: #ml-operations
- Docs: https://docs.ahadubank.com/ml-ops

**For API issues:**
- Email: api-support@ahadubank.com
- Slack: #api-support

---

## 📝 Changelog

### Version 2.0.0 (2026-06-20)
- ✅ Separated training from inference
- ✅ Added smart retraining logic
- ✅ Improved model versioning
- ✅ Added drift detection
- ✅ Optimized for production use

### Version 1.0.0 (2026-01-01)
- Initial release with auto-training on upload

---

## 📄 License

Copyright © 2026 Ahadu Bank S.C.  
Internal use only. Confidential.
