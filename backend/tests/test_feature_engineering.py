"""
Feature Engineering Service Tests
"""
import pytest
from app.services.feature_engineering import FeatureEngineeringService
from unittest.mock import MagicMock


@pytest.fixture
def service():
    return FeatureEngineeringService()


def make_raw(overrides=None):
    raw = MagicMock()
    defaults = {
        "id": 1,
        "product_id": 1,
        "period_date": "2024-01-01",
        "total_users": 100000,
        "active_users": 60000,
        "new_users": 5000,
        "churned_users": 1000,
        "total_transactions": 200000,
        "successful_transactions": 192000,
        "failed_transactions": 8000,
        "transaction_volume": 50000000,
        "total_revenue": 1500000,
        "fee_revenue": 180000,
        "uptime_percentage": 99.1,
        "downtime_hours": 1.5,
        "avg_response_time_ms": 450,
        "total_complaints": 350,
        "resolved_complaints": 280,
    }
    if overrides:
        defaults.update(overrides)
    for k, v in defaults.items():
        setattr(raw, k, v)
    return raw


def test_active_user_rate(service):
    raw = make_raw()
    features = service.compute_features(raw)
    expected = 60000 / 100000
    assert abs(features["active_user_rate"] - expected) < 0.001


def test_transaction_success_rate(service):
    raw = make_raw()
    features = service.compute_features(raw)
    expected = 192000 / 200000
    assert abs(features["transaction_success_rate"] - expected) < 0.001


def test_revenue_per_transaction(service):
    raw = make_raw()
    features = service.compute_features(raw)
    expected = 1500000 / 192000
    assert abs(features["revenue_per_transaction"] - expected) < 0.01


def test_revenue_per_active_user(service):
    raw = make_raw()
    features = service.compute_features(raw)
    expected = 1500000 / 60000
    assert abs(features["revenue_per_active_user"] - expected) < 0.01


def test_downtime_impact_score(service):
    raw = make_raw()
    features = service.compute_features(raw)
    assert features["downtime_impact_score"] is not None
    assert 0 <= features["downtime_impact_score"] <= 1


def test_operational_efficiency_score(service):
    raw = make_raw()
    features = service.compute_features(raw)
    assert features["operational_efficiency_score"] is not None
    assert 0 <= features["operational_efficiency_score"] <= 1


def test_safe_divide_zero(service):
    result = service._safe_divide(100, 0)
    assert result == 0.0


def test_safe_divide_none(service):
    result = service._safe_divide(None, 100)
    assert result is None


def test_complaint_growth_rate(service):
    raw = make_raw({"total_complaints": 400, "resolved_complaints": 280})
    features = service.compute_features(raw)
    expected = (400 - 280) / 400
    assert abs(features["complaint_growth_rate"] - expected) < 0.001


def test_user_engagement_index(service):
    raw = make_raw()
    features = service.compute_features(raw)
    aur = features["active_user_rate"]
    tsr = features["transaction_success_rate"]
    expected = aur * tsr
    assert abs(features["user_engagement_index"] - expected) < 0.001
