"""Tests for mesocycle template endpoints."""

import pytest
from fastapi import status


@pytest.fixture
def auth_headers(make_auth_headers):
    """Create a user and return authentication headers."""
    return make_auth_headers("mesocycle_test@example.com", "Mesocycle Tester")


@pytest.fixture
def second_user_headers(make_auth_headers):
    """Create a second user for testing ownership."""
    return make_auth_headers("mesocycle_test2@example.com", "Second Tester")


@pytest.fixture
def sample_exercise_id(client, auth_headers):
    """Get an exercise ID for testing."""
    response = client.get("/v1/exercises/", headers=auth_headers)
    exercises = response.json()
    return exercises[0]["id"]


def test_list_mesocycles_empty(client, auth_headers):
    """Test listing mesocycles when user has none."""
    response = client.get("/v1/mesocycles/", headers=auth_headers)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert isinstance(data, list)
    assert len(data) == 0


def test_create_mesocycle_minimal(client, auth_headers, sample_exercise_id):
    """Test creating a mesocycle template with minimal data."""
    mesocycle_data = {
        "name": "Test Mesocycle",
        "description": "A test training block",
        "weeks": 6,
        "days_per_week": 3,
        "workout_templates": [
            {
                "name": "Push Day",
                "description": "Chest, shoulders, triceps",
                "order_index": 0,
                "exercises": [
                    {
                        "exercise_id": sample_exercise_id,
                        "order_index": 0,
                        "target_sets": 3,
                        "weekly_set_increment": 0.5,
                        "target_reps_min": 8,
                        "target_reps_max": 12,
                        "starting_rir": 3,
                        "ending_rir": 0
                    }
                ]
            }
        ]
    }

    response = client.post("/v1/mesocycles/", json=mesocycle_data, headers=auth_headers)

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()

    assert data["name"] == "Test Mesocycle"
    assert data["weeks"] == 6
    assert data["days_per_week"] == 3
    assert len(data["workout_templates"]) == 1
    assert data["workout_templates"][0]["name"] == "Push Day"
    assert len(data["workout_templates"][0]["exercises"]) == 1
    assert "exercise" in data["workout_templates"][0]["exercises"][0]
    # weekly_set_increment round-trips
    assert data["workout_templates"][0]["exercises"][0]["weekly_set_increment"] == 0.5


def test_create_mesocycle_increment_defaults_to_zero(client, auth_headers, sample_exercise_id):
    """weekly_set_increment defaults to 0 when omitted."""
    mesocycle_data = {
        "name": "No Increment Mesocycle",
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
                        "target_reps_min": 8,
                        "target_reps_max": 12,
                    }
                ]
            }
        ]
    }

    response = client.post("/v1/mesocycles/", json=mesocycle_data, headers=auth_headers)
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["workout_templates"][0]["exercises"][0]["weekly_set_increment"] == 0.0


def test_create_mesocycle_full(client, auth_headers, sample_exercise_id):
    """Test creating a mesocycle template with complete nested structure."""
    mesocycle_data = {
        "name": "Full PPL Mesocycle",
        "description": "Push Pull Legs split",
        "weeks": 8,
        "days_per_week": 3,
        "workout_templates": [
            {
                "name": "Push Day",
                "description": "Chest, shoulders, triceps",
                "order_index": 0,
                "exercises": [
                    {
                        "exercise_id": sample_exercise_id,
                        "order_index": 0,
                        "target_sets": 4,
                        "target_reps_min": 6,
                        "target_reps_max": 8,
                        "starting_rir": 3,
                        "ending_rir": 1,
                        "notes": "Focus on progressive overload"
                    }
                ]
            },
            {
                "name": "Pull Day",
                "description": "Back and biceps",
                "order_index": 1,
                "exercises": [
                    {
                        "exercise_id": sample_exercise_id,
                        "order_index": 0,
                        "target_sets": 3,
                        "target_reps_min": 8,
                        "target_reps_max": 10,
                        "starting_rir": 2,
                        "ending_rir": 0
                    }
                ]
            },
            {
                "name": "Leg Day",
                "description": "Quads, hamstrings, glutes",
                "order_index": 2,
                "exercises": [
                    {
                        "exercise_id": sample_exercise_id,
                        "order_index": 0,
                        "target_sets": 4,
                        "target_reps_min": 10,
                        "target_reps_max": 15,
                        "starting_rir": 3,
                        "ending_rir": 0
                    }
                ]
            }
        ]
    }

    response = client.post("/v1/mesocycles/", json=mesocycle_data, headers=auth_headers)

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()

    assert data["name"] == "Full PPL Mesocycle"
    assert data["weeks"] == 8
    assert len(data["workout_templates"]) == 3
    assert data["workout_templates"][0]["name"] == "Push Day"
    assert data["workout_templates"][1]["name"] == "Pull Day"
    assert data["workout_templates"][2]["name"] == "Leg Day"


