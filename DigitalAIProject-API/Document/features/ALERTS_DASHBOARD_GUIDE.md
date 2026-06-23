# Alerts Dashboard - Technical Guide

**What It Is**: Monitor and respond to critical system alerts  
**How It Works**: Detects anomalies, generates alerts, tracks resolution  
**Purpose**: Real-time incident management and response

---

## 1. What is an Alert?

### Definition

An **Alert** is an **automated notification** triggered when a product's performance metric deviates significantly from expected patterns.

### Alert Types

```
1. Score Drop Alert
   Triggered: Score drops >5 points in one month
   Example: 95.0 → 89.0 = -6.0 drop
   Severity: HIGH
   Action: Investigate immediately

2. Tier Change Alert
   Triggered: Product changes tier
   Example: HIGH → MEDIUM tier drop
   Severity: HIGH
   Action: Review what changed

3. Metric Anomaly Alert
   Triggered: Specific metric exceeds threshold
   Examples:
     • Success rate drops below 95%
     • Uptime falls below 99%
     • Complaints spike +10%
   Severity: MEDIUM/HIGH

4. Trend Alert
   Triggered: Consistent decline over 3+ months
   Example: Score declining 0.5 points/month
   Severity: MEDIUM
   Action: Investigate root cause

5. Threshold Alert
   Triggered: Metric crosses critical boundary
   Examples:
     • Failed transactions > 10%
     • API errors > 5%
     • CSAT < 3.0/5
   Severity: CRITICAL
   Action: Emergency response
```

---

## 2. Alert Generation Process

### How Alerts are Created

```
Step 1: Get Latest Monthly Score
  Product: Mobile Banking
  Current: 95.0
  Previous: 94.8

Step 2: Calculate Changes
  Score Change: -0.2 (small, no alert)
  Tier: HIGH (no change)
  
  But check individual metrics...
  active_user_rate: 89% → 85% (-4%)
  complaint_growth: +2% → +5% (+3%)
  
Step 3: Evaluate Against Rules
  Rule: If active_user_rate drops >3% → Alert
  Evaluation: -4% > 3% ✓ TRIGGERED
  
  Rule: If complaint_growth > 5% → Alert
  Evaluation: +5% = 5% ✓ TRIGGERED

Step 4: Create Alert Records
  Alert 1:
    Type: METRIC_ANOMALY
    Product: Mobile Banking
    Metric: active_user_rate
    Severity: MEDIUM
    Message: "Active user rate declined 4%"
    
  Alert 2:
    Type: METRIC_ANOMALY
    Product: Mobile Banking
    Metric: complaint_growth_rate
    Severity: HIGH
    Message: "Complaints growing at 5%"

Step 5: Notify Users
  Send notification to:
    • Executive team
    • Product manager
    • Operations team
    
  Notification: "Mobile Banking: User rate down 4%"

Step 6: Store in Database
  Table: alerts
  Status: OPEN (unresolved)
  Created_at: 2026-06-21 14:30:00
  
Step 7: Display on Dashboard
  Show in alerts list with priority
```

### Alert Rules (Thresholds)

```
Alert Type              Threshold           Severity
────────────────────────────────────────────────────
Score Drop             > 5 points           HIGH
Tier Change            ANY change           HIGH
Active User Drop       > 3%                 MEDIUM
Success Rate Drop      < 95%                HIGH
Uptime Drop            < 99%                HIGH
CSAT Drop              > 0.5 points         MEDIUM
Complaint Growth       > 5%                 HIGH
Complaint Growth       > 10%                CRITICAL
Failed Txn Rate        > 5%                 HIGH
Failed Txn Rate        > 10%                CRITICAL
API Error Rate         > 3%                 HIGH
Downtime               > 2%                 HIGH
Revenue Drop           > 10%                MEDIUM
```

---

## 3. Alert Severity Levels

### Four-Tier Severity System

