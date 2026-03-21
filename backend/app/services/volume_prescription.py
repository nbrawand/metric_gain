"""Hypertrophy set volume prescription algorithm.

Two-layer system for prescribing how many sets of each muscle group to do
on a given training day during a mesocycle:
  Layer 1 - Weekly volume target from the volume optimizer
  Layer 2 - Session allocation with remainder distribution
"""

import json
import logging
import math
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy.orm import Session

logger = logging.getLogger("app.services.volume_prescription")


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class MesocycleConfig:
    total_weeks: int
    accumulation_weeks: int                          # total_weeks - 1 (last week = deload)
    days_per_week: int
    muscle_group_frequency: dict[str, int] = field(default_factory=dict)   # muscle -> sessions/week
    muscle_group_day_indices: dict[str, list[int]] = field(default_factory=dict)  # muscle -> [day_numbers]
    volume_profile: list[float] = field(default_factory=list)  # optimizer output: sets/week per body part


# ---------------------------------------------------------------------------
# Pure algorithm functions (no DB)
# ---------------------------------------------------------------------------

def compute_target_rir(week: int, accumulation_weeks: int) -> int:
    """Target RIR ramps from 3 (week 1) down to 0 (final accumulation week).

    Formula: round(3 * (accum_weeks - week) / (accum_weeks - 1))
    """
    if accumulation_weeks <= 1:
        return 0
    return round(3 * (accumulation_weeks - week) / (accumulation_weeks - 1))


def compute_weekly_volume_target(muscle_group: str, week: int, config: MesocycleConfig) -> int:
    """Layer 1: weekly volume target per muscle group from the optimizer profile."""
    if config.volume_profile and 0 < week <= len(config.volume_profile):
        target = config.volume_profile[week - 1]  # 1-indexed week
        return max(1, round(target))

    # Fallback if no profile (shouldn't happen in normal flow)
    return max(1, 4 + (week - 1) * 2)


