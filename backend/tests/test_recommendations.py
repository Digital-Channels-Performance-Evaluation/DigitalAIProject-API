"""
Recommendation Engine Tests
"""
import pytest
from unittest.mock import MagicMock, patch
from app.services.recommendation_service import RecommendationService
from datetime import date


@pytest.fixture
def service():
    return RecommendationService()


def make_score(perf_score=75.0, prev_score=80.0, tier="HIGH"):
    score = MagicMock()
    score.id = 1
    score.performance_score = perf_score
    score.previous_score = prev_score
    score.score_change = perf_score - prev_score
    score.performance_tier = tier
    return score


def test_high_failure_rate_triggers_recommendation(service):
    db = MagicMock()
    db.add = MagicMock()
    db.commit = MagicMock()
    
    features = {
        "transaction_success_rate": 0.82,  # Below 0.90 threshold
        "active_user_rate": 0.65,
        "downtime_impact_score": 0.01,
        "complaint_growth_rate": 0.05,
        "operational_efficiency_score": 0.85,
        "user_engagement_index": 0.55,
        "revenue_per_active_user": 25.0,
        "revenue_per_transaction": 8.0,
    }
    score_obj = make_score()
    
    recs = service.generate_for_product(db, 1, date.today(), score_obj, features)
    
    titles = [r.title for r in recs]
    assert any("transaction" in t.lower() or "failure" in t.lower() for t in titles)


def test_high_downtime_triggers_recommendation(service):
    db = MagicMock()
    db.add = MagicMock()
    db.commit = MagicMock()
    
    features = {
        "transaction_success_rate": 0.95,
        "active_user_rate": 0.60,
        "downtime_impact_score": 0.12,  # Above 0.05 threshold
        "complaint_growth_rate": 0.05,
        "operational_efficiency_score": 0.75,
        "user_engagement_index": 0.55,
        "revenue_per_active_user": 25.0,
        "revenue_per_transaction": 8.0,
    }
    score_obj = make_score()
    
    recs = service.generate_for_product(db, 1, date.today(), score_obj, features)
    
    titles = [r.title for r in recs]
    assert any("infrastructure" in t.lower() or "downtime" in t.lower() for t in titles)


def test_no_recommendations_for_healthy_product(service):
    db = MagicMock()
    db.add = MagicMock()
    db.commit = MagicMock()
    
    features = {
        "transaction_success_rate": 0.97,
        "active_user_rate": 0.72,
        "downtime_impact_score": 0.005,
        "complaint_growth_rate": 0.03,
        "operational_efficiency_score": 0.92,
        "user_engagement_index": 0.68,
        "revenue_per_active_user": 45.0,
        "revenue_per_transaction": 12.0,
    }
    score_obj = make_score(perf_score=88.0, prev_score=85.0)
    
    recs = service.generate_for_product(db, 1, date.today(), score_obj, features)
    assert len(recs) == 0


def test_score_drop_alert_generated(service):
    db = MagicMock()
    db.add = MagicMock()
    db.commit = MagicMock()
    
    score_obj = make_score(perf_score=55.0, prev_score=70.0)
    features = {
        "transaction_success_rate": 0.92,
        "downtime_impact_score": 0.02,
        "complaint_growth_rate": 0.08,
        "active_user_rate": 0.50,
    }
    
    alerts = service.generate_alerts(db, 1, date.today(), score_obj, features)
    alert_types = [a.alert_type for a in alerts]
    assert "score_drop" in alert_types
