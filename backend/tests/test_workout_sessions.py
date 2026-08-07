"""Tests for workout session and workout set endpoints."""

import pytest
from fastapi import status


@pytest.fixture
def auth_headers(make_auth_headers):
    """Create a user and return authentication headers."""
    return make_auth_headers("workout_test@example.com", "Workout Tester")


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
                        "weekly_set_increment": 1.0,
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
                        "weekly_set_increment": 0.5,
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


def _session_detail(client, auth_headers, instance_id, week=1, day=1):
    """Fetch one of the sessions an instance pre-creates for the whole block.

    Sessions are only ever created by starting an instance, so tests take the
    one they want rather than creating it.
    """
    listed = client.get(
        f"/v1/workout-sessions/?mesocycle_instance_id={instance_id}",
        headers=auth_headers,
    ).json()
    wanted = next(
        s for s in listed if s["week_number"] == week and s["day_number"] == day
    )
    return client.get(
        f"/v1/workout-sessions/{wanted['id']}", headers=auth_headers
    ).json()


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


def test_pre_created_session_shape(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Starting an instance creates each session ready to train."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance

    data = _session_detail(client, auth_headers, instance["id"], week=1, day=1)

    assert data["mesocycle_instance_id"] == instance["id"]
    assert data["workout_template_id"] == mesocycle["workout_templates"][0]["id"]
    assert data["week_number"] == 1
    assert data["day_number"] == 1
    assert data["status"] == "in_progress"
    # Week 1 set count comes straight from the template plan (target_sets=3)
    assert len(data["workout_sets"]) == 3


def test_pre_created_session_sets_follow_the_plan(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Each generated set belongs to the planned exercise and starts empty."""
    mesocycle = sample_mesocycle_with_workouts
    instance = sample_mesocycle_instance
    template = mesocycle["workout_templates"][0]

    data = _session_detail(client, auth_headers, instance["id"], week=1, day=1)

    sets = data["workout_sets"]
    exercise_template = template["exercises"][0]

    # Set count follows the user's plan: target_sets for week 1
    assert len(sets) == exercise_template["target_sets"]

    for workout_set in sets:
        assert workout_set["exercise_id"] == exercise_template["exercise_id"]
        assert workout_set["weight"] == 0  # Nothing logged yet
        assert workout_set["reps"] == 0
        assert "target_reps" in workout_set


def test_list_workout_sessions(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test listing workout sessions."""
    # The instance fixture pre-creates every session of the block

    # List sessions
    response = client.get("/v1/workout-sessions/", headers=auth_headers)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert isinstance(data, list)
    assert len(data) >= 2


def test_list_workout_sessions_filter_by_mesocycle_instance(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test filtering workout sessions by mesocycle instance."""
    instance = sample_mesocycle_instance

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
    instance = sample_mesocycle_instance

    session_id = _session_detail(client, auth_headers, instance["id"], week=1, day=1)["id"]

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
    instance = sample_mesocycle_instance

    session_id = _session_detail(client, auth_headers, instance["id"], week=1, day=1)["id"]

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


def test_update_workout_set_weight_and_reps(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test updating weight and reps for a workout set."""
    instance = sample_mesocycle_instance

    session = _session_detail(client, auth_headers, instance["id"], week=1, day=1)
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
    instance = sample_mesocycle_instance

    session = _session_detail(client, auth_headers, instance["id"], week=1, day=1)
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
    instance = sample_mesocycle_instance

    session = _session_detail(client, auth_headers, instance["id"], week=1, day=1)
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


def test_access_workout_sessions_without_auth(client):
    """Test that workout session endpoints require authentication."""
    # Try to list sessions
    response = client.get("/v1/workout-sessions/")
    assert response.status_code == status.HTTP_403_FORBIDDEN

    # Try to get session
    response = client.get("/v1/workout-sessions/1")
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_workout_session_isolation_between_users(client, auth_headers, make_auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Test that users cannot access other users' workout sessions."""
    # auth_headers belongs to the first user who owns the mesocycle
    instance = sample_mesocycle_instance

    # Create session as user1
    session_id = _session_detail(client, auth_headers, instance["id"], week=1, day=1)["id"]

    # Create a second user
    user2_headers = make_auth_headers("workout_test2@example.com", "Second Tester")

    # Try to access user1's session as user2
    response = client.get(f"/v1/workout-sessions/{session_id}", headers=user2_headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND


# Plan adherence tests (sets follow target_sets + weekly_set_increment)

def _sessions_for_instance(client, auth_headers, instance_id):
    response = client.get(
        f"/v1/workout-sessions/?mesocycle_instance_id={instance_id}",
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    return response.json()


def test_instance_pre_creates_sessions_with_planned_sets(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Starting an instance creates weeks x days sessions whose set counts follow the plan."""
    instance = sample_mesocycle_instance
    sessions = _sessions_for_instance(client, auth_headers, instance["id"])

    # 4 weeks x 2 workout templates
    assert len(sessions) == 8

    # Day 1: target_sets=3, increment=1.0 -> 3, 4, 5, 6
    # Day 2: target_sets=4, increment=0.5 -> 4, 5, 5, 6 (round half up)
    expected = {1: {1: 3, 2: 4, 3: 5, 4: 6}, 2: {1: 4, 2: 5, 3: 5, 4: 6}}
    for s in sessions:
        assert s["set_count"] == expected[s["day_number"]][s["week_number"]]


def test_final_week_follows_the_same_formula(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """The final week follows the same formula (no forced 1-set / 8-RIR deload)."""
    instance = sample_mesocycle_instance
    sessions = _sessions_for_instance(client, auth_headers, instance["id"])
    final = next(s for s in sessions if s["week_number"] == 4 and s["day_number"] == 1)

    response = client.get(f"/v1/workout-sessions/{final['id']}", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    sets = response.json()["workout_sets"]

    assert len(sets) == 6  # 3 + 1.0 * 3
    # RIR ramps 3 -> 0 across all weeks
    assert all(ws["target_rir"] == 0 for ws in sets)


def test_completing_session_does_not_change_other_sessions(client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance):
    """Completing a workout must not re-adjust any other session's sets."""
    instance = sample_mesocycle_instance
    before = {s["id"]: s["set_count"] for s in _sessions_for_instance(client, auth_headers, instance["id"])}

    first = next(
        s for s in _sessions_for_instance(client, auth_headers, instance["id"])
        if s["week_number"] == 1 and s["day_number"] == 1
    )

    # Add an extra set mid-workout, then complete the session
    detail = client.get(f"/v1/workout-sessions/{first['id']}", headers=auth_headers).json()
    exercise_id = detail["workout_sets"][0]["exercise_id"]
    response = client.post(
        f"/v1/workout-sessions/{first['id']}/exercises/{exercise_id}/sets",
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_201_CREATED

    response = client.patch(
        f"/v1/workout-sessions/{first['id']}",
        json={"status": "completed"},
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK

    after = {s["id"]: s["set_count"] for s in _sessions_for_instance(client, auth_headers, instance["id"])}

    # The completed session gained exactly the one manual set; nothing else moved
    assert after[first["id"]] == before[first["id"]] + 1
    for session_id, count in before.items():
        if session_id != first["id"]:
            assert after[session_id] == count


# Starting an instance seeded from a previous instance

def _make_template(client, auth_headers, name, exercises, weeks=4):
    payload = {
        "name": name,
        "weeks": weeks,
        "days_per_week": 1,
        "workout_templates": [
            {"name": "Day 1", "order_index": 0, "exercises": exercises}
        ],
    }
    response = client.post("/v1/mesocycles/", json=payload, headers=auth_headers)
    assert response.status_code == status.HTTP_201_CREATED
    return response.json()


def _exercise_entry(exercise_id, order_index, target_sets, increment=0.0):
    return {
        "exercise_id": exercise_id,
        "order_index": order_index,
        "target_sets": target_sets,
        "weekly_set_increment": increment,
        "target_reps_min": 8,
        "target_reps_max": 12,
    }


def test_start_from_source_includes_exercises_the_source_never_ran(client, auth_headers):
    """A template exercise missing from the source session still gets week-1 sets."""
    exercises = client.get("/v1/exercises/", headers=auth_headers).json()
    first_exercise, second_exercise = exercises[0]["id"], exercises[1]["id"]

    # Run one instance of a template that only has the first exercise
    old_template = _make_template(
        client, auth_headers, "Old Template", [_exercise_entry(first_exercise, 0, 2)]
    )
    old_instance = client.post(
        "/v1/mesocycle-instances/",
        json={"mesocycle_template_id": old_template["id"]},
        headers=auth_headers,
    ).json()

    source_session = next(
        s for s in _sessions_for_instance(client, auth_headers, old_instance["id"])
        if s["week_number"] == 1
    )
    detail = client.get(f"/v1/workout-sessions/{source_session['id']}", headers=auth_headers).json()
    for workout_set in detail["workout_sets"]:
        client.patch(
            f"/v1/workout-sessions/{source_session['id']}/sets/{workout_set['id']}",
            json={"weight": 100, "reps": 10},
            headers=auth_headers,
        )
    client.patch(
        f"/v1/workout-sessions/{source_session['id']}",
        json={"status": "completed"},
        headers=auth_headers,
    )
    client.patch(
        f"/v1/mesocycle-instances/{old_instance['id']}",
        json={"status": "completed"},
        headers=auth_headers,
    )

    # The new template adds a second exercise the source instance never ran
    new_template = _make_template(
        client,
        auth_headers,
        "New Template",
        [_exercise_entry(first_exercise, 0, 2), _exercise_entry(second_exercise, 1, 3)],
    )
    response = client.post(
        "/v1/mesocycle-instances/",
        json={
            "mesocycle_template_id": new_template["id"],
            "source_instance_id": old_instance["id"],
            "source_week_number": 1,
        },
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_201_CREATED
    new_instance = response.json()

    week_one = next(
        s for s in _sessions_for_instance(client, auth_headers, new_instance["id"])
        if s["week_number"] == 1
    )
    sets = client.get(f"/v1/workout-sessions/{week_one['id']}", headers=auth_headers).json()["workout_sets"]

    counts = {}
    for workout_set in sets:
        counts[workout_set["exercise_id"]] = counts.get(workout_set["exercise_id"], 0) + 1

    # Both planned exercises appear at their planned set counts
    assert counts.get(first_exercise) == 2
    assert counts.get(second_exercise) == 3

    # The exercise the source ran progresses off what was actually lifted, and
    # every one of its sets gets the same target — the sets past the source's
    # count used to fall through to the history lookup and progress on their own
    seeded = [s for s in sets if s["exercise_id"] == first_exercise]
    assert {s["target_weight"] for s in seeded} == {105.0}
    # The new exercise has no history to seed from, so it carries no weight target
    fresh = [s for s in sets if s["exercise_id"] == second_exercise]
    assert all(s["target_weight"] is None for s in fresh)


# Guards on session and set mutation

def test_cannot_modify_another_users_session(
    client, auth_headers, make_auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance
):
    """Another user must not be able to read or write someone else's workout."""
    session = _session_detail(client, auth_headers, sample_mesocycle_instance["id"], week=1, day=1)
    set_id = session["workout_sets"][0]["id"]
    exercise_id = session["workout_sets"][0]["exercise_id"]

    intruder = make_auth_headers("session_intruder@example.com", "Intruder")

    assert client.get(
        f"/v1/workout-sessions/{session['id']}", headers=intruder
    ).status_code == status.HTTP_404_NOT_FOUND

    assert client.patch(
        f"/v1/workout-sessions/{session['id']}/sets/{set_id}",
        json={"weight": 999, "reps": 99},
        headers=intruder,
    ).status_code == status.HTTP_404_NOT_FOUND

    assert client.post(
        f"/v1/workout-sessions/{session['id']}/exercises/{exercise_id}/sets",
        headers=intruder,
    ).status_code == status.HTTP_404_NOT_FOUND

    assert client.patch(
        f"/v1/workout-sessions/{session['id']}",
        json={"status": "completed"},
        headers=intruder,
    ).status_code == status.HTTP_404_NOT_FOUND

    # The owner's session is untouched
    unchanged = _session_detail(client, auth_headers, sample_mesocycle_instance["id"], week=1, day=1)
    assert unchanged["status"] == "in_progress"
    assert len(unchanged["workout_sets"]) == len(session["workout_sets"])
    assert all(s["weight"] == 0 for s in unchanged["workout_sets"])


def test_swapping_onto_an_exercise_already_present_is_rejected(
    client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance
):
    """Merging two exercises into one would give it two runs of set numbers."""
    exercises = client.get("/v1/exercises/", headers=auth_headers).json()
    session = next(
        s for s in _sessions_for_instance(client, auth_headers, sample_mesocycle_instance["id"])
        if s["week_number"] == 1 and s["day_number"] == 1
    )
    detail = client.get(f"/v1/workout-sessions/{session['id']}", headers=auth_headers).json()
    existing_exercise = detail["workout_sets"][0]["exercise_id"]
    other_exercise = next(e["id"] for e in exercises if e["id"] != existing_exercise)

    added = client.post(
        f"/v1/workout-sessions/{session['id']}/exercises/add",
        json={"exercise_id": other_exercise},
        headers=auth_headers,
    )
    assert added.status_code == status.HTTP_200_OK

    response = client.post(
        f"/v1/workout-sessions/{session['id']}/exercises/swap",
        json={"old_exercise_id": other_exercise, "new_exercise_id": existing_exercise},
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST

    # Set numbering is intact: each exercise still has its own 1..n run
    after = client.get(f"/v1/workout-sessions/{session['id']}", headers=auth_headers).json()
    per_exercise = {}
    for workout_set in after["workout_sets"]:
        per_exercise.setdefault(workout_set["exercise_id"], []).append(workout_set["set_number"])
    for numbers in per_exercise.values():
        assert sorted(numbers) == list(range(1, len(numbers) + 1))


def test_adding_a_set_for_an_unknown_exercise_is_rejected(
    client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance
):
    """An exercise id not in the session must 404 rather than create orphan sets.

    (The old generic POST /{id}/sets route this once covered was removed; the
    per-exercise route is the only way to add sets now.)
    """
    session = next(
        s for s in _sessions_for_instance(client, auth_headers, sample_mesocycle_instance["id"])
        if s["week_number"] == 1 and s["day_number"] == 1
    )
    response = client.post(
        f"/v1/workout-sessions/{session['id']}/exercises/999999/sets",
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


# Weight targets across weeks

def _complete_session(client, auth_headers, session, weight, reps=8):
    for workout_set in session["workout_sets"]:
        client.patch(
            f"/v1/workout-sessions/{session['id']}/sets/{workout_set['id']}",
            json={"weight": weight, "reps": reps},
            headers=auth_headers,
        )
    client.patch(
        f"/v1/workout-sessions/{session['id']}",
        json={"status": "completed"},
        headers=auth_headers,
    )


def _instance_with_history(client, auth_headers, exercise_id, history_weight=100):
    """Log a completed block at history_weight, then start a fresh one.

    The fresh block's sets are seeded from that history at instance creation,
    which is what makes a stale target possible later.
    """
    old_template = _make_template(
        client, auth_headers, "History Block", [_exercise_entry(exercise_id, 0, 2)]
    )
    old_instance = client.post(
        "/v1/mesocycle-instances/",
        json={"mesocycle_template_id": old_template["id"]},
        headers=auth_headers,
    ).json()
    _complete_session(
        client, auth_headers,
        _session_detail(client, auth_headers, old_instance["id"], week=1, day=1),
        weight=history_weight,
    )
    client.patch(
        f"/v1/mesocycle-instances/{old_instance['id']}",
        json={"status": "completed"},
        headers=auth_headers,
    )

    template = _make_template(
        client, auth_headers, "Current Block",
        [_exercise_entry(exercise_id, 0, 2, increment=0.5)],
    )
    return client.post(
        "/v1/mesocycle-instances/",
        json={"mesocycle_template_id": template["id"]},
        headers=auth_headers,
    ).json()


def test_sets_added_by_the_weekly_increment_get_a_current_target(client, auth_headers, sample_exercise_id):
    """The extra set a weekly increment adds must not keep a stale light target.

    Week 2 goes 2 -> 3 sets. The third set has no counterpart in week 1, so it
    used to keep the target seeded from older history while its siblings
    progressed off what was actually lifted.
    """
    instance = _instance_with_history(client, auth_headers, sample_exercise_id, history_weight=100)

    week_one = _session_detail(client, auth_headers, instance["id"], week=1, day=1)
    _complete_session(client, auth_headers, week_one, weight=200)

    week_two = _session_detail(client, auth_headers, instance["id"], week=2, day=1)

    assert len(week_two["workout_sets"]) == 3  # 2 + 0.5/week, rounded up
    targets = {s["target_weight"] for s in week_two["workout_sets"]}
    assert targets == {205}, f"expected every set to progress off 200, got {targets}"


def test_an_untouched_week_does_not_freeze_later_targets(client, auth_headers, sample_exercise_id):
    """Skipping a week must not pin later weeks to the weight they were seeded with."""
    instance = _instance_with_history(client, auth_headers, sample_exercise_id, history_weight=100)

    week_one = _session_detail(client, auth_headers, instance["id"], week=1, day=1)
    _complete_session(client, auth_headers, week_one, weight=200)

    # Week 2 is left untouched; week 3 must still build on week 1's 200
    week_three = _session_detail(client, auth_headers, instance["id"], week=3, day=1)
    targets = {s["target_weight"] for s in week_three["workout_sets"]}
    assert targets == {205}, f"expected targets off the last completed week, got {targets}"


def test_cannot_pull_another_users_custom_exercise_into_a_session(
    client, auth_headers, make_auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance
):
    """Add and swap must refuse someone else's private lift, not echo it back.

    GET /v1/exercises/{id} already refuses, so without the same check here the
    name and description of a private exercise leaked in the session response.
    """
    stranger = make_auth_headers("exercise_owner@example.com", "Exercise Owner")
    private = client.post(
        "/v1/exercises/",
        json={
            "name": "Private Rehab Protocol",
            "muscle_group": "Back",
            "equipment": "Cable",
        },
        headers=stranger,
    )
    assert private.status_code == status.HTTP_201_CREATED
    private_id = private.json()["id"]

    session = _session_detail(client, auth_headers, sample_mesocycle_instance["id"], week=1, day=1)
    mine = session["workout_sets"][0]["exercise_id"]

    assert client.post(
        f"/v1/workout-sessions/{session['id']}/exercises/add",
        json={"exercise_id": private_id},
        headers=auth_headers,
    ).status_code == status.HTTP_403_FORBIDDEN

    assert client.post(
        f"/v1/workout-sessions/{session['id']}/exercises/swap",
        json={"old_exercise_id": mine, "new_exercise_id": private_id},
        headers=auth_headers,
    ).status_code == status.HTTP_403_FORBIDDEN

    after = _session_detail(client, auth_headers, sample_mesocycle_instance["id"], week=1, day=1)
    assert private_id not in {s["exercise_id"] for s in after["workout_sets"]}


def test_explicit_null_in_a_partial_update_is_ignored(
    client, auth_headers, sample_mesocycle_with_workouts, sample_mesocycle_instance
):
    """A null for a NOT NULL column must not become an IntegrityError 500."""
    session = _session_detail(client, auth_headers, sample_mesocycle_instance["id"], week=1, day=1)
    set_id = session["workout_sets"][0]["id"]

    client.patch(
        f"/v1/workout-sessions/{session['id']}/sets/{set_id}",
        json={"weight": 135, "reps": 8},
        headers=auth_headers,
    )

    for body in ({"weight": None}, {"reps": None}, {"skipped": None}, {"order_index": None}):
        response = client.patch(
            f"/v1/workout-sessions/{session['id']}/sets/{set_id}",
            json=body,
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK, body
        assert response.json()["weight"] == 135
        assert response.json()["reps"] == 8

    # A nullable column is still clearable
    assert client.patch(
        f"/v1/workout-sessions/{session['id']}/sets/{set_id}",
        json={"rir": None},
        headers=auth_headers,
    ).json()["rir"] is None

    assert client.patch(
        f"/v1/workout-sessions/{session['id']}",
        json={"status": None},
        headers=auth_headers,
    ).json()["status"] == "in_progress"
