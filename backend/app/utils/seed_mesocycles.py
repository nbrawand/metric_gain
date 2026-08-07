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
    """Update a workout template's exercises in place to match the given list.

    Rows are reused by position rather than deleted and recreated: instances
    key their per-exercise note overrides by workout_exercise_id, and new ids
    on every seed run would orphan every note a user has written.
    """
    existing = (
        db.query(WorkoutExercise)
        .filter(WorkoutExercise.workout_template_id == workout_template.id)
        .order_by(WorkoutExercise.order_index)
        .all()
    )

    kept = 0
    for exercise_data in exercise_list:
        exercise = get_exercise_by_name(db, exercise_data["name"])
        if not exercise:
            print(f"  Warning: Exercise '{exercise_data['name']}' not found, skipping")
            continue

        fields = dict(
            exercise_id=exercise.id,
            order_index=kept,
            target_sets=exercise_data["sets"],
            weekly_set_increment=exercise_data.get("increment", 0.5),
            target_reps_min=exercise_data["reps_min"],
            target_reps_max=exercise_data["reps_max"],
            starting_rir=3,
            ending_rir=0,
        )

        if kept < len(existing):
            workout_exercise = existing[kept]
            for field, value in fields.items():
                setattr(workout_exercise, field, value)
        else:
            db.add(WorkoutExercise(workout_template_id=workout_template.id, **fields))
        kept += 1

    # Drop any trailing rows the template no longer has
    for workout_exercise in existing[kept:]:
        db.delete(workout_exercise)


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


