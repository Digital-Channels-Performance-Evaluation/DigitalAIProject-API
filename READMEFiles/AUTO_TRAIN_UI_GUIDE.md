# Auto-Train UI Control Guide

## 🎯 Overview

You can now control the `AUTO_TRAIN_ON_UPLOAD` setting directly from the web UI without editing files or restarting the server!

---

## 📍 Where to Find It

### Navigate to: **Model Training** page

1. Log in to the admin dashboard
2. Click on **"Model Training"** in the sidebar
3. Look for the **"Training Configuration"** section at the top

---

## 🎛️ How to Use

### Toggle Switch

The page shows a **toggle switch** with two states:

#### **OFF (Production Mode)** ✅ Recommended
```
Auto-Train OFF
```
- ✅ Fast data uploads (~2 seconds)
- ✅ Only predictions, no training
- ✅ Efficient for production
- ℹ️ Train manually when needed

#### **ON (Development Mode)** ⚠️ Use with caution
```
Auto-Train ON
```
- ⚠️ Slower uploads (~30 seconds)
- 🔄 Trains all 6 models automatically
- 🛠️ Convenient for development
- 💰 Higher resource usage

---

## 📋 Step-by-Step Instructions

### To Enable Auto-Training (Development):

1. **Go to Model Training page**
2. **Find "Training Configuration" section** (top of page)
3. **Click the toggle switch** to turn it ON
4. **See confirmation** - Alert turns orange/warning
5. **Upload data** - Models will auto-train

### To Disable Auto-Training (Production):

1. **Go to Model Training page**
2. **Find "Training Configuration" section**
3. **Click the toggle switch** to turn it OFF
4. **See confirmation** - Alert turns green
5. **Upload data** - Fast predictions only

---

## 🔔 Visual Indicators

### When AUTO-TRAIN is OFF (Production):
```
┌─────────────────────────────────────────────────┐
│ 🟢 Production Mode: Manual Training Only        │
│                                                  │
│ Data uploads are fast (predictions only).       │
│ Train models manually using the form below.     │
└─────────────────────────────────────────────────┘
```

### When AUTO-TRAIN is ON (Development):
```
┌─────────────────────────────────────────────────┐
│ 🟡 Development Mode: Auto-Training Enabled      │
│                                                  │
│ Models will train on every upload (~30s).       │
│ Recommended: Disable for production.            │
└─────────────────────────────────────────────────┘
```

---

## ⚠️ Important Notes

### Runtime Only
- The UI toggle changes the setting **in memory**
- Changes take effect **immediately**
- Setting **resets** when server restarts

### Permanent Changes
To make the change permanent (survive server restart):

1. **Update `.env` file:**
```bash
# backend/.env
AUTO_TRAIN_ON_UPLOAD=true   # or false
```

2. **Restart the backend server**

---

## 🎬 Use Cases

### Scenario 1: Initial Setup
```
1. Turn toggle ON
2. Upload historical data
3. Wait for training (~30s)
4. Turn toggle OFF
5. Continue with fast uploads
```

### Scenario 2: Daily Operations (Production)
```
1. Keep toggle OFF
2. Upload daily data (fast!)
3. Train manually once per week
4. Monitor model performance
```

### Scenario 3: Testing New Features
```
1. Turn toggle ON temporarily
2. Test with different datasets
3. Iterate quickly
4. Turn toggle OFF when done
```

---

## 🚀 Manual Training

When AUTO-TRAIN is OFF, train models using:

### Method 1: UI Form (Same Page)
1. Scroll down to **"Train New Model"** section
2. Select a **processed dataset**
3. Choose **model type**
4. Click **"Train Model"** button

### Method 2: API Endpoint
```bash
curl -X POST http://localhost:8000/api/ml/train-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 What Happens Behind the Scenes

### When You Toggle OFF → ON:
```
1. UI sends: POST /api/ml/config/auto-train?enabled=true
2. Backend updates: settings.AUTO_TRAIN_ON_UPLOAD = True
3. Future uploads will trigger training
4. Toast notification: "Auto-training enabled..."
```

### When You Toggle ON → OFF:
```
1. UI sends: POST /api/ml/config/auto-train?enabled=false
2. Backend updates: settings.AUTO_TRAIN_ON_UPLOAD = False
3. Future uploads skip training
4. Toast notification: "Auto-training disabled..."
```

---

## 🔐 Permissions

### Who Can Toggle?
- ✅ **Super Admin** - Full access
- ✅ **ML Engineer** - Can view and toggle
- ❌ **Other Roles** - View only (toggle disabled)

---

## 🐛 Troubleshooting

### Toggle Not Working?
**Check:**
1. Are you logged in as Super Admin or ML Engineer?
2. Is the backend server running?
3. Check browser console for errors (F12)
4. Try refreshing the page

### Setting Resets After Restart?
**Solution:**
This is expected! The UI toggle changes runtime settings only.
To persist:
```bash
# Edit backend/.env
AUTO_TRAIN_ON_UPLOAD=false

# Restart server
```

### Can't See the Toggle?
**Check:**
1. You're on the **Model Training** page
2. Look at the **top** of the page (first section)
3. Look for the **Settings icon** (⚙️)

---

## 📸 UI Screenshot Reference

```
┌─────────────────────────────────────────────────────────┐
│  Model Training                                          │
│  Train ML models to classify digital channel...         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐ │
│  │  ⚙️ Training Configuration                        │ │
│  │     Control when models are trained               │ │
│  │                                     [ Toggle ] ✓  │ │
│  ├───────────────────────────────────────────────────┤ │
│  │  🟢 Production Mode: Manual Training Only         │ │
│  │  Data uploads are fast (predictions only).        │ │
│  │  Train models manually using the form below.      │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
│  [Train New Model Form...]                              │
│  [Trained Models Table...]                              │
└─────────────────────────────────────────────────────────┘
```

---

## 🎓 Best Practices

### ✅ DO:
- Keep toggle OFF in production
- Turn ON only for initial setup or testing
- Monitor resource usage when ON
- Train manually on a schedule

### ❌ DON'T:
- Leave toggle ON in high-traffic production
- Toggle frequently during business hours
- Forget to turn OFF after testing
- Ignore the warning alerts

---

## Summary

| Where | Model Training Page (top section) |
|-------|-----------------------------------|
| What | Toggle switch for auto-training |
| Who | Super Admin & ML Engineer only |
| Effect | Immediate (runtime) |
| Persistence | Resets on server restart |
| Recommended | OFF for production |

**Quick Access:** Dashboard → Model Training → Training Configuration (top)

---

That's it! You now have full UI control over model training behavior! 🎉
