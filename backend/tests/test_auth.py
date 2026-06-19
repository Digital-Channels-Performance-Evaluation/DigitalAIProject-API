"""
Authentication endpoint integration tests.
Uses the shared conftest fixtures (real MySQL in CI, SQLite fallback locally).
"""
import pytest


def test_login_success(client, test_user):
    response = client.post("/api/auth/login", json={
        "email": "test@ahadu.com",
        "password": "TestPass@123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["role"] == "super_admin"


def test_login_wrong_password(client, test_user):
    response = client.post("/api/auth/login", json={
        "email": "test@ahadu.com",
        "password": "wrong_password",
    })
    assert response.status_code == 401


def test_login_nonexistent_user(client):
    response = client.post("/api/auth/login", json={
        "email": "nobody@ahadu.com",
        "password": "password",
    })
    assert response.status_code == 401


def test_get_me_authenticated(client, test_user, auth_headers):
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "test@ahadu.com"


def test_get_me_no_token(client):
    response = client.get("/api/auth/me")
    assert response.status_code in [401, 403]


def test_refresh_token(client, test_user):
    login_res = client.post("/api/auth/login", json={
        "email": "test@ahadu.com",
        "password": "TestPass@123",
    })
    refresh_token = login_res.json()["refresh_token"]

    response = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_logout(client, test_user, auth_headers):
    response = client.post("/api/auth/logout", headers=auth_headers)
    assert response.status_code == 200
