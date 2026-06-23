# Product Rankings - Technical Guide

**What It Is**: Products ranked by current performance score  
**How It Works**: Sorts all 6 products by score, tier, or trend  
**Purpose**: Quick comparison, identify leaders and laggards

---

## 1. What is Product Ranking?

### Definition

**Product Ranking** is a **sorted list of all digital banking products** ordered by selected criteria (usually performance score).

### Simple Example

```
Rank 1: Mobile Banking (95.0) ← Highest score
Rank 2: Card Banking (93.5)
Rank 3: Web Banking (78.2)
Rank 4: API Gateway (72.1)
Rank 5: ATM Network (68.3)
Rank 6: USSD Service (45.7) ← Lowest score
```

---

## 2. Ranking Criteria

### Primary Ranking: By Current Score

```
Mobile:  95.0  (Rank 1) ⭐
Card:    93.5  (Rank 2) ⭐
Web:     78.2  (Rank 3) ✅
API:     72.1  (Rank 4) ⚠️
ATM:     68.3  (Rank 5) ⚠️
USSD:    45.7  (Rank 6) ❌
```

### Secondary Ranking: By Tier

```
HIGH Tier Products (≥75):
  1. Mobile Banking (95.0)
  2. Card Banking (93.5)
  3. Web Banking (78.2)

MEDIUM Tier (45-74):
  4. API Gateway (72.1)
  5. ATM Network (68.3)
  6. USSD Service (45.7)

LOW Tier (<45):
  (None currently)
```

### Tertiary Ranking: By Trend

```
Sorted by improvement (best first):
  1. API Gateway (+0.8 points, +1.1%)  ← Fastest improving
  2. Web Banking (+0.6 points, +0.8%)
  3. Card Banking (+0.3 points, +0.3%)
  4. Mobile Banking (+0.2 points, +0.2%)
  5. USSD Service (-0.5 points, -1.1%)
  6. ATM Network (-0.8 points, -1.2%)  ← Fastest declining
```

### Quaternary: By Metric-Specific Ranking

```
Highest User Engagement:
  1. Mobile (89% active)
  2. Card (87% active)
  3. Web (62% active)
  ...
  
Best Uptime:
  1. Mobile (99.3%)
  2. Card (99.1%)
  3. Web (97.8%)
  ...
  
Highest CSAT(ustomer Satisfaction Score.)
  1. Mobile (4.5/5)
  2. Card (4.4/5)
  3. Web (3.8/5)
  ...
```

---

## 3. How Rankings are Calculated

### Ranking Algorithm

```
Step 1: Fetch all products with current score
  Products: [Mobile, Card, Web, API, ATM, USSD]
  Scores: [95.0, 93.5, 78.2, 72.1, 68.3, 45.7]

Step 2: Sort by selected criterion (default: score DESC)
  Result: [95.0, 93.5, 78.2, 72.1, 68.3, 45.7]
  Sorted: ✓ Descending (highest first)

Step 3: Assign rank positions
  Position 1: Mobile (95.0)
  Position 2: Card (93.5)
  Position 3: Web (78.2)
  Position 4: API (72.1)
  Position 5: ATM (68.3)
  Position 6: USSD (45.7)

Step 4: Calculate percentiles
  Mobile: 100th percentile (top)
  Card: 83rd percentile
  Web: 67th percentile
  API: 50th percentile (median)
  ATM: 33rd percentile
  USSD: 17th percentile (bottom)

Step 5: Add change from last month
  Mobile: Rank 1 → 1 (No change)
  Card: Rank 2 → 2 (No change)
  Web: Rank 3 → 3 (No change)
  API: Rank 5 → 4 (↑ Improved 1 rank!)
  ATM: Rank 4 → 5 (↓ Declined 1 rank)
  USSD: Rank 6 → 6 (No change)

Output: Sorted list with ranks, scores, tiers, trends
```

### Sorting SQL Query

