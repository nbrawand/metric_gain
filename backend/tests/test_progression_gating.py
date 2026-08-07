"""End-to-end: next week's target reflects whether this week was earned.

The unit tests cover compute_progression_targets in isolation. These check the
wiring — that the refresh path in GET /workout-sessions/{id} actually hands it
what the previous set was targeting, not just what was lifted.
"""

import pytest
from fastapi import status

from tests.test_workout_sessions import (  # noqa: F401 - fixtures
    auth_headers,
    sample_exercise_id,
)


REPS_MIN, REPS_MAX = 8, 10


@pytest.fixture
def block(client, auth_headers, sample_exercise_id):
    """A 4-week, 1-day block with one exercise on a fixed 3 sets."""
    template = client.post(
        "/v1/mesocycles/",
        json={
            "name": "Gating Block",
            "weeks": 4,
            "days_per_week": 1,
            "workout_templates": [
                {
                    "name": "Day 1",
                    "order_index": 0,
                    "exercises": [
                        {
                            "exercise_id": sample_exercise_id,
                            "order_index": 0,
                            "target_sets": 3,
                            "weekly_set_increment": 0.0,
                            "target_reps_min": REPS_MIN,
                            "target_reps_max": REPS_MAX,
                            "starting_rir": 3,
                            "ending_rir": 0,
                        }
                    ],
                }
            ],
        },
        headers=auth_headers,
    ).json()

    instance = client.post(
        "/v1/mesocycle-instances/",
        json={"mesocycle_template_id": template["id"]},
        headers=auth_headers,
    ).json()

    sessions = client.get(
        f"/v1/workout-sessions/?mesocycle_instance_id={instance['id']}",
        headers=auth_headers,
    ).json()
    return {s["week_number"]: s["id"] for s in sessions}


def _target(client, auth_headers, session_id):
    detail = client.get(f"/v1/workout-sessions/{session_id}", headers=auth_headers).json()
    return detail["workout_sets"][0]


def _log_and_finish(client, auth_headers, session_id, weight, reps, rir=0):
    detail = client.get(f"/v1/workout-sessions/{session_id}", headers=auth_headers).json()
    for workout_set in detail["workout_sets"]:
        response = client.patch(
            f"/v1/workout-sessions/{session_id}/sets/{workout_set['id']}",
            json={"weight": weight, "reps": reps, "rir": rir},
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK, response.text
    response = client.patch(
        f"/v1/workout-sessions/{session_id}",
        json={"status": "completed"},
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK, response.text


def test_hitting_the_target_raises_next_weeks_weight(client, auth_headers, block):
    week_one = _target(client, auth_headers, block[1])
    _log_and_finish(
        client, auth_headers, block[1], 225, week_one["target_reps"], rir=week_one["target_rir"]
    )

    week_two = _target(client, auth_headers, block[2])
    assert week_two["target_weight"] == 230


def test_missing_the_target_holds_next_weeks_weight(client, auth_headers, block):
    week_one = _target(client, auth_headers, block[1])
    _log_and_finish(
        client, auth_headers, block[1], 225, week_one["target_reps"], rir=week_one["target_rir"]
    )

    week_two = _target(client, auth_headers, block[2])
    assert week_two["target_weight"] == 230
    # One rep short of what was asked
    _log_and_finish(
        client, auth_headers, block[2], 230, week_two["target_reps"] - 1, rir=0
    )

    week_three = _target(client, auth_headers, block[3])
    assert week_three["target_weight"] == 230, (
        "a missed session must not buy a heavier target"
    )


def test_a_big_miss_steps_next_weeks_weight_back_down(
    client, auth_headers, block, sample_exercise_id
):
    week_one = _target(client, auth_headers, block[1])
    _log_and_finish(
        client, auth_headers, block[1], 225, week_one["target_reps"], rir=week_one["target_rir"]
    )

    # 2 reps against a target of 10 is the weight being wrong, not a bad day
    _log_and_finish(client, auth_headers, block[2], 230, 2, rir=0)

    # Back off by one loadable step for this exercise, whatever that is
    from app.services.progression import increment_for_equipment

    equipment = next(
        e["equipment"]
        for e in client.get("/v1/exercises/?limit=500", headers=auth_headers).json()
        if e["id"] == sample_exercise_id
    )
    step = increment_for_equipment(equipment)

    week_three = _target(client, auth_headers, block[3])
    assert week_three["target_weight"] == 230 - step


def test_reps_met_at_zero_rir_does_not_raise_the_weight(client, auth_headers, block):
    """Prescribed 3 RIR, taken to failure — already a maximum effort."""
    week_one = _target(client, auth_headers, block[1])
    assert week_one["target_rir"] == 3
    _log_and_finish(
        client, auth_headers, block[1], 225, week_one["target_reps"], rir=0
    )

    week_two = _target(client, auth_headers, block[2])
    assert week_two["target_weight"] == 225
