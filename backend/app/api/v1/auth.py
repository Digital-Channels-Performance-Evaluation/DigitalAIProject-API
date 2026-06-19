import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import (
    verify_password, hash_password, create_access_token, create_refresh_token, decode_token
)
from app.core.deps import get_current_user
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.auth import (
    LoginRequest, TokenResponse, RefreshRequest, AccessTokenResponse,
    ChangePasswordRequest, AdminResetPasswordRequest,
)
import pyotp

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Avatar storage — relative to the backend working directory
AVATAR_DIR = "uploads/avatars"
os.makedirs(AVATAR_DIR, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_AVATAR_BYTES = 5 * 1024 * 1024  # 5 MB


def log_audit(db: Session, user_id, action, request: Request, status: str = "success"):
    log = AuditLog(
        user_id=user_id,
        action=action,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        status=status,
    )
    db.add(log)
    db.commit()


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email, User.is_active == True).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        log_audit(db, None, "login_failed", request, "failure")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.is_mfa_enabled and user.mfa_secret:
        if not payload.mfa_code:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="MFA code required")
        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(payload.mfa_code):
            log_audit(db, user.id, "mfa_failed", request, "failure")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MFA code")

    user.last_login = datetime.now(timezone.utc)
    db.commit()

    access_token  = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)
    log_audit(db, user.id, "login_success", request)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        email=user.email,
        role=user.role,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
    )


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)):
    token_data = decode_token(payload.refresh_token)
    if not token_data or token_data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    user_id = token_data.get("sub")
    user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return AccessTokenResponse(access_token=create_access_token(user.id, user.role))


@router.post("/logout")
async def logout(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    log_audit(db, current_user.id, "logout", request)
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id":             current_user.id,
        "full_name":      current_user.full_name,
        "email":          current_user.email,
        "role":           current_user.role,
        "is_mfa_enabled": current_user.is_mfa_enabled,
        "last_login":     current_user.last_login,
        "avatar_url":     current_user.avatar_url,
    }


# ── Change own password ───────────────────────────────────────────────────────
@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


# ── Upload / update own avatar ────────────────────────────────────────────────
@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, or GIF images are allowed")

    content = await file.read()
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=400, detail="Image must be smaller than 5 MB")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(AVATAR_DIR, filename)

    # Delete old avatar file if it exists
    if current_user.avatar_url:
        old_path = current_user.avatar_url.lstrip("/")
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass

    with open(filepath, "wb") as f:
        f.write(content)

    avatar_url = f"/uploads/avatars/{filename}"
    current_user.avatar_url = avatar_url
    db.commit()
    return {"avatar_url": avatar_url, "message": "Avatar updated successfully"}
