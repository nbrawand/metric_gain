"""Pydantic schemas for Exercise model."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ExerciseBase(BaseModel):
    """Base exercise schema with common fields."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    muscle_group: str = Field(..., min_length=1, max_length=100)
    equipment: Optional[str] = Field(None, max_length=100)


class ExerciseCreate(ExerciseBase):
    """Schema for creating a new exercise (custom exercises only)."""

    pass


class ExerciseUpdate(BaseModel):
    """Schema for updating an exercise (custom exercises only)."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    muscle_group: Optional[str] = Field(None, min_length=1, max_length=100)
    equipment: Optional[str] = Field(None, max_length=100)


class ExerciseResponse(ExerciseBase):
    """Schema for exercise data in responses."""

    id: int
    is_custom: bool
    user_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExerciseListParams(BaseModel):
    """Query parameters for listing exercises."""

    muscle_group: Optional[str] = None
    equipment: Optional[str] = None
    search: Optional[str] = None
    include_custom: bool = True
    skip: int = Field(0, ge=0)
    limit: int = Field(100, ge=1, le=500)