def allocate_to_session(
    weekly_target: int,
    muscle_group: str,
    day_number: int,
    config: MesocycleConfig,
) -> int:
    """Layer 2: distribute weekly sets across training sessions for this muscle group.

    - Even split: base = weekly_target // F
    - Remainder distributed to earlier sessions in the week
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

    return sets


def _deload_sets(muscle_group: str, config: MesocycleConfig) -> int:
    """Deload volume from the optimizer profile (last week), divided by frequency, min 1."""
    # The optimizer already computes deload volume (typically 0)
    if config.volume_profile and len(config.volume_profile) >= config.total_weeks:
        weekly = round(config.volume_profile[config.total_weeks - 1])
    else:
        weekly = 2  # fallback

    if weekly <= 0:
        return 0

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
    experience_level: str = "intermediate",
    volume_profile: list[float] | None = None,
) -> MesocycleConfig:
    """Scan WorkoutTemplate -> WorkoutExercise -> Exercise to compute
    muscle group frequency and day indices.

    If volume_profile is provided, uses it directly. Otherwise computes
    the optimal volume profile using the user's experience level.
    """
    from app.models.mesocycle import WorkoutTemplate, WorkoutExercise
    from app.models.exercise import Exercise
    from app.services.volume_optimizer import create_mesocycle_volume

    # Use provided profile or compute one
    if volume_profile is None:
        volume_profile = []
        try:
            result = create_mesocycle_volume(experience_level, total_weeks)
            volume_profile = [w["sets"] for w in result["weeks"]]
        except Exception as e:
            logger.warning("Volume optimizer failed, falling back to fixed ramp: %s", e)

    config = MesocycleConfig(
        total_weeks=total_weeks,
        accumulation_weeks=max(total_weeks - 1, 1),
        days_per_week=days_per_week,
        volume_profile=volume_profile,
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

    Layers:
      1. Weekly volume target from optimizer
      2. Session allocation
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

    logger.debug(
        "Prescribed %d sets for %s (week %d, day %d): weekly_target=%d",
        planned_sets, muscle_group, week, day_number, weekly_target,
    )
    return planned_sets


# ---------------------------------------------------------------------------
# Re-optimization on workout completion
# ---------------------------------------------------------------------------

def reoptimize_instance_volumes(db: Session, instance, user) -> None:
    """Re-run optimizer and update set counts on all uncompleted sessions.

    Called when a workout is completed. Updates the volume profile on the
    instance and adjusts sets on future sessions.
    """
    from app.models.mesocycle import MesocycleInstance, WorkoutTemplate
    from app.models.workout_session import WorkoutSession, WorkoutSet
    from app.models.exercise import Exercise
    from app.services.volume_optimizer import create_mesocycle_volume

    total_weeks = instance.template_weeks
    if not total_weeks:
        return

    # Re-run optimizer
    volume_profile = []
    try:
        result = create_mesocycle_volume(user.experience_level, total_weeks)
        volume_profile = [w["sets"] for w in result["weeks"]]
    except Exception as e:
        logger.warning("Re-optimization failed: %s", e)
        return

    # Update stored profile
    instance.volume_profile = json.dumps(volume_profile)

    # Build config with new profile
    config = build_mesocycle_config(
        db, instance.mesocycle_template_id, total_weeks,
        instance.template_days_per_week,
        experience_level=user.experience_level,
        volume_profile=volume_profile,
    )

    # Find all uncompleted sessions
    uncompleted_sessions = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.mesocycle_instance_id == instance.id,
            WorkoutSession.status != "completed",
        )
        .all()
    )

    for session in uncompleted_sessions:
        is_deload = (session.week_number == total_weeks)

        # Get current sets grouped by exercise
        current_sets = (
            db.query(WorkoutSet)
            .filter(WorkoutSet.workout_session_id == session.id)
            .order_by(WorkoutSet.order_index, WorkoutSet.set_number)
            .all()
        )

        # Group by exercise_id
        exercise_groups = OrderedDict()
        for ws in current_sets:
            exercise_groups.setdefault(ws.exercise_id, []).append(ws)

        # Resolve muscle groups
        mg_exercise_ids = OrderedDict()
        exercise_lookup = {}
        for exercise_id in exercise_groups:
            exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
            exercise_lookup[exercise_id] = exercise
            mg = exercise.muscle_group if exercise else "Other"
            mg_exercise_ids.setdefault(mg, []).append(exercise_id)

        if is_deload:
            # Deload: 1 set per exercise at 8 RIR
            for exercise_id, sets in exercise_groups.items():
                if len(sets) > 1:
                    # Remove excess sets
                    for s in sets[1:]:
                        db.delete(s)
                if sets:
                    sets[0].target_rir = 8
            continue

        # Compute new prescribed counts per muscle group
        exercise_new_counts = {}
        for mg, ex_ids in mg_exercise_ids.items():
            total = max(len(ex_ids), get_prescribed_sets(
                db, mg, session.week_number, session.day_number,
                instance.user_id, instance.id, config,
            ))
            base = total // len(ex_ids)
            remainder = total % len(ex_ids)
            for i, eid in enumerate(ex_ids):
                exercise_new_counts[eid] = max(1, base + (1 if i < remainder else 0))

        target_rir = compute_target_rir(session.week_number, config.accumulation_weeks)

        # Adjust sets for each exercise
        for exercise_id, sets in exercise_groups.items():
            desired = exercise_new_counts.get(exercise_id, len(sets))
            current_count = len(sets)

            if desired > current_count:
                # Add sets
                last_set = sets[-1]
                for set_num in range(current_count + 1, desired + 1):
                    new_set = WorkoutSet(
                        workout_session_id=session.id,
                        exercise_id=exercise_id,
                        set_number=set_num,
                        order_index=last_set.order_index,
                        weight=0,
                        reps=0,
                        target_weight=None,
                        target_reps=last_set.target_reps,
                        target_rir=target_rir,
                    )
                    db.add(new_set)
            elif desired < current_count:
                # Remove excess sets from the end
                for s in sets[desired:]:
                    db.delete(s)

            # Update target_rir on remaining sets
            for s in sets[:desired]:
                s.target_rir = target_rir
