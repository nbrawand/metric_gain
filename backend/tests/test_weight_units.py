"""Weights are logged in the lifter's own unit, and rounded in it too.

5 lb is 2.27 kg, which is not a number any plate rack can produce, so a target
computed in pounds and converted for display is unusable. Rounding happens in
the unit that will actually be loaded.
"""

import json

import pytest

from app.services.progression import (
    KG,
    LB,
    compute_progression_targets,
    convert_weight,
    increment_for_equipment,
    normalize_unit,
)
from app.utils.db import user_weight_unit
from tests.test_workout_sessions import (  # noqa: F401 - fixtures
    auth_headers,
    sample_exercise_id,
)


class TestUnitResolution:
    def test_known_units_pass_through(self):
        assert normalize_unit("kg") == KG
        assert normalize_unit("KG") == KG
        assert normalize_unit("lb") == LB

    def test_anything_else_is_pounds(self):
        for value in (None, "", "stone", "pounds", "lbs"):
            assert normalize_unit(value) == LB

    def test_preferences_drive_the_users_unit(self):
        class FakeUser:
            preferences = json.dumps({"weight_unit": "kg"})

        assert user_weight_unit(FakeUser()) == KG

    def test_missing_or_broken_preferences_fall_back(self):
        class NoPrefs:
            preferences = None

        class Empty:
            preferences = "{}"

        class Broken:
            preferences = "not json at all"

        assert user_weight_unit(NoPrefs()) == LB
        assert user_weight_unit(Empty()) == LB
        assert user_weight_unit(Broken()) == LB


class TestIncrementsPerUnit:
    def test_kilogram_gyms_load_in_smaller_steps(self):
        # Smallest plate pair is 2 x 1.25 kg
        assert increment_for_equipment("Barbell", KG) == 2.5
        assert increment_for_equipment("Barbell", LB) == 5.0

    def test_single_plate_lifts_are_finer_in_both_units(self):
        assert increment_for_equipment("Bodyweight", KG) == 1.25
        assert increment_for_equipment("Bodyweight", LB) == 2.5

    def test_unit_defaults_to_pounds(self):
        assert increment_for_equipment("Barbell") == 5.0

    def test_progression_rounds_to_kilogram_steps(self):
        # 100 kg + 2.5% = 102.5, which is exactly a loadable kg step
        weight, _ = compute_progression_targets(
            100, 8, 12, increment=increment_for_equipment("Barbell", KG)
        )
        assert weight == 102.5


class TestConversion:
    def test_pounds_to_kilograms_lands_on_a_loadable_step(self):
        # 225 lb is 102.06 kg, which no rack can make
        assert convert_weight(225, LB, KG) == 102.5

    def test_kilograms_to_pounds_lands_on_a_loadable_step(self):
        assert convert_weight(100, KG, LB) == 220.0

    def test_converting_to_the_same_unit_changes_nothing(self):
        assert convert_weight(225, LB, LB) == 225

    def test_none_stays_none(self):
        assert convert_weight(None, LB, KG) is None

    def test_a_round_trip_stays_close(self):
        """Rounding to loadable steps each way must not drift far."""
        for original in (95, 135, 185, 225, 315):
            back = convert_weight(convert_weight(original, LB, KG), KG, LB)
            assert abs(back - original) <= 2.5, f"{original} -> {back}"


def test_switching_units_converts_logged_weights(
    client, auth_headers, sample_exercise_id
):
    """Otherwise a 225 lb squat silently becomes a 225 kg one."""
    template = client.post(
        "/v1/mesocycles/",
        json={
            "name": "Units Block",
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
                            "target_sets": 2,
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
    session_id = client.get(
        f"/v1/workout-sessions/?mesocycle_instance_id={instance['id']}",
        headers=auth_headers,
    ).json()[0]["id"]

    detail = client.get(f"/v1/workout-sessions/{session_id}", headers=auth_headers).json()
    for workout_set in detail["workout_sets"]:
        client.patch(
            f"/v1/workout-sessions/{session_id}/sets/{workout_set['id']}",
            json={"weight": 225, "reps": 8},
            headers=auth_headers,
        )

    response = client.patch(
        "/v1/auth/users/me",
        json={"preferences": json.dumps({"weight_unit": "kg"})},
        headers=auth_headers,
    )
    assert response.status_code == 200

    after = client.get(f"/v1/workout-sessions/{session_id}", headers=auth_headers).json()
    for workout_set in after["workout_sets"]:
        assert workout_set["weight"] == convert_weight(225, LB, KG)


def test_switching_back_restores_close_to_the_original(
    client, auth_headers, sample_exercise_id
):
    template = client.post(
        "/v1/mesocycles/",
        json={
            "name": "Round Trip Block",
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
                            "target_sets": 1,
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
    session_id = client.get(
        f"/v1/workout-sessions/?mesocycle_instance_id={instance['id']}",
        headers=auth_headers,
    ).json()[0]["id"]
    set_id = client.get(
        f"/v1/workout-sessions/{session_id}", headers=auth_headers
    ).json()["workout_sets"][0]["id"]
    client.patch(
        f"/v1/workout-sessions/{session_id}/sets/{set_id}",
        json={"weight": 200, "reps": 8},
        headers=auth_headers,
    )

    for unit in ("kg", "lb"):
        client.patch(
            "/v1/auth/users/me",
            json={"preferences": json.dumps({"weight_unit": unit})},
            headers=auth_headers,
        )

    final = client.get(f"/v1/workout-sessions/{session_id}", headers=auth_headers).json()
    assert abs(final["workout_sets"][0]["weight"] - 200) <= 2.5


def test_an_unrelated_preference_change_does_not_touch_weights(
    client, auth_headers, sample_exercise_id
):
    """Only a unit change should rewrite history."""
    template = client.post(
        "/v1/mesocycles/",
        json={
            "name": "Untouched Block",
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
                            "target_sets": 1,
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
    session_id = client.get(
        f"/v1/workout-sessions/?mesocycle_instance_id={instance['id']}",
        headers=auth_headers,
    ).json()[0]["id"]
    set_id = client.get(
        f"/v1/workout-sessions/{session_id}", headers=auth_headers
    ).json()["workout_sets"][0]["id"]
    client.patch(
        f"/v1/workout-sessions/{session_id}/sets/{set_id}",
        json={"weight": 185, "reps": 8},
        headers=auth_headers,
    )

    client.patch(
        "/v1/auth/users/me",
        json={"preferences": json.dumps({"onboarding_completed": True})},
        headers=auth_headers,
    )

    after = client.get(f"/v1/workout-sessions/{session_id}", headers=auth_headers).json()
    assert after["workout_sets"][0]["weight"] == 185
