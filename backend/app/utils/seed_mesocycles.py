"""Seed database with stock mesocycle templates."""

from typing import Optional
from sqlalchemy.orm import Session
from app.models.mesocycle import Mesocycle, WorkoutTemplate, WorkoutExercise
from app.models.exercise import Exercise


def get_exercise_by_name(db: Session, name: str) -> Optional[Exercise]:
    """Get an exercise by name (case-insensitive)."""
    return db.query(Exercise).filter(Exercise.name.ilike(name)).first()


# Push Pull Legs template configuration
# 6 days per week, 6 weeks
# Each exercise: 2 sets, RIR 3->0
PUSH_PULL_LEGS_TEMPLATE = {
    "name": "Push Pull Legs",
    "description": "Classic 6-day PPL split. Push (chest, shoulders, triceps), Pull (back, biceps), Legs (quads, hamstrings, calves, abs). Great for intermediate to advanced lifters.",
    "weeks": 6,
    "days_per_week": 6,
    "workouts": [
        {
            "name": "Push Day 1",
            "description": "Chest, shoulders, and triceps",
            "exercises": [
                {"name": "Dumbbell Bench Press", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Cable Fly", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Dumbbell Shoulder Press", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Rear Delt Fly", "sets": 2, "reps_min": 12, "reps_max": 15},
                {"name": "Cable Overhead Tricep Extension (Rope)", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Tricep Pushdown (Rope)", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Pull Day 1",
            "description": "Back and biceps",
            "exercises": [
                {"name": "Lat Pulldown", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Seated Cable Row", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Cable Curl", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Preacher Curl", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Legs Day 1",
            "description": "Quads, hamstrings, calves, and abs",
            "exercises": [
                {"name": "Barbell Squat", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Leg Extension", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Leg Curl", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Seated Calf Raise", "sets": 2, "reps_min": 12, "reps_max": 20},
                {"name": "Crunches", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Push Day 2",
            "description": "Chest, shoulders, and triceps (variation)",
            "exercises": [
                {"name": "Incline Dumbbell Press", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Incline Cable Fly", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Reverse Pec Deck", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Machine Lateral Raise", "sets": 2, "reps_min": 12, "reps_max": 20},
                {"name": "Skull Crushers", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Overhead Tricep Extension", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Pull Day 2",
            "description": "Back and biceps (variation)",
            "exercises": [
                {"name": "Pull-ups", "sets": 2, "reps_min": 6, "reps_max": 12},
                {"name": "Machine Row", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Machine Preacher Curl", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Dumbbell Curl", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Legs Day 2",
            "description": "Quads, hamstrings, calves, and abs (variation)",
            "exercises": [
                {"name": "Leg Press", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Leg Extension", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Lying Leg Curl", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Seated Calf Raise", "sets": 2, "reps_min": 12, "reps_max": 20},
                {"name": "Cable Crunch", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
    ],
}


def _set_workout_exercises(db: Session, workout_template: WorkoutTemplate, exercise_list: list) -> None:
    """Replace all exercises on a workout template with the given list."""
    # Delete existing exercises
    db.query(WorkoutExercise).filter(
        WorkoutExercise.workout_template_id == workout_template.id
    ).delete()

    # Create new exercises
    for exercise_idx, exercise_data in enumerate(exercise_list):
        exercise = get_exercise_by_name(db, exercise_data["name"])
        if not exercise:
            print(f"  Warning: Exercise '{exercise_data['name']}' not found, skipping")
            continue

        db.add(WorkoutExercise(
            workout_template_id=workout_template.id,
            exercise_id=exercise.id,
            order_index=exercise_idx,
            target_sets=exercise_data["sets"],
            target_reps_min=exercise_data["reps_min"],
            target_reps_max=exercise_data["reps_max"],
            starting_rir=3,
            ending_rir=0,
        ))


def _update_stock_mesocycle(db: Session, existing: Mesocycle, template: dict) -> None:
    """Update an existing stock mesocycle in-place, preserving its ID and workout template IDs."""
    # Update mesocycle fields
    existing.description = template["description"]
    existing.weeks = template["weeks"]
    existing.days_per_week = template["days_per_week"]

    # Get existing workout templates sorted by order_index
    existing_workouts = sorted(existing.workout_templates, key=lambda w: w.order_index)

    for workout_idx, workout_data in enumerate(template["workouts"]):
        if workout_idx < len(existing_workouts):
            # Update existing workout template in-place (keeps same ID)
            wt = existing_workouts[workout_idx]
            wt.name = workout_data["name"]
            wt.description = workout_data["description"]
            wt.order_index = workout_idx
            _set_workout_exercises(db, wt, workout_data["exercises"])
        else:
            # Add new workout template
            wt = WorkoutTemplate(
                mesocycle_id=existing.id,
                name=workout_data["name"],
                description=workout_data["description"],
                order_index=workout_idx,
            )
            db.add(wt)
            db.flush()
            _set_workout_exercises(db, wt, workout_data["exercises"])

    # Remove extra workout templates if new template has fewer days
    for wt in existing_workouts[len(template["workouts"]):]:
        db.delete(wt)

    print(f"  Updated stock mesocycle: {template['name']}")


def _create_stock_mesocycle(db: Session, template: dict) -> None:
    """Create a new stock mesocycle template."""
    mesocycle = Mesocycle(
        user_id=None,
        is_stock=1,
        name=template["name"],
        description=template["description"],
        weeks=template["weeks"],
        days_per_week=template["days_per_week"],
    )
    db.add(mesocycle)
    db.flush()

    for workout_idx, workout_data in enumerate(template["workouts"]):
        wt = WorkoutTemplate(
            mesocycle_id=mesocycle.id,
            name=workout_data["name"],
            description=workout_data["description"],
            order_index=workout_idx,
        )
        db.add(wt)
        db.flush()
        _set_workout_exercises(db, wt, workout_data["exercises"])

    print(f"  Created stock mesocycle: {template['name']}")


STOCK_TEMPLATES = [PUSH_PULL_LEGS_TEMPLATE]


def seed_mesocycles(db: Session) -> None:
    """
    Seed the database with stock mesocycle templates.

    For each template, checks if a stock mesocycle with the same name exists.
    If it exists, updates it in-place (preserving IDs so instances keep working).
    If it doesn't exist, creates it.
    """
    for template in STOCK_TEMPLATES:
        existing = db.query(Mesocycle).filter(
            Mesocycle.is_stock == 1,
            Mesocycle.name == template["name"],
        ).first()

        if existing:
            _update_stock_mesocycle(db, existing, template)
        else:
            _create_stock_mesocycle(db, template)

    db.commit()


if __name__ == "__main__":
    # Allow running this script directly for manual seeding
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        seed_mesocycles(db)
    finally:
        db.close()
