"""Structural checks on the stock exercise and mesocycle libraries.

Both seeders match on name, so a name that collides or a template that points
at an exercise that does not exist fails silently at deploy time rather than
loudly here.
"""

from collections import Counter

import pytest

from app.utils.seed_exercises import DEFAULT_EXERCISES
from app.utils.seed_mesocycles import STOCK_TEMPLATES


def test_exercise_names_are_unique():
    """seed_exercises dedupes on name, so a collision silently drops one.

    "Cable Kickback" existed twice (a triceps and a glute exercise) and the
    glute one was never inserted into any database.
    """
    duplicates = [n for n, c in Counter(e["name"] for e in DEFAULT_EXERCISES).items() if c > 1]
    assert duplicates == [], f"duplicate exercise names: {duplicates}"


def test_every_exercise_has_the_expected_fields():
    for exercise in DEFAULT_EXERCISES:
        assert set(exercise) == {"name", "description", "muscle_group", "equipment"}, exercise
        assert exercise["name"].strip()
        assert exercise["muscle_group"].strip()


def test_template_names_are_unique():
    duplicates = [n for n, c in Counter(t["name"] for t in STOCK_TEMPLATES).items() if c > 1]
    assert duplicates == [], f"duplicate template names: {duplicates}"


@pytest.mark.parametrize("template", STOCK_TEMPLATES, ids=lambda t: t["name"])
def test_template_is_internally_consistent(template):
    # Instances create one session per workout, so a mismatch here shows the
    # user a days/week the block will never honour
    assert template["days_per_week"] == len(template["workouts"]), (
        f"{template['name']}: claims {template['days_per_week']} days/week but "
        f"defines {len(template['workouts'])} workouts"
    )
    # Matches the bounds MesocycleCreate enforces on user-made templates
    assert 3 <= template["weeks"] <= 12
    assert 1 <= template["days_per_week"] <= 7
    assert template["description"].strip()


@pytest.mark.parametrize("template", STOCK_TEMPLATES, ids=lambda t: t["name"])
def test_template_exercises_resolve_and_are_in_range(template):
    known = {e["name"] for e in DEFAULT_EXERCISES}

    for workout in template["workouts"]:
        assert workout["name"].strip()
        seen = set()
        for exercise in workout["exercises"]:
            name = exercise["name"]
            # An unresolvable name is skipped at seed time, so the workout
            # quietly ships with fewer exercises than it lists
            assert name in known, f"{template['name']} / {workout['name']}: unknown exercise {name!r}"
            assert name not in seen, (
                f"{template['name']} / {workout['name']}: {name!r} listed twice; "
                "the session endpoints reject an exercise appearing twice"
            )
            seen.add(name)

            # Same bounds as WorkoutExerciseBase
            assert 1 <= exercise["sets"] <= 10
            assert 1 <= exercise["reps_min"] <= exercise["reps_max"] <= 100


def test_every_muscle_group_has_enough_exercises_to_swap_within():
    """A group with one or two entries leaves no alternative mid-workout."""
    counts = Counter(e["muscle_group"] for e in DEFAULT_EXERCISES)
    thin = {group: n for group, n in counts.items() if n < 4}
    assert thin == {}, f"muscle groups with too few exercises: {thin}"