```
CRITICAL (Red) 🔴
├─ Score drop >10 points
├─ Failed transactions >15%
├─ System downtime >5%
├─ CSAT <2.0/5
└─ Action: Emergency response required
   Timeline: Respond within 1 hour
   Example: USSD service completely down

HIGH (Orange) 🟠
├─ Score drop 5-10 points
├─ Failed transactions 5-15%
├─ System downtime 2-5%
├─ Tier change
└─ Action: Urgent investigation
   Timeline: Respond within 4 hours
   Example: ATM API errors spiking

MEDIUM (Yellow) 🟡
├─ Score drop 2-5 points
├─ User engagement down 3-5%
├─ CSAT drop 0.2-0.5 points
├─ Complaints growing 3-5%
└─ Action: Monitor and investigate
   Timeline: Respond within 24 hours
   Example: Minor metric fluctuation

LOW (Green) 🟢
├─ Small fluctuations <2 points
├─ User engagement down <3%
├─ Other minor issues
└─ Action: Log for trend analysis
   Timeline: Review weekly
   Example: Expected seasonal variation
```

### Severity Display

```
CRITICAL: 🔴 Red background, flashing
HIGH:     🟠 Orange background, highlighted
MEDIUM:   🟡 Yellow background, normal
LOW:      🟢 Green background, faded

Users see:
- CRITICAL first (top of list)
- Then HIGH
- Then MEDIUM
- Then LOW (at bottom)
```

---

## 4. Alert Lifecycle

### States of an Alert

```
┌──────────────┐
│   CREATED    │  Alert triggered by rule
│ (timestamp)  │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│   OPEN       │  Awaiting user action
│ (unresolved) │
└──────┬───────┘
       │
       ├─→ User acknowledges
       │
       ↓
┌──────────────┐
│ACKNOWLEDGED  │  User saw alert, investigating
│ (in progress)│
└──────┬───────┘
       │
       ├─→ Issue found & fixed
       │
       ↓
┌──────────────┐
│ RESOLVED     │  Issue addressed, alert closed
│ (closed)     │
└──────────────┘
```

### Example Alert Lifecycle

```
Timeline: USSD Service Failure (June 20-21, 2026)

14:30 → Alert Created
  "USSD Service: Score dropped from 46.2 → 45.7"
  Status: OPEN
  Severity: MEDIUM

14:32 → Notification Sent
  • Product Manager notified
  • Operations team alerted
  • Executive dashboard updated

14:45 → User Acknowledges
  Operations Manager clicks "Acknowledge"
  Status: ACKNOWLEDGED
  Note: "Investigating now"

15:20 → Root Cause Found
  "Database connection timeout"
  
15:45 → Issue Fixed
  Database restarted, USSD back online
  
16:00 → Alert Resolved
  Operations Manager clicks "Resolve"
  Status: RESOLVED
  Note: "Database restart fixed issue"
  Resolution Time: 1.5 hours

Next Month →  No alert (metric improved back to 46.2)
```

---

## 5. Alert Dashboard Display

### Main Alert List

```
┌────────────────────────────────────────────────────────────┐
│ ALERTS DASHBOARD - OPEN ALERTS (12)                       │
├────────────────────────────────────────────────────────────┤
│
│ Filter: [All] [CRITICAL] [HIGH] [MEDIUM] [LOW]
│ Sort: [By Severity] [By Time] [By Product]
│
├────────────────────────────────────────────────────────────┤
│
│ 🔴 1. CRITICAL - API Gateway
│    Score dropped from 72.1 → 68.0 (-4.1 points)
│    Created: 2 hours ago
│    Status: OPEN - Assign to: [Dropdown] [Assign]
│    Details: ▼ Show more
│
│ 🟠 2. HIGH - Mobile Banking
│    Active user rate: 89% → 82% (-7%)
│    Created: 1 hour ago
│    Status: ACKNOWLEDGED
│    Note: Investigating payment gateway
│
│ 🟡 3. MEDIUM - ATM Network
│    Uptime dropped: 94.2% → 92.1% (-2.1%)
│    Created: 30 min ago
│    Status: OPEN - [Acknowledge] [Resolve]
│
│ 🟡 4. MEDIUM - Web Banking
│    CSAT score: 3.8 → 3.5 (-0.3)
│    Created: 15 min ago
│    Status: OPEN
│
│ 🟢 5. LOW - Card Banking
│    Complaint growth: +2% (within normal range)
│    Created: 5 min ago
│    Status: OPEN
│
└────────────────────────────────────────────────────────────┘
```

### Alert Detail View