def test_create_mesocycle_invalid_exercise(client, auth_headers):
    """Test creating mesocycle with non-existent exercise ID."""
    mesocycle_data = {
        "name": "Invalid Mesocycle",
        "weeks": 6,
        "days_per_week": 3,
        "workout_templates": [
            {
                "name": "Test Workout",
                "order_index": 0,
                "exercises": [
                    {
                        "exercise_id": 99999,  # Non-existent exercise
                        "order_index": 0,
                        "target_sets": 3,
                        "target_reps_min": 8,
                        "target_reps_max": 12,
                        "starting_rir": 3,
                        "ending_rir": 0
                    }
                ]
            }
        ]
    }

    response = client.post("/v1/mesocycles/", json=mesocycle_data, headers=auth_headers)

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "not found" in response.json()["detail"].lower()


def test_list_mesocycles_with_data(client, auth_headers, sample_exercise_id):
    """Test listing mesocycles after creating some."""
    # Create two mesocycles
    mesocycle1 = {
        "name": "Mesocycle 1",
        "weeks": 6,
        "days_per_week": 3,
        "workout_templates": [
            {
                "name": "Workout 1",
                "order_index": 0,
                "exercises": [
                    {
                        "exercise_id": sample_exercise_id,
                        "order_index": 0,
                        "target_sets": 3,
                        "target_reps_min": 8,
                        "target_reps_max": 12,
                        "starting_rir": 3,
                        "ending_rir": 0
                    }
                ]
            }
        ]
    }

    mesocycle2 = {
        "name": "Mesocycle 2",
        "weeks": 8,
        "days_per_week": 3,
        "workout_templates": [
            {
                "name": "Workout 1",
                "order_index": 0,
                "exercises": [
                    {
                        "exercise_id": sample_exercise_id,
                        "order_index": 0,
                        "target_sets": 4,
                        "target_reps_min": 6,
                        "target_reps_max": 10,
                        "starting_rir": 3,
                        "ending_rir": 0
                    }
                ]
            },
            {
                "name": "Workout 2",
                "order_index": 1,
                "exercises": [
                    {
                        "exercise_id": sample_exercise_id,
                        "order_index": 0,
                        "target_sets": 3,
                        "target_reps_min": 10,
                        "target_reps_max": 15,
                        "starting_rir": 2,
                        "ending_rir": 0
                    }
                ]
            }
        ]
    }

    client.post("/v1/mesocycles/", json=mesocycle1, headers=auth_headers)
    client.post("/v1/mesocycles/", json=mesocycle2, headers=auth_headers)

    # List mesocycles
    response = client.get("/v1/mesocycles/", headers=auth_headers)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert len(data) == 2
    # Check that we have both mesocycles with correct workout counts
    workout_counts = sorted([m["workout_count"] for m in data])
    assert workout_counts == [1, 2]
    # List response should not include nested workout templates
    assert "workout_templates" not in data[0]
    assert "workout_templates" not in data[1]


