from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
from pathlib import Path
import shutil, uuid

from app.database import get_db
from app.core.security import verify_password, create_access_token
from app.core.deps import get_current_user
from app import models, schemas
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Directory for storing avatars
AVATARS_DIR = settings.DATA_ROOT / "avatars"
AVATARS_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/login", response_model=schemas.TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login with email + password, returns JWT access token."""
    user = db.query(models.User).filter(
        models.User.email == form_data.username
    ).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return schemas.TokenResponse(access_token=token, user=user)


@router.post("/login/json", response_model=schemas.TokenResponse)
def login_json(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Login with JSON body (for frontend fetch calls)."""
    user = db.query(models.User).filter(
        models.User.email == payload.email
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return schemas.TokenResponse(access_token=token, user=user)


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return current_user


@router.put("/me", response_model=schemas.UserResponse)
def update_me(
    payload: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update own name and email (all roles)."""
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.email is not None:
        conflict = db.query(models.User).filter(
            models.User.email == payload.email,
            models.User.id != current_user.id,
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = payload.email
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/password")
def change_my_password(
    payload: schemas.UserChangePassword,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change own password."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    from app.core.security import hash_password
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


# ── Avatar upload ─────────────────────────────────────────────────────────────

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_AVATAR_SIZE_MB  = 2


@router.post("/me/avatar", response_model=schemas.UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a profile photo. Replaces any existing avatar."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type. Allowed: jpeg, png, webp, gif",
        )

    # Read and size-check
    content = await file.read()
    if len(content) > MAX_AVATAR_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Image too large (max {MAX_AVATAR_SIZE_MB} MB)")

    # Delete old avatar if it exists
    if current_user.avatar_url:
        old_path = AVATARS_DIR / Path(current_user.avatar_url).name
        if old_path.exists():
            old_path.unlink()

    # Save new avatar with unique name
    ext = Path(file.filename).suffix.lower() or ".jpg"
    filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}{ext}"
    dest = AVATARS_DIR / filename

    with open(dest, "wb") as f:
        f.write(content)

    # Store relative URL
    current_user.avatar_url = f"/api/v1/auth/avatar/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me/avatar", response_model=schemas.UserResponse)
def delete_avatar(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove profile photo."""
    if current_user.avatar_url:
        old_path = AVATARS_DIR / Path(current_user.avatar_url).name
        if old_path.exists():
            old_path.unlink()
        current_user.avatar_url = None
        db.commit()
        db.refresh(current_user)
    return current_user


@router.get("/avatar/{filename}")
def serve_avatar(filename: str):
    """Serve a stored avatar image (public endpoint)."""
    path = AVATARS_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Avatar not found")
    return FileResponse(str(path))
