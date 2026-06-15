"""
Authentication tests.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.security import hash_password
from app.models.user import User

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Create test user
    user = db.query(User).filter(User.email == "test@ahadu.com").first()
    if not user:
        user = User(
            full_name="Test Admin",
            email="test@ahadu.com",
            hashed_password=hash_password("TestPass@123"),
            role="super_admin",
            is_active=True,
        )
        db.add(user)
        db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


def test_login_success():
    response = client.post("/api/auth/login", json={
        "email": "test@ahadu.com",
        "password": "TestPass@123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["role"] == "super_admin"


def test_login_wrong_password():
    response = client.post("/api/auth/login", json={
        "email": "test@ahadu.com",
        "password": "wrong_password",
    })
    assert response.status_code == 401


def test_login_nonexistent_user():
    response = client.post("/api/auth/login", json={
        "email": "nobody@ahadu.com",
        "password": "password",
    })
    assert response.status_code == 401


def test_get_me_authenticated():
    login_res = client.post("/api/auth/login", json={
        "email": "test@ahadu.com",
        "password": "TestPass@123",
    })
    token = login_res.json()["access_token"]
    
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "test@ahadu.com"


def test_get_me_no_token():
    response = client.get("/api/auth/me")
    assert response.status_code in [401, 403]


def test_refresh_token():
    login_res = client.post("/api/auth/login", json={
        "email": "test@ahadu.com",
        "password": "TestPass@123",
    })
    refresh_token = login_res.json()["refresh_token"]
    
    response = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
