# Performance Scores & Historical Scoring - Technical Guide

**What It Is**: Historical performance scoring for all 6 digital banking products  
**How It Works**: Monthly scores calculated from 14 metrics, stored with 24-month history  
**Purpose**: Track performance trends, detect changes, enable comparisons

---

## 1. What is Performance Score?

### Definition

A **Performance Score** is a **0-100 numeric rating** that represents how well a digital banking product is performing based on 14 key metrics.

```
Score Range    Interpretation                Example
────────────────────────────────────────────────────────
95-100         Excellent (TOP tier)          Mobile Banking: 95.0
85-94          Very Good                     Card Banking: 93.5
75-84          Good                          Web Banking: 78.2
65-74          Acceptable                    API Gateway: 72.1
45-64          Needs Improvement             ATM: 68.3, USSD: 45.7
< 45           Critical Issues               (Rare)
```

### How Score is Calculated

**Step 1: Collect 14 Metrics**
```
Active users, engagement, session duration, revenue,
Transaction success, failures, API errors,
Operational efficiency, uptime, downtime,
Complaints (growth, resolution), CSAT,
Revenue per transaction
```

**Step 2: Normalize Features**
```
Scale each metric to [0, 1] range
Apply StandardScaler (from training)
Clip to ±3 standard deviations
```

**Step 3: Ridge Regressor Predicts Score**
```
score = β₀ + β₁×f₁ + β₂×f₂ + ... + β₁₄×f₁₄

β₀ = 50.0 (intercept)
β₁...β₁₄ = Learned weights from training

Example:
  score = 50.0
         + 13.85 × (0.89)     [active users]
         - 9.43 × (0.02)      [failed txns]
         + 12.27 × (0.90)     [CSAT norm]
         + ... (11 more terms)
  = 95.0
```

**Step 4: Validate & Store**
```
Clip score to [0, 100]
Round to 2 decimals
Store in database with timestamp
```

---

## 2. Historical Scoring System

### How Historical Data is Stored

```
Database Table: scores
────────────────────────────────────────
Columns:
  id                  INTEGER (primary key)
  product_id          INTEGER (foreign key)
  period_date         DATE (month)
  performance_score   FLOAT (0-100)
  performance_tier    VARCHAR (HIGH/MEDIUM/LOW)
  trend_change        FLOAT (% change from prev month)
  previous_tier       VARCHAR (if tier changed)
  tier_changed        BOOLEAN
  
Example Row:
  id: 1
  product_id: 1 (Mobile Banking)
  period_date: 2026-06-21
  performance_score: 95.0
  performance_tier: HIGH
  trend_change: +2.5
  previous_tier: HIGH
  tier_changed: FALSE
```

### Data Retention

```
Historical Coverage:    24 months (2 years)
Update Frequency:       Monthly
Total Historical Records: 6 products × 24 months = 144 records
Retention Policy:       Keep last 24 months
Archive:                Older data exported to CSV
```

### Example Historical Data

```
Mobile Banking (Product ID: 1):

Month       Score   Tier    Trend   Previous
─────────────────────────────────────────────
Dec 2024    92.1    HIGH    +0.8    HIGH
Jan 2025    93.2    HIGH    +1.1    HIGH
Feb 2025    93.8    HIGH    +0.6    HIGH
Mar 2025    94.2    HIGH    +0.4    HIGH
Apr 2025    94.5    HIGH    +0.3    HIGH
May 2025    94.8    HIGH    +0.3    HIGH
Jun 2025    95.0    HIGH    +0.2    HIGH
    ↑ Steady improvement over 7 months

USSD Service (Product ID: 6):

Month       Score   Tier    Trend   Previous
─────────────────────────────────────────────
Dec 2024    52.1    MEDIUM  -1.5    HIGH ⚠️
Jan 2025    48.3    MEDIUM  -3.8    MEDIUM ❌
Feb 2025    46.2    MEDIUM  -2.1    MEDIUM ❌
Mar 2025    44.8    LOW     -1.4    MEDIUM ❌
Apr 2025    45.7    MEDIUM  +0.9    LOW ✓
May 2025    46.2    MEDIUM  +0.5    MEDIUM
Jun 2025    45.7    MEDIUM  -0.5    MEDIUM
    ↓ Declining then stabilized at MEDIUM
```

---

## 3. How Performance Scores are Generated

### Monthly Score Calculation Process

