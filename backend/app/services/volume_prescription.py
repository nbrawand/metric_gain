"""Hypertrophy set volume prescription algorithm.

Three-layer system for prescribing how many sets of each muscle group to do
on a given training day during a mesocycle's accumulation phase:
  Layer 1 - Weekly volume target (MEV -> MRV linear ramp)
  Layer 2 - Session allocation with remainder distribution
  Layer 3 - Real-time autoregulation (RIR deviation + e1RM trend)
"""

import logging
import math
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy.orm import Session

logger = logging.getLogger("app.services.volume_prescription")


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class MuscleGroupProfile:
    mev: int          # Minimum Effective Volume (sets/week)
    mav: int          # Maximum Adaptive Volume
    mrv: int          # Maximum Recoverable Volume
    recovery_hours: int
    max_sets_per_session: int


# Keyed by the 12 muscle groups that exist in the app's exercise seed data.
# Spec groups merged: Back (width+thickness) -> Back, Side/Rear/Front Delts -> Shoulders.
MUSCLE_GROUP_PROFILES: dict[str, MuscleGroupProfile] = {
    "Quadriceps":  MuscleGroupProfile(mev=6,  mav=14, mrv=20, recovery_hours=72, max_sets_per_session=100),
    "Hamstrings":  MuscleGroupProfile(mev=6,  mav=10, mrv=16, recovery_hours=72, max_sets_per_session=100),
    "Chest":       MuscleGroupProfile(mev=6,  mav=14, mrv=22, recovery_hours=48, max_sets_per_session=100),
    "Back":        MuscleGroupProfile(mev=6,  mav=14, mrv=22, recovery_hours=48, max_sets_per_session=100),
    "Shoulders":   MuscleGroupProfile(mev=8,  mav=16, mrv=26, recovery_hours=36, max_sets_per_session=100),
    "Biceps":      MuscleGroupProfile(mev=8,  mav=14, mrv=20, recovery_hours=36, max_sets_per_session=100),
    "Triceps":     MuscleGroupProfile(mev=8,  mav=14, mrv=20, recovery_hours=36, max_sets_per_session=100),
    "Glutes":      MuscleGroupProfile(mev=6,  mav=10, mrv=16, recovery_hours=72, max_sets_per_session=100),
    "Calves":      MuscleGroupProfile(mev=8,  mav=14, mrv=20, recovery_hours=36, max_sets_per_session=100),
    "Core":        MuscleGroupProfile(mev=6,  mav=12, mrv=18, recovery_hours=36, max_sets_per_session=100),
    "Traps":       MuscleGroupProfile(mev=6,  mav=10, mrv=16, recovery_hours=36, max_sets_per_session=100),
    "Forearms":    MuscleGroupProfile(mev=8,  mav=12, mrv=18, recovery_hours=36, max_sets_per_session=100),
}

DEFAULT_PROFILE = MuscleGroupProfile(mev=4, mav=10, mrv=16, recovery_hours=48, max_sets_per_session=8)


@dataclass
class MesocycleConfig:
    total_weeks: int
    accumulation_weeks: int                          # total_weeks - 1 (last week = deload)
    days_per_week: int
    muscle_group_frequency: dict[str, int] = field(default_factory=dict)   # muscle -> sessions/week
    muscle_group_day_indices: dict[str, list[int]] = field(default_factory=dict)  # muscle -> [day_numbers]


@dataclass
class UserState:
    recent_avg_rir: Optional[float] = None
    e1rm_trend: Optional[float] = None
    completed_sessions_count: int = 0
    current_estimated_mev: Optional[int] = None


# ---------------------------------------------------------------------------
# Pure algorithm functions (no DB)
# ---------------------------------------------------------------------------

def _get_profile(muscle_group: str) -> MuscleGroupProfile:
    return MUSCLE_GROUP_PROFILES.get(muscle_group, DEFAULT_PROFILE)


