"""Exercise changes made during a workout carry into later weeks of that day.

Sessions for the whole block are created when the instance starts, so without
propagation a swap in week 1 had to be repeated in weeks 2..N by hand.
"""

import pytest
from fastapi import status

from tests.test_workout_sessions import (  # noqa: F401 - fixtures
    auth_headers,
    sample_exercise_id,
    sample_mesocycle_with_workouts,
    sample_mesocycle_instance,
    _session_detail,
)


def _sessions_for_day(client, headers, instance_id, day=1):
    """Every session of one training day, keyed by week number."""
    listed = client.get(
        f"/v1/workout-sessions/?mesocycle_instance_id={instance_id}", headers=headers
    ).json()
    return {s["week_number"]: s for s in listed if s["day_number"] == day}


def _exercise_ids(client, headers, session_id):
    detail = client.get(f"/v1/workout-sessions/{session_id}", headers=headers).json()
    # dict.fromkeys keeps first-seen order
    return list(dict.fromkeys(s["exercise_id"] for s in detail["workout_sets"]))


@pytest.fixture
def other_exercise_id(client, auth_headers, sample_exercise_id):
    """An exercise that is not already in the day-1 template."""
    exercises = client.get("/v1/exercises/", headers=auth_headers).json()
    return next(e["id"] for e in exercises if e["id"] != sample_exercise_id)


