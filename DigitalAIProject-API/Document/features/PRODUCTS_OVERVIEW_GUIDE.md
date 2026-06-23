# Products Overview - Technical Guide

**What It Is**: Digital banking product performance overview dashboard  
**How It Works**: Central hub displaying all 6 products with real-time metrics, status, and key insights  
**Purpose**: Executive dashboard for portfolio-wide visibility and quick decision making

---

## 1. What is the Products Overview?

### Definition

The **Products Overview** is a **central dashboard component** that provides:
- Real-time status of all 6 digital banking products
- Current performance scores and tier classifications
- Key metrics at a glance
- Alerts and critical issues
- Quick access to detailed product information
- Comparison capabilities across the portfolio

### The 6 Digital Banking Products

```
1. 📱 Mobile Banking
   - Mobile application for personal banking
   - Largest user base (1.2M active users)
   - Performance: 95.0 (HIGH tier)

2. 💳 Card Banking
   - Credit/debit card services
   - User base: 800K active users
   - Performance: 93.5 (HIGH tier)

3. 💻 Web Banking
   - Desktop/web-based banking platform
   - User base: 600K active users
   - Performance: 78.2 (HIGH tier)

4. 🌐 API Gateway
   - Backend APIs for third-party integrations
   - User base: 50K API calls/month
   - Performance: 72.1 (MEDIUM tier)

5. 🏧 ATM Network
   - Automated teller machine network
   - User base: 500K active users
   - Performance: 68.3 (MEDIUM tier)

6. 📞 USSD Service
   - Unstructured Supplementary Service Data (SMS banking)
   - User base: 400K active users
   - Performance: 45.7 (MEDIUM tier)
```

---

## 2. Products Dashboard Layout

### Main Overview Screen

```
┌────────────────────────────────────────────────────────────────┐
│                    PRODUCTS OVERVIEW DASHBOARD                 │
│                        June 21, 2026                            │
├────────────────────────────────────────────────────────────────┤
│
│ PORTFOLIO SUMMARY
│ ─────────────────────────────────────────────────────────────
│
│ Total Products: 6 | Average Score: 80.1 | Portfolio Health: ✅ Good
│
│ Tier Distribution:
│   HIGH (≥75):    3 products (50%)  ✅ Green
│   MEDIUM (45-74): 3 products (50%)  🟡 Yellow
│   LOW (<45):     0 products  (0%)   ✅ Green
│
│ ─────────────────────────────────────────────────────────────
│
│ PRODUCTS GRID VIEW
│
│ ┌──────────────────┬──────────────────┬──────────────────┐
│ │   📱 MOBILE      │   💳 CARD        │   💻 WEB         │
│ │   BANKING        │   BANKING        │   BANKING        │
│ ├──────────────────┼──────────────────┼──────────────────┤
│ │ Score: 95.0 ⭐  │ Score: 93.5 ⭐  │ Score: 78.2 ✅  │
│ │ Tier: HIGH       │ Tier: HIGH       │ Tier: HIGH       │
│ │ Users: 1.2M      │ Users: 800K      │ Users: 600K      │
│ │ Status: ✅ Great │ Status: ✅ Great │ Status: ✅ Good  │
│ │ Trend: ↑ +0.2    │ Trend: ↑ +0.3    │ Trend: ↑ +0.6    │
│ │                  │                  │                  │
│ │ [View Details]   │ [View Details]   │ [View Details]   │
│ └──────────────────┴──────────────────┴──────────────────┘
│
│ ┌──────────────────┬──────────────────┬──────────────────┐
│ │   🌐 API         │   🏧 ATM         │   📞 USSD        │
│ │   GATEWAY        │   NETWORK        │   SERVICE        │
│ ├──────────────────┼──────────────────┼──────────────────┤
│ │ Score: 72.1 ⚠️  │ Score: 68.3 ⚠️  │ Score: 45.7 ❌  │
│ │ Tier: MEDIUM     │ Tier: MEDIUM     │ Tier: MEDIUM     │
│ │ Users: 50K/mo    │ Users: 500K      │ Users: 400K      │
│ │ Status: ⚠️ Alert │ Status: ⚠️ Alert │ Status: 🔴 Crisis│
│ │ Trend: ↑ +0.8    │ Trend: ↓ -0.8    │ Trend: ↓ -0.5    │
│ │                  │                  │                  │
│ │ [View Details]   │ [View Details]   │ [View Details]   │
│ └──────────────────┴──────────────────┴──────────────────┘
│
│ ─────────────────────────────────────────────────────────────
│
│ CRITICAL ALERTS (3)
│
│ 🔴 USSD Service: Score 45.7 (declining -0.5/mo)
│    → Risk: Drop below 45 threshold in 2 months
│    → Action: Review infrastructure
│
│ 🟠 ATM Network: Score 68.3 (declining -0.8/mo)
│    → Risk: Approach MEDIUM tier boundary
│    → Action: Investigate performance issues
│
│ 🟡 API Gateway: Errors rising (4.5% → 8.2%)
│    → Risk: Customer impact, API failures
│    → Action: Scale infrastructure
│
│ ─────────────────────────────────────────────────────────────
│
│ QUICK STATS
│
│ Portfolio Revenue:    $10.3M/month
│ Total Active Users:   3.7M+
│ Best Performer:       Mobile (95.0)
│ Needs Attention:      USSD (45.7)
│ Trend:                Mostly stable (2 improving, 2 declining)
│
└────────────────────────────────────────────────────────────────┘
```

