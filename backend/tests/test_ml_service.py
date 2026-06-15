"""
ML Service Tests
"""
import pytest
from app.services.ml_service import MLService


@pytest.fixture
def service():
    return MLService()


def test_compute_performance_score_high(service):
    features = {
        "active_user_rate": 0.75,
        "revenue_per_transaction": 25.0,
        "revenue_per_active_user": 50.0,
        "transaction_success_rate": 0.97,
        "user_engagement_index": 0.70,
        "complaint_growth_rate": 0.05,
        "downtime_impact_score": 0.01,
        "operational_efficiency_score": 0.92,
    }
    score = service._compute_performance_score(features)
    assert score >= 70, f"Expected HIGH score, got {score}"
    assert 0 <= score <= 100


def test_compute_performance_score_low(service):
    features = {
        "active_user_rate": 0.15,
        "revenue_per_transaction": 2.0,
        "revenue_per_active_user": 5.0,
        "transaction_success_rate": 0.72,
        "user_engagement_index": 0.10,
        "complaint_growth_rate": 0.45,
        "downtime_impact_score": 0.25,
        "operational_efficiency_score": 0.40,
    }
    score = service._compute_performance_score(features)
    assert score < 60, f"Expected lower score, got {score}"
    assert 0 <= score <= 100


def test_score_clipped_to_100(service):
    features = {
        "active_user_rate": 1.0,
        "revenue_per_transaction": 1000.0,
        "revenue_per_active_user": 1000.0,
        "transaction_success_rate": 1.0,
        "user_engagement_index": 1.0,
        "complaint_growth_rate": 0.0,
        "downtime_impact_score": 0.0,
        "operational_efficiency_score": 1.0,
    }
    score = service._compute_performance_score(features)
    assert score <= 100


def test_score_clipped_to_0(service):
    features = {
        "active_user_rate": 0.0,
        "revenue_per_transaction": 0.0,
        "revenue_per_active_user": 0.0,
        "transaction_success_rate": 0.0,
        "user_engagement_index": 0.0,
        "complaint_growth_rate": 1.0,
        "downtime_impact_score": 1.0,
        "operational_efficiency_score": 0.0,
    }
    score = service._compute_performance_score(features)
    assert score >= 0


def test_tier_assignment(service):
    import numpy as np
    scores = np.array([85.0, 55.0, 25.0])
    tiers = service._assign_tiers(scores)
    assert tiers[0] == "HIGH"
    assert tiers[1] == "MEDIUM"
    assert tiers[2] == "LOW"


def test_explanation_generated(service):
    features = {
        "transaction_success_rate": 0.80,
        "downtime_impact_score": 0.12,
        "complaint_growth_rate": 0.25,
        "active_user_rate": 0.25,
    }
    explanation = service._generate_explanation(features, 45.0)
    assert "45.0" in explanation
    assert len(explanation) > 20