def test_get_mesocycle_by_id(client, auth_headers, sample_exercise_id):
    """Test getting a specific mesocycle with full details."""
    # Create mesocycle
    mesocycle_data = {
        "name": "Detailed Mesocycle",
        "weeks": 6,
        "days_per_week": 3,
        "workout_templates": [
            {
                "name": "Upper Body",
                "description": "Chest, back, arms",
                "order_index": 0,
                "exercises": [
                    {
                        "exercise_id": sample_exercise_id,
                        "order_index": 0,
                        "target_sets": 3,
                        "target_reps_min": 8,
                        "target_reps_max": 12,
                        "starting_rir": 3,
                        "ending_rir": 0,
                        "notes": "Test notes"
                    }
                ]
            }
        ]
    }

    create_response = client.post("/v1/mesocycles/", json=mesocycle_data, headers=auth_headers)
    mesocycle_id = create_response.json()["id"]

    # Get mesocycle
    response = client.get(f"/v1/mesocycles/{mesocycle_id}", headers=auth_headers)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["id"] == mesocycle_id
    assert data["name"] == "Detailed Mesocycle"
    assert len(data["workout_templates"]) == 1
    assert data["workout_templates"][0]["name"] == "Upper Body"
    assert len(data["workout_templates"][0]["exercises"]) == 1
    assert data["workout_templates"][0]["exercises"][0]["notes"] == "Test notes"
    assert "exercise" in data["workout_templates"][0]["exercises"][0]


def test_get_nonexistent_mesocycle(client, auth_headers):
    """Test getting a mesocycle that doesn't exist."""
    response = client.get("/v1/mesocycles/99999", headers=auth_headers)

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_get_other_users_mesocycle(client, auth_headers, second_user_headers, sample_exercise_id):
    """Test that users cannot access other users' mesocycles."""
    # Create mesocycle with first user
    mesocycle_data = {
        "name": "Private Mesocycle",
        "weeks": 6,
        "days_per_week": 3,
        "workout_templates": [
            {
                "name": "Workout",
                "order_index": 0,
                "exercises": [
                    {
                        "exercise_id": sample_exercise_id,
                        "order_index": 0,
                        "target_sets": 3,
                        "target_reps_min": 8,
                        "target_reps_max": 12,
                        "starting_rir": 3,
                        "ending_rir": 0
                    }
                ]
            }
        ]
    }

    create_response = client.post("/v1/mesocycles/", json=mesocycle_data, headers=auth_headers)
    mesocycle_id = create_response.json()["id"]

    # Try to access with second user
    response = client.get(f"/v1/mesocycles/{mesocycle_id}", headers=second_user_headers)

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_update_mesocycle(client, auth_headers, sample_exercise_id):
    """Test updating mesocycle template details."""
    # Create mesocycle
    mesocycle_data = {
        "name": "Original Name",
        "description": "Original description",
        "weeks": 6,
        "days_per_week": 3,
        "workout_templates": [
            {
                "name": "Workout",
                "order_index": 0,
                "exercises": [
                    {
                        "exercise_id": sample_exercise_id,
                        "order_index": 0,
                        "target_sets": 3,
                        "target_reps_min": 8,
                        "target_reps_max": 12,
                        "starting_rir": 3,
                        "ending_rir": 0
                    }
                ]
            }
        ]
    }

    create_response = client.post("/v1/mesocycles/", json=mesocycle_data, headers=auth_headers)
    mesocycle_id = create_response.json()["id"]

    # Update mesocycle
    update_data = {
        "name": "Updated Name",
        "description": "Updated description"
    }

    response = client.put(f"/v1/mesocycles/{mesocycle_id}", json=update_data, headers=auth_headers)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["name"] == "Updated Name"
    assert data["description"] == "Updated description"
    assert data["weeks"] == 6  # Unchanged


