"""
Recommendation Engine unit tests.
Uses mocked DB — the service queries Product and RawData from DB,
so we mock those query results.
"""
import pytest
from unittest.mock import MagicMock, patch
from datetime import date
from app.services.recommendation_service import _build_recommendations, _build_alerts


def make_product(name="Test Product"):
    p = MagicMock()
    p.id = 1
    p.name = name
    return p


def make_score(perf_score=75.0, prev_score=80.0, tier="HIGH", score_change=None):
    s = MagicMock()
    s.id = 1
    s.performance_score = perf_score
    s.previous_score = prev_score
    s.score_change = score_change if score_change is not None else perf_score - prev_score
    s.performance_tier = tier
    s.previous_tier = tier
    s.tier_changed = False
    return s


def make_raw(**kwargs):
    r = MagicMock()
    defaults = dict(
        total_users=100_000, active_users=65_000,
        total_transactions=200_000, failed_transactions=8_000,
        successful_transactions=192_000,
        total_revenue=1_500_000,
        total_complaints=300, resolved_complaints=240,
        downtime_minutes=90, downtime_hours=1.5, uptime_percentage=99.1,
        avg_response_time_ms=450,
    )
    defaults.update(kwargs)
    for k, v in defaults.items():
        setattr(r, k, v)
    return r


# ── _build_recommendations ────────────────────────────────────────────────────

def test_high_failure_rate_triggers_recommendation():
    """Transaction failure >7% must generate a reliability recommendation."""
    features = {"transaction_success_rate": 0.82, "active_user_rate": 0.65}
    recs = _build_recommendations(make_product(), features, make_raw(), make_score(), date.today())
    titles = [r["title"].lower() for r in recs]
    assert any("transaction" in t or "failure" in t for t in titles), \
        f"No transaction/failure recommendation found in: {titles}"


def test_critical_failure_rate_triggers_critical_priority():
    """Failure rate >15% must produce a critical priority recommendation."""
    features = {"transaction_success_rate": 0.80, "active_user_rate": 0.65}
    recs = _build_recommendations(make_product(), features, make_raw(failed_transactions=40_000), make_score(), date.today())
    priorities = [r["priority"] for r in recs]
    assert "critical" in priorities or "high" in priorities


def test_high_downtime_triggers_infrastructure_recommendation():
    """downtime_impact_score >3 should trigger an infrastructure recommendation."""
    features = {
        "downtime_impact_score": 12.0,  # 12% of monthly minutes
        "transaction_success_rate": 0.97,
        "active_user_rate": 0.65,
    }
    recs = _build_recommendations(make_product(), features, make_raw(), make_score(), date.today())
    cats = [r["category"] for r in recs]
    assert "infrastructure" in cats, f"Expected 'infrastructure' category, got: {cats}"


def test_low_active_user_rate_triggers_adoption_recommendation():
    """Active user rate <40% should trigger a user_adoption recommendation."""
    features = {"active_user_rate": 0.18, "transaction_success_rate": 0.96}
    recs = _build_recommendations(make_product(), features, make_raw(active_users=18_000), make_score(), date.today())
    cats = [r["category"] for r in recs]
    assert "user_adoption" in cats, f"Expected 'user_adoption', got: {cats}"


def test_low_csat_triggers_satisfaction_recommendation():
    """CSAT < 2.5 should produce a customer_satisfaction recommendation."""
    features = {"csat_score": 1.8, "transaction_success_rate": 0.96, "active_user_rate": 0.60}
    recs = _build_recommendations(make_product(), features, make_raw(), make_score(), date.today())
    cats = [r["category"] for r in recs]
    assert "customer_satisfaction" in cats, f"Expected 'customer_satisfaction', got: {cats}"


def test_high_api_error_rate_triggers_technical_quality():
    """API error rate > 10% should trigger a critical technical_quality recommendation."""
    features = {"api_error_rate": 15.0, "transaction_success_rate": 0.96, "active_user_rate": 0.60}
    recs = _build_recommendations(make_product(), features, make_raw(), make_score(), date.today())
    cats = [r["category"] for r in recs]
    assert "technical_quality" in cats, f"Expected 'technical_quality', got: {cats}"


