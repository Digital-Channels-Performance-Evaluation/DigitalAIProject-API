# ML Training Configuration Guide

## Overview

The Ahadu Bank Evaluation Platform now supports **flexible ML training control** through the `AUTO_TRAIN_ON_UPLOAD` environment variable. This allows you to choose between automatic training (convenient for development) and manual training (efficient for production).

---

## 🎯 Training Modes

### Development Mode (Auto-Train)
```bash
AUTO_TRAIN_ON_UPLOAD=true
```

**Behavior:**
- ✅ Models automatically train on every data upload
- ✅ Convenient for rapid iteration and testing
- ⚠️ Slower uploads (~20-30 seconds for training)
- ⚠️ Higher resource usage

**Use When:**
- Setting up the system for the first time
- Testing with new datasets
- Developing and debugging ML features
- Dataset characteristics change frequently

---

### Production Mode (Manual Train)
```bash
AUTO_TRAIN_ON_UPLOAD=false  # Recommended
```

**Behavior:**
- ✅ Fast data uploads (only feature engineering + predictions)
- ✅ Efficient resource usage
- ✅ Predictable performance
- ✅ Control over when training occurs
- ℹ️ Requires manual training trigger

**Use When:**
- System is in production
- Dataset characteristics are stable
- You want to control training schedules
- Cost/performance optimization is important

---

## 📋 How to Configure

### Option 1: Environment Variable

**Backend .env file:**
```bash
# Production (recommended)
AUTO_TRAIN_ON_UPLOAD=false

# Development
AUTO_TRAIN_ON_UPLOAD=true
```

### Option 2: Docker Compose

**docker-compose.yml:**
```yaml
services:
  backend:
    environment:
      - AUTO_TRAIN_ON_UPLOAD=false
```

### Option 3: System Environment Variable

**Windows:**
```powershell
setx AUTO_TRAIN_ON_UPLOAD "false"
```

**Linux/Mac:**
```bash
export AUTO_TRAIN_ON_UPLOAD=false
```

---

## 🔧 Manual Training (Production Workflow)

When `AUTO_TRAIN_ON_UPLOAD=false`, use these methods to train models:

### Method 1: API Endpoint

**Train all models:**
```bash
POST /api/ml/train-all
Authorization: Bearer <admin_token>
```

**Train specific model:**
```bash
POST /api/ml/train
Content-Type: application/json

{
  "model_type": "random_forest",
  "hyperparameters": {}
}
```

### Method 2: Admin Dashboard (Recommended)

Navigate to the ML Management section and click **"Train Models"** button.

### Method 3: Scheduled Training

Set up a cron job or scheduled task:

**Linux cron (weekly):**
```bash
0 2 * * 0 curl -X POST https://api.example.com/api/ml/train-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Windows Task Scheduler:**
- Create scheduled task
- Run: `curl -X POST http://localhost:8000/api/ml/train-all -H "Authorization: Bearer TOKEN"`
- Schedule: Weekly on Sunday at 2 AM

---

## 🚀 Workflow Examples

### First-Time Setup

```bash
# Step 1: Enable auto-training for initial setup
AUTO_TRAIN_ON_UPLOAD=true

# Step 2: Upload historical data
POST /api/data/upload

# Step 3: Wait for training to complete (~30 seconds)
# Models are now ready!

# Step 4: Switch to production mode
AUTO_TRAIN_ON_UPLOAD=false

# Step 5: Continue uploading data (fast, prediction only)
POST /api/data/upload
```

---

### Daily Operations (Production)

```bash
# AUTO_TRAIN_ON_UPLOAD=false

# Morning: Upload daily data (fast!)
POST /api/data/upload
→ Feature engineering
→ Predictions with existing model
→ Results in ~2 seconds

# System uses pre-trained models for scoring
# No training overhead!
```

---

### Periodic Retraining (Production)

```bash
# Weekly or monthly: Retrain with accumulated data
POST /api/ml/train-all

# Check training status
GET /api/ml/task/{task_id}

# Select best performing model
POST /api/ml/select-best
```

---

## 📊 Model Training Details

### Models Trained (All 6 types)