```sql
SELECT 
  ROW_NUMBER() OVER (ORDER BY s.performance_score DESC) as rank,
  p.id as product_id,
  p.name as product_name,
  s.performance_score as current_score,
  s.performance_tier as tier,
  s.trend_change as trend,
  CASE 
    WHEN s.performance_score >= 75 THEN 'HIGH'
    WHEN s.performance_score >= 45 THEN 'MEDIUM'
    ELSE 'LOW'
  END as tier_category
FROM scores s
JOIN products p ON s.product_id = p.id
WHERE s.period_date = (SELECT MAX(period_date) FROM scores)
ORDER BY s.performance_score DESC;
```

---

## 4. Ranking Display Formats

### Leaderboard View (Default)

```
┌────────────────────────────────────────────────────────────┐
│         PRODUCT PERFORMANCE RANKINGS - JUNE 2026          │
├────┬──────────────────┬────────┬────────┬──────┬───────────┤
│ ## │ PRODUCT          │ SCORE  │ TIER   │TREND │ CHANGE    │
├────┼──────────────────┼────────┼────────┼──────┼───────────┤
│ 1  │ Mobile Banking   │ 95.0   │ HIGH   │ ↑    │ +0.2 ⭐  │
│ 2  │ Card Banking     │ 93.5   │ HIGH   │ ↑    │ +0.3 ⭐  │
│ 3  │ Web Banking      │ 78.2   │ HIGH   │ ↑    │ +0.6 ✅  │
│ 4  │ API Gateway      │ 72.1   │ MEDIUM │ ↑    │ +0.8 ⚠️  │
│ 5  │ ATM Network      │ 68.3   │ MEDIUM │ ↓    │ -0.8 ⚠️  │
│ 6  │ USSD Service     │ 45.7   │ MEDIUM │ ↓    │ -0.5 ❌  │
└────┴──────────────────┴────────┴────────┴──────┴───────────┘

Legend:
  ⭐ Excellence (score > 90)
  ✅ Good (score 75-90)
  ⚠️ Needs work (score 45-74)
  ❌ Critical (score < 45)
```

### Detailed View (Click on Product)

```
Rank 1: MOBILE BANKING
─────────────────────────────────────

Current Performance:
  Score: 95.0
  Tier: HIGH
  Percentile: 100th (best)

Trend Analysis:
  Previous Score: 94.8
  Change: +0.2 points
  % Change: +0.21%
  Direction: Improving ↑
  Consistency: Stable (1.2 std dev)

Comparison:
  vs #2 (Card): +1.5 points ahead
  vs Average (80.1): +14.9 ahead
  vs Worst (USSD): +49.3 ahead

Rank History (last 6 months):
  June: Rank 1
  May: Rank 1
  April: Rank 1
  March: Rank 1
  February: Rank 1
  January: Rank 1
  ✓ Consistent leader
```

### Competitive View (Peer Comparison)

```
Mobile vs Card (Top 2):

Metric              Mobile    Card    Difference
─────────────────────────────────────────────────
Score               95.0      93.5    +1.5 ✓
User Engagement     95.2      93.8    +1.4 ✓
Active Users        89%       87%     +2% ✓
Success Rate        98.3%     98.1%   +0.2% ✓
CSAT                4.5/5     4.4/5   +0.1 ✓
Uptime              99.3%     99.1%   +0.2% ✓

Winner: Mobile (5 out of 6 metrics ahead)
```

---

## 5. Ranking Changes & Movement

### Rank Movement Detection

```
Previous Month (May):
  Rank 1: Mobile (94.8)
  Rank 2: Card (93.2)
  Rank 3: Web (77.8)
  Rank 4: ATM (69.1)
  Rank 5: API (71.5)
  Rank 6: USSD (46.2)

Current Month (June):
  Rank 1: Mobile (95.0)  ✓ Same (maintained lead)
  Rank 2: Card (93.5)    ✓ Same
  Rank 3: Web (78.2)     ✓ Same
  Rank 4: API (72.1)     ↑ UP from rank 5! (+1 position)
  Rank 5: ATM (68.3)     ↓ DOWN from rank 4! (-1 position)
  Rank 6: USSD (45.7)    ✓ Same

Summary:
  Stable Leaders: Mobile, Card, Web (top 3 unchanged)
  Movement: API improved by 1 rank (72.1 > 69.1)
  Movement: ATM declined by 1 rank (68.3 < 69.1)
```

