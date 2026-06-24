"""
Feature Engineering Service unit tests.
All tests use mocked RawData objects — no DB required.
"""
import pytest
from unittest.mock import MagicMock
from app.services.feature_engineering import FeatureEngineeringService


@pytest.fixture
def service():
    return FeatureEngineeringService()


def make_raw(overrides=None):
    """Build a mock RawData with realistic defaults."""
    raw = MagicMock()
    defaults = {
        "id": 1,
        "product_id": 1,
        "period_date": "2024-01-01",
        "total_users": 100_000,
        "active_users": 60_000,
        "new_users": 5_000,
        "churned_users": 1_000,
        "total_transactions": 200_000,
        "successful_transactions": 192_000,
        "failed_transactions": 8_000,
        "failed_txn_rate": None,          # prefer successful_transactions path
        "transaction_volume": 50_000_000,
        "total_revenue": 1_500_000,
        "fee_revenue": 180_000,
        "uptime_percentage": 99.1,
        "downtime_hours": 1.5,
        "downtime_minutes": 90.0,
        "avg_response_time_ms": 450,
        "avg_session_duration_sec": None, # separate field — not derived from response time
        "api_error_rate": 2.5,
        "total_complaints": 350,
        "resolved_complaints": 280,
        "csat_score": 4.1,
        "fraud_event_count": 3,
        "security_incident_count": 0,
    }
    if overrides:
        defaults.update(overrides)
    for k, v in defaults.items():
        setattr(raw, k, v)
    return raw


# ── Core feature computations ─────────────────────────────────────────────────

def test_active_user_rate(service):
    raw = make_raw()
    features = service.compute_features(raw)
    assert abs(features["active_user_rate"] - 0.60) < 0.001


def test_transaction_success_rate_from_successful(service):
    raw = make_raw()
    features = service.compute_features(raw)
    assert abs(features["transaction_success_rate"] - 192_000 / 200_000) < 0.001


def test_transaction_success_rate_from_failed_txn_rate(service):
    """Falls back to 1 - failed_txn_rate/100 when successful_transactions is absent."""
    raw = make_raw({"successful_transactions": None, "failed_txn_rate": 5.0})
    features = service.compute_features(raw)
    assert abs(features["transaction_success_rate"] - 0.95) < 0.001


def test_revenue_per_transaction(service):
    raw = make_raw()
    features = service.compute_features(raw)
    assert abs(features["revenue_per_transaction"] - 1_500_000 / 200_000) < 0.01


def test_revenue_per_active_user(service):
    raw = make_raw()
    features = service.compute_features(raw)
    assert abs(features["revenue_per_active_user"] - 1_500_000 / 60_000) < 0.01


def test_downtime_impact_score_from_minutes(service):
    """downtime_minutes takes priority over downtime_hours."""
    MONTHLY_MIN = 30 * 24 * 60
    raw = make_raw({"downtime_minutes": 90.0})
    features = service.compute_features(raw)
    expected = 90.0 / MONTHLY_MIN * 100
    assert abs(features["downtime_impact_score"] - expected) < 0.001


def test_downtime_impact_score_from_uptime(service):
    """Falls back to 100 - uptime when no downtime fields are available."""
    raw = make_raw({"downtime_minutes": None, "downtime_hours": None, "uptime_percentage": 98.5})
    features = service.compute_features(raw)
    assert abs(features["downtime_impact_score"] - 1.5) < 0.001


def test_operational_efficiency_score_range(service):
    raw = make_raw()
    features = service.compute_features(raw)
    oes = features["operational_efficiency_score"]
    assert oes is not None
    assert 0 <= oes <= 100


def test_complaint_growth_rate_mom(service):
    """MoM growth rate uses prev_raw when provided."""
    raw = make_raw({"total_complaints": 440})
    prev = make_raw({"total_complaints": 400})
    features = service.compute_features(raw, prev_raw=prev)
    expected = (440 - 400) / 400 * 100
    assert abs(features["complaint_growth_rate"] - expected) < 0.01


def test_complaint_resolution_rate(service):
    raw = make_raw({"total_complaints": 350, "resolved_complaints": 280})
    features = service.compute_features(raw)
    expected = 280 / 350 * 100
    assert abs(features["complaint_resolution_rate"] - expected) < 0.01


def test_user_engagement_index(service):
    raw = make_raw()
    features = service.compute_features(raw)
    aur = features["active_user_rate"]
    txn = raw.total_transactions
    assert abs(features["user_engagement_index"] - round(aur * txn, 4)) < 1.0


# ── avg_session_duration_sec does NOT copy avg_response_time_ms (bug fix) ─────

def test_avg_session_duration_sec_is_none_when_not_set(service):
    """avg_session_duration_sec must be None when the raw field is missing — not avg_response_time_ms."""
    raw = make_raw({"avg_session_duration_sec": None, "avg_response_time_ms": 450})
    features = service.compute_features(raw)
    # The fix: this should be None, not 450 (the old broken behaviour)
    assert features["avg_session_duration_sec"] is None, (
        "avg_session_duration_sec must NOT fall back to avg_response_time_ms "
        "(different units and semantics)"
    )


def test_avg_session_duration_sec_uses_dedicated_field(service):
    """When avg_session_duration_sec is present on raw, it is used correctly."""
    raw = make_raw({"avg_session_duration_sec": 185.0, "avg_response_time_ms": 450})
    features = service.compute_features(raw)
    assert features["avg_session_duration_sec"] == 185.0


# ── Safe divide edge cases ────────────────────────────────────────────────────

def test_safe_divide_zero_denominator(service):
    assert service._safe_divide(100, 0) == 0.0


def test_safe_divide_none_numerator(service):
    assert service._safe_divide(None, 100) is None


def test_safe_divide_none_denominator(service):
    assert service._safe_divide(100, None) is None


def test_safe_divide_normal(service):
    result = service._safe_divide(150_000, 300_000)
    assert abs(result - 0.5) < 0.001
