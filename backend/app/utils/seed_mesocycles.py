"""Seed database with stock mesocycle templates."""

from typing import Optional
from sqlalchemy.orm import Session
from app.models.mesocycle import Mesocycle, WorkoutTemplate, WorkoutExercise
from app.models.exercise import Exercise


def get_exercise_by_name(db: Session, name: str) -> Optional[Exercise]:
    """Get an exercise by name (case-insensitive)."""
    return db.query(Exercise).filter(Exercise.name.ilike(name)).first()


# Push Pull Legs template configuration
# 6 days per week, 4 weeks
# Each exercise: 2 sets, 8-12 reps, RIR 3->0
PUSH_PULL_LEGS_TEMPLATE = {
    "name": "Push Pull Legs",
    "description": "Classic 6-day PPL split. Push (chest, shoulders, triceps), Pull (back, biceps), Legs (quads, hamstrings, calves, abs). Great for intermediate to advanced lifters.",
    "weeks": 4,
    "days_per_week": 6,
    "workouts": [
        {
            "name": "Push Day 1",
            "description": "Chest, shoulders, and triceps",
            "exercises": [
                # Chest (2 exercises)
                {"name": "Barbell Bench Press", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Cable Fly", "sets": 2, "reps_min": 10, "reps_max": 15},
                # Shoulders (2 exercises)
                {"name": "Overhead Press", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Lateral Raise", "sets": 2, "reps_min": 12, "reps_max": 15},
                # Triceps (2 exercises)
                {"name": "Close-Grip Bench Press", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Tricep Pushdown", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Pull Day 1",
            "description": "Back and biceps",
            "exercises": [
                # Back (2 exercises)
                {"name": "Barbell Row", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Lat Pulldown", "sets": 2, "reps_min": 8, "reps_max": 12},
                # Biceps (2 exercises)
                {"name": "Barbell Curl", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Hammer Curl", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Legs Day 1",
            "description": "Quads, hamstrings, calves, and abs",
            "exercises": [
                # Quads (2 exercises)
                {"name": "Barbell Squat", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Leg Extension", "sets": 2, "reps_min": 10, "reps_max": 15},
                # Hamstrings (2 exercises)
                {"name": "Romanian Deadlift", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Leg Curl", "sets": 2, "reps_min": 10, "reps_max": 15},
                # Calves (2 exercises)
                {"name": "Standing Calf Raise", "sets": 2, "reps_min": 12, "reps_max": 20},
                {"name": "Seated Calf Raise", "sets": 2, "reps_min": 12, "reps_max": 20},
                # Abs (2 exercises)
                {"name": "Hanging Leg Raise", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Cable Crunch", "sets": 2, "reps_min": 12, "reps_max": 20},
            ],
        },
        {
            "name": "Push Day 2",
            "description": "Chest, shoulders, and triceps (variation)",
            "exercises": [
                # Chest (2 exercises)
                {"name": "Incline Barbell Bench Press", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Dumbbell Bench Press", "sets": 2, "reps_min": 8, "reps_max": 12},
                # Shoulders (2 exercises)
                {"name": "Dumbbell Shoulder Press", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Face Pulls", "sets": 2, "reps_min": 12, "reps_max": 20},
                # Triceps (2 exercises)
                {"name": "Skull Crushers", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Overhead Tricep Extension", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Pull Day 2",
            "description": "Back and biceps (variation)",
            "exercises": [
                # Back (2 exercises)
                {"name": "Pull-ups", "sets": 2, "reps_min": 6, "reps_max": 12},
                {"name": "Seated Cable Row", "sets": 2, "reps_min": 8, "reps_max": 12},
                # Biceps (2 exercises)
                {"name": "Dumbbell Curl", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Preacher Curl", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Legs Day 2",
            "description": "Quads, hamstrings, calves, and abs (variation)",
            "exercises": [
                # Quads (2 exercises)
                {"name": "Leg Press", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Bulgarian Split Squat", "sets": 2, "reps_min": 8, "reps_max": 12},
                # Hamstrings (2 exercises)
                {"name": "Good Mornings", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Nordic Hamstring Curl", "sets": 2, "reps_min": 6, "reps_max": 10},
                # Calves (2 exercises)
                {"name": "Standing Calf Raise", "sets": 2, "reps_min": 12, "reps_max": 20},
                {"name": "Seated Calf Raise", "sets": 2, "reps_min": 12, "reps_max": 20},
                # Abs (2 exercises)
                {"name": "Plank", "sets": 2, "reps_min": 1, "reps_max": 1},  # Time-based
                {"name": "Russian Twists", "sets": 2, "reps_min": 15, "reps_max": 25},
            ],
        },
    ],
}


def seed_mesocycles(db: Session) -> None:
    """
    Seed the database with stock mesocycle templates.

    Only seeds if no stock mesocycles exist yet.
    """
    # Check if stock mesocycles already exist
    existing_count = db.query(Mesocycle).filter(Mesocycle.is_stock == 1).count()

    if existing_count > 0:
        print(f"Stock mesocycles already exist ({existing_count} found). Skipping seed.")
        return

    print("Seeding stock mesocycle templates...")

    # Create Push Pull Legs mesocycle
    template = PUSH_PULL_LEGS_TEMPLATE
    mesocycle = Mesocycle(
        user_id=None,  # Stock mesocycles have no owner
        is_stock=1,
        name=template["name"],
        description=template["description"],
        weeks=template["weeks"],
        days_per_week=template["days_per_week"],
    )
    db.add(mesocycle)
    db.flush()  # Get mesocycle ID

    # Create workout templates
    for workout_idx, workout_data in enumerate(template["workouts"]):
        workout_template = WorkoutTemplate(
            mesocycle_id=mesocycle.id,
            name=workout_data["name"],
            description=workout_data["description"],
            order_index=workout_idx,
        )
        db.add(workout_template)
        db.flush()  # Get workout template ID

        # Create workout exercises
        for exercise_idx, exercise_data in enumerate(workout_data["exercises"]):
            exercise = get_exercise_by_name(db, exercise_data["name"])
            if not exercise:
                print(f"  Warning: Exercise '{exercise_data['name']}' not found, skipping")
                continue

            workout_exercise = WorkoutExercise(
                workout_template_id=workout_template.id,
                exercise_id=exercise.id,
                order_index=exercise_idx,
                target_sets=exercise_data["sets"],
                target_reps_min=exercise_data["reps_min"],
                target_reps_max=exercise_data["reps_max"],
                starting_rir=3,  # Default starting RIR
                ending_rir=0,  # Go to failure by end of mesocycle
            )
            db.add(workout_exercise)

    db.commit()
    print(f"Successfully seeded Push Pull Legs mesocycle template!")


if __name__ == "__main__":
    # Allow running this script directly for manual seeding
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        seed_mesocycles(db)
    finally:
        db.close()