def test_update_other_users_mesocycle(client, auth_headers, second_user_headers, sample_exercise_id):
    """Test that users cannot update other users' mesocycles."""
    # Create mesocycle with first user
    mesocycle_data = {
        "name": "Private Mesocycle",
        "weeks": 6,
        "days_per_week": 3,
        "workout_templates": [
            {
                "name": "Workout",
                "order_index": 0,
                "exercises": [
                    {
                        "exercise_id": sample_exercise_id,
                        "order_index": 0,
                        "target_sets": 3,
                        "target_reps_min": 8,
                        "target_reps_max": 12,
                        "starting_rir": 3,
                        "ending_rir": 0
                    }
                ]
            }
        ]
    }

    create_response = client.post("/v1/mesocycles/", json=mesocycle_data, headers=auth_headers)
    mesocycle_id = create_response.json()["id"]

    # Try to update with second user
    response = client.put(
        f"/v1/mesocycles/{mesocycle_id}",
        json={"name": "Hacked Name"},
        headers=second_user_headers
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_delete_mesocycle(client, auth_headers, sample_exercise_id):
    """Test deleting a mesocycle."""
    # Create mesocycle
    mesocycle_data = {
        "name": "Mesocycle to Delete",
        "weeks": 6,
        "days_per_week": 3,
        "workout_templates": [
            {
                "name": "Workout",
                "order_index": 0,
                "exercises": [
                    {
                        "exercise_id": sample_exercise_id,
                        "order_index": 0,
                        "target_sets": 3,
                        "target_reps_min": 8,
                        "target_reps_max": 12,
                        "starting_rir": 3,
                        "ending_rir": 0
                    }
                ]
            }
        ]
    }

    create_response = client.post("/v1/mesocycles/", json=mesocycle_data, headers=auth_headers)
    mesocycle_id = create_response.json()["id"]

    # Delete mesocycle
    response = client.delete(f"/v1/mesocycles/{mesocycle_id}", headers=auth_headers)

    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Verify it's deleted
    get_response = client.get(f"/v1/mesocycles/{mesocycle_id}", headers=auth_headers)
    assert get_response.status_code == status.HTTP_404_NOT_FOUND


def test_delete_other_users_mesocycle(client, auth_headers, second_user_headers, sample_exercise_id):
    """Test that users cannot delete other users' mesocycles."""
    # Create mesocycle with first user
    mesocycle_data = {
        "name": "Private Mesocycle",
        "weeks": 6,
        "days_per_week": 3,
        "workout_templates": [
            {
                "name": "Workout",
                "order_index": 0,
                "exercises": [
                    {
                        "exercise_id": sample_exercise_id,
                        "order_index": 0,
                        "target_sets": 3,
                        "target_reps_min": 8,
                        "target_reps_max": 12,
                        "starting_rir": 3,
                        "ending_rir": 0
                    }
                ]
            }
        ]
    }

    create_response = client.post("/v1/mesocycles/", json=mesocycle_data, headers=auth_headers)
    mesocycle_id = create_response.json()["id"]

    # Try to delete with second user
    response = client.delete(f"/v1/mesocycles/{mesocycle_id}", headers=second_user_headers)

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_add_workout_template(client, auth_headers, sample_exercise_id):
    """Test adding a workout template to an existing mesocycle."""
    # Create mesocycle with one workout
    mesocycle_data = {
        "name": "Expandable Mesocycle",
        "weeks": 6,
        "days_per_week": 3,
        "workout_templates": [
            {
                "name": "Workout 1",
                "order_index": 0,
                "exercises": [
                    {
                        "exercise_id": sample_exercise_id,
                        "order_index": 0,
                        "target_sets": 3,
                        "target_reps_min": 8,
                        "target_reps_max": 12,
                        "starting_rir": 3,
                        "ending_rir": 0
                    }
                ]
            }
        ]
    }

    create_response = client.post("/v1/mesocycles/", json=mesocycle_data, headers=auth_headers)
    mesocycle_id = create_response.json()["id"]

    # Add second workout template
    new_workout = {
        "name": "Workout 2",
        "description": "Additional workout",
        "order_index": 1,
        "exercises": [
            {
                "exercise_id": sample_exercise_id,
                "order_index": 0,
                "target_sets": 4,
                "target_reps_min": 6,
                "target_reps_max": 10,
                "starting_rir": 3,
                "ending_rir": 1
            }
        ]
    }

    response = client.post(
        f"/v1/mesocycles/{mesocycle_id}/workout-templates",
        json=new_workout,
        headers=auth_headers
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()

    assert data["name"] == "Workout 2"
    assert data["mesocycle_id"] == mesocycle_id
    assert len(data["exercises"]) == 1

    # Verify mesocycle now has 2 workouts
    get_response = client.get(f"/v1/mesocycles/{mesocycle_id}", headers=auth_headers)
    assert len(get_response.json()["workout_templates"]) == 2


def test_access_mesocycles_without_auth(client):
    """Test that accessing mesocycles without authentication fails."""
    response = client.get("/v1/mesocycles/")

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_create_mesocycle_invalid_weeks(client, auth_headers, sample_exercise_id):
    """Test creating mesocycle with invalid weeks (outside 3-12 range)."""
    mesocycle_data = {
        "name": "Invalid Weeks",
        "weeks": 2,  # Too few weeks
        "days_per_week": 3,
        "workout_templates": [
            {
                "name": "Workout",
                "order_index": 0,
                "exercises": [
                    {
                        "exercise_id": sample_exercise_id,
                        "order_index": 0,
                        "target_sets": 3,
                        "target_reps_min": 8,
                        "target_reps_max": 12,
                        "starting_rir": 3,
                        "ending_rir": 0
                    }
                ]
            }
        ]
    }

    response = client.post("/v1/mesocycles/", json=mesocycle_data, headers=auth_headers)

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY




def test_cannot_replace_workouts_while_an_instance_is_active(client, auth_headers, sample_exercise_id):
    """Replacing workouts deletes them, which would detach a running instance's sessions."""
    mesocycle = client.post(
        "/v1/mesocycles/",
        json={
            "name": "Active Block",
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
                            "target_reps_min": 8,
                            "target_reps_max": 12,
                        }
                    ],
                }
            ],
        },
        headers=auth_headers,
    ).json()

    started = client.post(
        "/v1/mesocycle-instances/",
        json={"mesocycle_template_id": mesocycle["id"]},
        headers=auth_headers,
    )
    assert started.status_code == status.HTTP_201_CREATED

    response = client.put(
        f"/v1/mesocycles/{mesocycle['id']}/workout-templates",
        json=[{"name": "Renamed Day", "order_index": 0, "exercises": []}],
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_409_CONFLICT

    # Sessions still point at their plan
    sessions = client.get(
        f"/v1/workout-sessions/?mesocycle_instance_id={started.json()['id']}",
        headers=auth_headers,
    ).json()
    assert sessions
    assert all(s["workout_template_id"] is not None for s in sessions)


def test_editing_workouts_keeps_exercise_row_ids(client, auth_headers, sample_exercise_id):
    """Instances key their exercise notes by workout_exercise_id, so an edit
    must not recreate the rows those notes point at."""
    exercises = client.get("/v1/exercises/", headers=auth_headers).json()
    second_exercise = next(e["id"] for e in exercises if e["id"] != sample_exercise_id)

    mesocycle = client.post(
        "/v1/mesocycles/",
        json={
            "name": "Note Keeper",
            "weeks": 4,
            "days_per_week": 1,
            "workout_templates": [
                {
                    "name": "Day 1",
                    "order_index": 0,
                    "exercises": [
                        {"exercise_id": sample_exercise_id, "order_index": 0,
                         "target_sets": 3, "target_reps_min": 8, "target_reps_max": 12},
                    ],
                }
            ],
        },
        headers=auth_headers,
    ).json()
    original_id = mesocycle["workout_templates"][0]["exercises"][0]["id"]

    # Rename the day and add a second exercise
    updated = client.put(
        f"/v1/mesocycles/{mesocycle['id']}/workout-templates",
        json=[
            {
                "name": "Renamed Day",
                "order_index": 0,
                "exercises": [
                    {"exercise_id": sample_exercise_id, "order_index": 0,
                     "target_sets": 4, "target_reps_min": 8, "target_reps_max": 12},
                    {"exercise_id": second_exercise, "order_index": 1,
                     "target_sets": 2, "target_reps_min": 8, "target_reps_max": 12},
                ],
            }
        ],
        headers=auth_headers,
    )
    assert updated.status_code == status.HTTP_200_OK

    day = updated.json()["workout_templates"][0]
    assert day["name"] == "Renamed Day"
    kept = next(e for e in day["exercises"] if e["exercise_id"] == sample_exercise_id)
    assert kept["id"] == original_id  # same row, so any note on it survives
    assert kept["target_sets"] == 4


def test_a_workout_cannot_list_the_same_exercise_twice(client, auth_headers, sample_exercise_id):
    """Two entries for one exercise would give it two runs of set numbers."""
    response = client.post(
        "/v1/mesocycles/",
        json={
            "name": "Duplicated",
            "weeks": 4,
            "days_per_week": 1,
            "workout_templates": [
                {
                    "name": "Day 1",
                    "order_index": 0,
                    "exercises": [
                        {"exercise_id": sample_exercise_id, "order_index": 0,
                         "target_sets": 2, "target_reps_min": 8, "target_reps_max": 12},
                        {"exercise_id": sample_exercise_id, "order_index": 1,
                         "target_sets": 3, "target_reps_min": 8, "target_reps_max": 12},
                    ],
                }
            ],
        },
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