### Rank Gap Analysis

```
Score Gaps (How far apart):

Between 1-2: 95.0 - 93.5 = 1.5 points (close)
Between 2-3: 93.5 - 78.2 = 15.3 points (large gap!)
Between 3-4: 78.2 - 72.1 = 6.1 points (moderate)
Between 4-5: 72.1 - 68.3 = 3.8 points (small)
Between 5-6: 68.3 - 45.7 = 22.6 points (huge gap!)

Interpretation:
  • Top 2 are close (competitors)
  • Top 3 are separated from bottom 3 (big skill gap)
  • Middle products (4-5) are close
  • Gap to USSD is huge (might need special attention)
```

---

## 6. Historical Ranking Changes

### Rank Over Time (6 Months)

```
Month    Rank1   Rank2   Rank3   Rank4   Rank5   Rank6
────────────────────────────────────────────────────────
Jan      Mobile  Card    Web     API     ATM     USSD
Feb      Mobile  Card    Web     API     ATM     USSD
Mar      Mobile  Card    Web     API     ATM     USSD
Apr      Mobile  Card    Web     API     ATM     USSD
May      Mobile  Card    Web     ATM     API     USSD  ← Swapped
Jun      Mobile  Card    Web     API     ATM     USSD  ← Back

Analysis:
  • Top 3 stable (Mobile, Card, Web always 1-3)
  • Middle 2 swapped in May (ATM & API exchanged positions)
  • Bottom stable (USSD always last)
```

### Rank Stability Metrics

```
Product     Months in Top 3    Months Outside    Volatility
────────────────────────────────────────────────────────────
Mobile      12/12 (100%)       0                 0 (most stable)
Card        12/12 (100%)       0                 0
Web         12/12 (100%)       0                 0
API         8/12 (67%)         4                 3 (volatile)
ATM         7/12 (58%)         5                 4
USSD        0/12 (0%)          12                5 (least stable)
```

---

## 7. Percentile Ranking

### How Percentiles Work

```
Percentile = (Rank / Total Products) × 100

Mobile (Rank 1):
  Percentile = (1 / 6) × 100 = 16.7%... Wait, that's backwards!
  
Correct calculation:
  Percentile = ((Total - Rank + 1) / Total) × 100
  = ((6 - 1 + 1) / 6) × 100
  = (6 / 6) × 100
  = 100th percentile (best)

Card (Rank 2):
  Percentile = ((6 - 2 + 1) / 6) × 100 = (5/6) × 100 = 83rd percentile

USSD (Rank 6):
  Percentile = ((6 - 6 + 1) / 6) × 100 = (1/6) × 100 = 17th percentile
```

### Percentile Display

```
Mobile: ████████████████████ 100th percentile (Best)
Card:   █████████████████░░░░░ 83rd percentile
Web:    ███████████░░░░░░░░░░░ 67th percentile
API:    ██████░░░░░░░░░░░░░░░░ 50th percentile
ATM:    ████░░░░░░░░░░░░░░░░░░ 33rd percentile
USSD:   ██░░░░░░░░░░░░░░░░░░░░ 17th percentile (Worst)
```

---

## 8. Filtering & Sorting Options

### Sort By Score (Default)

```
Mobile (95.0) → Card (93.5) → Web (78.2) → ...
(Descending, highest first)
```

### Sort By Tier

```
HIGH Tier First:
  Mobile (95.0), Card (93.5), Web (78.2)

Then MEDIUM:
  API (72.1), ATM (68.3), USSD (45.7)

Then LOW:
  (None)
```

