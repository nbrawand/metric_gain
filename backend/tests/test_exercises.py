"""Tests for exercise endpoints."""

import pytest
from fastapi import status


@pytest.fixture
def auth_headers(make_auth_headers):
    """Create a user and return authentication headers."""
    return make_auth_headers("exercise_test@example.com", "Exercise Tester")


def test_list_exercises(client, auth_headers):
    """Test listing exercises includes default exercises."""
    response = client.get("/v1/exercises/", headers=auth_headers)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert isinstance(data, list)
    assert len(data) > 0  # Should have default exercises

    # Check first exercise structure
    exercise = data[0]
    assert "id" in exercise
    assert "name" in exercise
    assert "muscle_group" in exercise
    assert "is_custom" in exercise


def test_list_exercises_filter_by_muscle_group(client, auth_headers):
    """Test filtering exercises by muscle group."""
    response = client.get(
        "/v1/exercises/",
        params={"muscle_group": "Chest"},
        headers=auth_headers
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert len(data) > 0
    # All returned exercises should be chest exercises
    for exercise in data:
        assert "chest" in exercise["muscle_group"].lower()


def test_list_exercises_search(client, auth_headers):
    """Test searching exercises by name."""
    response = client.get(
        "/v1/exercises/",
        params={"search": "bench"},
        headers=auth_headers
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert len(data) > 0
    # All returned exercises should have 'bench' in the name
    for exercise in data:
        assert "bench" in exercise["name"].lower()


def test_get_muscle_groups(client, auth_headers):
    """Test getting list of muscle groups."""
    response = client.get("/v1/exercises/muscle-groups", headers=auth_headers)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert isinstance(data, list)
    assert len(data) > 0
    # Should include common muscle groups
    muscle_groups_lower = [mg.lower() for mg in data]
    assert "chest" in muscle_groups_lower
    assert "back" in muscle_groups_lower


def test_get_exercise_by_id(client, auth_headers):
    """Test getting a specific exercise by ID."""
    # First get list to find an exercise ID
    list_response = client.get("/v1/exercises/", headers=auth_headers)
    exercises = list_response.json()
    exercise_id = exercises[0]["id"]

    # Get specific exercise
    response = client.get(f"/v1/exercises/{exercise_id}", headers=auth_headers)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["id"] == exercise_id
    assert "name" in data
    assert "muscle_group" in data


def test_get_nonexistent_exercise(client, auth_headers):
    """Test getting an exercise that doesn't exist."""
    response = client.get("/v1/exercises/99999", headers=auth_headers)

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_create_custom_exercise(client, auth_headers):
    """Test creating a custom exercise."""
    response = client.post(
        "/v1/exercises/",
        json={
            "name": "My Custom Exercise",
            "description": "A unique exercise I created",
            "muscle_group": "Custom Group",
            "equipment": "Custom Equipment"
        },
        headers=auth_headers
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()

    assert data["name"] == "My Custom Exercise"
    assert data["is_custom"] is True
    assert data["user_id"] is not None


def test_create_duplicate_custom_exercise(client, auth_headers):
    """Test creating a custom exercise with duplicate name."""
    exercise_data = {
        "name": "Duplicate Exercise",
        "description": "Test exercise",
        "muscle_group": "Test",
        "equipment": "None"
    }

    # Create first exercise
    client.post("/v1/exercises/", json=exercise_data, headers=auth_headers)

    # Try to create duplicate
    response = client.post("/v1/exercises/", json=exercise_data, headers=auth_headers)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already have" in response.json()["detail"].lower()


def test_update_custom_exercise(client, auth_headers):
    """Test updating a custom exercise."""
    # Create a custom exercise first
    create_response = client.post(
        "/v1/exercises/",
        json={
            "name": "Exercise to Update",
            "description": "Original description",
            "muscle_group": "Test",
            "equipment": "None"
        },
        headers=auth_headers
    )
    exercise_id = create_response.json()["id"]

    # Update the exercise
    response = client.put(
        f"/v1/exercises/{exercise_id}",
        json={
            "name": "Updated Exercise Name",
            "description": "Updated description"
        },
        headers=auth_headers
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["name"] == "Updated Exercise Name"
    assert data["description"] == "Updated description"
    assert data["muscle_group"] == "Test"  # Unchanged fields should remain


def test_update_default_exercise_fails(client, auth_headers):
    """Test that updating default exercises is forbidden."""
    # Get a default exercise ID
    list_response = client.get("/v1/exercises/", headers=auth_headers)
    default_exercise = next(ex for ex in list_response.json() if not ex["is_custom"])

    # Try to update it
    response = client.put(
        f"/v1/exercises/{default_exercise['id']}",
        json={"name": "Modified Default"},
        headers=auth_headers
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_delete_custom_exercise(client, auth_headers):
    """Test deleting a custom exercise."""
    # Create a custom exercise
    create_response = client.post(
        "/v1/exercises/",
        json={
            "name": "Exercise to Delete",
            "description": "Will be deleted",
            "muscle_group": "Test",
            "equipment": "None"
        },
        headers=auth_headers
    )
    exercise_id = create_response.json()["id"]

    # Delete the exercise
    response = client.delete(f"/v1/exercises/{exercise_id}", headers=auth_headers)

    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Verify it's deleted
    get_response = client.get(f"/v1/exercises/{exercise_id}", headers=auth_headers)
    assert get_response.status_code == status.HTTP_404_NOT_FOUND


def test_delete_default_exercise_fails(client, auth_headers):
    """Test that deleting default exercises is forbidden."""
    # Get a default exercise ID
    list_response = client.get("/v1/exercises/", headers=auth_headers)
    default_exercise = next(ex for ex in list_response.json() if not ex["is_custom"])

    # Try to delete it
    response = client.delete(f"/v1/exercises/{default_exercise['id']}", headers=auth_headers)

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_access_exercises_without_auth(client):
    """Test that accessing exercises without authentication fails."""
    response = client.get("/v1/exercises/")

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_list_exercises_with_pagination(client, auth_headers):
    """Test pagination of exercise list."""
    # Get first page
    response1 = client.get(
        "/v1/exercises/",
        params={"skip": 0, "limit": 5},
        headers=auth_headers
    )

    assert response1.status_code == status.HTTP_200_OK
    data1 = response1.json()
    assert len(data1) <= 5

    # Get second page
    response2 = client.get(
        "/v1/exercises/",
        params={"skip": 5, "limit": 5},
        headers=auth_headers
    )

    data2 = response2.json()

    # Should get different exercises
    if len(data1) == 5 and len(data2) > 0:
        assert data1[0]["id"] != data2[0]["id"]


def test_cannot_delete_a_custom_exercise_that_is_in_use(client, auth_headers):
    """Deleting an in-use exercise would cascade away logged sets and template rows."""
    exercise = client.post(
        "/v1/exercises/",
        json={"name": "In Use Lift", "muscle_group": "Chest", "equipment": "Barbell"},
        headers=auth_headers,
    ).json()

    client.post(
        "/v1/mesocycles/",
        json={
            "name": "Uses The Lift",
            "weeks": 4,
            "days_per_week": 1,
            "workout_templates": [
                {
                    "name": "Day 1",
                    "order_index": 0,
                    "exercises": [
                        {
                            "exercise_id": exercise["id"],
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
    )

    response = client.delete(f"/v1/exercises/{exercise['id']}", headers=auth_headers)
    assert response.status_code == status.HTTP_409_CONFLICT

    still_there = client.get(f"/v1/exercises/{exercise['id']}", headers=auth_headers)
    assert still_there.status_code == status.HTTP_200_OK


def test_muscle_groups_exclude_other_users_custom_exercises(client, make_auth_headers):
    """The muscle group a user types on a private exercise is private too."""
    owner = make_auth_headers("mg_owner@example.com", "MG Owner")
    other = make_auth_headers("mg_other@example.com", "MG Other")

    created = client.post(
        "/v1/exercises/",
        json={"name": "Owner Only Lift", "muscle_group": "Owner Private Group"},
        headers=owner,
    )
    assert created.status_code == status.HTTP_201_CREATED

    assert "Owner Private Group" in client.get(
        "/v1/exercises/muscle-groups", headers=owner
    ).json()
    assert "Owner Private Group" not in client.get(
        "/v1/exercises/muscle-groups", headers=other
    ).json()


def test_muscle_groups_still_include_default_exercises(client, auth_headers):
    """Scoping the query must not hide the stock library."""
    groups = client.get("/v1/exercises/muscle-groups", headers=auth_headers).json()
    assert len(groups) > 0
    assert groups == sorted(groups)
