"""Pydantic schemas for User model and authentication."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema with common fields."""

    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a new user (registration)."""

    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class UserResponse(UserBase):
    """Schema for user data in responses (excludes sensitive data)."""

    id: int
    created_at: datetime
    is_active: bool
    timezone: str
    preferences: str

    class Config:
        from_attributes = True  # Allows creation from ORM models


class UserUpdate(BaseModel):
    """Schema for updating user profile."""

    full_name: Optional[str] = None
    timezone: Optional[str] = None
    preferences: Optional[str] = None


class Token(BaseModel):
    """Schema for authentication token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for decoded token data."""

    user_id: Optional[int] = None
    email: Optional[str] = None


class AuthResponse(BaseModel):
    """Schema for authentication response (login/register)."""

    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