### Sort By Trend

```
Best Improving:
  1. API (+0.8)
  2. Web (+0.6)
  3. Card (+0.3)
  4. Mobile (+0.2)
  5. USSD (-0.5)
  6. ATM (-0.8)
```

### Sort By Specific Metric

```
Highest Active Users:
  1. Mobile (89%)
  2. Card (87%)
  3. Web (62%)
  4. API (48%)
  5. ATM (45%)
  6. USSD (35%)

Best Customer Satisfaction:
  1. Mobile (4.5/5)
  2. Card (4.4/5)
  3. Web (3.8/5)
  4. API (3.2/5)
  5. ATM (3.1/5)
  6. USSD (2.9/5)
```

---

## 9. Dashboard Features

### Ranking Table

```
┌─────────────────────────────────────────────────────┐
│ PRODUCT RANKINGS - SORT BY: [SCORE ▼]              │
├─────────────────────────────────────────────────────┤
│
│ [Rank] [Name] [Score] [Tier] [Trend] [Action]
│
│   1    Mobile   95.0   HIGH   ↑ +0.2  [View]
│   2    Card     93.5   HIGH   ↑ +0.3  [View]
│   3    Web      78.2   HIGH   ↑ +0.6  [View]
│   4    API      72.1   MED    ↑ +0.8  [View]
│   5    ATM      68.3   MED    ↓ -0.8  [View]
│   6    USSD     45.7   MED    ↓ -0.5  [View]
│
└─────────────────────────────────────────────────────┘
```

### Filter Options

```
Sort By:  [Score ▼] [Tier ▼] [Trend ▼] [Metric ▼]

View:     [All] [HIGH tier] [MEDIUM tier] [LOW tier]

Export:   [Download CSV] [Export to Excel] [Print]

Refresh:  [Last updated: Jun 21, 2026 3:24 PM]
```

---

## 10. Technical Implementation

### Backend API

```python
GET /api/v1/rankings?sort_by=score&order=desc

Response:
{
  "rankings": [
    {
      "rank": 1,
      "product_id": 1,
      "product_name": "Mobile Banking",
      "score": 95.0,
      "tier": "HIGH",
      "trend_change": 0.2,
      "percentile": 100,
      "previous_rank": 1,
      "rank_change": 0
    },
    {
      "rank": 2,
      "product_id": 2,
      "product_name": "Card Banking",
      ...
    },
    ...
  ],
  "updated_at": "2026-06-21T00:00:00Z",
  "total_products": 6
}
```

### SQL Query

```sql
WITH ranked_products AS (
  SELECT 
    ROW_NUMBER() OVER (ORDER BY performance_score DESC) as rank,
    product_id,
    product_name,
    performance_score,
    performance_tier,
    trend_change
  FROM scores
  WHERE period_date = (SELECT MAX(period_date) FROM scores)
)
SELECT * FROM ranked_products ORDER BY rank;
```

---

## 11. Use Cases

### Executive

**"Which are our best products?"**
→ Look at ranking table, see Mobile & Card leading

**"Is anyone falling behind?"**
→ Check rank changes, see API improving, ATM declining

### Product Manager

**"How does my product rank?"**
→ Find product in list, see rank and trend

**"Who's beating me?"**
→ Click products above in ranking to compare metrics

### Operations

**"Which product needs emergency attention?"**
→ Look for low-ranked with declining trend
→ USSD (Rank 6, -0.5 trend) needs attention

---

## Summary

### Ranking System

✅ **What**: Sorted list of all products by performance  
✅ **How**: SQL query with ROW_NUMBER() window function  
✅ **Updates**: Monthly (automated with score calculation)  
✅ **Display**: Table, leaderboard, percentiles  
✅ **Filter**: By score, tier, trend, or specific metric  

---

**Status**: ✅ PRODUCTION READY  
**Last Updated**: June 21, 2026