def estimate_1rm(weight: float, reps: int, rir: Optional[int] = None) -> float:
    """Epley formula extended for RIR: e1RM = weight * (1 + (reps + rir) / 30)."""
    if weight <= 0:
        return 0.0
    effective_rir = rir if rir is not None else 0
    return weight * (1 + (reps + effective_rir) / 30)


def compute_target_rir(week: int, accumulation_weeks: int) -> int:
    """Target RIR ramps from 3 (week 1) down to 0 (final accumulation week).

    Formula: round(3 * (accum_weeks - week) / (accum_weeks - 1))
    """
    if accumulation_weeks <= 1:
        return 0
    return round(3 * (accumulation_weeks - week) / (accumulation_weeks - 1))


def compute_weekly_volume_target(muscle_group: str, week: int, config: MesocycleConfig) -> int:
    """Layer 1: linear ramp from MEV to MRV across accumulation weeks.

    Week 1 starts exactly at MEV; final accumulation week reaches MRV.
    S_weekly(m, week) = round(MEV + (week-1) * (MRV - MEV) / (accum_weeks - 1))
    Clamped to [MEV, MRV].
    """
    profile = _get_profile(muscle_group)
    accum = config.accumulation_weeks
    if accum <= 1:
        return profile.mev

    target = profile.mev + (week - 1) * (profile.mrv - profile.mev) / (accum - 1)
    target = max(profile.mev, min(round(target), profile.mrv))
    return target


def allocate_to_session(
    weekly_target: int,
    muscle_group: str,
    day_number: int,
    config: MesocycleConfig,
) -> int:
    """Layer 2: distribute weekly sets across training sessions for this muscle group.

    - Even split: base = weekly_target // F
    - Remainder distributed to earlier sessions in the week
    - Capped at max_sets_per_session; warning logged if cap drops volume
    - Returns 0 if day_number is not in this muscle group's template days
    """
    day_indices = config.muscle_group_day_indices.get(muscle_group, [])
    if day_number not in day_indices:
        return 0

    freq = config.muscle_group_frequency.get(muscle_group, 0)
    if freq <= 0:
        return 0

    base = weekly_target // freq
    remainder = weekly_target - base * freq

    # Day's position (0-indexed) in the sorted day list for this muscle group
    sorted_days = sorted(day_indices)
    day_position = sorted_days.index(day_number)

    sets = base + (1 if day_position < remainder else 0)
    sets = max(sets, 1)  # Never prescribe 0 for a day that includes this muscle group

    profile = _get_profile(muscle_group)
    cap = profile.max_sets_per_session
    if sets > cap:
        logger.warning(
            "Session cap hit for %s on day %d: prescribed %d but cap is %d. "
            "Weekly target %d may not be achievable in %d sessions.",
            muscle_group, day_number, sets, cap, weekly_target, freq,
        )
        sets = cap

    return sets


def autoregulate_sets(
    planned_sets: int,
    muscle_group: str,
    week: int,
    user_state: UserState,
    config: MesocycleConfig,
) -> int:
    """Layer 3: adjust planned sets based on actual user performance signals.

    Skips adjustment if fewer than 2 completed sessions exist (cold start).
    Signals:
      - RIR deviation: if actual avg RIR is lower than target, user is more fatigued
      - e1RM trend: if estimated 1RM is declining, user exceeds recoverable volume
    Floor: ceil(MEV / F)
    """
    if user_state.completed_sessions_count < 2:
        logger.info("Cold start for %s: skipping autoregulation (%d sessions).",
                     muscle_group, user_state.completed_sessions_count)
        return planned_sets

    adjustment = 1.0
    target_rir = compute_target_rir(week, config.accumulation_weeks)

    # Signal 1: RIR deviation
    if user_state.recent_avg_rir is not None:
        rir_deviation = target_rir - user_state.recent_avg_rir
        if rir_deviation > 1.5:
            adjustment -= 0.15
            logger.info("Autoregulation %s: RIR deviation %.2f > 1.5 -> -15%%",
                        muscle_group, rir_deviation)
        elif rir_deviation > 0.75:
            adjustment -= 0.08
            logger.info("Autoregulation %s: RIR deviation %.2f > 0.75 -> -8%%",
                        muscle_group, rir_deviation)

    # Signal 2: e1RM trend
    if user_state.e1rm_trend is not None:
        if user_state.e1rm_trend < -0.03:
            adjustment -= 0.15
            logger.info("Autoregulation %s: e1RM trend %.3f < -3%% -> -15%%",
                        muscle_group, user_state.e1rm_trend)
        elif user_state.e1rm_trend < -0.01:
            adjustment -= 0.08
            logger.info("Autoregulation %s: e1RM trend %.3f < -1%% -> -8%%",
                        muscle_group, user_state.e1rm_trend)

    profile = _get_profile(muscle_group)
    freq = config.muscle_group_frequency.get(muscle_group, 1)
    min_sets = math.ceil(profile.mev / freq) if freq > 0 else 1
    min_sets = max(min_sets, 1)

    adjusted = max(round(planned_sets * adjustment), min_sets)
    return adjusted