TWO_DAY_FULL_BODY_TEMPLATE = {
    "name": "2-Day Full Body",
    "description": "Minimalist 2-day full body program. Hits every major muscle group twice per week with compound movements. Ideal for beginners or those with limited training time.",
    "weeks": 5,
    "days_per_week": 2,
    "workouts": [
        {
            "name": "Full Body A",
            "description": "Quad, lateral delt, back, hamstring, chest, and bicep focus",
            "exercises": [
                {"name": "Barbell Squat", "sets": 2, "reps_min": 5, "reps_max": 10},
                {"name": "Cable Lateral Raise", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Lat Pulldown", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Seated Leg Curl", "sets": 2, "reps_min": 12, "reps_max": 15},
                {"name": "Dumbbell Bench Press", "sets": 2, "reps_min": 12, "reps_max": 15},
                {"name": "Cable Curl", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Full Body B",
            "description": "Back, chest, tricep, hamstring, quad, and calf focus",
            "exercises": [
                {"name": "Seated Cable Row", "sets": 2, "reps_min": 5, "reps_max": 10},
                {"name": "Incline Barbell Bench Press", "sets": 2, "reps_min": 5, "reps_max": 10},
                {"name": "Cable Overhead Tricep Extension (Rope)", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Romanian Deadlift", "sets": 2, "reps_min": 5, "reps_max": 10},
                {"name": "Leg Extension", "sets": 2, "reps_min": 12, "reps_max": 15},
                {"name": "Standing Calf Raise", "sets": 2, "reps_min": 8, "reps_max": 12},
            ],
        },
    ],
}

THREE_DAY_FULL_BODY_TEMPLATE = {
    "name": "3-Day Full Body",
    "description": "Balanced 3-day full body program. Each session trains the entire body with varied exercises. Great for beginners and intermediates seeking efficient training.",
    "weeks": 5,
    "days_per_week": 3,
    "workouts": [
        {
            "name": "Full Body A",
            "description": "Chest, quads, back, hamstrings, shoulders, and abs",
            "exercises": [
                {"name": "Incline Barbell Bench Press", "sets": 3, "reps_min": 5, "reps_max": 10},
                {"name": "Barbell Squat", "sets": 3, "reps_min": 5, "reps_max": 10},
                {"name": "Pull-ups", "sets": 3, "reps_min": 5, "reps_max": 10},
                {"name": "Lying Leg Curl", "sets": 3, "reps_min": 12, "reps_max": 15},
                {"name": "Cable Lateral Raise", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Decline Sit-ups", "sets": 3, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Full Body B",
            "description": "Back, shoulders, biceps, triceps, calves, and abs",
            "exercises": [
                {"name": "Seated Cable Row", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Dumbbell Shoulder Press", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Cable Curl", "sets": 3, "reps_min": 10, "reps_max": 15},
                {"name": "Cable Overhead Tricep Extension (Rope)", "sets": 3, "reps_min": 10, "reps_max": 15},
                {"name": "Standing Calf Raise", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Hanging Leg Raise", "sets": 3, "reps_min": 8, "reps_max": 12},
            ],
        },
        {
            "name": "Full Body C",
            "description": "Hamstrings, quads, calves, back, chest, and shoulders",
            "exercises": [
                {"name": "Romanian Deadlift", "sets": 3, "reps_min": 5, "reps_max": 10},
                {"name": "Leg Extension", "sets": 3, "reps_min": 12, "reps_max": 15},
                {"name": "Leg Press Calf Raise", "sets": 3, "reps_min": 12, "reps_max": 15},
                {"name": "Lat Pulldown", "sets": 3, "reps_min": 12, "reps_max": 15},
                {"name": "Machine Chest Press", "sets": 3, "reps_min": 12, "reps_max": 15},
                {"name": "Lateral Raise", "sets": 3, "reps_min": 12, "reps_max": 15},
            ],
        },
    ],
}

FOUR_DAY_UPPER_LOWER_TEMPLATE = {
    "name": "4-Day Upper Lower",
    "description": "Classic 4-day upper/lower split. Two upper and two lower sessions per week with complementary exercise selection. Excellent balance of volume and recovery for intermediates.",
    "weeks": 5,
    "days_per_week": 4,
    "workouts": [
        {
            "name": "Upper A",
            "description": "Chest, triceps, back, and biceps (strength focus)",
            "exercises": [
                {"name": "Barbell Bench Press", "sets": 3, "reps_min": 3, "reps_max": 5},
                {"name": "Incline Cable Fly", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Cable Overhead Tricep Extension (Rope)", "sets": 3, "reps_min": 10, "reps_max": 15},
                {"name": "Machine Row", "sets": 4, "reps_min": 10, "reps_max": 15},
                {"name": "Lat Pulldown", "sets": 5, "reps_min": 10, "reps_max": 15},
                {"name": "Cable Curl", "sets": 6, "reps_min": 15, "reps_max": 20},
            ],
        },
        {
            "name": "Lower A",
            "description": "Quads, hamstrings, calves, shoulders, and abs",
            "exercises": [
                {"name": "Barbell Squat", "sets": 2, "reps_min": 5, "reps_max": 10},
                {"name": "Lying Leg Curl", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Leg Press Calf Raise", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Cable Lateral Raise", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Cable Crunch", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Upper B",
            "description": "Back, biceps, chest, and triceps (hypertrophy focus)",
            "exercises": [
                {"name": "Pull-ups", "sets": 1, "reps_min": 5, "reps_max": 10},
                {"name": "Seated Cable Row", "sets": 2, "reps_min": 5, "reps_max": 10},
                {"name": "Preacher Curl", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Incline Barbell Bench Press", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Cable Fly", "sets": 1, "reps_min": 15, "reps_max": 20},
                {"name": "Tricep Pushdown (Rope)", "sets": 2, "reps_min": 15, "reps_max": 20},
            ],
        },
        {
            "name": "Lower B",
            "description": "Hamstrings, quads, calves, shoulders, and abs",
            "exercises": [
                {"name": "Romanian Deadlift", "sets": 1, "reps_min": 5, "reps_max": 10},
                {"name": "Bulgarian Split Squat", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Leg Extension", "sets": 2, "reps_min": 15, "reps_max": 20},
                {"name": "Standing Calf Raise", "sets": 2, "reps_min": 15, "reps_max": 20},
                {"name": "Lateral Raise", "sets": 2, "reps_min": 15, "reps_max": 20},
                {"name": "Hanging Leg Raise", "sets": 2, "reps_min": 8, "reps_max": 12},
            ],
        },
    ],
}

FIVE_DAY_LPPLU_TEMPLATE = {
    "name": "5-Day Legs/Push/Pull/Lower/Upper",
    "description": "5-day hybrid split combining push/pull/legs with upper/lower. Each muscle group is hit twice per week with varied rep ranges. Great for intermediate to advanced lifters.",
    "weeks": 5,
    "days_per_week": 5,
    "workouts": [
        {
            "name": "Legs",
            "description": "Quads, hamstrings, calves, and glutes",
            "exercises": [
                {"name": "Barbell Squat", "sets": 3, "reps_min": 5, "reps_max": 10},
                {"name": "Leg Press", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Leg Press Calf Raise", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Lying Leg Curl", "sets": 3, "reps_min": 12, "reps_max": 15},
                {"name": "Cable Pull-Through", "sets": 3, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Push",
            "description": "Chest, shoulders, triceps, and abs",
            "exercises": [
                {"name": "Barbell Bench Press", "sets": 3, "reps_min": 5, "reps_max": 10},
                {"name": "Incline Cable Fly", "sets": 3, "reps_min": 12, "reps_max": 15},
                {"name": "Dumbbell Shoulder Press", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Cable Overhead Tricep Extension (Rope)", "sets": 3, "reps_min": 10, "reps_max": 15},
                {"name": "Hanging Leg Raise", "sets": 3, "reps_min": 8, "reps_max": 12},
            ],
        },
        {
            "name": "Pull",
            "description": "Back, biceps, and lateral delts",
            "exercises": [
                {"name": "Pull-ups", "sets": 3, "reps_min": 5, "reps_max": 10},
                {"name": "Seated Cable Row", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Face Pulls", "sets": 3, "reps_min": 12, "reps_max": 15},
                {"name": "Cable Curl", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Cable Lateral Raise", "sets": 3, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Lower",
            "description": "Hamstrings, glutes, quads, calves, and abs",
            "exercises": [
                {"name": "Romanian Deadlift", "sets": 3, "reps_min": 5, "reps_max": 10},
                {"name": "Hip Thrust", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Standing Calf Raise", "sets": 3, "reps_min": 12, "reps_max": 15},
                {"name": "Leg Extension", "sets": 3, "reps_min": 12, "reps_max": 15},
                {"name": "Cable Crunch", "sets": 3, "reps_min": 12, "reps_max": 15},
            ],
        },
        {
            "name": "Upper",
            "description": "Chest, back, shoulders, triceps, and biceps",
            "exercises": [
                {"name": "Incline Barbell Bench Press", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Machine Row", "sets": 3, "reps_min": 10, "reps_max": 15},
                {"name": "Lat Pulldown", "sets": 3, "reps_min": 10, "reps_max": 15},
                {"name": "Lateral Raise", "sets": 3, "reps_min": 15, "reps_max": 20},
                {"name": "Tricep Pushdown (Rope)", "sets": 3, "reps_min": 12, "reps_max": 17},
                {"name": "Preacher Curl", "sets": 3, "reps_min": 12, "reps_max": 17},
            ],
        },
    ],
}

BEGINNER_STRENGTH_TEMPLATE = {
    "name": "Beginner Strength",
    "description": "Compound-focused program inspired by Starting Strength and StrongLifts, alternating two barbell sessions. Builds a foundation with simple linear progression. Ideal for true beginners learning the big lifts.",
    "weeks": 5,
    "days_per_week": 2,
    "workouts": [
        {
            "name": "Workout A",
            "description": "Squat, bench press, and row",
            "exercises": [
                {"name": "Barbell Squat", "sets": 3, "reps_min": 5, "reps_max": 8},
                {"name": "Barbell Bench Press", "sets": 3, "reps_min": 5, "reps_max": 8},
                {"name": "Barbell Row", "sets": 3, "reps_min": 5, "reps_max": 8},
                {"name": "Cable Curl", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Crunches", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Workout B",
            "description": "Squat, overhead press, and deadlift",
            "exercises": [
                {"name": "Barbell Squat", "sets": 3, "reps_min": 5, "reps_max": 8},
                {"name": "Overhead Press", "sets": 3, "reps_min": 5, "reps_max": 8},
                {"name": "Deadlift", "sets": 2, "reps_min": 5, "reps_max": 8},
                {"name": "Tricep Pushdown (Rope)", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Hanging Leg Raise", "sets": 2, "reps_min": 8, "reps_max": 12},
            ],
        },
    ],
}

BEGINNER_MACHINE_TEMPLATE = {
    "name": "Beginner Machine Only",
    "description": "3-day full body program using only machines and cables. Perfect for gym newcomers who want to build confidence and learn movement patterns before progressing to free weights.",
    "weeks": 5,
    "days_per_week": 3,
    "workouts": [
        {
            "name": "Full Body A",
            "description": "Chest, back, quads, hamstrings, and shoulders",
            "exercises": [
                {"name": "Machine Chest Press", "sets": 3, "reps_min": 10, "reps_max": 15},
                {"name": "Machine Row", "sets": 3, "reps_min": 10, "reps_max": 15},
                {"name": "Leg Press", "sets": 3, "reps_min": 10, "reps_max": 15},
                {"name": "Lying Leg Curl", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Machine Shoulder Press", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Full Body B",
            "description": "Back, chest, quads, calves, and arms",
            "exercises": [
                {"name": "Lat Pulldown", "sets": 3, "reps_min": 10, "reps_max": 15},
                {"name": "Pec Deck", "sets": 3, "reps_min": 10, "reps_max": 15},
                {"name": "Leg Extension", "sets": 3, "reps_min": 12, "reps_max": 15},
                {"name": "Seated Calf Raise", "sets": 2, "reps_min": 12, "reps_max": 20},
                {"name": "Machine Preacher Curl", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Machine Tricep Extension", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Full Body C",
            "description": "Legs, back, chest, shoulders, and core",
            "exercises": [
                {"name": "Hack Squat", "sets": 3, "reps_min": 10, "reps_max": 15},
                {"name": "Seated Leg Curl", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Seated Cable Row", "sets": 3, "reps_min": 10, "reps_max": 15},
                {"name": "Machine Chest Press", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Machine Lateral Raise", "sets": 2, "reps_min": 12, "reps_max": 20},
                {"name": "Cable Crunch", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
    ],
}

BEGINNER_UPPER_LOWER_3DAY_TEMPLATE = {
    "name": "Beginner 3-Day Upper/Lower",
    "description": "3-day upper/lower split alternating Upper, Lower, and Full Body sessions each week. A great stepping stone from full body to a 4-day upper/lower split. Suitable for beginners with 2-3 months of training experience.",
    "weeks": 6,
    "days_per_week": 3,
    "workouts": [
        {
            "name": "Upper Body",
            "description": "Chest, back, shoulders, biceps, and triceps",
            "exercises": [
                {"name": "Dumbbell Bench Press", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Lat Pulldown", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Dumbbell Shoulder Press", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Seated Cable Row", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Cable Curl", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Tricep Pushdown (Rope)", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Lower Body",
            "description": "Quads, hamstrings, glutes, calves, and core",
            "exercises": [
                {"name": "Barbell Squat", "sets": 3, "reps_min": 6, "reps_max": 10},
                {"name": "Romanian Deadlift", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Leg Press", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Leg Curl", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Standing Calf Raise", "sets": 2, "reps_min": 12, "reps_max": 20},
                {"name": "Cable Crunch", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Full Body",
            "description": "Compounds hitting every major muscle group",
            "exercises": [
                {"name": "Incline Dumbbell Press", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Pull-ups", "sets": 2, "reps_min": 5, "reps_max": 10},
                {"name": "Goblet Squat", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Lying Leg Curl", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Lateral Raise", "sets": 2, "reps_min": 12, "reps_max": 15},
                {"name": "Face Pulls", "sets": 2, "reps_min": 12, "reps_max": 15},
            ],
        },
    ],
}

BRO_SPLIT_TEMPLATE = {
    "name": "Bro Split",
    "description": "Classic bodybuilding 5-day split training one muscle group per day: Chest, Back, Shoulders, Legs, Arms. High volume per session with full week recovery per muscle. Great for intermediate lifters focused on hypertrophy.",
    "weeks": 6,
    "days_per_week": 5,
    "workouts": [
        {
            "name": "Chest Day",
            "description": "Chest focused with heavy pressing and isolation work",
            "exercises": [
                {"name": "Barbell Bench Press", "sets": 3, "reps_min": 6, "reps_max": 8},
                {"name": "Incline Dumbbell Press", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Decline Barbell Bench Press", "sets": 2, "reps_min": 8, "reps_max": 10},
                {"name": "Cable Fly", "sets": 3, "reps_min": 12, "reps_max": 15},
                {"name": "Pec Deck", "sets": 2, "reps_min": 12, "reps_max": 15},
            ],
        },
        {
            "name": "Back Day",
            "description": "Back focused with vertical and horizontal pulling",
            "exercises": [
                {"name": "Deadlift", "sets": 3, "reps_min": 5, "reps_max": 8},
                {"name": "Pull-ups", "sets": 3, "reps_min": 5, "reps_max": 10},
                {"name": "Dumbbell Row", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Seated Cable Row", "sets": 3, "reps_min": 10, "reps_max": 15},
                {"name": "Cable Pullover", "sets": 2, "reps_min": 10, "reps_max": 12},
            ],
        },
        {
            "name": "Shoulders & Traps",
            "description": "Shoulders and traps with pressing, lateral work, and shrugs",
            "exercises": [
                {"name": "Overhead Press", "sets": 3, "reps_min": 6, "reps_max": 10},
                {"name": "Arnold Press", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Cable Lateral Raise", "sets": 3, "reps_min": 12, "reps_max": 20},
                {"name": "Face Pulls", "sets": 3, "reps_min": 15, "reps_max": 20},
                {"name": "Barbell Shrug", "sets": 3, "reps_min": 8, "reps_max": 12},
            ],
        },
        {
            "name": "Leg Day",
            "description": "Quads, hamstrings, and calves",
            "exercises": [
                {"name": "Barbell Squat", "sets": 3, "reps_min": 6, "reps_max": 10},
                {"name": "Hack Squat", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Romanian Deadlift", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Lying Leg Curl", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Leg Extension", "sets": 2, "reps_min": 12, "reps_max": 15},
                {"name": "Standing Calf Raise", "sets": 3, "reps_min": 10, "reps_max": 20},
            ],
        },
        {
            "name": "Arms Day",
            "description": "Biceps and triceps alternating",
            "exercises": [
                {"name": "EZ Bar Curl", "sets": 3, "reps_min": 8, "reps_max": 10},
                {"name": "Close-Grip Bench Press", "sets": 3, "reps_min": 6, "reps_max": 10},
                {"name": "Hammer Curl", "sets": 3, "reps_min": 10, "reps_max": 12},
                {"name": "Skull Crushers", "sets": 3, "reps_min": 10, "reps_max": 12},
                {"name": "Preacher Curl", "sets": 2, "reps_min": 12, "reps_max": 15},
                {"name": "Tricep Pushdown (Rope)", "sets": 2, "reps_min": 12, "reps_max": 15},
            ],
        },
    ],
}

GLUTE_FOCUSED_UPPER_LOWER_TEMPLATE = {
    "name": "Glute & Lower Body Focus",
    "description": "4-day upper/lower split with extra glute and lower body emphasis. Inspired by Strong Curves and popular glute-building programs. Two lower body days (strength + hypertrophy) with hip thrusts, squats, and RDLs as primary lifts. Great for anyone prioritizing glute and leg development.",
    "weeks": 6,
    "days_per_week": 4,
    "workouts": [
        {
            "name": "Lower Strength",
            "description": "Heavy squats, hip thrusts, and posterior chain work",
            "exercises": [
                {"name": "Barbell Squat", "sets": 3, "reps_min": 5, "reps_max": 8},
                {"name": "Hip Thrust", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Romanian Deadlift", "sets": 3, "reps_min": 8, "reps_max": 10},
                {"name": "Bulgarian Split Squat", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Lying Leg Curl", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Standing Calf Raise", "sets": 2, "reps_min": 12, "reps_max": 20},
            ],
        },
        {
            "name": "Upper A",
            "description": "Chest, back, shoulders, and arms",
            "exercises": [
                {"name": "Dumbbell Bench Press", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Lat Pulldown", "sets": 3, "reps_min": 8, "reps_max": 12},
                {"name": "Dumbbell Shoulder Press", "sets": 2, "reps_min": 8, "reps_max": 12},
                {"name": "Seated Cable Row", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Cable Curl", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Tricep Pushdown (Rope)", "sets": 2, "reps_min": 10, "reps_max": 15},
            ],
        },
        {
            "name": "Lower Hypertrophy",
            "description": "High-rep glute and leg work for growth",
            "exercises": [
                {"name": "Hip Thrust", "sets": 3, "reps_min": 12, "reps_max": 15},
                {"name": "Goblet Squat", "sets": 3, "reps_min": 10, "reps_max": 15},
                {"name": "Cable Pull-Through", "sets": 3, "reps_min": 12, "reps_max": 15},
                {"name": "Walking Lunges", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Leg Extension", "sets": 2, "reps_min": 12, "reps_max": 15},
                {"name": "Seated Calf Raise", "sets": 2, "reps_min": 15, "reps_max": 20},
            ],
        },
        {
            "name": "Upper B",
            "description": "Back, chest, shoulders, and core",
            "exercises": [
                {"name": "Machine Row", "sets": 3, "reps_min": 10, "reps_max": 15},
                {"name": "Incline Dumbbell Press", "sets": 3, "reps_min": 10, "reps_max": 15},
                {"name": "Face Pulls", "sets": 2, "reps_min": 12, "reps_max": 15},
                {"name": "Cable Lateral Raise", "sets": 2, "reps_min": 12, "reps_max": 20},
                {"name": "Pallof Press", "sets": 2, "reps_min": 10, "reps_max": 15},
                {"name": "Hanging Leg Raise", "sets": 2, "reps_min": 8, "reps_max": 12},
            ],
        },
    ],
}

STOCK_TEMPLATES = [
    PUSH_PULL_LEGS_TEMPLATE,
    TWO_DAY_FULL_BODY_TEMPLATE,
    THREE_DAY_FULL_BODY_TEMPLATE,
    FOUR_DAY_UPPER_LOWER_TEMPLATE,
    FIVE_DAY_LPPLU_TEMPLATE,
    BEGINNER_STRENGTH_TEMPLATE,
    BEGINNER_MACHINE_TEMPLATE,
    BEGINNER_UPPER_LOWER_3DAY_TEMPLATE,
    BRO_SPLIT_TEMPLATE,
    GLUTE_FOCUSED_UPPER_LOWER_TEMPLATE,
]


def seed_mesocycles(db: Session) -> None:
    """
    Seed the database with stock mesocycle templates.

    For each template, checks if a stock mesocycle with the same name exists.
    If it exists, updates it in-place (preserving IDs so instances keep working).
    If it doesn't exist, creates it.
    """
    for template in STOCK_TEMPLATES:
        # Instances get one session per workout, so a days_per_week that
        # disagrees with the workout count is shown to users but never honored
        if template["days_per_week"] != len(template["workouts"]):
            print(
                f"  Warning: '{template['name']}' claims {template['days_per_week']} days/week "
                f"but defines {len(template['workouts'])} workouts"
            )

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
