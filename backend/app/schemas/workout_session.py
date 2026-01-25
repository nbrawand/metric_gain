"""Pydantic schemas for WorkoutSession and WorkoutSet models."""

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# WorkoutSet Schemas
class WorkoutSetBase(BaseModel):
    """Base workout set schema."""

    exercise_id: int
    set_number: int = Field(..., ge=1)
    order_index: int = Field(0, ge=0)
    weight: float = Field(..., ge=0)
    reps: int = Field(..., ge=0)  # Allow 0 for sets not yet performed
    rir: Optional[int] = Field(None, ge=0, le=10)
    target_weight: Optional[float] = Field(None, ge=0)
    target_reps: Optional[int] = Field(None, ge=0)  # Allow 0 for optional targets
    target_rir: Optional[int] = Field(None, ge=0, le=10)
    notes: Optional[str] = None


class WorkoutSetCreate(WorkoutSetBase):
    """Schema for creating a workout set."""

    pass


class WorkoutSetUpdate(BaseModel):
    """Schema for updating a workout set."""

    exercise_id: Optional[int] = None
    set_number: Optional[int] = Field(None, ge=1)
    order_index: Optional[int] = Field(None, ge=0)
    weight: Optional[float] = Field(None, ge=0)
    reps: Optional[int] = Field(None, ge=0)  # Allow 0 for sets not yet performed
    rir: Optional[int] = Field(None, ge=0, le=10)
    target_weight: Optional[float] = Field(None, ge=0)
    target_reps: Optional[int] = Field(None, ge=0)  # Allow 0 for optional targets
    target_rir: Optional[int] = Field(None, ge=0, le=10)
    notes: Optional[str] = None


class WorkoutSetResponse(WorkoutSetBase):
    """Schema for workout set in responses."""

    id: int
    workout_session_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# WorkoutSession Schemas
class WorkoutSessionBase(BaseModel):
    """Base workout session schema."""

    mesocycle_instance_id: int
    workout_template_id: int
    workout_date: date
    week_number: int = Field(..., ge=1)
    day_number: int = Field(..., ge=1)  # Flexible day number (1, 2, 3... based on workout template)
    duration_minutes: Optional[int] = Field(None, ge=1)
    notes: Optional[str] = None


class WorkoutSessionCreate(WorkoutSessionBase):
    """Schema for creating a workout session."""

    pass


class WorkoutSessionUpdate(BaseModel):
    """Schema for updating a workout session."""

    workout_date: Optional[date] = None
    week_number: Optional[int] = Field(None, ge=1)
    day_number: Optional[int] = Field(None, ge=1)  # Flexible day number
    status: Optional[str] = Field(None, pattern="^(in_progress|completed|skipped)$")
    duration_minutes: Optional[int] = Field(None, ge=1)
    notes: Optional[str] = None


class WorkoutSessionResponse(WorkoutSessionBase):
    """Schema for workout session in responses."""

    id: int
    user_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    workout_sets: List[WorkoutSetResponse] = []

    class Config:
        from_attributes = True


class WorkoutSessionListResponse(BaseModel):
    """Schema for workout session list item (without sets)."""

    id: int
    user_id: int
    mesocycle_instance_id: int
    workout_template_id: int
    workout_date: date
    week_number: int
    day_number: int
    status: str
    duration_minutes: Optional[int]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    set_count: int  # Number of sets completed

    class Config:
        from_attributes = True
