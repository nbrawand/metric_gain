"""Training history read back to the lifter.

Every set logged carries weight, reps and RIR and none of it was ever shown.
These cover the maths and the endpoints that surface it.
"""

import pytest
from fastapi import status

from app.services.analytics import estimate_one_rep_max
from tests.test_workout_sessions import (  # noqa: F401 - fixtures
    auth_headers,
    sample_exercise_id,
)


class TestOneRepMaxEstimate:
    def test_a_single_rep_is_its_own_max(self):
        assert estimate_one_rep_max(225, 1, 0) == pytest.approx(232.5, abs=0.1)

    def test_reps_in_reserve_count_towards_the_estimate(self):
        """A set stopped at 2 RIR had two more reps in it.

        Ignoring that makes a deliberately submaximal set look like a
        regression against a set taken to failure at the same weight.
        """
        to_failure = estimate_one_rep_max(225, 7, 0)
        held_back = estimate_one_rep_max(225, 5, 2)
        assert held_back == to_failure

    def test_a_missing_rir_is_treated_as_failure(self):
        """The conservative reading: it can only understate."""
        assert estimate_one_rep_max(225, 5) == estimate_one_rep_max(225, 5, 0)

    def test_very_high_rep_sets_are_clamped(self):
        """Epley falls apart past ~12 reps.

        Without the clamp a 30-rep set of calf raises claims a 2x max.
        """
        assert estimate_one_rep_max(100, 30) == estimate_one_rep_max(100, 12)

    def test_unusable_sets_return_none_rather_than_zero(self):
        assert estimate_one_rep_max(0, 5) is None
        assert estimate_one_rep_max(225, 0) is None
        assert estimate_one_rep_max(None, 5) is None
        assert estimate_one_rep_max(225, None) is None


@pytest.fixture
def trained_block(client, auth_headers, sample_exercise_id):
    """A finished week of training, so there is history to read back."""
    template = client.post(
        "/v1/mesocycles/",
        json={
            "name": "Analytics Block",
            "weeks": 3,
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
                            "target_reps_min": 8,
                            "target_reps_max": 10,
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
    weeks = {s["week_number"]: s["id"] for s in sessions}

    detail = client.get(f"/v1/workout-sessions/{weeks[1]}", headers=auth_headers).json()
    # A top set and two lighter back-off sets, so "best per session" has
    # something to choose between
    weights = [225, 185, 185]
    for workout_set, weight in zip(detail["workout_sets"], weights):
        client.patch(
            f"/v1/workout-sessions/{weeks[1]}/sets/{workout_set['id']}",
            json={"weight": weight, "reps": 8, "rir": 2},
            headers=auth_headers,
        )
    client.patch(
        f"/v1/workout-sessions/{weeks[1]}",
        json={"status": "completed"},
        headers=auth_headers,
    )
    return {"instance": instance, "weeks": weeks}


def test_overview_counts_only_completed_work(client, auth_headers, trained_block):
    response = client.get("/v1/analytics/overview", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["sessions_completed"] == 1
    assert data["sets_logged"] == 3
    assert data["blocks_completed"] == 0, "the block is still running"
    assert data["total_reps"] == 24
    assert data["total_volume"] == pytest.approx((225 + 185 + 185) * 8)
    assert data["training_since"] is not None
    assert data["weight_unit"] == "lb"


def test_overview_is_empty_for_a_new_account(client, auth_headers):
    response = client.get("/v1/analytics/overview", headers=auth_headers)
    data = response.json()
    assert data["sessions_completed"] == 0
    assert data["sets_logged"] == 0
    assert data["total_volume"] == 0
    assert data["training_since"] is None


def test_strength_history_reports_the_best_set_of_each_session(
    client, auth_headers, trained_block, sample_exercise_id
):
    """Plotting every set would turn the line into back-off noise."""
    response = client.get(
        f"/v1/analytics/strength/{sample_exercise_id}", headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert len(data["points"]) == 1, "one completed session, one point"
    point = data["points"][0]
    assert point["weight"] == 225, "the top set, not a back-off set"
    assert point["estimated_1rm"] == estimate_one_rep_max(225, 8, 2)


def test_strength_history_refuses_another_users_custom_exercise(
    client, auth_headers, make_auth_headers
):
    other = make_auth_headers("analytics_victim@example.com", "Victim")
    private = client.post(
        "/v1/exercises/",
        json={"name": "Private Lift", "muscle_group": "Chest", "equipment": "Barbell"},
        headers=other,
    ).json()

    response = client.get(
        f"/v1/analytics/strength/{private['id']}", headers=auth_headers
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Private Lift" not in response.text


def test_volume_history_counts_hard_sets_per_muscle_group(
    client, auth_headers, trained_block
):
    response = client.get("/v1/analytics/volume", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert len(data["weeks"]) == 1
    assert data["muscle_groups"], "the trained exercise has a muscle group"
    group = data["muscle_groups"][0]
    assert data["sets"][group] == [3]


def test_records_report_the_best_lift_per_exercise(
    client, auth_headers, trained_block, sample_exercise_id
):
    response = client.get("/v1/analytics/records", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    record = next(r for r in data["records"] if r["exercise_id"] == sample_exercise_id)
    assert record["heaviest_weight"] == 225
    assert record["heaviest_weight_reps"] == 8
    assert record["best_estimated_1rm"] == estimate_one_rep_max(225, 8, 2)
    assert record["best_estimated_1rm_date"] is not None


def test_trained_exercises_lists_only_what_was_logged(
    client, auth_headers, trained_block, sample_exercise_id
):
    """The library is 140 entries; offering all of them is mostly empty charts."""
    response = client.get("/v1/analytics/trained-exercises", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    trained = response.json()

    assert [e["id"] for e in trained] == [sample_exercise_id]


def test_analytics_never_leak_between_users(
    client, auth_headers, trained_block, make_auth_headers
):
    stranger = make_auth_headers("analytics_stranger@example.com", "Stranger")

    overview = client.get("/v1/analytics/overview", headers=stranger).json()
    assert overview["sets_logged"] == 0

    records = client.get("/v1/analytics/records", headers=stranger).json()
    assert records["records"] == []

    volume = client.get("/v1/analytics/volume", headers=stranger).json()
    assert volume["weeks"] == []


def test_analytics_require_authentication(client, test_db):
    for path in ("overview", "volume", "records", "trained-exercises"):
        response = client.get(f"/v1/analytics/{path}")
        assert response.status_code == 401, path