```
┌─ ALERT DETAILS ────────────────────────────────────┐
│                                                    │
│ Alert ID: ALT-2026-06-021-047                      │
│ Type: SCORE_DROP                                   │
│ Severity: 🔴 CRITICAL                             │
│ Product: API Gateway (ID: 4)                       │
│                                                    │
│ Timeline:                                          │
│  Created: Jun 21, 2026 2:00 PM                     │
│  Acknowledged: —                                   │
│  Resolved: —                                       │
│                                                    │
│ Metric Changes:                                    │
│  • Performance Score: 72.1 → 68.0 (-4.1) 📉      │
│  • Tier: MEDIUM (no change)                       │
│  • Trend: -5.7% (declining)                       │
│                                                    │
│ Detailed Metrics:                                  │
│  • API Error Rate: 4.5% → 8.2% 📈 CRITICAL       │
│  • Success Rate: 94.5% → 91.2% 📉 WARNING        │
│  • Uptime: 96.5% → 94.8% 📉 MEDIUM               │
│                                                    │
│ Root Cause Analysis:                              │
│  API errors tripled (4.5% → 8.2%)                │
│  Likely cause: Backend service degradation       │
│                                                    │
│ Recommended Actions:                              │
│  1. Check API server logs                         │
│  2. Verify database connections                   │
│  3. Scale up if traffic spike                     │
│  4. Notify Dev team for investigation             │
│                                                    │
│ [Acknowledge] [Assign to] [Add Note] [Resolve]    │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 6. User Interactions

### Actions on Alerts

```
Action 1: Acknowledge
─────────────────────
User: "I've seen this alert"
Effect: Status changes to ACKNOWLEDGED
Time: Tracked for SLA metrics
Message: Can add note (e.g., "Investigating now")

Action 2: Assign
───────────────
User: "Give this to John to fix"
Effect: Alert assigned to John
Notification: John receives task
Tracking: Assigned to, assigned date

Action 3: Resolve
────────────────
User: "This is fixed"
Effect: Status changes to RESOLVED
Info: Record resolution time, root cause
Example: "Fixed database connection pool"

Action 4: Escalate
──────────────────
User: "This needs executive attention"
Effect: Priority increased to CRITICAL
Notification: Executives notified
Action: Meeting/emergency response triggered

Action 5: Archive
────────────────
User: "Hide this alert"
Effect: Moved to archive (not shown by default)
Info: Can be retrieved from historical view
```

---

## 7. Alert Filtering & Organization

### Filters Available

```
By Status:
  □ OPEN (12)
  □ ACKNOWLEDGED (3)
  □ RESOLVED (27)
  □ ARCHIVED (5)

By Severity:
  □ CRITICAL (2)
  □ HIGH (5)
  □ MEDIUM (8)
  □ LOW (3)

By Product:
  □ Mobile Banking (4)
  □ Card Banking (1)
  □ Web Banking (2)
  □ API Gateway (3)
  □ ATM Network (4)
  □ USSD Service (3)

By Type:
  □ Score Drop
  □ Tier Change
  □ Metric Anomaly
  □ Trend Alert
  □ Threshold Alert

By Time:
  □ Last 24 hours
  □ Last 7 days
  □ Last 30 days
  □ All time
```

---

## 8. Alert Statistics & Reporting

### Alert Metrics Dashboard

```
┌─────────────────────────────────────────┐
│ ALERT STATISTICS (Last 30 Days)        │
├─────────────────────────────────────────┤
│                                         │
│ Total Alerts Generated:    87           │
│ Currently Open:            12           │
│ Resolved:                  75           │
│ Resolution Rate:           86.2% ✅     │
│                                         │
│ By Severity:                            │
│  Critical:  3   (3.4%)                 │
│  High:      18  (20.7%)                │
│  Medium:    52  (59.8%)                │
│  Low:       14  (16.1%)                │
│                                         │
│ Average Resolution Time:    4.2 hours  │
│ Fastest Resolved:          12 min      │
│ Slowest Resolved:          2.5 days    │
│                                         │
│ By Product:                             │
│  USSD:      28  (32.2%)  ← Most alerts │
│  ATM:       18  (20.7%)                │
│  API:       16  (18.4%)                │
│  Web:       14  (16.1%)                │
│  Mobile:    8   (9.2%)                 │
│  Card:      3   (3.4%)   ← Least alerts│
│                                         │
│ Alert Trend:                            │
│  Week 1:    22 alerts                   │
│  Week 2:    18 alerts    ↓ Improving  │
│  Week 3:    25 alerts    ↑ Worsening  │
│  Week 4:    22 alerts    → Stable     │
│                                         │
└─────────────────────────────────────────┘
```

---

## 9. Notification System

### How Users Get Notified

```
Alert Created → System Sends Notifications