```
Timeline: Every month on the 1st

┌─────────────────────────────────────┐
│ 1. Collect Previous Month's Data    │
│    • Transaction logs               │
│    • User activity                  │
│    • System uptime                  │
│    • Support tickets                │
│    • Revenue reports                │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ 2. Calculate 14 Metrics             │
│    • Aggregate raw data             │
│    • Compute averages               │
│    • Generate KPIs                  │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ 3. Load Trained ML Models           │
│    • Ridge Regressor (score)        │
│    • Random Forest (tier)           │
│    • Scaler (normalization)         │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ 4. Normalize Features               │
│    • Apply StandardScaler           │
│    • Clip to ±3σ                    │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ 5. Predict Score & Tier             │
│    • Regressor → 0-100 score        │
│    • Classifier → tier              │
│    • Get confidence                 │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ 6. Compare with Previous Month      │
│    • Calculate trend (% change)     │
│    • Flag if tier changed           │
│    • Generate alert if big drop     │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ 7. Store in Database                │
│    • Insert new score record        │
│    • Update tier if changed         │
│    • Create alert if needed         │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ 8. Display on Dashboard             │
│    • Show current score             │
│    • Show trend arrow               │
│    • Show tier badge                │
│    • Show historical chart          │
└─────────────────────────────────────┘
```

---

## 4. Historical Trend Analysis

### How Trends Are Calculated

```
Current Score (June):  95.0
Previous Score (May):  94.8

Trend Calculation:
  Change = Current - Previous = 95.0 - 94.8 = +0.2
  Percentage = (Change / Previous) × 100 = +0.21%

Interpretation:
  Trend: ↑ Improving (positive)
  Magnitude: Small (+0.2 points)
  Confidence: High (small change expected)
```

### Trend Categories

```
Improving (↑):        Current > Previous + 1.0
  Example: 94.0 → 95.1 = +1.1 points
  Label: Green arrow "Improving"
  Action: Continue current operations

Stable (→):           -1.0 ≤ (Current - Previous) ≤ +1.0
  Example: 94.8 → 95.0 = +0.2 points
  Label: Grey dash "Stable"
  Action: Monitor for changes

Declining (↓):        Current < Previous - 1.0
  Example: 95.0 → 93.5 = -1.5 points
  Label: Red arrow "Declining"
  Action: Investigate issues

Critical Drop (↓↓):   Current < Previous - 5.0
  Example: 95.0 → 89.0 = -6.0 points
  Label: Red alert "CRITICAL"
  Action: Emergency response
```

### 24-Month Trend Example

```
Mobile Banking - 24 Month Trend:

100 |
 95 |    ╱╲     ╱╲    ╱╲
 90 |   ╱  ╲   ╱  ╲  ╱  ╲    ╱╲
 85 |      ╲ ╱    ╲╱    ╲  ╱
 80 |
    └─────────────────────── Months
     Jun'24 Dec'24 Jun'25 Dec'25

Trend Analysis:
  • Seasonal: Peak in Q1, dip in Q3
  • Overall: Steady improvement (+3.0 over 24 months)
  • Stability: High (standard deviation 1.2)
  • Forecast: Likely to continue improving
```

---

## 5. Tier Changes & Alerts

### Tracking Tier Changes

```
When score crosses tier boundary:

Score Drop from 76 → 74:
  Previous Tier: HIGH (≥75)
  New Tier: MEDIUM (45-74)
  Event: TIER_CHANGE
  Alert: "Mobile Banking dropped to MEDIUM tier!"
  Action: Investigate why score dropped 2 points

Score Jump from 74 → 76:
  Previous Tier: MEDIUM (45-74)
  New Tier: HIGH (≥75)
  Event: TIER_IMPROVEMENT
  Alert: "Mobile Banking promoted to HIGH tier!"
  Action: Celebrate improvement
```

### Historical Tier Distribution

```
Product: ATM Network

Tier Changes (24 months):
  Month 1:  LOW     (score 38)
  Month 2:  LOW     (score 42)
  Month 3:  MEDIUM  (score 48)  ✓ Improved
  Month 4:  MEDIUM  (score 52)
  ...
  Month 24: MEDIUM  (score 68)

Summary:
  Time in LOW:    3 months (12.5%)
  Time in MEDIUM: 18 months (75%)
  Time in HIGH:   3 months (12.5%)
  
Trend: Moved from LOW → MEDIUM (improvement confirmed)
```

---

## 6. Dashboard Features

### Historical Charts

**24-Month Performance Chart**

```
Shows: Line graph of score over 24 months

Visual Elements:
  • X-axis: Months (last 24)
  • Y-axis: Score (0-100)
  • Line: Score trend (color: green if improving)
  • Bands: Tier regions (HIGH=green, MED=yellow, LOW=red)
  • Dots: Monthly data points (hover for details)

Interactivity:
  • Hover: Show exact score for that month
  • Click: View detailed metrics for that month
  • Zoom: Select time range to zoom in
  • Export: Download chart as PNG/PDF
```

