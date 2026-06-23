# XGBoost Usage Flow in the System

## 🎯 Overview
XGBoost is trained as a **classification model** in your system (via `ml_pipeline.py`) but is **NOT automatically used in predictions** by default. Instead, the system uses a model selection strategy.

---

## 📊 When XGBoost is Used

### 1. **TRAINING PHASE** (When Models Are Trained)

#### Trigger:
- Bulk upload of data completes → Feature engineering done → `_trigger_model_training()` is called
- OR manually via `POST /api/v1/ml/train` endpoint

#### What happens:
```python
# File: backend/app/core/ml_pipeline.py
MODEL_REGISTRY = {
    "xgboost": lambda: XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        eval_metric="mlogloss",
        random_state=42,
    ),
    "random_forest": ...,
    "gradient_boosting": ...,
}

# Training command (default model)
ml_pipeline.train(processed_file=Path(...), model_type="xgboost")
```

**Models Trained Together:**
1. XGBoost (classification)
2. Random Forest (classification)
3. Decision Tree (classification)
4. Gradient Boosting (classification)
5. Ridge Regressor (scoring)
6. Similarity model

**Output:** All trained models are saved to `ModelRegistry` table with metrics (accuracy, F1, log_loss)

---

### 2. **MODEL SELECTION PHASE** (Which Model Actually Predicts)

After all models are trained, `select_best_model()` is called:

```python
# File: backend/app/services/ml_service.py
def select_best_model(self, db: Session) -> dict:
    # Query all classifiers
    clf_types = ["classification", "random_forest", "decision_tree", "gradient_boosting"]
    all_classifiers = db.query(ModelRegistry).filter(
        ModelRegistry.model_type.in_(clf_types)
    ).all()

    # Select classifier with LOWEST log_loss (best performance)
    best_clf = min(all_classifiers, key=lambda m: m.mse)
    
    # Set is_active = True for the winner
    best_clf.is_active = True
    
    # Copy to production
    shutil.copy2(best_clf.file_path, "classifier_latest.pkl")
```

**Selection Criteria:**
- **For Classification:** Lowest **log_loss** (or MSE) among all trained classifiers
- **For Regression:** Lowest **MAE** among regressors

**Possible Winners:**
- ✅ XGBoost (if it has the best log_loss)
- ✅ Random Forest (if it has the best log_loss)
- ✅ Decision Tree (if it has the best log_loss)
- ✅ Gradient Boosting (if it has the best log_loss)

---

### 3. **PREDICTION PHASE** (When the System Makes Predictions)

When predictions are needed, the system loads the **active model** (NOT necessarily XGBoost):

