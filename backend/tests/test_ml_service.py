"""
ML Service unit tests.
All tests use no DB — pure logic verification.
"""
import pytest
import numpy as np
from app.services.ml_service import MLService


@pytest.fixture
def service():
    return MLService()


# ── Performance score formula ─────────────────────────────────────────────────

def test_compute_performance_score_high(service):
    features = {
        "active_user_rate": 0.80,
        "txn_success_rate": 0.97,
        "transaction_success_rate": 0.97,
        "operational_efficiency_score": 92.0,
        "downtime_impact_score": 0.3,
        "complaint_resolution_rate": 90.0,
        "csat_score": 4.5,
        "fraud_incidents": 1,
        "api_error_rate": 1.0,
    }
    score = service._compute_performance_score(features)
    assert score >= 75, f"Expected HIGH score (≥75), got {score}"
    assert 0 <= score <= 95


def test_compute_performance_score_low(service):
    features = {
        "active_user_rate": 0.10,
        "txn_success_rate": 0.70,
        "transaction_success_rate": 0.70,
        "operational_efficiency_score": 30.0,
        "downtime_impact_score": 20.0,
        "complaint_resolution_rate": 20.0,
        "csat_score": 1.5,
        "fraud_incidents": 60,
        "api_error_rate": 18.0,
    }
    score = service._compute_performance_score(features)
    assert score < 45, f"Expected LOW score (<45), got {score}"
    assert score >= 0


def test_score_never_exceeds_95(service):
    """Score cap: no product may ever score 100; maximum is 95."""
    features = {
        "active_user_rate": 1.0,
        "txn_success_rate": 1.0,
        "transaction_success_rate": 1.0,
        "operational_efficiency_score": 100.0,
        "downtime_impact_score": 0.0,
        "complaint_resolution_rate": 100.0,
        "csat_score": 5.0,
        "fraud_incidents": 0,
        "api_error_rate": 0.0,
    }
    score = service._compute_performance_score(features)
    assert score <= 95.0, f"Score must not exceed 95, got {score}"


def test_score_never_below_zero(service):
    features = {
        "active_user_rate": 0.0,
        "txn_success_rate": 0.0,
        "transaction_success_rate": 0.0,
        "operational_efficiency_score": 0.0,
        "downtime_impact_score": 100.0,
        "complaint_resolution_rate": 0.0,
        "csat_score": 0.0,
        "fraud_incidents": 999,
        "api_error_rate": 100.0,
    }
    score = service._compute_performance_score(features)
    assert score >= 0.0


# ── Tier assignment ───────────────────────────────────────────────────────────

def test_assign_tiers(service):
    scores = np.array([85.0, 60.0, 20.0])
    tiers = service._assign_tiers(scores)
    assert tiers[0] == "HIGH"
    assert tiers[1] == "MEDIUM"
    assert tiers[2] == "LOW"


def test_score_to_tier_boundaries(service):
    assert service._score_to_tier(75.0) == "HIGH"
    assert service._score_to_tier(74.9) == "MEDIUM"
    assert service._score_to_tier(45.0) == "MEDIUM"
    assert service._score_to_tier(44.9) == "LOW"
    assert service._score_to_tier(0.0) == "LOW"


# ── Metric reporting: no artificial cap ──────────────────────────────────────

def test_cap_metrics_reports_true_value(service):
    """After fix: _cap_metrics must NOT clamp accuracy — report true value."""
    result = service._cap_metrics(acc=0.98, f1=0.99, r2=0.97, mae=2.5)
    assert result["acc"] == 0.98, "Accuracy must not be artificially capped at 0.96"
    assert result["f1"] == 0.99,  "F1 must not be artificially capped at 0.958"
    assert result["r2"] == 0.97,  "R² must not be artificially capped at 0.96"
    assert result["mae"] == 2.5


def test_cap_metrics_rounds_to_4dp(service):
    result = service._cap_metrics(acc=0.956789, f1=0.943210)
    assert result["acc"] == 0.9568
    assert result["f1"] == 0.9432


# ── Explanation generation ────────────────────────────────────────────────────

def test_explanation_mentions_score(service):
    features = {
        "txn_success_rate": 0.80,
        "downtime_impact_score": 5.0,
        "complaint_growth_rate": 15.0,
        "active_user_rate": 0.25,
        "fraud_incidents": 0,
        "api_error_rate": 1.0,
        "csat_score": 3.0,
    }
    explanation = service._generate_explanation(features, 42.5)
    assert "42.5" in explanation
    assert len(explanation) > 30


def test_explanation_healthy_product(service):
    features = {
        "txn_success_rate": 0.98,
        "downtime_impact_score": 0.1,
        "complaint_growth_rate": 2.0,
        "active_user_rate": 0.75,
        "fraud_incidents": 0,
        "api_error_rate": 0.5,
        "csat_score": 4.5,
    }
    explanation = service._generate_explanation(features, 88.0)
    assert "strong" in explanation.lower() or "88.0" in explanation


# ── DB alias map: fraud_event_count → fraud_incidents ────────────────────────

def test_db_feature_alias_maps_fraud_correctly(service):
    """fraud_event_count (DB column) must map to fraud_incidents (FEATURES name)."""
    from app.services.ml_service import DB_FEATURE_ALIAS
    assert DB_FEATURE_ALIAS.get("fraud_event_count") == "fraud_incidents", (
        "DB column 'fraud_event_count' must alias to feature 'fraud_incidents'"
    )


def test_db_feature_alias_no_duplicate_fraud_key(service):
    """The old broken key 'fraud_incidents' must not appear as a DB column alias."""
    from app.services.ml_service import DB_FEATURE_ALIAS
    # 'fraud_incidents' is a FEATURES name (value), not a DB column (key)
    assert "fraud_incidents" not in DB_FEATURE_ALIAS, (
        "'fraud_incidents' should be a FEATURES value, not a DB_FEATURE_ALIAS key"
    )


# ── Training noise ────────────────────────────────────────────────────────────

def test_add_training_noise_preserves_shape(service):
    X = np.ones((10, 5)) * 0.5
    noisy = service._add_training_noise(X)
    assert noisy.shape == X.shape
    assert np.all(noisy >= 0) and np.all(noisy <= 1)


# ── Safe split ────────────────────────────────────────────────────────────────

def test_safe_split_tiny_dataset(service):
    X = np.array([[1, 2], [3, 4], [5, 6]])
    y = np.array(["HIGH", "MEDIUM", "LOW"])
    X_train, X_test, y_train, y_test = service._safe_split(X, y)
    assert len(X_train) >= 1
    assert len(X_test) >= 1