**Monthly Scorecard**

```
┌─────────────────────────────────────┐
│ MOBILE BANKING - JUNE 2026          │
├─────────────────────────────────────┤
│                                     │
│ Current Score:     95.0 ✅          │
│ Previous Score:    94.8             │
│ Trend:             ↑ +0.2           │
│ Trend %:           +0.21%           │
│                                     │
│ Current Tier:      HIGH ✅          │
│ Previous Tier:     HIGH             │
│ Tier Changed:      No               │
│                                     │
│ Confidence:        91.5%            │
│ Best Month Ever:   95.0 (Jun 2026)  │
│ Worst Month:       92.1 (Dec 2024)  │
│                                     │
│ Average (24mo):    94.1             │
│ Std Deviation:     1.2              │
│                                     │
└─────────────────────────────────────┘
```

### Comparison Views

**Products Side-by-Side**

```
| Product | Current | Previous | Trend | Tier | Status |
|---------|---------|----------|-------|------|--------|
| Mobile | 95.0 | 94.8 | ↑+0.2 | HIGH | ✅ |
| Card | 93.5 | 93.2 | ↑+0.3 | HIGH | ✅ |
| Web | 78.2 | 77.8 | ↑+0.4 | HIGH | ✅ |
| API | 72.1 | 71.5 | ↑+0.6 | MEDIUM | ⚠️ |
| ATM | 68.3 | 69.1 | ↓-0.8 | MEDIUM | ⚠️ |
| USSD | 45.7 | 46.2 | ↓-0.5 | MEDIUM | ❌ |
```

---

## 7. Technical Implementation

### Backend API Endpoint

```python
GET /api/v1/scores/dashboard/historical/{product_id}

Response:
{
  "product_id": 1,
  "product_name": "Mobile Banking",
  "current_score": 95.0,
  "previous_score": 94.8,
  "trend_change": 0.2,
  "trend_percentage": 0.21,
  "current_tier": "HIGH",
  "previous_tier": "HIGH",
  "tier_changed": false,
  "confidence": 0.915,
  "historical_data": [
    {
      "period_date": "2026-06-21",
      "score": 95.0,
      "tier": "HIGH",
      "confidence": 0.915
    },
    {
      "period_date": "2026-05-21",
      "score": 94.8,
      "tier": "HIGH",
      "confidence": 0.912
    },
    ...
  ],
  "statistics": {
    "mean": 94.1,
    "median": 94.3,
    "std_dev": 1.2,
    "min": 92.1,
    "max": 95.0,
    "total_records": 24
  }
}
```

### Database Query

```sql
SELECT 
  id,
  product_id,
  period_date,
  performance_score,
  performance_tier,
  trend_change,
  tier_changed
FROM scores
WHERE product_id = 1
ORDER BY period_date DESC
LIMIT 24;
```

---

## 8. Use Cases

### Executive Dashboard

**What They See**:
- Current score for each product
- Trend arrow (up/down/stable)
- Historical chart showing 24-month trend
- Comparison table of all products

**Questions Answered**:
- Is Mobile Banking improving? (Yes, +0.2 points)
- Which product needs attention? (USSD at 45.7)
- What's the trend? (Mostly improving)

### Product Manager

**What They See**:
- Detailed scorecard for their product
- Month-by-month breakdown
- What metrics changed most
- When score improved/declined

**Actions**:
- Click a month to see detailed metrics
- Export 24-month chart for presentation
- Share trend with team

### Operations Team

**What They See**:
- Alert if score drops >5 points
- Which metrics caused the drop
- Trend of specific metrics

**Actions**:
- Investigate low-performing products
- Implement improvements
- Monitor impact on next month's score

---

## 9. Performance Score Summary

### Calculation Flow

```
Raw Data → Metrics → Normalize → ML Model → Score → Store → Display
  ↓          ↓         ↓           ↓         ↓       ↓        ↓
Logs,     14 KPIs   [0-1]    Ridge     0-100  Database Dashboard
Tickets   (1-5)     scale   Regressor Score  + Trend  + Charts
```

### Key Metrics

✅ **Accuracy**: Ridge Regressor R²=0.9577  
✅ **Speed**: <1ms per prediction  
✅ **Historical**: 24 months retained  
✅ **Update**: Monthly (automated)  
✅ **Trend**: Automatic calculation  

---

**Status**: ✅ PRODUCTION READY  
**Last Updated**: June 21, 2026
