"""Seed database with default exercises."""

from sqlalchemy.orm import Session
from app.models.exercise import Exercise


DEFAULT_EXERCISES = [
    # ==================== Chest ====================
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
        "name": "Decline Barbell Bench Press",
        "description": "Bench press on a decline bench targeting lower chest",
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
        "name": "Decline Dumbbell Press",
        "description": "Decline press variation with dumbbells targeting lower chest",
        "muscle_group": "Chest",
        "equipment": "Dumbbells",
    },
    {
        "name": "Machine Chest Press",
        "description": "Chest press performed on a machine for controlled movement",
        "muscle_group": "Chest",
        "equipment": "Machine",
    },
    {
        "name": "Cable Fly",
        "description": "Isolation exercise for chest using cables",
        "muscle_group": "Chest",
        "equipment": "Cable Machine",
    },
    {
        "name": "Incline Cable Fly",
        "description": "Cable fly on an incline bench targeting upper chest",
        "muscle_group": "Chest",
        "equipment": "Cable Machine",
    },
    {
        "name": "Pec Deck",
        "description": "Machine fly isolation exercise for chest",
        "muscle_group": "Chest",
        "equipment": "Machine",
    },
    {
        "name": "Dumbbell Fly",
        "description": "Isolation chest exercise with dumbbells on a flat bench",
        "muscle_group": "Chest",
        "equipment": "Dumbbells",
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

    # ==================== Back ====================
    {
        "name": "Barbell Row",
        "description": "Compound back exercise for thickness",
        "muscle_group": "Back",
        "equipment": "Barbell",
    },
    {
        "name": "Pendlay Row",
        "description": "Strict barbell row from the floor each rep",
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
        "name": "Chin-ups",
        "description": "Underhand-grip pull-up emphasizing lats and biceps",
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
        "name": "Close-Grip Lat Pulldown",
        "description": "Lat pulldown with a narrow grip for mid-back emphasis",
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
        "name": "Chest-Supported Row",
        "description": "Row performed with chest against an incline bench to isolate the back",
        "muscle_group": "Back",
        "equipment": "Dumbbells",
    },
    {
        "name": "Machine Row",
        "description": "Rowing exercise performed on a plate-loaded or selectorized machine",
        "muscle_group": "Back",
        "equipment": "Machine",
    },
    {
        "name": "Deadlift",
        "description": "Compound full-body exercise emphasizing back and posterior chain",
        "muscle_group": "Back",
        "equipment": "Barbell",
    },
    {
        "name": "Rack Pull",
        "description": "Partial deadlift from pins emphasizing upper back and traps",
        "muscle_group": "Back",
        "equipment": "Barbell",
    },
    {
        "name": "T-Bar Row",
        "description": "Machine or landmine rowing variation",
        "muscle_group": "Back",
        "equipment": "T-Bar/Machine",
    },
    {
        "name": "Cable Pullover",
        "description": "Isolation exercise for lats using a cable machine",
        "muscle_group": "Back",
        "equipment": "Cable Machine",
    },
    {
        "name": "Single-Arm Lat Pulldown",
        "description": "Unilateral lat pulldown for balanced development",
        "muscle_group": "Back",
        "equipment": "Cable Machine",
    },

    # ==================== Shoulders ====================
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
        "name": "Arnold Press",
        "description": "Rotational dumbbell press hitting all three delt heads",
        "muscle_group": "Shoulders",
        "equipment": "Dumbbells",
    },
    {
        "name": "Machine Shoulder Press",
        "description": "Shoulder press on a machine for controlled movement",
        "muscle_group": "Shoulders",
        "equipment": "Machine",
    },
    {
        "name": "Lateral Raise",
        "description": "Isolation exercise for side delts",
        "muscle_group": "Shoulders",
        "equipment": "Dumbbells",
    },
    {
        "name": "Cable Lateral Raise",
        "description": "Lateral raise using a cable for constant tension",
        "muscle_group": "Shoulders",
        "equipment": "Cable Machine",
    },
    {
        "name": "Machine Lateral Raise",
        "description": "Lateral raise performed on a machine",
        "muscle_group": "Shoulders",
        "equipment": "Machine",
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
        "name": "Reverse Pec Deck",
        "description": "Machine fly targeting rear delts",
        "muscle_group": "Shoulders",
        "equipment": "Machine",
    },
    {
        "name": "Face Pulls",
        "description": "Cable exercise targeting rear delts and upper back",
        "muscle_group": "Shoulders",
        "equipment": "Cable Machine",
    },
    {
        "name": "Upright Row",
        "description": "Barbell or dumbbell row to chin level targeting delts and traps",
        "muscle_group": "Shoulders",
        "equipment": "Barbell/Dumbbells",
    },

    # ==================== Biceps ====================
    {
        "name": "Barbell Curl",
        "description": "Compound bicep exercise",
        "muscle_group": "Biceps",
        "equipment": "Barbell",
    },
    {
        "name": "EZ Bar Curl",
        "description": "Bicep curl with an EZ curl bar for wrist comfort",
        "muscle_group": "Biceps",
        "equipment": "EZ Bar",
    },
    {
        "name": "Dumbbell Curl",
        "description": "Bicep curl with dumbbells",
        "muscle_group": "Biceps",
        "equipment": "Dumbbells",
    },
    {
        "name": "Incline Dumbbell Curl",
        "description": "Bicep curl on an incline bench for a deeper stretch",
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
        "name": "Concentration Curl",
        "description": "Seated unilateral curl for peak contraction",
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
        "name": "Machine Preacher Curl",
        "description": "Bicep curl performed on a preacher curl machine",
        "muscle_group": "Biceps",
        "equipment": "Machine",
    },
    {
        "name": "Spider Curl",
        "description": "Bicep curl lying prone on an incline bench for constant tension",
        "muscle_group": "Biceps",
        "equipment": "Dumbbells/EZ Bar",
    },
    {
        "name": "Cable Curl",
        "description": "Bicep curl using cable machine",
        "muscle_group": "Biceps",
        "equipment": "Cable Machine",
    },
    {
        "name": "Bayesian Cable Curl",
        "description": "Cable curl performed behind the body for a long-head stretch",
        "muscle_group": "Biceps",
        "equipment": "Cable Machine",
    },

    # ==================== Triceps ====================
    {
        "name": "Close-Grip Bench Press",
        "description": "Compound tricep exercise",
        "muscle_group": "Triceps",
        "equipment": "Barbell",
    },
    {
        "name": "Tricep Pushdown (V-Bar)",
        "description": "Cable pushdown using a V-bar attachment",
        "muscle_group": "Triceps",
        "equipment": "Cable Machine",
    },
    {
        "name": "Tricep Pushdown (Rope)",
        "description": "Cable pushdown using a rope attachment for extra range of motion",
        "muscle_group": "Triceps",
        "equipment": "Cable Machine",
    },
    {
        "name": "Tricep Pushdown (Straight Bar)",
        "description": "Cable pushdown using a straight bar attachment",
        "muscle_group": "Triceps",
        "equipment": "Cable Machine",
    },
    {
        "name": "Single-Arm Cable Pushdown",
        "description": "Unilateral cable pushdown using a single handle",
        "muscle_group": "Triceps",
        "equipment": "Cable Machine",
    },
    {
        "name": "Reverse Grip Pushdown",
        "description": "Cable pushdown with an underhand grip targeting the medial head",
        "muscle_group": "Triceps",
        "equipment": "Cable Machine",
    },
    {
        "name": "Overhead Tricep Extension",
        "description": "Tricep extension performed overhead with dumbbells",
        "muscle_group": "Triceps",
        "equipment": "Dumbbells",
    },
    {
        "name": "Cable Overhead Tricep Extension (Rope)",
        "description": "Overhead tricep extension using a rope attachment on a cable",
        "muscle_group": "Triceps",
        "equipment": "Cable Machine",
    },
    {
        "name": "Cable Overhead Tricep Extension (Bar)",
        "description": "Overhead tricep extension using a bar attachment on a cable",
        "muscle_group": "Triceps",
        "equipment": "Cable Machine",
    },
    {
        "name": "Skull Crushers",
        "description": "Lying tricep extension",
        "muscle_group": "Triceps",
        "equipment": "Barbell/Dumbbells",
    },
    {
        "name": "Tricep Kickback",
        "description": "Isolation exercise extending the arm behind the body",
        "muscle_group": "Triceps",
        "equipment": "Dumbbells",
    },
    {
        "name": "Cable Kickback",
        "description": "Tricep kickback using a cable for constant tension",
        "muscle_group": "Triceps",
        "equipment": "Cable Machine",
    },
    {
        "name": "Machine Tricep Extension",
        "description": "Tricep extension performed on a selectorized machine",
        "muscle_group": "Triceps",
        "equipment": "Machine",
    },
    {
        "name": "Dip Machine",
        "description": "Machine-assisted dip targeting triceps",
        "muscle_group": "Triceps",
        "equipment": "Machine",
    },
    {
        "name": "Diamond Push-ups",
        "description": "Push-up variation with hands close together for tricep emphasis",
        "muscle_group": "Triceps",
        "equipment": "Bodyweight",
    },
    {
        "name": "JM Press",
        "description": "Hybrid of close-grip bench press and skull crusher for triceps",
        "muscle_group": "Triceps",
        "equipment": "Barbell",
    },

    # ==================== Quadriceps ====================
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
        "name": "Hack Squat",
        "description": "Machine squat variation targeting quads",
        "muscle_group": "Quadriceps",
        "equipment": "Machine",
    },
    {
        "name": "Pendulum Squat",
        "description": "Machine squat with a pendulum lever for quad emphasis",
        "muscle_group": "Quadriceps",
        "equipment": "Machine",
    },
    {
        "name": "Smith Machine Squat",
        "description": "Squat performed on a Smith machine for a guided bar path",
        "muscle_group": "Quadriceps",
        "equipment": "Smith Machine",
    },
    {
        "name": "Goblet Squat",
        "description": "Squat holding a dumbbell or kettlebell at the chest",
        "muscle_group": "Quadriceps",
        "equipment": "Dumbbells/Kettlebell",
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
    {
        "name": "Walking Lunges",
        "description": "Lunges performed while walking forward",
        "muscle_group": "Quadriceps",
        "equipment": "Dumbbells/Bodyweight",
    },
    {
        "name": "Sissy Squat",
        "description": "Bodyweight or loaded squat leaning back to isolate quads",
        "muscle_group": "Quadriceps",
        "equipment": "Bodyweight/Machine",
    },
    {
        "name": "Step-ups",
        "description": "Unilateral exercise stepping onto a box or bench",
        "muscle_group": "Quadriceps",
        "equipment": "Dumbbells/Bodyweight",
    },

    # ==================== Hamstrings ====================
    {
        "name": "Romanian Deadlift",
        "description": "Hip-hinge exercise targeting hamstrings",
        "muscle_group": "Hamstrings",
        "equipment": "Barbell",
    },
    {
        "name": "Dumbbell Romanian Deadlift",
        "description": "Romanian deadlift using dumbbells",
        "muscle_group": "Hamstrings",
        "equipment": "Dumbbells",
    },
    {
        "name": "Stiff-Leg Deadlift",
        "description": "Deadlift with minimal knee bend for hamstring emphasis",
        "muscle_group": "Hamstrings",
        "equipment": "Barbell",
    },
    {
        "name": "Lying Leg Curl",
        "description": "Isolation exercise for hamstrings performed lying face down",
        "muscle_group": "Hamstrings",
        "equipment": "Machine",
    },
    {
        "name": "Seated Leg Curl",
        "description": "Isolation exercise for hamstrings performed seated",
        "muscle_group": "Hamstrings",
        "equipment": "Machine",
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
        "name": "Glute-Ham Raise",
        "description": "Compound posterior chain exercise on a GHD machine",
        "muscle_group": "Hamstrings",
        "equipment": "GHD Machine",
    },
    {
        "name": "Good Mornings",
        "description": "Hip-hinge exercise for hamstrings and lower back",
        "muscle_group": "Hamstrings",
        "equipment": "Barbell",
    },

    # ==================== Glutes ====================
    {
        "name": "Hip Thrust",
        "description": "Glute-focused hip extension with back on a bench",
        "muscle_group": "Glutes",
        "equipment": "Barbell",
    },
    {
        "name": "Machine Hip Thrust",
        "description": "Hip thrust performed on a dedicated machine",
        "muscle_group": "Glutes",
        "equipment": "Machine",
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
    {
        "name": "Cable Kickback",
        "description": "Glute isolation with a cable attached at the ankle",
        "muscle_group": "Glutes",
        "equipment": "Cable Machine",
    },
    {
        "name": "Glute Machine Kickback",
        "description": "Glute isolation using a kickback machine",
        "muscle_group": "Glutes",
        "equipment": "Machine",
    },
    {
        "name": "Sumo Deadlift",
        "description": "Wide-stance deadlift emphasizing glutes and inner thighs",
        "muscle_group": "Glutes",
        "equipment": "Barbell",
    },

    # ==================== Calves ====================
    {
        "name": "Standing Calf Raise",
        "description": "Calf exercise performed standing",
        "muscle_group": "Calves",
        "equipment": "Machine/Dumbbells",
    },
    {
        "name": "Seated Calf Raise",
        "description": "Calf exercise performed seated targeting the soleus",
        "muscle_group": "Calves",
        "equipment": "Machine",
    },
    {
        "name": "Leg Press Calf Raise",
        "description": "Calf raise performed on the leg press machine",
        "muscle_group": "Calves",
        "equipment": "Leg Press Machine",
    },
    {
        "name": "Donkey Calf Raise",
        "description": "Calf raise in a bent-over position for a deep stretch",
        "muscle_group": "Calves",
        "equipment": "Machine/Bodyweight",
    },

    # ==================== Traps ====================
    {
        "name": "Barbell Shrug",
        "description": "Trap exercise using a barbell",
        "muscle_group": "Traps",
        "equipment": "Barbell",
    },
    {
        "name": "Dumbbell Shrug",
        "description": "Trap exercise using dumbbells",
        "muscle_group": "Traps",
        "equipment": "Dumbbells",
    },

    # ==================== Forearms ====================
    {
        "name": "Wrist Curl",
        "description": "Forearm flexion exercise",
        "muscle_group": "Forearms",
        "equipment": "Barbell/Dumbbells",
    },
    {
        "name": "Reverse Wrist Curl",
        "description": "Forearm extension exercise",
        "muscle_group": "Forearms",
        "equipment": "Barbell/Dumbbells",
    },
    {
        "name": "Farmer's Walk",
        "description": "Loaded carry for grip strength and forearms",
        "muscle_group": "Forearms",
        "equipment": "Dumbbells/Kettlebell",
    },

    # ==================== Core ====================
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
    {
        "name": "Ab Wheel Rollout",
        "description": "Core exercise using an ab wheel for anti-extension",
        "muscle_group": "Core",
        "equipment": "Ab Wheel",
    },
    {
        "name": "Decline Sit-ups",
        "description": "Sit-ups on a decline bench for added resistance",
        "muscle_group": "Core",
        "equipment": "Decline Bench",
    },
    {
        "name": "Pallof Press",
        "description": "Anti-rotation core exercise using a cable or band",
        "muscle_group": "Core",
        "equipment": "Cable Machine/Band",
    },
    {
        "name": "Woodchops",
        "description": "Rotational core exercise using a cable or medicine ball",
        "muscle_group": "Core",
        "equipment": "Cable Machine/Medicine Ball",
    },
    {
        "name": "Dead Bug",
        "description": "Anti-extension core exercise performed lying on back",
        "muscle_group": "Core",
        "equipment": "Bodyweight",
    },
]


def seed_exercises(db: Session) -> None:
    """
    Seed the database with default exercises.

    On first run, inserts all exercises. On subsequent runs, adds any new
    exercises that don't already exist (matched by name).
    """
    existing_exercises = db.query(Exercise).filter(Exercise.is_custom == False).all()
    existing_names = {e.name for e in existing_exercises}

    new_exercises = [
        ex for ex in DEFAULT_EXERCISES if ex["name"] not in existing_names
    ]

    if not new_exercises:
        print(f"All {len(DEFAULT_EXERCISES)} default exercises already exist. Skipping seed.")
        return

    print(f"Seeding {len(new_exercises)} new default exercises...")

    for exercise_data in new_exercises:
        exercise = Exercise(
            **exercise_data,
            is_custom=False,
            user_id=None
        )
        db.add(exercise)

    db.commit()
    print(f"Successfully seeded {len(new_exercises)} new default exercises! "
          f"(Total: {len(existing_names) + len(new_exercises)})")


if __name__ == "__main__":
    # Allow running this script directly for manual seeding
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        seed_exercises(db)
    finally:
        db.close()
