"""Set counts follow logged performance instead of a fixed weekly increment.

The increment used to be chosen once at creation and replayed for the whole
block regardless of how training went. Every set already records what it was
asked for and what was achieved, so next week's volume can be decided from that
with no extra input from the lifter.
"""

import pytest
from fastapi import status

from app.services.autoregulation import (
    MUSCLE_GROUP_WEEKLY_SET_CEILINGS,
    ceiling_for_muscle_group,
    score_exercise_performance,
)
from tests.test_workout_sessions import (  # noqa: F401 - fixtures
    auth_headers,
    sample_exercise_id,
)


class FakeSet:
    def __init__(self, reps, target_reps, rir=None, target_rir=None, skipped=0):
        self.reps = reps
        self.target_reps = target_reps
        self.rir = rir
        self.target_rir = target_rir
        self.skipped = skipped


class TestScoring:
    def test_every_set_hit_earns_another_set(self):
        assert score_exercise_performance([FakeSet(10, 10)] * 3) == 1

    def test_beating_the_target_also_earns_a_set(self):
        assert score_exercise_performance([FakeSet(12, 10)] * 3) == 1

    def test_one_miss_holds(self):
        assert score_exercise_performance(
            [FakeSet(10, 10), FakeSet(10, 10), FakeSet(8, 10)]
        ) == 0

    def test_most_missed_drops_a_set(self):
        assert score_exercise_performance(
            [FakeSet(8, 10), FakeSet(8, 10), FakeSet(10, 10)]
        ) == -1

    def test_a_skipped_set_counts_against_you(self):
        """Volume has not earned the right to grow off work that wasn't done."""
        assert score_exercise_performance(
            [FakeSet(10, 10), FakeSet(0, 10, skipped=1)]
        ) == 0
        assert score_exercise_performance(
            [FakeSet(0, 10, skipped=1), FakeSet(0, 10, skipped=1)]
        ) == -1

    def test_sets_left_blank_are_not_hits(self):
        assert score_exercise_performance([FakeSet(0, 10)] * 3) == -1

    def test_untargeted_sets_are_ignored_rather_than_failed(self):
        """History from before targets existed must not read as failure."""
        assert score_exercise_performance([FakeSet(10, None)] * 3) == 0

    def test_reps_met_at_a_harder_rir_is_a_miss(self):
        assert score_exercise_performance(
            [FakeSet(10, 10, rir=0, target_rir=2)] * 3
        ) == -1


class TestCeilings:
    def test_known_groups_use_their_own_ceiling(self):
        assert ceiling_for_muscle_group("Chest") == 22
        assert ceiling_for_muscle_group("Hamstrings") == 16

    def test_unknown_groups_fall_back(self):
        assert ceiling_for_muscle_group("Grip") == 25
        assert ceiling_for_muscle_group(None) == 25

    def test_ceilings_match_the_frontend_table(self):
        """The chart draws these; this module enforces them.

        If they drift, the app warns about one number and holds you to another.
        """
        import pathlib
        import re

        source = pathlib.Path(__file__).resolve().parents[2] / "frontend/src/utils/volume.ts"
        text = source.read_text()
        block = re.search(
            r"WEEKLY_SET_CEILINGS: Record<string, number> = \{(.*?)\}", text, re.S
        )
        assert block, "could not find WEEKLY_SET_CEILINGS in volume.ts"
        frontend = {
            m.group(1): int(m.group(2))
            for m in re.finditer(r"(\w+):\s*(\d+)", block.group(1))
        }
        assert frontend == MUSCLE_GROUP_WEEKLY_SET_CEILINGS


