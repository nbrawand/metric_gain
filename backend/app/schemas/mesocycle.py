"""Pydantic schemas for Mesocycle, WorkoutTemplate, and WorkoutExercise models."""

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field
from app.schemas.exercise import ExerciseResponse


# WorkoutExercise Schemas
class WorkoutExerciseBase(BaseModel):
    """Base workout exercise schema."""

    exercise_id: int
    order_index: int = Field(0, ge=0)
    target_sets: int = Field(3, ge=1, le=10)  # Default 3 sets
    target_reps_min: int = Field(8, ge=1, le=100)  # Default 8 reps
    target_reps_max: int = Field(12, ge=1, le=100)  # Default 12 reps
    starting_rir: int = Field(3, ge=0, le=5)  # Default 3 RIR
    ending_rir: int = Field(0, ge=0, le=5)  # Default 0 RIR
    notes: Optional[str] = None


class WorkoutExerciseCreate(BaseModel):
    """Schema for creating a workout exercise - only requires exercise selection."""

    exercise_id: int
    order_index: int = Field(0, ge=0)
    target_sets: int = Field(3, ge=1, le=10)  # Auto-generated, default 3 sets
    target_reps_min: int = Field(8, ge=1, le=100)  # Auto-generated, default 8 reps
    target_reps_max: int = Field(12, ge=1, le=100)  # Auto-generated, default 12 reps
    starting_rir: int = Field(3, ge=0, le=5)  # Auto-generated, default 3 RIR
    ending_rir: int = Field(0, ge=0, le=5)  # Auto-generated, default 0 RIR
    notes: Optional[str] = None


class WorkoutExerciseUpdate(BaseModel):
    """Schema for updating a workout exercise."""

    exercise_id: Optional[int] = None
    order_index: Optional[int] = Field(None, ge=0)
    target_sets: Optional[int] = Field(None, ge=1, le=10)
    target_reps_min: Optional[int] = Field(None, ge=1, le=100)
    target_reps_max: Optional[int] = Field(None, ge=1, le=100)
    starting_rir: Optional[int] = Field(None, ge=0, le=5)
    ending_rir: Optional[int] = Field(None, ge=0, le=5)
    notes: Optional[str] = None


class WorkoutExerciseResponse(WorkoutExerciseBase):
    """Schema for workout exercise in responses."""

    id: int
    workout_template_id: int
    created_at: datetime
    updated_at: datetime

    # Include exercise details
    exercise: ExerciseResponse  # Will be populated with exercise data

    class Config:
        from_attributes = True


# WorkoutTemplate Schemas
class WorkoutTemplateBase(BaseModel):
    """Base workout template schema."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    order_index: int = Field(0, ge=0)


class WorkoutTemplateCreate(WorkoutTemplateBase):
    """Schema for creating a workout template."""

    exercises: List[WorkoutExerciseCreate] = []


class WorkoutTemplateUpdate(BaseModel):
    """Schema for updating a workout template."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    order_index: Optional[int] = Field(None, ge=0)


class WorkoutTemplateResponse(WorkoutTemplateBase):
    """Schema for workout template in responses."""

    id: int
    mesocycle_id: int
    created_at: datetime
    updated_at: datetime
    exercises: List[WorkoutExerciseResponse] = []

    class Config:
        from_attributes = True


# Mesocycle Schemas
class MesocycleBase(BaseModel):
    """Base mesocycle schema."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    weeks: int = Field(..., ge=3, le=12)
    days_per_week: int = Field(..., ge=1, le=7)
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class MesocycleCreate(MesocycleBase):
    """Schema for creating a mesocycle."""

    workout_templates: List[WorkoutTemplateCreate] = []


class MesocycleUpdate(BaseModel):
    """Schema for updating a mesocycle."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    weeks: Optional[int] = Field(None, ge=3, le=12)
    days_per_week: Optional[int] = Field(None, ge=1, le=7)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = Field(None, pattern="^(planning|active|completed|archived)$")


class MesocycleResponse(MesocycleBase):
    """Schema for mesocycle in responses."""

    id: int
    user_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    workout_templates: List[WorkoutTemplateResponse] = []

    class Config:
        from_attributes = True


class MesocycleListResponse(BaseModel):
    """Schema for mesocycle list item (without nested templates)."""

    id: int
    user_id: int
    name: str
    description: Optional[str]
    weeks: int
    days_per_week: int
    start_date: Optional[date]
    end_date: Optional[date]
    status: str
    created_at: datetime
    updated_at: datetime
    workout_count: int  # Number of workout templates

    class Config:
        from_attributes = True
