from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import decode_token
from app import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# ── Role sets ─────────────────────────────────────────────────────────────────
# Roles that can upload datasets, train models, run/delete predictions
_DATA_ROLES = {
    models.UserRole.admin,
    models.UserRole.manager,
    models.UserRole.officer,
}

# All authenticated roles (everyone except unauthenticated)
_ALL_ROLES = {
    models.UserRole.admin,
    models.UserRole.executive_manager,
    models.UserRole.manager,
    models.UserRole.officer,
}


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    user_id: int = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Admin only — user management, audit log."""
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_data_access(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Admin / Manager / Officer — upload data, train models, run predictions."""
    if current_user.role not in _DATA_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Data access requires Admin, Manager, or Officer role"
        )
    return current_user


# Legacy alias kept so existing imports still work
require_analyst = require_data_access
