"""
Dynamic Recommendation & Alert Engine.
All recommendations and alerts are generated directly from the uploaded dataset
and ML model outputs — no hardcoded values, no static recommendations.
"""
from typing import List, Optional
from datetime import date
from sqlalchemy.orm import Session

from app.models.data import ProcessedFeatures, RawData
from app.models.ml_models import Score
from app.models.recommendations import Recommendation
from app.models.alerts import Alert
from app.models.product import Product
import logging

logger = logging.getLogger(__name__)


# ── Dynamic recommendation rules (value-driven, not static text) ─────────────
# Each rule evaluates actual metric values and generates context-specific text.
# Rules are ordered by impact priority.

def _build_recommendations(
    product: Product,
    features: dict,
    raw: Optional[RawData],
    score_obj: Score,
    period_date: date,
) -> List[dict]:
    """
    Build a list of recommendation dicts from actual metric values.
    Each recommendation is unique to the product's actual data.
    """
    recs = []
    pname = product.name
    score = score_obj.performance_score if score_obj else 0

    # ── 1. Transaction Failure Rate ────────────────────────────────────────────
    tsr = features.get("transaction_success_rate") or features.get("txn_success_rate")
    failed_rate = features.get("failed_txn_rate") or features.get("failed_txn_rate_pct")
    if tsr is not None:
        fail_pct = round((1 - tsr) * 100, 2) if tsr <= 1.0 else round(tsr, 2)
        if fail_pct > 15:
            recs.append({
                "category": "transaction_reliability",
                "priority": "critical",
                "title": f"Critical: {pname} Transaction Failure Rate at {fail_pct:.1f}%",
                "description": (
                    f"Transaction failure rate for {pname} has reached {fail_pct:.1f}%, "
                    f"far exceeding the 5% acceptable threshold. "
                    f"With {int(raw.failed_transactions or 0):,} failed transactions this period, "
                    f"immediate investigation into payment gateway errors, "
                    f"timeout configurations, and network reliability is critical. "
                    f"Target: reduce failure rate below 3% within 14 days."
                ),
                "trigger_metric": "transaction_success_rate",
                "trigger_value": tsr,
            })
        elif fail_pct > 7:
            recs.append({
                "category": "transaction_reliability",
                "priority": "high",
                "title": f"Reduce {pname} Transaction Failure Rate ({fail_pct:.1f}%)",
                "description": (
                    f"{pname} is experiencing a {fail_pct:.1f}% transaction failure rate "
                    f"({int(raw.failed_transactions or 0):,} failures this period). "
                    f"Review payment gateway logs, identify peak-failure time windows, "
                    f"and implement retry mechanisms. Target: below 5% within 30 days."
                ),
                "trigger_metric": "transaction_success_rate",
                "trigger_value": tsr,
            })
        elif fail_pct > 4:
            recs.append({
                "category": "transaction_reliability",
                "priority": "medium",
                "title": f"Monitor {pname} Transaction Reliability ({fail_pct:.1f}% failures)",
                "description": (
                    f"{pname} failure rate of {fail_pct:.1f}% is approaching the 5% threshold. "
                    f"Proactively review API response times and introduce circuit breaker patterns "
                    f"to prevent escalation. Total transactions this period: "
                    f"{int(raw.total_transactions or 0):,}."
                ),
                "trigger_metric": "transaction_success_rate",
                "trigger_value": tsr,
            })

    # ── 2. Active User Adoption ────────────────────────────────────────────────
    aur = features.get("active_user_rate")
    if aur is not None and raw:
        active_users = int(raw.active_users or 0)
        total_users  = int(raw.total_users or 1)
        aur_pct = round(aur * 100, 1)
        if aur < 0.20:
            recs.append({
                "category": "user_adoption",
                "priority": "critical",
                "title": f"Critical: {pname} Active User Rate Only {aur_pct:.1f}%",
                "description": (
                    f"Only {active_users:,} of {total_users:,} registered users ({aur_pct:.1f}%) "
                    f"actively use {pname}. This indicates a severe adoption problem. "
                    f"Immediate action required: launch targeted re-engagement campaigns, "
                    f"simplify onboarding, and introduce loyalty incentives. "
                    f"Without intervention, revenue impact will escalate."
                ),
                "trigger_metric": "active_user_rate",
                "trigger_value": aur,
            })
        elif aur < 0.40:
            recs.append({
                "category": "user_adoption",
                "priority": "high",
                "title": f"Expand {pname} User Adoption (currently {aur_pct:.1f}%)",
                "description": (
                    f"{pname} has {active_users:,} active users out of {total_users:,} registered "
                    f"({aur_pct:.1f}%). To reach the 50% active user target, focus on: "
                    f"(1) Personalised push notification campaigns, "
                    f"(2) Gamified engagement features, "
                    f"(3) Merchant/agent incentive programmes, "
                    f"(4) Customer education sessions."
                ),
                "trigger_metric": "active_user_rate",
                "trigger_value": aur,
            })
        elif aur < 0.55:
            recs.append({
                "category": "user_adoption",
                "priority": "medium",
                "title": f"Boost {pname} Active User Engagement ({aur_pct:.1f}%)",
                "description": (
                    f"{pname} active user rate of {aur_pct:.1f}% is below the 60% benchmark. "
                    f"Consider A/B testing new onboarding flows and introducing session-based "
                    f"rewards to increase daily active usage. Current base: {active_users:,} users."
                ),
                "trigger_metric": "active_user_rate",
                "trigger_value": aur,
            })

    # ── 3. Downtime / Infrastructure ──────────────────────────────────────────
    dis = features.get("downtime_impact_score")
    if dis is not None:
        dis_pct = dis if dis > 1.0 else dis * 100
        if raw and raw.downtime_minutes:
            down_min = int(raw.downtime_minutes)
            down_context = f"{down_min:,} downtime minutes recorded."
        elif raw and raw.downtime_hours:
            down_context = f"{raw.downtime_hours:.1f} downtime hours recorded."
        elif raw and raw.uptime_percentage is not None:
            down_context = f"Uptime: {raw.uptime_percentage:.2f}%."
        else:
            down_context = ""

        if dis_pct > 10:
            recs.append({
                "category": "infrastructure",
                "priority": "critical",
                "title": f"Critical Infrastructure Failure: {pname} Downtime at {dis_pct:.2f}%",
                "description": (
                    f"{pname} has experienced {dis_pct:.2f}% downtime this period. {down_context} "
                    f"This is severely impacting customer experience and transaction completion. "
                    f"Escalate to infrastructure team immediately. Deploy redundant servers, "
                    f"implement automatic failover, and establish 24/7 monitoring with SLA of 99.9% uptime."
                ),
                "trigger_metric": "downtime_impact_score",
                "trigger_value": dis,
            })
        elif dis_pct > 3:
            recs.append({
                "category": "infrastructure",
                "priority": "high",
                "title": f"Improve {pname} Infrastructure Reliability ({dis_pct:.2f}% downtime)",
                "description": (
                    f"{pname} downtime impact stands at {dis_pct:.2f}%. {down_context} "
                    f"Actions: review server health metrics, implement load balancing, "
                    f"schedule infrastructure maintenance during low-traffic windows. "
                    f"Target: reduce downtime below 1% of monthly available time."
                ),
                "trigger_metric": "downtime_impact_score",
                "trigger_value": dis,
            })
        elif dis_pct > 1:
            recs.append({
                "category": "infrastructure",
                "priority": "low",
                "title": f"Monitor {pname} System Uptime ({dis_pct:.2f}% downtime)",
                "description": (
                    f"{pname} has {dis_pct:.2f}% downtime — within acceptable range but trending. "
                    f"{down_context} Continue monitoring server metrics and ensure "
                    f"automated health checks are in place."
                ),
                "trigger_metric": "downtime_impact_score",
                "trigger_value": dis,
            })

    # ── 4. Complaint Volume & Growth ──────────────────────────────────────────
    cgr = features.get("complaint_growth_rate")
    crr = features.get("complaint_resolution_rate")
    if cgr is not None and raw:
        total_complaints = int(raw.total_complaints or 0)
        resolved = int(raw.resolved_complaints or 0)
        unresolved = total_complaints - resolved

        if cgr > 50:
            recs.append({
                "category": "customer_satisfaction",
                "priority": "critical",
                "title": f"Complaint Surge: {pname} Volume Up {cgr:.1f}% MoM",
                "description": (
                    f"{pname} complaints surged by {cgr:.1f}% this period "
                    f"({total_complaints:,} total, {unresolved:,} unresolved). "
                    f"This indicates a systematic product or service failure. "
                    f"Convene an emergency customer experience task force, "
                    f"identify and fix root causes immediately, and proactively "
                    f"contact affected customers within 48 hours."
                ),
                "trigger_metric": "complaint_growth_rate",
                "trigger_value": cgr,
            })
        elif cgr > 20:
            recs.append({
                "category": "customer_satisfaction",
                "priority": "high",
                "title": f"Rising Complaints for {pname}: {cgr:.1f}% Increase",
                "description": (
                    f"{pname} complaints increased by {cgr:.1f}% compared to the previous period "
                    f"({total_complaints:,} total, {unresolved:,} unresolved). "
                    f"Analyse complaint categories, prioritise resolution of the top 3 issues, "
                    f"and implement a structured complaint management workflow with "
                    f"resolution SLA of 48 hours."
                ),
                "trigger_metric": "complaint_growth_rate",
                "trigger_value": cgr,
            })

    # Complaint resolution rate
    if crr is not None:
        crr_pct = crr if crr > 1.0 else crr * 100
        if crr_pct < 50:
            recs.append({
                "category": "customer_satisfaction",
                "priority": "high",
                "title": f"Low Complaint Resolution: {pname} at {crr_pct:.1f}%",
                "description": (
                    f"Only {crr_pct:.1f}% of {pname} complaints are resolved. "
                    f"Unresolved complaints erode customer trust. "
                    f"Assign dedicated resolution team, implement escalation matrix, "
                    f"and track resolution time as a core KPI. Target: 85%+ resolution rate."
                ),
                "trigger_metric": "complaint_resolution_rate",
                "trigger_value": crr,
            })
        elif crr_pct < 70:
            recs.append({
                "category": "customer_satisfaction",
                "priority": "medium",
                "title": f"Improve {pname} Complaint Resolution ({crr_pct:.1f}%)",
                "description": (
                    f"{pname} complaint resolution rate of {crr_pct:.1f}% is below the 80% target. "
                    f"Streamline the resolution workflow, empower frontline agents, "
                    f"and introduce self-service resolution channels."
                ),
                "trigger_metric": "complaint_resolution_rate",
                "trigger_value": crr,
            })

    # ── 5. Revenue Optimisation ────────────────────────────────────────────────
    rpau = features.get("revenue_per_active_user")
    if rpau is not None and rpau < 15.0 and raw:
        total_rev = raw.total_revenue or 0
        if rpau < 3:
            recs.append({
                "category": "revenue_optimization",
                "priority": "high",
                "title": f"Critically Low {pname} Revenue per User (ETB {rpau:.2f})",
                "description": (
                    f"{pname} generates only ETB {rpau:.2f} per active user "
                    f"(total revenue: ETB {total_rev:,.0f}). "
                    f"Revenue diversification is urgent: introduce tiered pricing, "
                    f"premium features, and cross-sell complementary services. "
                    f"Target: ETB 20+ per active user within 2 quarters."
                ),
                "trigger_metric": "revenue_per_active_user",
                "trigger_value": rpau,
            })
        elif rpau < 15:
            recs.append({
                "category": "revenue_optimization",
                "priority": "medium",
                "title": f"Optimise {pname} Revenue per Active User (ETB {rpau:.2f})",
                "description": (
                    f"{pname} revenue per active user is ETB {rpau:.2f}, below the ETB 15 benchmark. "
                    f"Consider premium feature bundles, transaction-based incentives, "
                    f"and merchant partnership programmes to increase ARPU."
                ),
                "trigger_metric": "revenue_per_active_user",
                "trigger_value": rpau,
            })

    # ── 6. API Error Rate / Technical Quality ─────────────────────────────────
    api_err = features.get("api_error_rate")
    if api_err is not None and api_err > 3.0:
        if api_err > 10:
            recs.append({
                "category": "technical_quality",
                "priority": "critical",
                "title": f"Critical API Errors: {pname} at {api_err:.1f}%",
                "description": (
                    f"{pname} API error rate of {api_err:.1f}% is critically high. "
                    f"This directly impacts transaction completion and user experience. "
                    f"Immediately review API gateway logs, identify failing endpoints, "
                    f"implement error monitoring (e.g., Sentry), and deploy hotfixes."
                ),
                "trigger_metric": "api_error_rate",
                "trigger_value": api_err,
            })
        else:
            recs.append({
                "category": "technical_quality",
                "priority": "medium" if api_err <= 6 else "high",
                "title": f"Reduce {pname} API Error Rate ({api_err:.1f}%)",
                "description": (
                    f"{pname} API error rate stands at {api_err:.1f}%, above the 3% threshold. "
                    f"Audit failing API endpoints, implement circuit breakers, "
                    f"add retry logic, and review backend service health. "
                    f"Target: below 2% API error rate."
                ),
                "trigger_metric": "api_error_rate",
                "trigger_value": api_err,
            })

    # ── 7. CSAT Score ─────────────────────────────────────────────────────────
    csat = features.get("csat_score")
    if csat is not None and 0 < csat < 3.5:
        if csat < 2.0:
            recs.append({
                "category": "customer_satisfaction",
                "priority": "critical",
                "title": f"Critical: {pname} Customer Satisfaction at {csat:.1f}/5.0",
                "description": (
                    f"{pname} CSAT score of {csat:.1f}/5.0 indicates widespread customer dissatisfaction. "
                    f"Conduct urgent customer interviews, identify top pain points, "
                    f"and launch a product experience overhaul. "
                    f"Low CSAT correlates strongly with churn risk."
                ),
                "trigger_metric": "csat_score",
                "trigger_value": csat,
            })
        else:
            recs.append({
                "category": "customer_satisfaction",
                "priority": "high" if csat < 2.5 else "medium",
                "title": f"Improve {pname} Customer Satisfaction ({csat:.1f}/5.0)",
                "description": (
                    f"{pname} CSAT of {csat:.1f}/5.0 is below the 4.0 target. "
                    f"Key actions: improve UI/UX responsiveness, reduce support wait times, "
                    f"launch in-app feedback collection, and act on top negative feedback themes."
                ),
                "trigger_metric": "csat_score",
                "trigger_value": csat,
            })

    # ── 8. Fraud & Security ───────────────────────────────────────────────────
    fraud = features.get("fraud_incidents")
    if fraud is not None and fraud > 10:
        recs.append({
            "category": "security_compliance",
            "priority": "critical" if fraud > 50 else "high",
            "title": f"{'Critical' if fraud > 50 else 'Elevated'} Fraud Activity: {pname} ({int(fraud)} incidents)",
            "description": (
                f"{pname} recorded {int(fraud)} fraud incidents this period. "
                f"{'This is a critical security breach requiring immediate escalation.' if fraud > 50 else 'Fraud is above acceptable levels.'} "
                f"Actions: review and strengthen transaction authentication (OTP/biometric), "
                f"implement real-time fraud scoring, deploy anomaly detection models, "
                f"and notify affected customers immediately."
            ),
            "trigger_metric": "fraud_incidents",
            "trigger_value": fraud,
        })

    # ── 9. Operational Efficiency ─────────────────────────────────────────────
    oes = features.get("operational_efficiency_score")
    if oes is not None:
        oes_pct = oes if oes > 1.0 else oes * 100
        if oes_pct < 60:
            recs.append({
                "category": "operational_excellence",
                "priority": "high",
                "title": f"Low {pname} Operational Efficiency ({oes_pct:.1f}%)",
                "description": (
                    f"{pname} operational efficiency of {oes_pct:.1f}% is below the 75% benchmark. "
                    f"Review transaction processing pipeline latency, system resource utilisation, "
                    f"and API response times. Deploy performance profiling and optimise "
                    f"database queries and caching layers."
                ),
                "trigger_metric": "operational_efficiency_score",
                "trigger_value": oes,
            })
        elif oes_pct < 75:
            recs.append({
                "category": "operational_excellence",
                "priority": "medium",
                "title": f"Enhance {pname} Operational Performance ({oes_pct:.1f}%)",
                "description": (
                    f"{pname} efficiency at {oes_pct:.1f}% — approaching target but improvements possible. "
                    f"Consider infrastructure scaling, connection pooling optimisation, "
                    f"and CDN deployment to improve response times."
                ),
                "trigger_metric": "operational_efficiency_score",
                "trigger_value": oes,
            })

    # ── 10. Score-level insight ────────────────────────────────────────────────
    if score_obj and score_obj.score_change is not None and score_obj.score_change < -8:
        prev_s = score_obj.previous_score or 0
        recs.append({
            "category": "performance_recovery",
            "priority": "critical",
            "title": f"{pname} Score Dropped {abs(score_obj.score_change):.1f} Points — Recovery Plan Needed",
            "description": (
                f"{pname} performance score fell from {prev_s:.1f} to {score:.1f} "
                f"({score_obj.score_change:.1f} points). "
                f"This multi-metric deterioration requires a structured recovery plan: "
                f"identify the top 3 contributing KPIs, set weekly targets, "
                f"and establish a dedicated recovery task force reporting to management."
            ),
            "trigger_metric": "performance_score",
            "trigger_value": score,
        })

    return recs


