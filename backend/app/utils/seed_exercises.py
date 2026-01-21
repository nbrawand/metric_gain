"""Seed database with default exercises."""

from sqlalchemy.orm import Session
from app.models.exercise import Exercise


DEFAULT_EXERCISES = [
    # Chest
    {
        "name": "Barbell Bench Press",
        "description": "Compound chest exercise performed on a flat bench",
        "muscle_group": "Chest",
        "equipment": "Barbell",
    },
    {
        "name": "Incline Barbell Bench Press",
        "description": "Bench press performed on an incline bench targeting upper chest",
        "muscle_group": "Chest",
        "equipment": "Barbell",
    },
    {
        "name": "Dumbbell Bench Press",
        "description": "Bench press variation using dumbbells for greater range of motion",
        "muscle_group": "Chest",
        "equipment": "Dumbbells",
    },
    {
        "name": "Incline Dumbbell Press",
        "description": "Incline press variation with dumbbells",
        "muscle_group": "Chest",
        "equipment": "Dumbbells",
    },
    {
        "name": "Cable Fly",
        "description": "Isolation exercise for chest using cables",
        "muscle_group": "Chest",
        "equipment": "Cable Machine",
    },
    {
        "name": "Push-ups",
        "description": "Bodyweight chest exercise",
        "muscle_group": "Chest",
        "equipment": "Bodyweight",
    },
    {
        "name": "Dips",
        "description": "Compound exercise targeting chest and triceps",
        "muscle_group": "Chest",
        "equipment": "Parallel Bars",
    },

    # Back
    {
        "name": "Barbell Row",
        "description": "Compound back exercise for thickness",
        "muscle_group": "Back",
        "equipment": "Barbell",
    },
    {
        "name": "Pull-ups",
        "description": "Bodyweight back exercise for width",
        "muscle_group": "Back",
        "equipment": "Pull-up Bar",
    },
    {
        "name": "Lat Pulldown",
        "description": "Cable exercise targeting lats",
        "muscle_group": "Back",
        "equipment": "Cable Machine",
    },
    {
        "name": "Seated Cable Row",
        "description": "Rowing variation using cable machine",
        "muscle_group": "Back",
        "equipment": "Cable Machine",
    },
    {
        "name": "Dumbbell Row",
        "description": "Unilateral rowing exercise",
        "muscle_group": "Back",
        "equipment": "Dumbbells",
    },
    {
        "name": "Deadlift",
        "description": "Compound full-body exercise emphasizing back and posterior chain",
        "muscle_group": "Back",
        "equipment": "Barbell",
    },
    {
        "name": "T-Bar Row",
        "description": "Machine or landmine rowing variation",
        "muscle_group": "Back",
        "equipment": "T-Bar/Machine",
    },

    # Shoulders
    {
        "name": "Overhead Press",
        "description": "Compound shoulder exercise",
        "muscle_group": "Shoulders",
        "equipment": "Barbell",
    },
    {
        "name": "Dumbbell Shoulder Press",
        "description": "Shoulder press with dumbbells",
        "muscle_group": "Shoulders",
        "equipment": "Dumbbells",
    },
    {
        "name": "Lateral Raise",
        "description": "Isolation exercise for side delts",
        "muscle_group": "Shoulders",
        "equipment": "Dumbbells",
    },
    {
        "name": "Front Raise",
        "description": "Isolation exercise for front delts",
        "muscle_group": "Shoulders",
        "equipment": "Dumbbells",
    },
    {
        "name": "Rear Delt Fly",
        "description": "Isolation exercise for rear delts",
        "muscle_group": "Shoulders",
        "equipment": "Dumbbells",
    },
    {
        "name": "Face Pulls",
        "description": "Cable exercise targeting rear delts and upper back",
        "muscle_group": "Shoulders",
        "equipment": "Cable Machine",
    },

    # Arms - Biceps
    {
        "name": "Barbell Curl",
        "description": "Compound bicep exercise",
        "muscle_group": "Biceps",
        "equipment": "Barbell",
    },
    {
        "name": "Dumbbell Curl",
        "description": "Bicep curl with dumbbells",
        "muscle_group": "Biceps",
        "equipment": "Dumbbells",
    },
    {
        "name": "Hammer Curl",
        "description": "Bicep variation targeting brachialis",
        "muscle_group": "Biceps",
        "equipment": "Dumbbells",
    },
    {
        "name": "Preacher Curl",
        "description": "Bicep curl performed on preacher bench",
        "muscle_group": "Biceps",
        "equipment": "Barbell/Dumbbells",
    },
    {
        "name": "Cable Curl",
        "description": "Bicep curl using cable machine",
        "muscle_group": "Biceps",
        "equipment": "Cable Machine",
    },

    # Arms - Triceps
    {
        "name": "Close-Grip Bench Press",
        "description": "Compound tricep exercise",
        "muscle_group": "Triceps",
        "equipment": "Barbell",
    },
    {
        "name": "Tricep Pushdown",
        "description": "Isolation tricep exercise using cables",
        "muscle_group": "Triceps",
        "equipment": "Cable Machine",
    },
    {
        "name": "Overhead Tricep Extension",
        "description": "Tricep extension performed overhead",
        "muscle_group": "Triceps",
        "equipment": "Dumbbells/Cable",
    },
    {
        "name": "Skull Crushers",
        "description": "Lying tricep extension",
        "muscle_group": "Triceps",
        "equipment": "Barbell/Dumbbells",
    },

    # Legs - Quads
    {
        "name": "Barbell Squat",
        "description": "Compound leg exercise",
        "muscle_group": "Quadriceps",
        "equipment": "Barbell",
    },
    {
        "name": "Front Squat",
        "description": "Squat variation with bar in front rack position",
        "muscle_group": "Quadriceps",
        "equipment": "Barbell",
    },
    {
        "name": "Leg Press",
        "description": "Machine-based quad exercise",
        "muscle_group": "Quadriceps",
        "equipment": "Leg Press Machine",
    },
    {
        "name": "Leg Extension",
        "description": "Isolation exercise for quads",
        "muscle_group": "Quadriceps",
        "equipment": "Machine",
    },
    {
        "name": "Bulgarian Split Squat",
        "description": "Unilateral leg exercise",
        "muscle_group": "Quadriceps",
        "equipment": "Dumbbells",
    },
    {
        "name": "Lunges",
        "description": "Unilateral leg exercise",
        "muscle_group": "Quadriceps",
        "equipment": "Dumbbells/Bodyweight",
    },

    # Legs - Hamstrings
    {
        "name": "Romanian Deadlift",
        "description": "Hip-hinge exercise targeting hamstrings",
        "muscle_group": "Hamstrings",
        "equipment": "Barbell",
    },
    {
        "name": "Leg Curl",
        "description": "Isolation exercise for hamstrings",
        "muscle_group": "Hamstrings",
        "equipment": "Machine",
    },
    {
        "name": "Nordic Hamstring Curl",
        "description": "Bodyweight hamstring exercise",
        "muscle_group": "Hamstrings",
        "equipment": "Bodyweight",
    },
    {
        "name": "Good Mornings",
        "description": "Hip-hinge exercise for hamstrings and lower back",
        "muscle_group": "Hamstrings",
        "equipment": "Barbell",
    },

    # Legs - Glutes
    {
        "name": "Hip Thrust",
        "description": "Glute-focused exercise",
        "muscle_group": "Glutes",
        "equipment": "Barbell",
    },
    {
        "name": "Glute Bridge",
        "description": "Bodyweight or weighted glute exercise",
        "muscle_group": "Glutes",
        "equipment": "Barbell/Bodyweight",
    },
    {
        "name": "Cable Pull-Through",
        "description": "Hip-hinge exercise using cables",
        "muscle_group": "Glutes",
        "equipment": "Cable Machine",
    },

    # Legs - Calves
    {
        "name": "Standing Calf Raise",
        "description": "Calf exercise performed standing",
        "muscle_group": "Calves",
        "equipment": "Machine/Dumbbells",
    },
    {
        "name": "Seated Calf Raise",
        "description": "Calf exercise performed seated",
        "muscle_group": "Calves",
        "equipment": "Machine",
    },

    # Core
    {
        "name": "Plank",
        "description": "Isometric core exercise",
        "muscle_group": "Core",
        "equipment": "Bodyweight",
    },
    {
        "name": "Crunches",
        "description": "Basic abdominal exercise",
        "muscle_group": "Core",
        "equipment": "Bodyweight",
    },
    {
        "name": "Russian Twists",
        "description": "Rotational core exercise",
        "muscle_group": "Core",
        "equipment": "Bodyweight/Medicine Ball",
    },
    {
        "name": "Hanging Leg Raise",
        "description": "Advanced core exercise",
        "muscle_group": "Core",
        "equipment": "Pull-up Bar",
    },
    {
        "name": "Cable Crunch",
        "description": "Weighted abdominal exercise",
        "muscle_group": "Core",
        "equipment": "Cable Machine",
    },
]


def seed_exercises(db: Session) -> None:
    """
    Seed the database with default exercises.

    Only seeds if no default exercises exist yet.
    """
    # Check if default exercises already exist
    existing_count = db.query(Exercise).filter(Exercise.is_custom == False).count()

    if existing_count > 0:
        print(f"Default exercises already exist ({existing_count} found). Skipping seed.")
        return

    print(f"Seeding {len(DEFAULT_EXERCISES)} default exercises...")

    for exercise_data in DEFAULT_EXERCISES:
        exercise = Exercise(
            **exercise_data,
            is_custom=False,
            user_id=None
        )
        db.add(exercise)

    db.commit()
    print(f"Successfully seeded {len(DEFAULT_EXERCISES)} default exercises!")


if __name__ == "__main__":
    # Allow running this script directly for manual seeding
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        seed_exercises(db)
    finally:
        db.close()