def _deload_sets(muscle_group: str, config: MesocycleConfig) -> int:
    """Deload volume: max(MEV - 2, MEV // 2) weekly, divided by frequency, min 1."""
    profile = _get_profile(muscle_group)
    weekly = max(profile.mev - 2, profile.mev // 2)
    # For zero-MEV groups (e.g. Core), give at least 1 set/week
    weekly = max(weekly, 1)
    freq = config.muscle_group_frequency.get(muscle_group, 1)
    freq = max(freq, 1)
    per_session = max(math.ceil(weekly / freq), 1)
    return per_session


# ---------------------------------------------------------------------------
# DB query functions
# ---------------------------------------------------------------------------

def build_mesocycle_config(
    db: Session,
    mesocycle_template_id: int,
    total_weeks: int,
    days_per_week: int,
) -> MesocycleConfig:
    """Scan WorkoutTemplate -> WorkoutExercise -> Exercise to compute
    muscle group frequency and day indices.
    """
    from app.models.mesocycle import WorkoutTemplate, WorkoutExercise
    from app.models.exercise import Exercise

    config = MesocycleConfig(
        total_weeks=total_weeks,
        accumulation_weeks=max(total_weeks - 1, 1),
        days_per_week=days_per_week,
    )

    templates = (
        db.query(WorkoutTemplate)
        .filter(WorkoutTemplate.mesocycle_id == mesocycle_template_id)
        .order_by(WorkoutTemplate.order_index)
        .all()
    )

    for tmpl in templates:
        day_number = tmpl.order_index + 1  # 1-based day number
        for we in tmpl.exercises:
            exercise = db.query(Exercise).filter(Exercise.id == we.exercise_id).first()
            if not exercise:
                continue
            mg = exercise.muscle_group
            if mg not in config.muscle_group_day_indices:
                config.muscle_group_day_indices[mg] = []
            if day_number not in config.muscle_group_day_indices[mg]:
                config.muscle_group_day_indices[mg].append(day_number)

    # Compute frequency from day indices
    for mg, days in config.muscle_group_day_indices.items():
        config.muscle_group_frequency[mg] = len(days)

    return config


def _compute_e1rm_trend_from_sets(
    sets_with_dates: list[tuple[float, int, Optional[int], "date"]],
) -> Optional[float]:
    """Compute e1RM percent change between the last two weeks of data.

    Args:
        sets_with_dates: list of (weight, reps, rir, workout_date) tuples.

    Returns:
        Percent change as a decimal (e.g. -0.05 = 5% decline), or None
        if insufficient data.
    """
    if not sets_with_dates:
        return None

    from datetime import timedelta

    # Find the most recent date
    dates = [d for _, _, _, d in sets_with_dates]
    max_date = max(dates)

    # Split into two weeks: recent (last 7 days) and prior (8-14 days)
    recent_e1rms = []
    prior_e1rms = []
    for weight, reps, rir, d in sets_with_dates:
        if weight <= 0 or reps <= 0:
            continue
        e1rm = estimate_1rm(weight, reps, rir)
        days_ago = (max_date - d).days
        if days_ago < 7:
            recent_e1rms.append(e1rm)
        elif days_ago < 14:
            prior_e1rms.append(e1rm)

    if not recent_e1rms or not prior_e1rms:
        return None

    avg_recent = sum(recent_e1rms) / len(recent_e1rms)
    avg_prior = sum(prior_e1rms) / len(prior_e1rms)

    if avg_prior == 0:
        return None

    return (avg_recent - avg_prior) / avg_prior


def build_user_state(
    db: Session,
    user_id: int,
    muscle_group: str,
    mesocycle_instance_id: int,
) -> UserState:
    """Query completed sessions' WorkoutSets for recent avg RIR and e1RM trend."""
    from app.models.workout_session import WorkoutSession, WorkoutSet
    from app.models.exercise import Exercise

    state = UserState()

    # Get all completed sessions for this mesocycle instance
    sessions = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.mesocycle_instance_id == mesocycle_instance_id,
            WorkoutSession.user_id == user_id,
            WorkoutSession.status == "completed",
        )
        .order_by(WorkoutSession.workout_date.desc())
        .all()
    )

    state.completed_sessions_count = len(sessions)
    if not sessions:
        return state

    # Get exercise IDs for this muscle group
    exercise_ids = [
        eid for (eid,) in
        db.query(Exercise.id).filter(Exercise.muscle_group == muscle_group).all()
    ]
    if not exercise_ids:
        return state

    # Collect sets across completed sessions for this muscle group
    session_ids = [s.id for s in sessions]
    sets = (
        db.query(WorkoutSet)
        .filter(
            WorkoutSet.workout_session_id.in_(session_ids),
            WorkoutSet.exercise_id.in_(exercise_ids),
            WorkoutSet.skipped == 0,
        )
        .all()
    )

    if not sets:
        return state

    # Recent avg RIR (all sets with RIR data)
    rir_values = [s.rir for s in sets if s.rir is not None]
    if rir_values:
        state.recent_avg_rir = sum(rir_values) / len(rir_values)

    # e1RM trend: need dates from sessions
    session_date_map = {s.id: s.workout_date for s in sessions}
    sets_with_dates = []
    for s in sets:
        d = session_date_map.get(s.workout_session_id)
        if d and s.weight > 0 and s.reps > 0:
            sets_with_dates.append((s.weight, s.reps, s.rir, d))

    state.e1rm_trend = _compute_e1rm_trend_from_sets(sets_with_dates)

    # Current estimated MEV (use population default for now)
    profile = _get_profile(muscle_group)
    state.current_estimated_mev = profile.mev

    return state


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def get_prescribed_sets(
    db: Session,
    muscle_group: str,
    week: int,
    day_number: int,
    user_id: int,
    mesocycle_instance_id: int,
    config: MesocycleConfig,
) -> int:
    """Return the number of sets to prescribe for a muscle group on a given day.

    Orchestrates all 3 layers:
      1. Weekly volume target
      2. Session allocation
      3. Autoregulation
    Returns deload volume for the final week.
    """
    # Deload week
    if week == config.total_weeks:
        sets = _deload_sets(muscle_group, config)
        logger.debug("Deload week %d for %s: %d sets", week, muscle_group, sets)
        return sets

    # Layer 1
    weekly_target = compute_weekly_volume_target(muscle_group, week, config)

    # Layer 2
    planned_sets = allocate_to_session(weekly_target, muscle_group, day_number, config)

    if planned_sets == 0:
        logger.debug("Muscle group %s not scheduled on day %d", muscle_group, day_number)
        return 0

    # Layer 3
    user_state = build_user_state(db, user_id, muscle_group, mesocycle_instance_id)
    prescribed = autoregulate_sets(planned_sets, muscle_group, week, user_state, config)

    logger.debug(
        "Prescribed %d sets for %s (week %d, day %d): "
        "weekly_target=%d, planned=%d, autoregulated=%d",
        prescribed, muscle_group, week, day_number,
        weekly_target, planned_sets, prescribed,
    )
    return prescribed