def _build_alerts(
    product: Product,
    features: dict,
    raw: Optional[RawData],
    score_obj: Score,
    period_date: date,
) -> List[dict]:
    """
    Build dynamic alerts from actual dataset values.
    Severity is determined by how far the metric deviates from thresholds.
    """
    alerts = []
    pname = product.name

    # ── Score drop alert ──────────────────────────────────────────────────────
    if score_obj and score_obj.previous_score is not None:
        drop = score_obj.previous_score - score_obj.performance_score
        if drop >= 15:
            alerts.append({
                "alert_type": "score_drop",
                "severity": "critical",
                "title": f"Severe Score Drop: {pname} Lost {drop:.1f} Points",
                "message": (
                    f"{pname} performance score collapsed by {drop:.1f} points "
                    f"from {score_obj.previous_score:.1f} to {score_obj.performance_score:.1f}. "
                    f"Immediate executive review required."
                ),
                "metric_name": "performance_score",
                "metric_value": score_obj.performance_score,
                "previous_value": score_obj.previous_score,
            })
        elif drop >= 8:
            alerts.append({
                "alert_type": "score_drop",
                "severity": "high",
                "title": f"Score Drop Alert: {pname} Down {drop:.1f} Points",
                "message": (
                    f"{pname} score dropped {drop:.1f} points "
                    f"(from {score_obj.previous_score:.1f} to {score_obj.performance_score:.1f}). "
                    f"Review top contributing metrics and initiate corrective actions."
                ),
                "metric_name": "performance_score",
                "metric_value": score_obj.performance_score,
                "previous_value": score_obj.previous_score,
            })
        elif drop >= 4:
            alerts.append({
                "alert_type": "score_drop",
                "severity": "medium",
                "title": f"Minor Score Decline: {pname} Down {drop:.1f} Points",
                "message": (
                    f"{pname} score declined by {drop:.1f} points this period "
                    f"({score_obj.previous_score:.1f} → {score_obj.performance_score:.1f}). "
                    f"Monitor closely for continued decline."
                ),
                "metric_name": "performance_score",
                "metric_value": score_obj.performance_score,
                "previous_value": score_obj.previous_score,
            })

    # ── Downtime alerts ───────────────────────────────────────────────────────
    dis = features.get("downtime_impact_score")
    if dis is not None:
        dis_pct = dis if dis > 1.0 else dis * 100
        uptime = raw.uptime_percentage if raw and raw.uptime_percentage is not None else (100 - dis_pct)
        if dis_pct > 15:
            alerts.append({
                "alert_type": "downtime_spike",
                "severity": "critical",
                "title": f"Critical Downtime: {pname} System Availability at {uptime:.1f}%",
                "message": (
                    f"{pname} downtime impact reached {dis_pct:.2f}% this period "
                    f"(uptime: {uptime:.1f}%). This severely impacts all digital transactions. "
                    f"Infrastructure emergency protocol must be activated immediately."
                ),
                "metric_name": "downtime_impact_score",
                "metric_value": dis,
            })
        elif dis_pct > 5:
            alerts.append({
                "alert_type": "downtime_spike",
                "severity": "high",
                "title": f"High Downtime Detected: {pname} at {dis_pct:.2f}%",
                "message": (
                    f"{pname} downtime impact is {dis_pct:.2f}% (uptime: {uptime:.1f}%). "
                    f"Review system health logs and implement redundancy measures."
                ),
                "metric_name": "downtime_impact_score",
                "metric_value": dis,
            })
        elif dis_pct > 2:
            alerts.append({
                "alert_type": "downtime_spike",
                "severity": "medium",
                "title": f"Moderate Downtime: {pname} Uptime at {uptime:.1f}%",
                "message": (
                    f"{pname} has {dis_pct:.2f}% downtime impact this period. "
                    f"While within tolerable range, investigate root cause to prevent escalation."
                ),
                "metric_name": "downtime_impact_score",
                "metric_value": dis,
            })

    # ── Transaction failure rate alerts ───────────────────────────────────────
    tsr = features.get("transaction_success_rate") or features.get("txn_success_rate")
    if tsr is not None:
        fail_pct = round((1 - tsr) * 100, 2) if tsr <= 1.0 else round(100 - tsr, 2)
        total_txn = int(raw.total_transactions or 0) if raw else 0
        failed_txn = int(raw.failed_transactions or 0) if raw else 0

        if fail_pct > 20:
            alerts.append({
                "alert_type": "failure_rate_increase",
                "severity": "critical",
                "title": f"Critical Failure Rate: {pname} — {fail_pct:.1f}% of Transactions Failing",
                "message": (
                    f"{pname} transaction failure rate is {fail_pct:.1f}% "
                    f"({failed_txn:,} of {total_txn:,} transactions failed). "
                    f"Payment processing is severely compromised. Emergency response required."
                ),
                "metric_name": "transaction_success_rate",
                "metric_value": tsr,
            })
        elif fail_pct > 10:
            alerts.append({
                "alert_type": "failure_rate_increase",
                "severity": "high",
                "title": f"High Failure Rate: {pname} at {fail_pct:.1f}%",
                "message": (
                    f"{pname} has {fail_pct:.1f}% transaction failures "
                    f"({failed_txn:,} of {total_txn:,}). "
                    f"Exceeds the 10% critical threshold. Investigate payment gateway urgently."
                ),
                "metric_name": "transaction_success_rate",
                "metric_value": tsr,
            })
        elif fail_pct > 5:
            alerts.append({
                "alert_type": "failure_rate_increase",
                "severity": "medium",
                "title": f"Elevated Failure Rate: {pname} at {fail_pct:.1f}%",
                "message": (
                    f"{pname} transaction failure rate of {fail_pct:.1f}% "
                    f"({failed_txn:,} failures) exceeds the 5% threshold. "
                    f"Monitor trends and review error logs."
                ),
                "metric_name": "transaction_success_rate",
                "metric_value": tsr,
            })
        elif fail_pct > 2:
            alerts.append({
                "alert_type": "failure_rate_increase",
                "severity": "low",
                "title": f"Minor Failure Rate: {pname} at {fail_pct:.1f}%",
                "message": (
                    f"{pname} failure rate of {fail_pct:.1f}% — within range but worth monitoring. "
                    f"{failed_txn:,} failed transactions recorded."
                ),
                "metric_name": "transaction_success_rate",
                "metric_value": tsr,
            })

    # ── Complaint surge alerts ────────────────────────────────────────────────
    cgr = features.get("complaint_growth_rate")
    if cgr is not None and raw:
        total_comp = int(raw.total_complaints or 0)
        if cgr > 50:
            alerts.append({
                "alert_type": "complaint_surge",
                "severity": "critical",
                "title": f"Complaint Surge: {pname} Volume Up {cgr:.1f}% MoM",
                "message": (
                    f"{pname} complaints surged {cgr:.1f}% this period "
                    f"({total_comp:,} total complaints). "
                    f"This level of increase signals a major product or service failure."
                ),
                "metric_name": "complaint_growth_rate",
                "metric_value": cgr,
            })
        elif cgr > 25:
            alerts.append({
                "alert_type": "complaint_surge",
                "severity": "high",
                "title": f"Rising Complaints: {pname} +{cgr:.1f}% This Period",
                "message": (
                    f"{pname} complaint volume grew by {cgr:.1f}% "
                    f"({total_comp:,} total). High complaint growth often precedes churn. "
                    f"Investigate and resolve top complaint categories."
                ),
                "metric_name": "complaint_growth_rate",
                "metric_value": cgr,
            })
        elif cgr > 10:
            alerts.append({
                "alert_type": "complaint_surge",
                "severity": "medium",
                "title": f"Complaint Increase: {pname} +{cgr:.1f}% Growth",
                "message": (
                    f"{pname} complaints increased {cgr:.1f}% ({total_comp:,} total). "
                    f"Customer satisfaction below target — review feedback trends."
                ),
                "metric_name": "complaint_growth_rate",
                "metric_value": cgr,
            })
        elif cgr > 3 and total_comp > 0:
            alerts.append({
                "alert_type": "complaint_surge",
                "severity": "low",
                "title": f"Minor Complaint Uptick: {pname} +{cgr:.1f}%",
                "message": (
                    f"{pname} shows minor complaint growth of {cgr:.1f}% ({total_comp:,} total). "
                    f"Continue monitoring for escalation."
                ),
                "metric_name": "complaint_growth_rate",
                "metric_value": cgr,
            })

    # ── CSAT alert ────────────────────────────────────────────────────────────
    csat = features.get("csat_score")
    if csat is not None and 0 < csat < 3.0:
        alerts.append({
            "alert_type": "complaint_surge",
            "severity": "critical" if csat < 2.0 else "high",
            "title": f"Low Customer Satisfaction: {pname} CSAT {csat:.1f}/5.0",
            "message": (
                f"{pname} CSAT score of {csat:.1f}/5.0 is below acceptable levels. "
                f"Customer dissatisfaction at this level risks significant churn."
            ),
            "metric_name": "csat_score",
            "metric_value": csat,
        })

    # ── User adoption alert ───────────────────────────────────────────────────
    aur = features.get("active_user_rate")
    if aur is not None:
        aur_pct = round(aur * 100, 1)
        if aur_pct < 15:
            alerts.append({
                "alert_type": "score_drop",
                "severity": "critical",
                "title": f"Critical: {pname} Active User Rate Only {aur_pct:.1f}%",
                "message": (
                    f"Only {aur_pct:.1f}% of {pname} registered users are active. "
                    f"Product adoption has critically failed — immediate action required."
                ),
                "metric_name": "active_user_rate",
                "metric_value": aur,
            })
        elif aur_pct < 25:
            alerts.append({
                "alert_type": "score_drop",
                "severity": "high",
                "title": f"Low User Adoption: {pname} at {aur_pct:.1f}%",
                "message": (
                    f"{pname} active user rate of {aur_pct:.1f}% is below the 30% minimum threshold. "
                    f"User engagement campaigns must be prioritised."
                ),
                "metric_name": "active_user_rate",
                "metric_value": aur,
            })

    return alerts