def test_add_carries_into_every_later_week(
    client, auth_headers, sample_mesocycle_instance, other_exercise_id
):
    instance = sample_mesocycle_instance
    weeks = _sessions_for_day(client, auth_headers, instance["id"])
    # 4 training weeks plus the deload week that follows them
    assert len(weeks) == 5, "4 training weeks + deload"

    response = client.post(
        f"/v1/workout-sessions/{weeks[1]['id']}/exercises/add",
        json={"exercise_id": other_exercise_id},
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["future_sessions_updated"] == 4

    for week in (1, 2, 3, 4, 5):
        assert other_exercise_id in _exercise_ids(client, auth_headers, weeks[week]["id"]), (
            f"week {week} did not get the added exercise"
        )


def test_remove_carries_into_every_later_week(
    client, auth_headers, sample_mesocycle_instance, sample_exercise_id
):
    instance = sample_mesocycle_instance
    weeks = _sessions_for_day(client, auth_headers, instance["id"])

    response = client.delete(
        f"/v1/workout-sessions/{weeks[1]['id']}/exercises/{sample_exercise_id}",
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["future_sessions_updated"] == 4

    for week in (1, 2, 3, 4, 5):
        assert sample_exercise_id not in _exercise_ids(
            client, auth_headers, weeks[week]["id"]
        ), f"week {week} still has the removed exercise"


def test_swap_carries_into_every_later_week(
    client, auth_headers, sample_mesocycle_instance, sample_exercise_id, other_exercise_id
):
    instance = sample_mesocycle_instance
    weeks = _sessions_for_day(client, auth_headers, instance["id"])

    response = client.post(
        f"/v1/workout-sessions/{weeks[1]['id']}/exercises/swap",
        json={
            "old_exercise_id": sample_exercise_id,
            "new_exercise_id": other_exercise_id,
        },
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["future_sessions_updated"] == 4

    for week in (1, 2, 3, 4, 5):
        ids = _exercise_ids(client, auth_headers, weeks[week]["id"])
        assert other_exercise_id in ids, f"week {week} missing the swapped-in exercise"
        assert sample_exercise_id not in ids, f"week {week} kept the swapped-out exercise"


def test_only_later_weeks_change_not_earlier_ones(
    client, auth_headers, sample_mesocycle_instance, other_exercise_id
):
    """Editing week 3 must leave weeks 1 and 2 alone."""
    instance = sample_mesocycle_instance
    weeks = _sessions_for_day(client, auth_headers, instance["id"])

    response = client.post(
        f"/v1/workout-sessions/{weeks[3]['id']}/exercises/add",
        json={"exercise_id": other_exercise_id},
        headers=auth_headers,
    )
    assert response.json()["future_sessions_updated"] == 2

    assert other_exercise_id not in _exercise_ids(client, auth_headers, weeks[1]["id"])
    assert other_exercise_id not in _exercise_ids(client, auth_headers, weeks[2]["id"])
    assert other_exercise_id in _exercise_ids(client, auth_headers, weeks[3]["id"])
    assert other_exercise_id in _exercise_ids(client, auth_headers, weeks[4]["id"])


def test_other_days_are_untouched(
    client, auth_headers, sample_mesocycle_instance, other_exercise_id
):
    """The template has two days; a day-1 edit must not reach day 2."""
    instance = sample_mesocycle_instance
    day1 = _sessions_for_day(client, auth_headers, instance["id"], day=1)
    day2 = _sessions_for_day(client, auth_headers, instance["id"], day=2)
    assert day2, "fixture should have a second training day"

    client.post(
        f"/v1/workout-sessions/{day1[1]['id']}/exercises/add",
        json={"exercise_id": other_exercise_id},
        headers=auth_headers,
    )

    for week, session in day2.items():
        assert other_exercise_id not in _exercise_ids(
            client, auth_headers, session["id"]
        ), f"day 2 week {week} was changed by a day 1 edit"


def test_a_completed_later_week_is_never_rewritten(
    client, auth_headers, sample_mesocycle_instance, sample_exercise_id
):
    """A finished session is a record of what happened, not a plan."""
    instance = sample_mesocycle_instance
    weeks = _sessions_for_day(client, auth_headers, instance["id"])

    client.patch(
        f"/v1/workout-sessions/{weeks[3]['id']}",
        json={"status": "completed"},
        headers=auth_headers,
    )

    response = client.delete(
        f"/v1/workout-sessions/{weeks[1]['id']}/exercises/{sample_exercise_id}",
        headers=auth_headers,
    )
    # Weeks 2 and 4 only — week 3 is completed
    assert response.json()["future_sessions_updated"] == 3

    assert sample_exercise_id in _exercise_ids(client, auth_headers, weeks[3]["id"])
    assert sample_exercise_id not in _exercise_ids(client, auth_headers, weeks[2]["id"])
    assert sample_exercise_id not in _exercise_ids(client, auth_headers, weeks[4]["id"])


def test_logged_work_in_a_later_week_is_not_deleted(
    client, auth_headers, sample_mesocycle_instance, sample_exercise_id
):
    """Someone who trained ahead keeps what they recorded."""
    instance = sample_mesocycle_instance
    weeks = _sessions_for_day(client, auth_headers, instance["id"])

    week3 = client.get(
        f"/v1/workout-sessions/{weeks[3]['id']}", headers=auth_headers
    ).json()
    logged_set = next(
        s for s in week3["workout_sets"] if s["exercise_id"] == sample_exercise_id
    )
    client.patch(
        f"/v1/workout-sessions/{weeks[3]['id']}/sets/{logged_set['id']}",
        json={"weight": 100, "reps": 8},
        headers=auth_headers,
    )

    response = client.delete(
        f"/v1/workout-sessions/{weeks[1]['id']}/exercises/{sample_exercise_id}",
        headers=auth_headers,
    )
    assert response.json()["future_sessions_updated"] == 3

    assert sample_exercise_id in _exercise_ids(client, auth_headers, weeks[3]["id"])


def test_swap_skips_a_later_week_that_already_has_the_new_exercise(
    client, auth_headers, sample_mesocycle_instance, sample_exercise_id, other_exercise_id
):
    """Swapping onto an exercise already present would duplicate set numbers."""
    instance = sample_mesocycle_instance
    weeks = _sessions_for_day(client, auth_headers, instance["id"])

    # Put the target exercise into week 4 only
    client.post(
        f"/v1/workout-sessions/{weeks[4]['id']}/exercises/add",
        json={"exercise_id": other_exercise_id},
        headers=auth_headers,
    )

    response = client.post(
        f"/v1/workout-sessions/{weeks[1]['id']}/exercises/swap",
        json={
            "old_exercise_id": sample_exercise_id,
            "new_exercise_id": other_exercise_id,
        },
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    # Weeks 2 and 3 swapped; week 4 skipped rather than corrupted
    assert response.json()["future_sessions_updated"] == 2

    week4_ids = _exercise_ids(client, auth_headers, weeks[4]["id"])
    assert other_exercise_id in week4_ids
    assert sample_exercise_id in week4_ids


def test_added_exercise_follows_the_plans_weekly_set_ramp(
    client, auth_headers, sample_mesocycle_instance, sample_exercise_id
):
    """A propagated exercise is sized per week, not frozen at week 1's count.

    Day 1's template entry ramps 3 sets +1/week, so removing and re-adding it
    in week 1 must still produce 3/4/5/6 across the training weeks — and then
    deload rather than carrying the ramp into the recovery week.
    """
    instance = sample_mesocycle_instance
    weeks = _sessions_for_day(client, auth_headers, instance["id"])

    client.delete(
        f"/v1/workout-sessions/{weeks[1]['id']}/exercises/{sample_exercise_id}",
        headers=auth_headers,
    )
    client.post(
        f"/v1/workout-sessions/{weeks[1]['id']}/exercises/add",
        json={"exercise_id": sample_exercise_id},
        headers=auth_headers,
    )

    counts = []
    for week in (1, 2, 3, 4, 5):
        detail = client.get(
            f"/v1/workout-sessions/{weeks[week]['id']}", headers=auth_headers
        ).json()
        counts.append(
            sum(1 for s in detail["workout_sets"] if s["exercise_id"] == sample_exercise_id)
        )

    # Training weeks follow the plan's ramp; the deload halves week 1 rather
    # than continuing it, so the recovery week is not the block's biggest
    assert counts == [3, 4, 5, 6, 2], f"expected ramp then deload, got {counts}"
