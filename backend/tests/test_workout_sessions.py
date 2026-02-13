"""Tests for workout session and workout set endpoints."""

import pytest
from datetime import date, datetime, timedelta
from fastapi import status


@pytest.fixture
def auth_headers(client):
    """Create a user and return authentication headers."""
    response = client.post(
        "/v1/auth/register",
        json={
            "email": "workout_test@example.com",
            "password": "testpass123",
            "full_name": "Workout Tester"
        }
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_exercise_id(client, auth_headers):
    """Get an exercise ID for testing."""
    response = client.get("/v1/exercises/", headers=auth_headers)
    exercises = response.json()
    return exercises[0]["id"]


@pytest.fixture
def sample_mesocycle_with_workouts(client, auth_headers, sample_exercise_id):
    """Create a mesocycle template with workout templates for testing."""
    mesocycle_data = {
        "name": "Test Mesocycle for Workouts",
        "weeks": 4,
        "days_per_week": 3,
        "workout_templates": [
            {
                "name": "Day 1 - Push",
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
            },
            {
                "name": "Day 2 - Pull",
                "order_index": 1,
                "exercises": [
                    {
                        "exercise_id": sample_exercise_id,
                        "order_index": 0,
                        "target_sets": 4,
                        "target_reps_min": 6,
                        "target_reps_max": 10,
                        "starting_rir": 2,
                        "ending_rir": 0
                    }
                ]
            }
        ]
    }

    response = client.post("/v1/mesocycles/", json=mesocycle_data, headers=auth_headers)
    assert response.status_code == status.HTTP_201_CREATED
    return response.json()


@pytest.fixture
def sample_mesocycle_instance(client, auth_headers, sample_mesocycle_with_workouts):
    """Create a mesocycle instance from the template for testing."""
    mesocycle = sample_mesocycle_with_workouts

    instance_data = {
        "mesocycle_template_id": mesocycle["id"]
    }

    response = client.post("/v1/mesocycle-instances/", json=instance_data, headers=auth_headers)
    assert response.status_code == status.HTTP_201_CREATED
    return response.json()


def test_create_workout_session(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test creating a workout session."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template_id = mesocycle["workout_templates"][0]["id"]

    session_data = {
        "mesocycle_instance_id": instance["id"],
        "workout_template_id": template_id,
        "workout_date": str(date.today()),
        "week_number": 1,
        "day_number": 1
    }

    response = client.post("/v1/workout-sessions/", json=session_data, headers=auth_headers)

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()

    assert data["mesocycle_instance_id"] == instance["id"]
    assert data["workout_template_id"] == template_id
    assert data["week_number"] == 1
    assert data["day_number"] == 1
    assert data["status"] == "in_progress"
    assert "workout_sets" in data
    assert len(data["workout_sets"]) == 3  # target_sets from template


def test_create_workout_session_auto_generates_sets(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test that workout session automatically generates sets from template."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template = mesocycle["workout_templates"][0]
    template_id = template["id"]

    session_data = {
        "mesocycle_instance_id": instance["id"],
        "workout_template_id": template_id,
        "workout_date": str(date.today()),
        "week_number": 1,
        "day_number": 1
    }

    response = client.post("/v1/workout-sessions/", json=session_data, headers=auth_headers)

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()

    # Check sets were generated
    sets = data["workout_sets"]
    exercise_template = template["exercises"][0]

    assert len(sets) == exercise_template["target_sets"]

    for i, workout_set in enumerate(sets, 1):
        assert workout_set["set_number"] == i
        assert workout_set["exercise_id"] == exercise_template["exercise_id"]
        assert workout_set["weight"] == 0  # Default value
        assert workout_set["reps"] == 0  # Default value
        assert "target_reps" in workout_set


def test_list_workout_sessions(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test listing workout sessions."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template_id = mesocycle["workout_templates"][0]["id"]

    # Create two sessions
    for day in [1, 2]:
        session_data = {
            "mesocycle_instance_id": instance["id"],
            "workout_template_id": template_id,
            "workout_date": str(date.today() + timedelta(days=day-1)),
            "week_number": 1,
            "day_number": day
        }
        client.post("/v1/workout-sessions/", json=session_data, headers=auth_headers)

    # List sessions
    response = client.get("/v1/workout-sessions/", headers=auth_headers)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert isinstance(data, list)
    assert len(data) >= 2


def test_list_workout_sessions_filter_by_mesocycle_instance(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test filtering workout sessions by mesocycle instance."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template_id = mesocycle["workout_templates"][0]["id"]

    # Create session
    session_data = {
        "mesocycle_instance_id": instance["id"],
        "workout_template_id": template_id,
        "workout_date": str(date.today()),
        "week_number": 1,
        "day_number": 1
    }
    client.post("/v1/workout-sessions/", json=session_data, headers=auth_headers)

    # Filter by mesocycle instance
    response = client.get(
        f"/v1/workout-sessions/?mesocycle_instance_id={instance['id']}",
        headers=auth_headers
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert isinstance(data, list)
    assert all(s["mesocycle_instance_id"] == instance["id"] for s in data)


def test_list_workout_sessions_filter_by_status(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test filtering workout sessions by status."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template_id = mesocycle["workout_templates"][0]["id"]

    # Create session
    session_data = {
        "mesocycle_instance_id": instance["id"],
        "workout_template_id": template_id,
        "workout_date": str(date.today()),
        "week_number": 1,
        "day_number": 1
    }
    response = client.post("/v1/workout-sessions/", json=session_data, headers=auth_headers)
    session_id = response.json()["id"]

    # Filter by status
    response = client.get(
        "/v1/workout-sessions/?status_filter=in_progress",
        headers=auth_headers
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert isinstance(data, list)
    assert all(s["status"] == "in_progress" for s in data if "status" in s)


def test_get_workout_session_by_id(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test getting a workout session by ID."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template_id = mesocycle["workout_templates"][0]["id"]

    # Create session
    session_data = {
        "mesocycle_instance_id": instance["id"],
        "workout_template_id": template_id,
        "workout_date": str(date.today()),
        "week_number": 1,
        "day_number": 1
    }
    create_response = client.post("/v1/workout-sessions/", json=session_data, headers=auth_headers)
    session_id = create_response.json()["id"]

    # Get session
    response = client.get(f"/v1/workout-sessions/{session_id}", headers=auth_headers)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["id"] == session_id
    assert "workout_sets" in data
    assert len(data["workout_sets"]) > 0


def test_get_nonexistent_workout_session(client, auth_headers):
    """Test getting a workout session that doesn't exist."""
    response = client.get("/v1/workout-sessions/99999", headers=auth_headers)

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_workout_session_status(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test updating workout session status."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template_id = mesocycle["workout_templates"][0]["id"]

    # Create session
    session_data = {
        "mesocycle_instance_id": instance["id"],
        "workout_template_id": template_id,
        "workout_date": str(date.today()),
        "week_number": 1,
        "day_number": 1
    }
    create_response = client.post("/v1/workout-sessions/", json=session_data, headers=auth_headers)
    session_id = create_response.json()["id"]

    # Update to completed
    update_data = {"status": "completed"}
    response = client.patch(
        f"/v1/workout-sessions/{session_id}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["status"] == "completed"
    assert data["completed_at"] is not None


def test_delete_workout_session(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test deleting a workout session."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template_id = mesocycle["workout_templates"][0]["id"]

    # Create session
    session_data = {
        "mesocycle_instance_id": instance["id"],
        "workout_template_id": template_id,
        "workout_date": str(date.today()),
        "week_number": 1,
        "day_number": 1
    }
    create_response = client.post("/v1/workout-sessions/", json=session_data, headers=auth_headers)
    session_id = create_response.json()["id"]

    # Delete session
    response = client.delete(f"/v1/workout-sessions/{session_id}", headers=auth_headers)

    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Verify it's gone
    get_response = client.get(f"/v1/workout-sessions/{session_id}", headers=auth_headers)
    assert get_response.status_code == status.HTTP_404_NOT_FOUND


# Workout Set Tests

def test_update_workout_set_weight_and_reps(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test updating weight and reps for a workout set."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template_id = mesocycle["workout_templates"][0]["id"]

    # Create session
    session_data = {
        "mesocycle_instance_id": instance["id"],
        "workout_template_id": template_id,
        "workout_date": str(date.today()),
        "week_number": 1,
        "day_number": 1
    }
    create_response = client.post("/v1/workout-sessions/", json=session_data, headers=auth_headers)
    session = create_response.json()
    session_id = session["id"]
    set_id = session["workout_sets"][0]["id"]

    # Update set
    update_data = {
        "weight": 135.5,
        "reps": 10
    }
    response = client.patch(
        f"/v1/workout-sessions/{session_id}/sets/{set_id}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["weight"] == 135.5
    assert data["reps"] == 10


def test_update_workout_set_with_rir(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test updating workout set with RIR (reps in reserve)."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template_id = mesocycle["workout_templates"][0]["id"]

    # Create session
    session_data = {
        "mesocycle_instance_id": instance["id"],
        "workout_template_id": template_id,
        "workout_date": str(date.today()),
        "week_number": 1,
        "day_number": 1
    }
    create_response = client.post("/v1/workout-sessions/", json=session_data, headers=auth_headers)
    session = create_response.json()
    session_id = session["id"]
    set_id = session["workout_sets"][0]["id"]

    # Update set with RIR
    update_data = {
        "weight": 100.0,
        "reps": 12,
        "rir": 2
    }
    response = client.patch(
        f"/v1/workout-sessions/{session_id}/sets/{set_id}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["weight"] == 100.0
    assert data["reps"] == 12
    assert data["rir"] == 2


def test_update_workout_set_with_notes(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test updating workout set with notes."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template_id = mesocycle["workout_templates"][0]["id"]

    # Create session
    session_data = {
        "mesocycle_instance_id": instance["id"],
        "workout_template_id": template_id,
        "workout_date": str(date.today()),
        "week_number": 1,
        "day_number": 1
    }
    create_response = client.post("/v1/workout-sessions/", json=session_data, headers=auth_headers)
    session = create_response.json()
    session_id = session["id"]
    set_id = session["workout_sets"][0]["id"]

    # Update set with notes
    update_data = {
        "weight": 225.0,
        "reps": 5,
        "notes": "Felt heavy today, lower back tight"
    }
    response = client.patch(
        f"/v1/workout-sessions/{session_id}/sets/{set_id}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["notes"] == "Felt heavy today, lower back tight"


def test_add_workout_set_to_session(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance, sample_exercise_id):
    """Test adding an additional workout set to a session."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template_id = mesocycle["workout_templates"][0]["id"]

    # Create session
    session_data = {
        "mesocycle_instance_id": instance["id"],
        "workout_template_id": template_id,
        "workout_date": str(date.today()),
        "week_number": 1,
        "day_number": 1
    }
    create_response = client.post("/v1/workout-sessions/", json=session_data, headers=auth_headers)
    session = create_response.json()
    session_id = session["id"]
    initial_set_count = len(session["workout_sets"])

    # Add a new set
    new_set_data = {
        "exercise_id": sample_exercise_id,
        "set_number": initial_set_count + 1,
        "order_index": initial_set_count,
        "weight": 0,
        "reps": 0
    }
    response = client.post(
        f"/v1/workout-sessions/{session_id}/sets",
        json=new_set_data,
        headers=auth_headers
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()

    assert data["set_number"] == initial_set_count + 1
    assert data["exercise_id"] == sample_exercise_id


def test_delete_workout_set(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test deleting a workout set."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template_id = mesocycle["workout_templates"][0]["id"]

    # Create session
    session_data = {
        "mesocycle_instance_id": instance["id"],
        "workout_template_id": template_id,
        "workout_date": str(date.today()),
        "week_number": 1,
        "day_number": 1
    }
    create_response = client.post("/v1/workout-sessions/", json=session_data, headers=auth_headers)
    session = create_response.json()
    session_id = session["id"]
    set_id = session["workout_sets"][0]["id"]

    # Delete set
    response = client.delete(
        f"/v1/workout-sessions/{session_id}/sets/{set_id}",
        headers=auth_headers
    )

    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Verify session still exists but has fewer sets
    get_response = client.get(f"/v1/workout-sessions/{session_id}", headers=auth_headers)
    updated_session = get_response.json()
    assert len(updated_session["workout_sets"]) == len(session["workout_sets"]) - 1


def test_access_workout_sessions_without_auth(client):
    """Test that workout session endpoints require authentication."""
    # Try to list sessions
    response = client.get("/v1/workout-sessions/")
    assert response.status_code == status.HTTP_403_FORBIDDEN

    # Try to create session
    response = client.post("/v1/workout-sessions/", json={})
    assert response.status_code == status.HTTP_403_FORBIDDEN

    # Try to get session
    response = client.get("/v1/workout-sessions/1")
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_workout_session_isolation_between_users(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test that users cannot access other users' workout sessions."""
    # auth_headers belongs to the first user who owns the mesocycle
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template_id = mesocycle["workout_templates"][0]["id"]

    # Create session as user1
    session_data = {
        "mesocycle_instance_id": instance["id"],
        "workout_template_id": template_id,
        "workout_date": str(date.today()),
        "week_number": 1,
        "day_number": 1
    }
    create_response = client.post("/v1/workout-sessions/", json=session_data, headers=auth_headers)
    session_id = create_response.json()["id"]

    # Create a second user
    user2_response = client.post(
        "/v1/auth/register",
        json={
            "email": "workout_test2@example.com",
            "password": "testpass123",
            "full_name": "Second Tester"
        }
    )
    user2_token = user2_response.json()["access_token"]
    user2_headers = {"Authorization": f"Bearer {user2_token}"}

    # Try to access user1's session as user2
    response = client.get(f"/v1/workout-sessions/{session_id}", headers=user2_headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND


# Workout Feedback Tests

def test_submit_workout_feedback(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test submitting muscle group feedback for a workout session."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template_id = mesocycle["workout_templates"][0]["id"]

    # Create session
    session_data = {
        "mesocycle_instance_id": instance["id"],
        "workout_template_id": template_id,
        "workout_date": str(date.today()),
        "week_number": 1,
        "day_number": 1
    }
    create_response = client.post("/v1/workout-sessions/", json=session_data, headers=auth_headers)
    session_id = create_response.json()["id"]

    # Submit feedback
    feedback_data = {
        "feedback": [
            {"muscle_group": "Chest", "difficulty": "Just Right"},
            {"muscle_group": "Triceps", "difficulty": "Easy"},
            {"muscle_group": "Shoulders", "difficulty": "Difficult"},
        ]
    }
    response = client.post(
        f"/v1/workout-sessions/{session_id}/feedback",
        json=feedback_data,
        headers=auth_headers
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()

    assert len(data) == 3
    muscle_groups = {item["muscle_group"] for item in data}
    assert muscle_groups == {"Chest", "Triceps", "Shoulders"}

    difficulties = {item["muscle_group"]: item["difficulty"] for item in data}
    assert difficulties["Chest"] == "Just Right"
    assert difficulties["Triceps"] == "Easy"
    assert difficulties["Shoulders"] == "Difficult"

    # Each entry should have an id and workout_session_id
    for item in data:
        assert "id" in item
        assert item["workout_session_id"] == session_id
        assert "created_at" in item


def test_submit_feedback_replaces_existing(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test that re-submitting feedback replaces the previous entries."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template_id = mesocycle["workout_templates"][0]["id"]

    # Create session
    session_data = {
        "mesocycle_instance_id": instance["id"],
        "workout_template_id": template_id,
        "workout_date": str(date.today()),
        "week_number": 1,
        "day_number": 1
    }
    create_response = client.post("/v1/workout-sessions/", json=session_data, headers=auth_headers)
    session_id = create_response.json()["id"]

    # Submit initial feedback
    feedback_data = {
        "feedback": [
            {"muscle_group": "Chest", "difficulty": "Easy"},
        ]
    }
    client.post(
        f"/v1/workout-sessions/{session_id}/feedback",
        json=feedback_data,
        headers=auth_headers
    )

    # Re-submit with updated feedback
    updated_feedback = {
        "feedback": [
            {"muscle_group": "Chest", "difficulty": "Too Difficult"},
            {"muscle_group": "Back", "difficulty": "Just Right"},
        ]
    }
    response = client.post(
        f"/v1/workout-sessions/{session_id}/feedback",
        json=updated_feedback,
        headers=auth_headers
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()

    # Should only have the new entries, not the old ones
    assert len(data) == 2
    difficulties = {item["muscle_group"]: item["difficulty"] for item in data}
    assert difficulties["Chest"] == "Too Difficult"
    assert difficulties["Back"] == "Just Right"


def test_submit_feedback_invalid_difficulty(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test that submitting feedback with an invalid difficulty value is rejected."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template_id = mesocycle["workout_templates"][0]["id"]

    # Create session
    session_data = {
        "mesocycle_instance_id": instance["id"],
        "workout_template_id": template_id,
        "workout_date": str(date.today()),
        "week_number": 1,
        "day_number": 1
    }
    create_response = client.post("/v1/workout-sessions/", json=session_data, headers=auth_headers)
    session_id = create_response.json()["id"]

    # Submit feedback with invalid difficulty
    feedback_data = {
        "feedback": [
            {"muscle_group": "Chest", "difficulty": "Super Hard"},
        ]
    }
    response = client.post(
        f"/v1/workout-sessions/{session_id}/feedback",
        json=feedback_data,
        headers=auth_headers
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_submit_feedback_nonexistent_session(client, auth_headers):
    """Test submitting feedback for a workout session that doesn't exist."""
    feedback_data = {
        "feedback": [
            {"muscle_group": "Chest", "difficulty": "Easy"},
        ]
    }
    response = client.post(
        "/v1/workout-sessions/99999/feedback",
        json=feedback_data,
        headers=auth_headers
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_submit_feedback_other_users_session(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test that a user cannot submit feedback for another user's session."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template_id = mesocycle["workout_templates"][0]["id"]

    # Create session as user1
    session_data = {
        "mesocycle_instance_id": instance["id"],
        "workout_template_id": template_id,
        "workout_date": str(date.today()),
        "week_number": 1,
        "day_number": 1
    }
    create_response = client.post("/v1/workout-sessions/", json=session_data, headers=auth_headers)
    session_id = create_response.json()["id"]

    # Create a second user
    user2_response = client.post(
        "/v1/auth/register",
        json={
            "email": "feedback_test2@example.com",
            "password": "testpass123",
            "full_name": "Feedback Tester"
        }
    )
    user2_token = user2_response.json()["access_token"]
    user2_headers = {"Authorization": f"Bearer {user2_token}"}

    # Try to submit feedback as user2 for user1's session
    feedback_data = {
        "feedback": [
            {"muscle_group": "Chest", "difficulty": "Easy"},
        ]
    }
    response = client.post(
        f"/v1/workout-sessions/{session_id}/feedback",
        json=feedback_data,
        headers=user2_headers
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
