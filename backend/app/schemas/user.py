"""Pydantic schemas for User model and authentication."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """Base user schema with common fields."""

    email: EmailStr
    full_name: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user data in responses (excludes sensitive data)."""

    id: int
    created_at: datetime
    is_active: bool
    timezone: str
    preferences: str
    subscription_status: str = "trialing"
    trial_ends_at: Optional[datetime] = None
    is_admin: bool = False

    class Config:
        from_attributes = True  # Allows creation from ORM models


class UserUpdate(BaseModel):
    """Schema for updating user profile."""

    full_name: Optional[str] = None
    timezone: Optional[str] = None
    preferences: Optional[str] = None


class AuthResponse(BaseModel):
    """Schema for authentication response (login/register)."""

    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