---

## 3. Individual Product Card

### Detailed Product View

```
┌─────────────────────────────────────────────────────────────┐
│          📱 MOBILE BANKING - DETAILED VIEW                  │
├─────────────────────────────────────────────────────────────┤
│
│ CURRENT STATUS
│ ────────────────────────────────────────────────────────────
│ Performance Score:  95.0
│ Tier:              HIGH (≥75)
│ Percentile:        100th (best in portfolio)
│ Trend:             ↑ Improving (+0.2 points this month)
│
│ KEY METRICS (This Month)
│ ────────────────────────────────────────────────────────────
│ Success Rate:       98.3% (Target: 97%) ✅ Exceeding
│ Active Users:       89% (Target: 75%) ✅ Exceeding
│ Uptime:             99.3% (Target: 99%) ✅ Exceeding
│ CSAT Score:         4.5/5 (Target: 4.0) ✅ Exceeding
│ Revenue:            $1.5M/month
│ User Growth:        +8%/month
│ Failed Txns:        0.2% (Target: <1%) ✅ Great
│
│ BUSINESS METRICS
│ ────────────────────────────────────────────────────────────
│ Active Users:       1.2M
│ Monthly Growth:     8% (accelerating)
│ Revenue/User:       $1.25/month
│ Customer Churn:     1.2%/month (low)
│ NPS Score:          72 (excellent)
│
│ PERFORMANCE TREND (Last 6 Months)
│ ────────────────────────────────────────────────────────────
│ Jan: 94.7  Feb: 94.9  Mar: 94.8  Apr: 94.9  May: 94.8  Jun: 95.0
│
│ Trend Chart:
│        95.0 |           *
│        94.8 | *   * *   *   *
│        94.6 |
│        94.4 └─────────────────────
│             Jan  Feb Mar Apr May Jun
│
│ STATUS: ✅ STABLE & STRONG (consistent high performance)
│
│ RANK IN PORTFOLIO
│ ────────────────────────────────────────────────────────────
│ Current Rank:       #1 (best)
│ Previous Rank:      #1
│ Rank Change:        No change (maintained)
│ Points Ahead of #2:  +1.5 (vs Card at 93.5)
│
│ ALERTS & NOTES
│ ────────────────────────────────────────────────────────────
│ ✅ No critical alerts
│ ✅ No performance issues
│ ✅ User satisfaction high
│ 📝 Growth opportunity: Consider premium tier features
│
│ ACTIONS
│ ────────────────────────────────────────────────────────────
│ [View Score Breakdown]  [View Recommendations]
│ [View 3-Month Forecast] [View Alerts]
│ [Download Report]       [Compare to Others]
│
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Product Comparison View

### Side-by-Side Comparison

```
┌─────────────────────────────────────────────────────────────┐
│          PRODUCT COMPARISON: MOBILE vs CARD                 │
├──────────────────────────┬──────────────────┬───────────────┤
│ Metric                   │ Mobile  │ Card   │ Difference    │
├──────────────────────────┼──────────────────┼───────────────┤
│ Overall Score            │ 95.0    │ 93.5   │ +1.5 ✅      │
│ Tier                     │ HIGH    │ HIGH   │ Same          │
│ Percentile               │ 100th   │ 83rd   │ +17 points    │
│                          │                                   │
│ Success Rate             │ 98.3%   │ 98.1%  │ +0.2% ✅     │
│ Active Users             │ 89%     │ 87%    │ +2% ✅       │
│ Uptime                   │ 99.3%   │ 99.1%  │ +0.2% ✅     │
│ CSAT Score               │ 4.5/5   │ 4.4/5  │ +0.1 ✅      │
│ Revenue/User             │ $1.25   │ $1.10  │ +$0.15 ✅    │
│ User Growth              │ +8%/mo  │ +3%/mo │ +5% ✅       │
│ Failed Txns              │ 0.2%    │ 0.3%   │ -0.1% ✅     │
│ Complaints/Month         │ 12      │ 15     │ -3 ✅        │
│                          │                                   │
│ Rank in Portfolio        │ #1      │ #2     │ +1 rank      │
│ Trend                    │ ↑ +0.2  │ ↑ +0.3 │ Card trending│
│                          │         │        │ faster       │
│                          │                                   │
│ Winner: MOBILE (5/10)    │                                   │
│ Same: CARD (5/10)        │                                   │
│                          │                                   │
└──────────────────────────┴──────────────────┴───────────────┘
```

---

## 5. Portfolio Status Dashboard

### Health Overview

```
┌────────────────────────────────────────────────────────────┐
│              PORTFOLIO HEALTH DASHBOARD                    │
├────────────────────────────────────────────────────────────┤
│
│ OVERALL PORTFOLIO HEALTH: 🟢 GOOD
│
│ ────────────────────────────────────────────────────────────
│
│ PORTFOLIO METRICS
│
│ Average Score:          80.1
│ Best Score:             95.0 (Mobile)
│ Worst Score:            45.7 (USSD)
│ Score Range:            49.3 points (high variance)
│
│ HIGH Tier Products:     3 (50%) ✅ Good distribution
│ MEDIUM Tier:            3 (50%) ⚠️ Need improvement
│ LOW Tier:               0 (0%)  ✅ None at risk
│
│ Revenue Distribution:
│   Mobile:   15% ($1.5M)
│   Card:     12% ($1.2M)
│   Web:      11% ($1.1M)
│   API:      8% ($0.8M)
│   ATM:      8% ($0.8M)
│   USSD:     6% ($0.6M)
│   Other:    40% ($4.3M) ← Other revenue streams
│
│ Portfolio Diversity:
│   ✅ Digital: 38% (Mobile, Card, Web, API)
│   ✅ ATM:     8% (Physical)
│   ✅ USSD:    6% (SMS-based)
│   Well-diversified across channels
│
│ ────────────────────────────────────────────────────────────
│
│ TREND ANALYSIS
│
│ Improving:   2 products (API +0.8, Web +0.6)
│ Stable:      2 products (Card +0.3, Mobile +0.2)
│ Declining:   2 products (USSD -0.5, ATM -0.8)
│
│ Overall Trend: SLIGHTLY DECLINING (-0.1 avg)
│ Recommendation: Monitor declining products closely
│
│ ────────────────────────────────────────────────────────────
│
│ RISK ASSESSMENT
│
│ Critical Risk:  1 product (USSD below 50 threshold)
│ High Risk:      1 product (ATM trending down)
│ Medium Risk:    1 product (API errors rising)
│ Low Risk:       3 products (Mobile, Card, Web stable)
│
│ Overall Risk Level: 🟡 MODERATE
│ Action Needed: Monitor USSD & ATM closely
│
│ ────────────────────────────────────────────────────────────
│
│ BUSINESS HEALTH
│
│ Total Active Users:     3.7M+
│ Total Monthly Revenue:  $10.3M
│ Growth Rate:            +2%/month (portfolio)
│ Churn Rate:             2.1%/month (portfolio avg)
│
│ Best Growth:  Mobile +8%/month
│ Worst Growth: USSD -2%/month (declining)
│
│ ────────────────────────────────────────────────────────────
│
│ COMPLIANCE & OPERATIONAL
│
│ All products meeting SLA: ✅ Yes
│ Security incidents:       ❌ None reported
│ Data breaches:            ❌ None
│ Regulatory violations:    ❌ None
│
│ Status: ✅ FULLY COMPLIANT
│
└────────────────────────────────────────────────────────────┘
```

---

## 6. Product Status Cards

### Status Indicator Meaning

```
Product Status Indicators:

⭐ EXCELLENT (95+)
   ├─ Mobile Banking (95.0)
   └─ Characteristics: Top performer, growing, high satisfaction
   └─ Action: Maintain, consider expansion

✅ GOOD (75-94)
   ├─ Card Banking (93.5)
   ├─ Web Banking (78.2)
   └─ Characteristics: Solid performance, stable
   └─ Action: Optimize, monitor for improvements

⚠️ NEEDS WORK (45-74)
   ├─ API Gateway (72.1)
   ├─ ATM Network (68.3)
   └─ Characteristics: Below target, issues to address
   └─ Action: Implement improvements, monitor closely

🔴 CRITICAL (<45)
   ├─ USSD Service (45.7) - borderline
   └─ Characteristics: Below acceptable threshold
   └─ Action: Emergency intervention required
```

---

## 7. Product Filter & Sort Options

### Dashboard Controls

```
FILTERS:
  □ Show All (6)
  ☑ HIGH Tier (3)      ← Toggle on/off
  □ MEDIUM Tier (3)
  □ LOW Tier (0)
  
  □ Digital channels (4: Mobile, Card, Web, API)
  □ Physical channels (2: ATM, USSD)
  
  □ Growing (+) ← Products with positive trend
  □ Declining (-) ← Products with negative trend
  □ Stable (±) ← Products with minimal change