def _make_block(client, auth_headers, exercise_ids, target_sets=3, autoregulate=True,
                weeks=4, name="Autoreg Block"):
    template = client.post(
        "/v1/mesocycles/",
        json={
            "name": name,
            "weeks": weeks,
            "days_per_week": 1,
            "workout_templates": [
                {
                    "name": "Day 1",
                    "order_index": 0,
                    "exercises": [
                        {
                            "exercise_id": ex,
                            "order_index": i,
                            "target_sets": target_sets,
                            "weekly_set_increment": 1.0,
                            "target_reps_min": 8,
                            "target_reps_max": 10,
                            "starting_rir": 3,
                            "ending_rir": 0,
                        }
                        for i, ex in enumerate(exercise_ids)
                    ],
                }
            ],
        },
        headers=auth_headers,
    ).json()
    instance = client.post(
        "/v1/mesocycle-instances/",
        json={
            "mesocycle_template_id": template["id"],
            "autoregulate_volume": autoregulate,
        },
        headers=auth_headers,
    ).json()
    sessions = client.get(
        f"/v1/workout-sessions/?mesocycle_instance_id={instance['id']}",
        headers=auth_headers,
    ).json()
    return instance, {s["week_number"]: s["id"] for s in sessions}


def _sets_for(client, auth_headers, session_id, exercise_id=None):
    detail = client.get(f"/v1/workout-sessions/{session_id}", headers=auth_headers).json()
    sets = detail["workout_sets"]
    if exercise_id is not None:
        sets = [s for s in sets if s["exercise_id"] == exercise_id]
    return sets


def _log_and_finish(client, auth_headers, session_id, reps_delta=0, rir=None):
    """Log every set at its target, optionally short by reps_delta."""
    detail = client.get(f"/v1/workout-sessions/{session_id}", headers=auth_headers).json()
    for workout_set in detail["workout_sets"]:
        target = workout_set["target_reps"] or 10
        client.patch(
            f"/v1/workout-sessions/{session_id}/sets/{workout_set['id']}",
            json={
                "weight": 100,
                "reps": max(0, target - reps_delta),
                "rir": rir if rir is not None else workout_set["target_rir"],
            },
            headers=auth_headers,
        )
    return client.patch(
        f"/v1/workout-sessions/{session_id}",
        json={"status": "completed"},
        headers=auth_headers,
    )


def test_a_block_starts_flat_rather_than_pre_ramped(
    client, auth_headers, sample_exercise_id
):
    """The ramp is what autoregulation replaces.

    Pre-ramping and then autoregulating would apply two increases to the same
    week, even though the template still carries a weekly increment.
    """
    _, weeks = _make_block(client, auth_headers, [sample_exercise_id], target_sets=3)
    for week in (1, 2, 3, 4):
        assert len(_sets_for(client, auth_headers, weeks[week])) == 3


def test_hitting_every_target_adds_a_set_next_week(
    client, auth_headers, sample_exercise_id
):
    _, weeks = _make_block(client, auth_headers, [sample_exercise_id], target_sets=3)

    response = _log_and_finish(client, auth_headers, weeks[1])
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["volume_adjustments"] == [
        {
            "exercise_id": sample_exercise_id,
            "delta": 1,
            "from_sets": 3,
            "to_sets": 4,
            "capped": False,
        }
    ]
    assert len(_sets_for(client, auth_headers, weeks[2])) == 4


def test_missing_one_set_holds_next_week(client, auth_headers, sample_exercise_id):
    _, weeks = _make_block(client, auth_headers, [sample_exercise_id], target_sets=3)

    detail = client.get(f"/v1/workout-sessions/{weeks[1]}", headers=auth_headers).json()
    for i, workout_set in enumerate(detail["workout_sets"]):
        target = workout_set["target_reps"] or 10
        client.patch(
            f"/v1/workout-sessions/{weeks[1]}/sets/{workout_set['id']}",
            json={"weight": 100, "reps": target - (2 if i == 0 else 0),
                  "rir": workout_set["target_rir"]},
            headers=auth_headers,
        )
    response = client.patch(
        f"/v1/workout-sessions/{weeks[1]}", json={"status": "completed"},
        headers=auth_headers,
    )
    assert response.json()["volume_adjustments"] == []
    assert len(_sets_for(client, auth_headers, weeks[2])) == 3