Email (Immediate):
  Subject: "[CRITICAL] API Gateway Score Drop"
  Recipients: Product Manager, Operations Lead
  
SMS (High Priority):
  "🔴 ALERT: API Gateway -4.1 pts. Check dashboard."
  To: On-call engineer
  
Dashboard (Always):
  Red alert badge shows count
  Alert appears in list
  Page refreshes automatically
  
Slack (Optional):
  #operations channel
  "CRITICAL: API Gateway score dropped 4 points"
  Link to dashboard
  
PagerDuty (Emergency):
  (If CRITICAL and unresolved for 1 hour)
  Escalates to on-call team
```

---

## 10. Technical Implementation

### Backend Alert Generation

```python
# Pseudo-code for alert creation

def check_and_create_alerts(product_id, current_score, previous_score):
    # Rule 1: Score Drop
    if current_score - previous_score < -5:
        create_alert(
            type="SCORE_DROP",
            severity="HIGH",
            message=f"Score dropped {current_score - previous_score} points"
        )
    
    # Rule 2: Check metrics
    metrics = get_metrics(product_id)
    
    if metrics['active_user_rate'] < 0.7:  # Below 70%
        create_alert(
            type="METRIC_ANOMALY",
            metric="active_user_rate",
            severity="MEDIUM"
        )
    
    if metrics['failed_txn_rate'] > 0.10:  # Above 10%
        create_alert(
            type="THRESHOLD",
            metric="failed_txn_rate",
            severity="CRITICAL"
        )
    
    # Rule 3: Tier change
    current_tier = get_tier(current_score)
    previous_tier = get_tier(previous_score)
    
    if current_tier != previous_tier:
        create_alert(
            type="TIER_CHANGE",
            message=f"Tier changed from {previous_tier} to {current_tier}",
            severity="HIGH"
        )
    
    # Notify users
    notify_users(product_id, alerts)
```

### Database Schema

```sql
CREATE TABLE alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    alert_type VARCHAR(50),  -- SCORE_DROP, METRIC_ANOMALY, etc.
    severity VARCHAR(20),     -- CRITICAL, HIGH, MEDIUM, LOW
    message TEXT,
    metric_name VARCHAR(100),
    old_value FLOAT,
    new_value FLOAT,
    status VARCHAR(20),        -- OPEN, ACKNOWLEDGED, RESOLVED
    created_at TIMESTAMP,
    acknowledged_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    assigned_to INT NULL,
    resolution_note TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### API Endpoint

```python
GET /api/v1/alerts?status=open&severity=CRITICAL

Response:
{
  "alerts": [
    {
      "id": 1047,
      "product_id": 4,
      "product_name": "API Gateway",
      "type": "SCORE_DROP",
      "severity": "CRITICAL",
      "message": "Score dropped from 72.1 to 68.0",
      "created_at": "2026-06-21T14:00:00Z",
      "status": "OPEN",
      "assigned_to": null
    },
    ...
  ],
  "total_count": 12,
  "open_count": 12,
  "critical_count": 2
}
```

---

## 11. Alert Escalation Flow

```
Alert Created (CRITICAL Severity)
  │
  ├─ Sent to: Product Manager, Operations
  │
  ├─ If not acknowledged in 15 minutes:
  │  └─ Escalate to: Director level
  │
  ├─ If not resolved in 1 hour:
  │  └─ Escalate to: Executive, Ops Manager
  │     Send: PagerDuty, SMS to on-call
  │
  ├─ If not resolved in 4 hours:
  │  └─ Escalate to: CTO, VP Engineering
  │     Action: Emergency war room
  │
  └─ If not resolved in 24 hours:
     └─ Escalate to: C-level executives
        Action: Service degradation notice
```

---

## Summary

### Alert System

✅ **What**: Automated anomaly detection and incident management  
✅ **How**: Rules-based alert generation, severity classification  
✅ **When**: Real-time (upon score/metric calculation)  
✅ **Where**: Dashboard, email, SMS, Slack  
✅ **Why**: Enable rapid response to issues  

---

**Status**: ✅ PRODUCTION READY  
**Last Updated**: June 21, 2026
