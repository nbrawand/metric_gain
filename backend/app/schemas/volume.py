"""Pydantic schemas for volume optimization endpoint."""

from typing import List, Optional

from pydantic import BaseModel, Field


class OptimizeRequest(BaseModel):
    """Request body for volume optimization."""

    experience_level: str = Field(..., pattern="^(beginner|intermediate|advanced)$")
    total_weeks: int = Field(..., ge=3, le=12)
    w_max: float = Field(30.0, ge=10.0, le=50.0)


class WeekData(BaseModel):
    """Volume data for a single week."""

    week: int
    sets: float
    type: str
    performance: float
    fitness: float
    fatigue: float
    kappa: float
    alpha: float
    effective_volume: float


class OptimizeResponse(BaseModel):
    """Response body for volume optimization."""

    weeks: List[WeekData]
    peak_performance: float
    peak_week: int