SORT BY:
  ○ Score (Descending) ← Default
  ○ Score (Ascending)
  ○ Tier
  ○ Trend (Best improving first)
  ○ Trend (Worst declining first)
  ○ User Base (Largest first)
  ○ Revenue (Highest first)
  ○ Alphabetical

TIME PERIOD:
  ○ Current Month
  ○ Last 3 Months (average)
  ○ Last 6 Months (average)
  ○ Last 12 Months (average)
  ○ Custom Date Range
```

---

## 8. Quick Access Shortcuts

### What Users Can Do from Products Overview

```
From Product Card, Users Can:

1. View Full Details
   → Click product → Opens detailed product page
   → See all metrics, charts, alerts

2. Compare to Others
   → Select 2 products → Comparison view
   → See side-by-side metrics

3. View Recommendations
   → See AI-generated improvement suggestions
   → Understand ROI for each action

4. Check 3-Month Forecast
   → See predicted trend
   → Understand confidence level

5. Review Alerts
   → See all active alerts for product
   → Understand severity

6. View Historical Performance
   → See 24-month performance chart
   → Track improvement/decline

7. Export Data
   → Download product data (CSV, Excel)
   → Create custom reports

8. Drill Down to Metrics
   → See 14 individual metrics
   → Understand score calculation
```

---

## 9. Data Sources & Updates

### Where Product Data Comes From

```
Real-Time Metrics (Updated Daily):
  • Success Rate, Uptime, Failed Transactions
  • Current user count, active sessions
  • Real-time alerts and incidents

Daily Metrics (Updated 24 hours):
  • Performance Score (calculated overnight)
  • Tier Classification
  • Compliance metrics

Monthly Metrics (Updated monthly):
  • Revenue, User Growth
  • Business metrics aggregation
  • Historical trend update

Data Sources:
  ├─ Application logs (uptime, errors)
  ├─ Transaction database (success rate, volume)
  ├─ User database (active users, growth)
  ├─ Revenue system (financial metrics)
  ├─ Customer feedback (CSAT, NPS)
  └─ Incident tracking (alerts, issues)
```

---

## 10. Mobile Responsive View

### Products Overview on Mobile

```
┌──────────────────────────────┐
│    PRODUCTS OVERVIEW         │
│       Mobile View            │
├──────────────────────────────┤
│                              │
│ Portfolio: ⭐ GOOD           │
│ Avg Score: 80.1             │
│ Alerts: 3                    │
│                              │
├──────────────────────────────┤
│ PRODUCTS (6)                 │
│                              │
│ 1. 📱 Mobile                │
│    Score: 95.0 HIGH          │
│    Status: ✅ Excellent      │
│    [Details]                 │
│                              │
│ 2. 💳 Card                   │
│    Score: 93.5 HIGH          │
│    Status: ✅ Great          │
│    [Details]                 │
│                              │
│ 3. 💻 Web                    │
│    Score: 78.2 HIGH          │
│    Status: ✅ Good           │
│    [Details]                 │
│                              │
│ 4. 🌐 API                    │
│    Score: 72.1 MED           │
│    Status: ⚠️ Alert          │
│    [Details]                 │
│                              │
│ [Load More...]               │
│                              │
├──────────────────────────────┤
│ QUICK ACTIONS                │
│                              │
│ [Compare Products]           │
│ [View Recommendations]       │
│ [Export Report]              │
│                              │
└──────────────────────────────┘
```

---

## 11. Technical Implementation

### Backend API

```python
GET /api/v1/products

Response:
{
  "products": [
    {
      "id": 1,
      "name": "Mobile Banking",
      "category": "digital",
      "performance_score": 95.0,
      "tier": "HIGH",
      "percentile": 100,
      "active_users": 1200000,
      "revenue_monthly": 1500000,
      "success_rate": 0.983,
      "uptime": 0.993,
      "csat": 4.5,
      "trend": {
        "score_change": 0.2,
        "rank_previous": 1,
        "rank_current": 1
      },
      "alerts": [],
      "status": "excellent"
    },
    ...
  ],
  "portfolio_summary": {
    "average_score": 80.1,
    "high_tier_count": 3,
    "medium_tier_count": 3,
    "low_tier_count": 0,
    "total_users": 3700000,
    "total_revenue": 10300000
  },
  "updated_at": "2026-06-21T00:00:00Z"
}

