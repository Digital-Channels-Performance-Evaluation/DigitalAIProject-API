"""
Shared pytest fixtures.

DB strategy
-----------
- Integration tests (test_auth.py, test_api_*.py) use a real MySQL instance,
  which is available both locally (DATABASE_URL env var) and in CI (GitHub
  Actions spins up a mysql service container).
- Unit tests (test_ml_service.py, test_feature_engineering.py,
  test_recommendations.py) use mocks and never touch the DB.

Set DATABASE_URL before running integration tests, e.g.:
    export DATABASE_URL=mysql+pymysql://ahadu_user:ahadu_pass@localhost:3306/ahadu_test
    pytest tests/
"""
import os
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# ── Database URL ──────────────────────────────────────────────────────────────
# Use MySQL if DATABASE_URL is provided, otherwise fall back to SQLite for
# pure unit tests that don't exercise the DB directly.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./test_ahadu.db",
)

# Suppress SQLAlchemy warnings in tests
os.environ.setdefault("DEBUG", "true")


@pytest.fixture(scope="session")
def db_engine():
    """Create a test database engine (session-scoped for speed)."""
    connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
    yield engine
    engine.dispose()


@pytest.fixture(scope="session")
def db_tables(db_engine):
    """Create all tables once per test session."""
    from app.core.database import Base
    # Import all models so they register on Base.metadata
    import app.models.user           # noqa
    import app.models.product        # noqa
    import app.models.data           # noqa
    import app.models.ml_models      # noqa
    import app.models.alerts         # noqa
    import app.models.recommendations  # noqa
    import app.models.audit_log      # noqa

    Base.metadata.create_all(bind=db_engine)
    yield
    Base.metadata.drop_all(bind=db_engine)


@pytest.fixture
def db_session(db_engine, db_tables):
    """Provide a transactional DB session that rolls back after each test."""
    connection = db_engine.connect()
    transaction = connection.begin()
    SessionLocal = sessionmaker(bind=connection)
    session = SessionLocal()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def test_user(db_session):
    """Create a super_admin test user."""
    from app.models.user import User
    from app.core.security import hash_password

    user = db_session.query(User).filter(User.email == "test@ahadu.com").first()
    if not user:
        user = User(
            full_name="Test Admin",
            email="test@ahadu.com",
            hashed_password=hash_password("TestPass@123"),
            role="super_admin",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
    return user


@pytest.fixture
def client(db_session):
    """FastAPI test client with DB session overridden."""
    from app.main import app
    from app.core.database import get_db

    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # rollback handled by db_session fixture

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client, test_user):
    """Return Authorization headers for the test super_admin user."""
    resp = client.post("/api/auth/login", json={
        "email": "test@ahadu.com",
        "password": "TestPass@123",
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