```python
# File: backend/app/services/ml_service.py
def predict(self, db: Session, product_id: int, features: dict) -> dict:
    
    # Load the ACTIVE classifier (whichever won in select_best_model)
    cls_model = self._load_artifact("classifier_latest.pkl")
    
    if cls_model is None:
        # Fallback: Query DB for active classifier
        cls_rec = db.query(ModelRegistry).filter(
            ModelRegistry.model_type.in_(
                ["classification", "random_forest", "decision_tree", "gradient_boosting"]
            ),
            ModelRegistry.is_active == True  # ← THE ACTIVE ONE
        ).first()
    
    # Make prediction with the ACTIVE model (might be XGBoost or another)
    tier = cls_model.predict(feature_vector)[0]
    confidence = cls_model.predict_proba(feature_vector).max()
    
    return {
        "predicted_tier": tier,
        "confidence": confidence,
        "model_version": cls_model.model_type  # e.g., "xgboost" or "random_forest"
    }
```

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────┐
│  1. BULK UPLOAD                 │
│  - User uploads CSV/Excel/JSON  │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  2. FEATURE ENGINEERING         │
│  - Background task processes    │
│  - Creates processed_features   │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  3. AUTO-TRAINING (if enabled)  │
│  AUTO_TRAIN_ON_UPLOAD=true      │
│                                 │
│  Trains:                        │
│  ├─ XGBoost                     │ ◄─ DEFAULT MODEL
│  ├─ Random Forest               │
│  ├─ Decision Tree               │
│  ├─ Gradient Boosting           │
│  ├─ Ridge Regressor             │
│  └─ Similarity Model            │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  4. MODEL SELECTION             │
│  select_best_model()            │
│                                 │
│  Picks classifier with          │
│  LOWEST log_loss                │
│                                 │
│  Winner marked: is_active=True  │
│  (Could be any of the 4)        │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  5. PREDICTIONS                 │
│  predict(product_id, features)  │
│                                 │
│  Uses: classifier_latest.pkl    │
│  (The active/best model)        │
│                                 │
│  Returns:                       │
│  ├─ predicted_score             │
│  ├─ predicted_tier              │
│  ├─ confidence                  │
│  └─ model_version               │
└─────────────────────────────────┘
```

---

## 📍 Where XGBoost Is Used

### ✅ **DEFINITELY Used For:**
| When | Where | Purpose |
|------|-------|---------|
| **Training** | `ml_pipeline.train(model_type="xgboost")` | Train classification model |
| **Seedingt** | `backend/app/db/seed.py` (line 350) | Register as initial model |
| **Scoring** | `backend/app/db/seed.py` (line 277) | Make predictions during seeding |

### ❓ **CONDITIONALLY Used For:**
| When | Condition | Purpose |
|------|-----------|---------|
| **Predictions** | IF XGBoost has **lowest log_loss** in `select_best_model()` | Classify products into performance tiers |
| **Auto-Training** | IF `AUTO_TRAIN_ON_UPLOAD=true` in `.env` | Auto-train after bulk upload |

### ❌ **NOT Used For:**
- Regression (scoring) — Uses Ridge Regressor
- Similarity matching — Uses KNN-based model
- If another model (RF, DT, GB) performs better

---

## 🚀 How to Ensure XGBoost Is Used for Predictions

### Option 1: Enable Auto-Training (Recommended for Development)
```bash
# Edit: backend/.env
AUTO_TRAIN_ON_UPLOAD=true
```

Then:
1. Upload data → XGBoost trains → if best performance → gets `is_active=True`

### Option 2: Check Active Model
```bash
# Query the DB
SELECT model_name, model_type, is_active, accuracy, f1_score 
FROM model_registry 
WHERE is_active = TRUE;
```

If the active model is NOT XGBoost, check the log_loss values:
```bash
SELECT model_type, f1_score, accuracy, mse 
FROM model_registry 
ORDER BY mse ASC 
LIMIT 5;
```

If XGBoost's MSE is higher than others, it won't be selected.

### Option 3: Manually Set XGBoost as Active
```bash
# Update DB
UPDATE model_registry 
SET is_active = FALSE 
WHERE is_active = TRUE AND model_type IN ('classification', 'random_forest', 'decision_tree', 'gradient_boosting');

UPDATE model_registry 
SET is_active = TRUE 
WHERE model_type = 'xgboost' 
LIMIT 1;
```

---

## 📈 Key Files

| File | Purpose |
|------|---------|
| `ml_pipeline.py` | Defines XGBoost training config |
| `ml_service.py` | Selects best model, makes predictions |
| `upload.py` | Triggers auto-training after upload |
| `seed.py` | Seeds initial models |
| `config.py` | `AUTO_TRAIN_ON_UPLOAD` setting |

---

## ⚙️ Current Configuration

**Status:**
- ✅ XGBoost is **installed** and **configured**
- ✅ XGBoost can be **trained**
- ❌ XGBoost auto-training is **DISABLED** (AUTO_TRAIN_ON_UPLOAD=false)
- ❓ XGBoost may or may not be **actively predicting** (depends on model selection)

**To Verify:** Check `model_registry` table for `is_active=True` model type.

---

## 🔍 API Endpoints for XGBoost

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/ml/train` | `POST` | Train XGBoost (or other models) |
| `/api/v1/ml/retrain` | `POST` | Retrain all models |
| `/api/v1/ml/train-all` | `POST` | Train all model types at once |
| `/api/v1/ml/select-best` | `POST` | Run model selection |
| `/api/v1/ml/list-models` | `GET` | See all trained models + is_active status |
| `/api/v1/ml/check-drift` | `GET` | Check model drift |

---

## 💡 Summary

**XGBoost is READY to use but may not be ACTIVELY PREDICTING unless:**

1. ✅ Auto-training is enabled (`AUTO_TRAIN_ON_UPLOAD=true`)
2. ✅ Data has been uploaded and trained
3. ✅ XGBoost has the best performance metrics (lowest log_loss) among classifiers
4. ✅ `is_active=True` is set in `model_registry` for XGBoost

If you want to **guarantee XGBoost is used**, manually set it as active in the database after training.