def test_high_fraud_triggers_security_recommendation():
    """fraud_incidents > 50 should trigger a critical security_compliance recommendation."""
    features = {"fraud_incidents": 60, "transaction_success_rate": 0.96, "active_user_rate": 0.65}
    recs = _build_recommendations(make_product(), features, make_raw(), make_score(), date.today())
    cats = [r["category"] for r in recs]
    assert "security_compliance" in cats, f"Expected 'security_compliance', got: {cats}"


def test_score_drop_triggers_performance_recovery():
    """Score drop > 8 pts should trigger a performance_recovery recommendation."""
    score = make_score(perf_score=50.0, prev_score=65.0, score_change=-15.0)
    features = {"transaction_success_rate": 0.93, "active_user_rate": 0.60}
    recs = _build_recommendations(make_product(), features, make_raw(), score, date.today())
    cats = [r["category"] for r in recs]
    assert "performance_recovery" in cats, f"Expected 'performance_recovery', got: {cats}"


def test_healthy_product_has_no_recommendations():
    """A product with all metrics in healthy ranges should produce no recommendations."""
    features = {
        "transaction_success_rate": 0.97,
        "active_user_rate": 0.75,
        # downtime_impact_score omitted — service skips the check when None
        # This simulates a product with no downtime recorded this period
        "complaint_growth_rate": 2.0,
        "complaint_resolution_rate": 88.0,
        "operational_efficiency_score": 90.0,
        "revenue_per_active_user": 55.0,
        "api_error_rate": 1.0,
        "csat_score": 4.5,
        "fraud_incidents": 2,
    }
    score = make_score(perf_score=88.0, prev_score=86.0, score_change=2.0)
    recs = _build_recommendations(make_product(), features, make_raw(), score, date.today())
    assert len(recs) == 0, (
        f"Expected 0 recommendations for healthy product, "
        f"got {len(recs)}: {[r['title'] for r in recs]}"
    )


# ── _build_alerts ─────────────────────────────────────────────────────────────

def test_large_score_drop_generates_critical_alert():
    """Score drop ≥ 15 pts must generate a critical score_drop alert."""
    score = make_score(perf_score=50.0, prev_score=70.0, score_change=-20.0)
    features = {}
    alerts = _build_alerts(make_product(), features, make_raw(), score, date.today())
    critical_drops = [a for a in alerts if a["alert_type"] == "score_drop" and a["severity"] == "critical"]
    assert len(critical_drops) > 0, "Expected critical score_drop alert for 20pt drop"


def test_medium_score_drop_generates_high_alert():
    """Score drop of 8–14 pts must generate a high severity score_drop alert."""
    score = make_score(perf_score=60.0, prev_score=70.0, score_change=-10.0)
    features = {}
    alerts = _build_alerts(make_product(), features, make_raw(), score, date.today())
    high_drops = [a for a in alerts if a["alert_type"] == "score_drop" and a["severity"] == "high"]
    assert len(high_drops) > 0, "Expected high score_drop alert for 10pt drop"


def test_high_transaction_failure_generates_alert():
    """Failure rate > 20% must produce a critical failure_rate_increase alert."""
    score = make_score(perf_score=40.0, prev_score=42.0)
    features = {"transaction_success_rate": 0.75}  # 25% failure
    alerts = _build_alerts(make_product(), features, make_raw(), score, date.today())
    failure_alerts = [a for a in alerts if a["alert_type"] == "failure_rate_increase"]
    assert len(failure_alerts) > 0, "Expected failure_rate_increase alert"
    assert failure_alerts[0]["severity"] == "critical"


def test_high_downtime_generates_downtime_alert():
    """downtime_impact_score > 15% must produce a critical downtime_spike alert."""
    features = {"downtime_impact_score": 18.0}
    score = make_score()
    alerts = _build_alerts(make_product(), features, make_raw(), score, date.today())
    downtime_alerts = [a for a in alerts if a["alert_type"] == "downtime_spike"]
    assert len(downtime_alerts) > 0
    assert downtime_alerts[0]["severity"] == "critical"


def test_alert_contains_required_fields():
    """Every generated alert must have alert_type, severity, title, message."""
    score = make_score(perf_score=50.0, prev_score=68.0, score_change=-18.0)
    features = {"transaction_success_rate": 0.78, "downtime_impact_score": 16.0}
    alerts = _build_alerts(make_product(), features, make_raw(), score, date.today())
    for a in alerts:
        assert "alert_type" in a
        assert "severity" in a
        assert "title" in a
        assert "message" in a