1. **Logistic Regression** - Fast, interpretable baseline
2. **Random Forest** - Robust ensemble method
3. **Decision Tree** - Simple, explainable rules
4. **Gradient Boosting** - High performance ensemble
5. **Ridge Regression** - Continuous score prediction
6. **KNN Similarity** - Product clustering

### Training Process

```
1. Load processed features from database
2. Split data (80% train / 20% test)
3. Hyperparameter tuning with GridSearchCV
4. Cross-validation (5-fold)
5. Train on full dataset
6. Save model artifacts
7. Evaluate performance
8. Select best model
```

### Training Time

- **Small dataset** (<1000 records): ~15 seconds
- **Medium dataset** (1000-10000 records): ~30 seconds
- **Large dataset** (>10000 records): ~60 seconds

---

## 🔍 Monitoring & Logs

### Check Training Status

**Logs when AUTO_TRAIN_ON_UPLOAD=true:**
```
INFO: AUTO_TRAIN_ON_UPLOAD=True: Training models with uploaded data...
INFO: Successfully trained classification model
INFO: Successfully trained random_forest model
INFO: Model training complete. Trained: classification, random_forest, ...
```

**Logs when AUTO_TRAIN_ON_UPLOAD=false:**
```
INFO: AUTO_TRAIN_ON_UPLOAD=False: Skipping training, using existing models for predictions.
INFO: Auto-pipeline complete for products: [1, 2, 3, 4, 5, 6]
```

### View Model Registry

```bash
GET /api/ml/models
```

Response shows all trained models with performance metrics:
```json
[
  {
    "id": 1,
    "model_name": "RandomForest_Classifier",
    "model_type": "random_forest",
    "version": "v20260620114853",
    "accuracy": 0.92,
    "f1_score": 0.91,
    "is_active": true,
    "created_at": "2026-06-20T11:48:53"
  }
]
```

---

## ⚙️ Best Practices

### ✅ DO:

- Use `AUTO_TRAIN_ON_UPLOAD=false` in production
- Train manually on a schedule (weekly/monthly)
- Monitor model performance over time
- Retrain when model drift is detected
- Keep training logs for auditing
- Version your models

### ❌ DON'T:

- Enable auto-training in high-traffic production
- Train on every single data upload
- Ignore model performance degradation
- Skip validation of trained models
- Delete old model versions immediately

---

## 🎓 When to Retrain

Retrain your models when:

1. **Scheduled** - Weekly, monthly, or quarterly
2. **New Data** - Accumulated 1000+ new records
3. **Drift Detected** - Model performance drops >5%
4. **Business Change** - New products or metrics added
5. **Seasonal** - Quarterly to capture trends
6. **Manual Request** - Admin decision based on analysis

---

## 🐛 Troubleshooting

### Issue: Models not training

**Check:**
```bash
# 1. Verify environment variable
echo $AUTO_TRAIN_ON_UPLOAD

# 2. Check logs for training messages
grep "AUTO_TRAIN_ON_UPLOAD" backend.log

# 3. Verify model artifacts exist
ls -la ml_models/
```

### Issue: Training takes too long

**Solutions:**
- Reduce dataset size (sample or aggregate)
- Disable auto-training: `AUTO_TRAIN_ON_UPLOAD=false`
- Use scheduled training during off-peak hours
- Optimize hyperparameter search grid

### Issue: Predictions fail after disabling auto-train

**Fix:**
- Train models at least once before disabling auto-train
- Check model artifacts exist in `./ml_models/` directory
- Manually trigger training: `POST /api/ml/train-all`

---

## 📞 Support

For issues or questions:
- Check logs: `tail -f backend/logs/app.log`
- API docs: `http://localhost:8000/docs`
- Model registry: `GET /api/ml/models`

---

## Summary

| Mode | AUTO_TRAIN_ON_UPLOAD | Best For | Upload Speed | When to Train |
|------|---------------------|----------|--------------|---------------|
| **Development** | `true` | Testing, setup | Slow (~30s) | Every upload |
| **Production** | `false` | Live system | Fast (~2s) | On schedule |

**Recommendation:** Use `AUTO_TRAIN_ON_UPLOAD=false` for production and trigger training manually on a schedule (weekly/monthly).
