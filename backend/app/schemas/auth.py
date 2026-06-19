from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    mfa_code: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    role: str
    full_name: str
    avatar_url: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str = "product_manager"


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class AdminResetPasswordRequest(BaseModel):
    new_password: str


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    is_active: bool
    is_mfa_enabled: bool
    avatar_url: Optional[str] = None
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MFASetupResponse(BaseModel):
    secret: str
    qr_code_url: str
    provisioning_uri: str


class MFAVerifyRequest(BaseModel):
    code: str
