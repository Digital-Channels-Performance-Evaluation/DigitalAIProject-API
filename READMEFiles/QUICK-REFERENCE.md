# ⚡ Quick Reference Guide

## ML Operations - Cheat Sheet

---

## 🎬 Initial Setup (One-time)

```bash
# 1. Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@ahadubank.com", "password": "admin123"}'

# 2. Upload historical data
curl -X POST http://localhost:8000/api/data/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@historical_data.csv"

# 3. Train models (REQUIRED!)
curl -X POST http://localhost:8000/api/ml/train-all \
  -H "Authorization: Bearer TOKEN"
```

---

## 📤 Daily Data Upload (Inference Only)

```bash
# Upload new data - NO training, uses existing models
curl -X POST http://localhost:8000/api/data/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@daily_data.csv"
```

**What happens:**
- ✅ Feature engineering
- ✅ Predictions with pre-trained model
- ✅ Scoring & alerts
- ❌ NO model training (fast!)

---

## 🔄 Retraining Models

### Train All Models (Full Retrain)
```bash
curl -X POST http://localhost:8000/api/ml/train-all \
  -H "Authorization: Bearer TOKEN"
```

### Train Specific Model
```bash
curl -X POST http://localhost:8000/api/ml/train \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model_type": "random_forest",
    "dataset_version": "1.0.0"
  }'
```

### Smart Retrain (Conditional)
```bash
curl -X POST http://localhost:8000/api/ml/retrain \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model_type": "random_forest",
    "reason": "Weekly scheduled retrain"
  }'
```

---

## 📊 Model Management

### List All Models
```bash
curl -X GET http://localhost:8000/api/ml/models \
  -H "Authorization: Bearer TOKEN"
```

### Check Model Drift
```bash
curl -X GET http://localhost:8000/api/ml/drift \
  -H "Authorization: Bearer TOKEN"
```

### Select Best Model
```bash
curl -X POST http://localhost:8000/api/ml/select-best \
  -H "Authorization: Bearer TOKEN"
```

---

## 🔮 Predictions

### Get 3-Month Predictions
```bash
curl -X GET http://localhost:8000/api/ml/predictions/1 \
  -H "Authorization: Bearer TOKEN"
```

### Get Product Score
```bash
curl -X GET http://localhost:8000/api/scores/product/1 \
  -H "Authorization: Bearer TOKEN"
```

### Get Recommendations
```bash
curl -X GET http://localhost:8000/api/recommendations/product/1 \
  -H "Authorization: Bearer TOKEN"
```

---

## 🚨 When to Retrain

| Scenario | Action | Frequency |
|----------|--------|-----------|
| Initial setup | ✅ Train | Once |
| Daily operations | ❌ Don't train | Multiple/day |
| Weekly maintenance | ✅ Train if drift | Weekly |
| Poor accuracy | ✅ Train | On-demand |
| New feature added | ✅ Train | Once |
| Large data update | ✅ Train | On-demand |

---

## 🎯 Model Types

| Type | Use Case | Training Time |
|------|----------|---------------|
| `classification` | Tier prediction (LOW/MEDIUM/HIGH) | ~8s |
| `random_forest` | Best accuracy, ensemble | ~7s |
| `decision_tree` | Fast, interpretable | ~0.3s |
| `gradient_boosting` | High accuracy, slow | ~9s |
| `regression` | Score prediction (0-100) | ~0.2s |
| `similarity` | Product comparison | ~0.2s |

**Total training time (all 6):** ~26 seconds

---

## 📁 Required CSV Columns

```csv
product_code,metric_date,total_users,active_users,transaction_count,transaction_value,revenue,failed_transactions,complaints,downtime_minutes,fraud_incidents
CHANNEL_001,2026-06-01,1000,800,5000,250000,12500,50,5,30,2
```

**Required:**
- `product_code` - Product identifier
- `metric_date` - Date (YYYY-MM-DD)
- `total_users` - Total registered users
- `active_users` - Monthly active users
- `transaction_count` - Number of transactions
- `transaction_value` - Total transaction value
- `revenue` - Revenue generated
- `failed_transactions` - Failed count
- `complaints` - Customer complaints
- `downtime_minutes` - System downtime
- `fraud_incidents` - Fraud events

---

## 🔐 User Roles

| Role | Upload Data | Train Models | View Predictions |
|------|-------------|--------------|------------------|
| `super_admin` | ✅ | ✅ | ✅ |
| `ml_engineer` | ✅ | ✅ | ✅ |
| `data_engineer` | ✅ | ❌ | ✅ |
| `product_manager` | ❌ | ❌ | ✅ |
| `executive_management` | ❌ | ❌ | ✅ |

---

## ⏱️ Performance Benchmarks

| Operation | Expected Time |
|-----------|---------------|
| Upload CSV (100 rows) | ~3 seconds |
| Feature engineering | ~8 seconds |
| Single prediction | <1 second |
| Train all models | ~26 seconds |
| Train single model | ~0.2-9 seconds |

---

## 🐛 Common Issues

### "No models found"
**Fix:** Train models first
```bash
curl -X POST http://localhost:8000/api/ml/train-all \
  -H "Authorization: Bearer TOKEN"
```

### "Not enough data for training"
**Fix:** Upload more historical data (min 50 records, ideal 500+)

### "Poor prediction accuracy"
**Fix:** Upload diverse historical data, retrain models

### "Upload succeeds but no scores"
**Fix:** Models not trained - run `/api/ml/train-all`

---

## 📞 Quick Support

- 🔴 **Critical issues:** ml-ops@ahadubank.com
- 🟡 **Questions:** #ml-operations Slack
- 🟢 **Documentation:** [Full ML Operations Guide](./ML-OPERATIONS-GUIDE.md)

---

## 📌 Remember

**Training vs Inference:**
- 🎓 **Training:** Create/update model (rare, ~26s)
- 🔮 **Inference:** Use existing model (frequent, <5s)

**In Production:**
- ✅ Upload data → Inference (fast, no training)
- ✅ Weekly/monthly → Train (scheduled)
- ❌ Never train on every upload!

---

**Last Updated:** 2026-06-20  
**Version:** 2.0.0