def test_missing_most_sets_drops_one_next_week(
    client, auth_headers, sample_exercise_id
):
    _, weeks = _make_block(client, auth_headers, [sample_exercise_id], target_sets=3)

    response = _log_and_finish(client, auth_headers, weeks[1], reps_delta=5)
    assert response.json()["volume_adjustments"][0]["delta"] == -1
    assert len(_sets_for(client, auth_headers, weeks[2])) == 2


def test_an_exercise_never_drops_below_one_set(
    client, auth_headers, sample_exercise_id
):
    """Falling to zero would quietly delete the exercise from the block."""
    _, weeks = _make_block(client, auth_headers, [sample_exercise_id], target_sets=1)

    _log_and_finish(client, auth_headers, weeks[1], reps_delta=9)
    assert len(_sets_for(client, auth_headers, weeks[2])) == 1


def test_the_muscle_group_ceiling_blocks_a_deserved_set(
    client, auth_headers
):
    """Three chest exercises each creeping up is nine extra chest sets a week.

    No per-exercise limit would notice, which is why the cap is per muscle.
    """
    chest = [
        e["id"]
        for e in client.get("/v1/exercises/?limit=500", headers=auth_headers).json()
        if e["muscle_group"] == "Chest"
    ][:3]
    assert len(chest) == 3

    ceiling = MUSCLE_GROUP_WEEKLY_SET_CEILINGS["Chest"]
    # 3 exercises x 8 sets = 24, already past the 22 ceiling
    _, weeks = _make_block(client, auth_headers, chest, target_sets=8)

    response = _log_and_finish(client, auth_headers, weeks[1])
    adjustments = response.json()["volume_adjustments"]
    assert adjustments, "performance was earned, so something should be reported"
    assert all(a["delta"] == 0 and a["capped"] for a in adjustments)

    total = len(_sets_for(client, auth_headers, weeks[2]))
    assert total == 24, "no sets should have been added past the ceiling"
    assert total > ceiling, "fixture is meant to start over the ceiling"


def test_manual_mode_ignores_performance(client, auth_headers, sample_exercise_id):
    """The override: replay the weekly increment, whatever gets logged."""
    _, weeks = _make_block(
        client, auth_headers, [sample_exercise_id], target_sets=3, autoregulate=False
    )
    # Pre-ramped by the template's +1/week
    assert len(_sets_for(client, auth_headers, weeks[2])) == 4

    response = _log_and_finish(client, auth_headers, weeks[1], reps_delta=5)
    assert response.json()["volume_adjustments"] == []
    assert len(_sets_for(client, auth_headers, weeks[2])) == 4


def test_only_the_next_week_moves(client, auth_headers, sample_exercise_id):
    """A single session must not reshape the rest of the block."""
    _, weeks = _make_block(client, auth_headers, [sample_exercise_id], target_sets=3)

    _log_and_finish(client, auth_headers, weeks[1])

    assert len(_sets_for(client, auth_headers, weeks[2])) == 4
    assert len(_sets_for(client, auth_headers, weeks[3])) == 3
    assert len(_sets_for(client, auth_headers, weeks[4])) == 3


def test_the_deload_week_is_never_grown(client, auth_headers, sample_exercise_id):
    """The deload is prescribed recovery, not a place to add volume."""
    _, weeks = _make_block(
        client, auth_headers, [sample_exercise_id], target_sets=3, weeks=4
    )
    deload_week = max(weeks)
    before = len(_sets_for(client, auth_headers, weeks[deload_week]))

    # Finish the last training week perfectly
    for week in (1, 2, 3):
        _log_and_finish(client, auth_headers, weeks[week])
    response = _log_and_finish(client, auth_headers, weeks[4])

    assert response.json()["volume_adjustments"] == []
    assert len(_sets_for(client, auth_headers, weeks[deload_week])) == before