class RecommendationService:

    def generate_for_product(
        self,
        db: Session,
        product_id: int,
        period_date: date,
        score_obj: Score,
        features: dict,
    ) -> List[Recommendation]:
        """Generate dynamic recommendations from actual dataset values."""
        # Remove old recommendations for this product+period to avoid duplicates
        db.query(Recommendation).filter(
            Recommendation.product_id == product_id,
            Recommendation.period_date == period_date,
        ).delete()
        db.commit()

        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return []

        # Get the latest raw data for this product+period
        raw = (
            db.query(RawData)
            .filter(
                RawData.product_id == product_id,
                RawData.period_date == period_date,
            )
            .order_by(RawData.period_date.desc())
            .first()
        )
        if raw is None:
            raw = (
                db.query(RawData)
                .filter(RawData.product_id == product_id)
                .order_by(RawData.period_date.desc())
                .first()
            )

        rec_dicts = _build_recommendations(product, features, raw, score_obj, period_date)
        saved = []

        for rd in rec_dicts:
            ai_exp = self._generate_ai_explanation(score_obj, features, rd, product)
            rec = Recommendation(
                product_id=product_id,
                score_id=score_obj.id if score_obj else None,
                period_date=period_date,
                category=rd["category"],
                priority=rd["priority"],
                title=rd["title"],
                description=rd["description"],
                trigger_metric=rd.get("trigger_metric"),
                trigger_value=rd.get("trigger_value"),
                ai_explanation=ai_exp,
            )
            db.add(rec)
            saved.append(rec)

        db.commit()
        return saved

    def generate_alerts(
        self,
        db: Session,
        product_id: int,
        period_date: date,
        score_obj: Score,
        features: dict,
    ) -> List[Alert]:
        """Generate dynamic alerts from actual dataset values."""
        db.query(Alert).filter(
            Alert.product_id == product_id,
            Alert.period_date == period_date,
        ).delete()
        db.commit()

        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return []

        raw = (
            db.query(RawData)
            .filter(RawData.product_id == product_id)
            .order_by(RawData.period_date.desc())
            .first()
        )

        alert_dicts = _build_alerts(product, features, raw, score_obj, period_date)
        saved = []

        for ad in alert_dicts:
            alert = Alert(
                product_id=product_id,
                alert_type=ad["alert_type"],
                severity=ad["severity"],
                title=ad["title"],
                message=ad["message"],
                metric_name=ad.get("metric_name"),
                metric_value=ad.get("metric_value"),
                previous_value=ad.get("previous_value"),
                threshold_value=ad.get("threshold_value", 0),
                period_date=period_date,
            )
            db.add(alert)
            saved.append(alert)

        db.commit()
        return saved

    def _generate_ai_explanation(
        self,
        score_obj: Score,
        features: dict,
        rule: dict,
        product: Product,
    ) -> str:
        score = score_obj.performance_score if score_obj else 0
        change = score_obj.score_change if score_obj else None

        lines = [f"Product: {product.name}"]
        lines.append(f"Performance Score: {score:.1f}/95 ({score_obj.performance_tier if score_obj else 'N/A'})")
        if change is not None:
            direction = "decreased" if change < 0 else "increased"
            lines.append(f"Score {direction} by {abs(change):.1f} points this period.")

        # Identify actual contributing factors from real data
        contributors = []
        tsr = features.get("transaction_success_rate") or features.get("txn_success_rate") or 1
        if tsr < 0.95:
            contributors.append(f"Transaction failure rate: {round((1-tsr)*100, 1)}%")

        dis = features.get("downtime_impact_score") or 0
        dis_pct = dis if dis > 1.0 else dis * 100
        if dis_pct > 2:
            contributors.append(f"System downtime: {dis_pct:.2f}% of available time")

        cgr = features.get("complaint_growth_rate") or 0
        if cgr > 10:
            contributors.append(f"Complaint growth: +{cgr:.1f}% MoM")

        aur = features.get("active_user_rate") or 1
        if aur < 0.5:
            contributors.append(f"Active user rate: {round(aur*100, 1)}%")

        csat = features.get("csat_score") or 5
        if csat < 3.5:
            contributors.append(f"Customer satisfaction: {csat:.1f}/5.0")

        api_err = features.get("api_error_rate") or 0
        if api_err > 3:
            contributors.append(f"API error rate: {api_err:.1f}%")

        if contributors:
            lines.append("\nKey factors affecting this recommendation:")
            for c in contributors:
                lines.append(f"  • {c}")

        lines.append(f"\nRecommended Action: {rule.get('title', 'See description')}")
        lines.append(f"Priority: {rule.get('priority', 'medium').upper()}")
        lines.append(f"Category: {rule.get('category', 'general').replace('_', ' ').title()}")

        return "\n".join(lines)


recommendation_service = RecommendationService()