GET /api/v1/products/{product_id}

Response:
{
  "id": 1,
  "name": "Mobile Banking",
  "description": "Mobile application for personal banking",
  "performance_score": 95.0,
  "tier": "HIGH",
  "metrics": {
    "success_rate": 0.983,
    "uptime": 0.993,
    "csat": 4.5,
    "active_users": 1200000,
    "user_growth_monthly": 0.08,
    "revenue_monthly": 1500000,
    "failed_transactions": 0.002,
    "complaints_monthly": 12
  },
  "performance_history": [
    {"month": "2026-01", "score": 94.7},
    {"month": "2026-02", "score": 94.9},
    ...
  ],
  "alerts": [],
  "recommendations": [
    {
      "id": 1,
      "title": "Expand Premium Features",
      "impact": "+5 points",
      "roi": "200%"
    }
  ]
}
```

### SQL Queries

```sql
-- Get all products with current metrics
SELECT 
  p.id,
  p.name,
  p.category,
  s.performance_score,
  s.performance_tier,
  ROW_NUMBER() OVER (ORDER BY s.performance_score DESC) as rank,
  ROUND((ROW_NUMBER() OVER (ORDER BY s.performance_score DESC) - 1) * 100.0 / 6, 0) as percentile,
  u.active_user_count,
  r.monthly_revenue
FROM products p
JOIN scores s ON p.id = s.product_id
JOIN user_metrics u ON p.id = u.product_id
JOIN revenue_metrics r ON p.id = r.product_id
WHERE s.period_date = (SELECT MAX(period_date) FROM scores)
ORDER BY s.performance_score DESC;

-- Get portfolio summary
SELECT 
  COUNT(*) as total_products,
  AVG(s.performance_score) as average_score,
  SUM(CASE WHEN s.performance_tier = 'HIGH' THEN 1 ELSE 0 END) as high_tier_count,
  SUM(CASE WHEN s.performance_tier = 'MEDIUM' THEN 1 ELSE 0 END) as medium_tier_count,
  SUM(CASE WHEN s.performance_tier = 'LOW' THEN 1 ELSE 0 END) as low_tier_count,
  SUM(u.active_user_count) as total_users,
  SUM(r.monthly_revenue) as total_revenue
FROM products p
JOIN scores s ON p.id = s.product_id
JOIN user_metrics u ON p.id = u.product_id
JOIN revenue_metrics r ON p.id = r.product_id
WHERE s.period_date = (SELECT MAX(period_date) FROM scores);
```

---

## 12. Use Cases

### For Executive

**"What's the health of our digital banking portfolio?"**
→ Look at Products Overview dashboard
→ See: Average score 80.1, 3 HIGH tier, 3 MEDIUM tier
→ Status: Good but need to improve 3 products

**"Which product should we invest in?"**
→ See Mobile Banking performing best (95.0)
→ See recommendations suggesting feature expansion
→ Mobile growing fastest (+8%/month)
→ Recommendation: Invest in Mobile growth

### For Product Manager

**"How is my product performing?"**
→ Click on product card
→ See: Score, tier, metrics, alerts, recommendations
→ Compare to peers
→ View trend and forecast

### For Operations

**"Any critical issues?"**
→ Check "Critical Alerts" section
→ See USSD at 45.7 (critical)
→ See API errors rising
→ Priority: Address USSD first, then API

---

## 13. Summary: Products Overview

### What It Does

✅ Displays all 6 digital banking products  
✅ Shows real-time performance metrics  
✅ Tier classification (HIGH/MEDIUM/LOW)  
✅ Portfolio health summary  
✅ Alerts and critical issues  
✅ Quick access to detailed information  
✅ Comparison capabilities  
✅ Responsive design (desktop & mobile)  

### Key Features

**Dashboard Components:**
- Portfolio summary & health status
- Product grid with quick stats
- Critical alerts section
- Trend analysis
- Risk assessment
- Business metrics

**Interactivity:**
- Filter by tier, channel, trend
- Sort by various criteria
- Quick drill-down to details
- Side-by-side comparison
- Export capabilities

**Real-Time Information:**
- Live status updates
- Active alerts
- Current scores & metrics
- User counts
- Revenue data

---

**Status**: ✅ PRODUCTION READY  
**Last Updated**: June 21, 2026
