"""The block ends with a deload week rather than on its hardest week.

A 6-week plan used to finish at RIR 0 and stop, handing the next block a fully
fatigued lifter. The deload is one extra week after the planned weeks: about
half the sets, a little lighter, stopping well short of failure.
"""

import pytest
from fastapi import status

from app.services.progression import (
    DELOAD_TARGET_RIR,
    compute_deload_sets,
    compute_deload_weight,
    compute_target_rir,
    is_deload_week,
)
from tests.test_workout_sessions import (  # noqa: F401 - fixtures
    auth_headers,
    sample_exercise_id,
)


TRAINING_WEEKS = 4


class TestDeloadHelpers:
    def test_only_a_week_past_the_plan_is_a_deload(self):
        assert not is_deload_week(4, TRAINING_WEEKS)
        assert is_deload_week(5, TRAINING_WEEKS)

    def test_a_block_with_no_known_length_has_no_deload(self):
        assert not is_deload_week(5, None)
        assert not is_deload_week(5, 0)

    def test_rir_ramps_to_zero_then_backs_off_for_the_deload(self):
        ramp = [compute_target_rir(w, 6) for w in range(1, 8)]
        assert ramp == [3, 2, 2, 1, 1, 0, DELOAD_TARGET_RIR]

    def test_sets_are_roughly_halved_but_never_zero(self):
        assert compute_deload_sets(6) == 3
        assert compute_deload_sets(5) == 3  # round half up
        assert compute_deload_sets(3) == 2
        assert compute_deload_sets(1) == 1

    def test_weight_backs_off_onto_a_loadable_step(self):
        assert compute_deload_weight(200, 5) == 180
        assert compute_deload_weight(100, 2.5) == 90
        assert compute_deload_weight(None, 5) is None

    def test_deload_weight_never_drops_below_one_step(self):
        assert compute_deload_weight(2, 5) == 5


@pytest.fixture
def block(client, auth_headers, sample_exercise_id):
    template = client.post(
        "/v1/mesocycles/",
        json={
            "name": "Deload Block",
            "weeks": TRAINING_WEEKS,
            "days_per_week": 1,
            "workout_templates": [
                {
                    "name": "Day 1",
                    "order_index": 0,
                    "exercises": [
                        {
                            "exercise_id": sample_exercise_id,
                            "order_index": 0,
                            "target_sets": 4,
                            "weekly_set_increment": 1.0,
                            "target_reps_min": 8,
                            "target_reps_max": 12,
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
        # Manual mode so the deload can be compared against a known ramp
        json={"mesocycle_template_id": template["id"], "autoregulate_volume": False},
        headers=auth_headers,
    ).json()
    return instance


def _sessions(client, auth_headers, instance_id):
    listed = client.get(
        f"/v1/workout-sessions/?mesocycle_instance_id={instance_id}",
        headers=auth_headers,
    ).json()
    return {s["week_number"]: s for s in listed}


def test_the_block_has_one_more_week_of_sessions_than_it_plans(
    client, auth_headers, block
):
    sessions = _sessions(client, auth_headers, block["id"])
    assert sorted(sessions) == [1, 2, 3, 4, 5]
    assert block["template_weeks"] == TRAINING_WEEKS
    assert block["includes_deload"] is True
    assert block["total_weeks"] == TRAINING_WEEKS + 1


def test_the_deload_week_carries_about_half_the_sets(client, auth_headers, block):
    sessions = _sessions(client, auth_headers, block["id"])
    # 4 sets +1/week -> 4, 5, 6, 7 across training, then half of week 1
    assert [sessions[w]["set_count"] for w in (1, 2, 3, 4)] == [4, 5, 6, 7]
    assert sessions[5]["set_count"] == compute_deload_sets(4)


def test_the_deload_week_asks_for_a_high_rir(client, auth_headers, block):
    sessions = _sessions(client, auth_headers, block["id"])

    final_training = client.get(
        f"/v1/workout-sessions/{sessions[4]['id']}", headers=auth_headers
    ).json()
    assert final_training["workout_sets"][0]["target_rir"] == 0

    deload = client.get(
        f"/v1/workout-sessions/{sessions[5]['id']}", headers=auth_headers
    ).json()
    assert all(s["target_rir"] == DELOAD_TARGET_RIR for s in deload["workout_sets"])


def test_the_deload_week_is_lighter_than_what_was_being_worked_with(
    client, auth_headers, block, sample_exercise_id
):
    sessions = _sessions(client, auth_headers, block["id"])

    # Train week 1 so there is history to back off from
    detail = client.get(
        f"/v1/workout-sessions/{sessions[1]['id']}", headers=auth_headers
    ).json()
    for workout_set in detail["workout_sets"]:
        client.patch(
            f"/v1/workout-sessions/{sessions[1]['id']}/sets/{workout_set['id']}",
            json={"weight": 200, "reps": workout_set["target_reps"], "rir": 3},
            headers=auth_headers,
        )
    client.patch(
        f"/v1/workout-sessions/{sessions[1]['id']}",
        json={"status": "completed"},
        headers=auth_headers,
    )

    deload = client.get(
        f"/v1/workout-sessions/{sessions[5]['id']}", headers=auth_headers
    ).json()
    for workout_set in deload["workout_sets"]:
        assert workout_set["target_weight"] is not None
        assert workout_set["target_weight"] < 200, (
            "the deload must back the weight off, not progress it"
        )


def test_an_exercise_added_mid_block_deloads_too(
    client, auth_headers, block, sample_exercise_id
):
    """Propagation reaches the deload week, so it must size for it.

    Following the plan's ramp into the recovery week would land it on the
    block's highest set count.
    """
    sessions = _sessions(client, auth_headers, block["id"])
    other = next(
        e["id"]
        for e in client.get("/v1/exercises/", headers=auth_headers).json()
        if e["id"] != sample_exercise_id
    )

    response = client.post(
        f"/v1/workout-sessions/{sessions[1]['id']}/exercises/add",
        json={"exercise_id": other},
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK

    deload = client.get(
        f"/v1/workout-sessions/{sessions[5]['id']}", headers=auth_headers
    ).json()
    added = [s for s in deload["workout_sets"] if s["exercise_id"] == other]
    assert added, "the added exercise should reach the deload week"
    assert all(s["target_rir"] == DELOAD_TARGET_RIR for s in added)
    # Not in the plan, so it defaults to 3 sets, halved for the deload
    assert len(added) == compute_deload_sets(3)


def test_blocks_started_before_deloads_existed_keep_their_old_span(client, auth_headers):
    """includes_deload is stored, not derived.

    An in-flight block has no sessions for a deload week; deriving one would
    give it a final week that can never be completed.
    """
    from app.models.mesocycle import MesocycleInstance
    from tests.conftest import TestingSessionLocal

    db = TestingSessionLocal()
    try:
        legacy = MesocycleInstance(
            user_id=1,
            template_weeks=6,
            template_days_per_week=3,
            includes_deload=False,
            status="active",
            start_date="2026-01-01",
        )
        assert legacy.total_weeks == 6
    finally:
        db.close()
