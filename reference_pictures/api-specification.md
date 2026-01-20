# API Specification

## Overview

RESTful API for the Workout PWA built with FastAPI.

**Base URL:** `https://api.metricgain.com/v1`
**Local Development:** `http://localhost:8000/v1`

**Authentication:** Bearer JWT tokens in Authorization header

---

## Authentication Endpoints

### POST /auth/register

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe",
      "created_at": "2025-01-19T12:00:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer"
  }
}
```

**Errors:**
- `400`: Email already exists
- `422`: Validation error (weak password, invalid email)

---

### POST /auth/login

Authenticate user and receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer"
  }
}
```

**Errors:**
- `401`: Invalid credentials

---

### POST /auth/refresh

Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer"
  }
}
```

**Errors:**
- `401`: Invalid or expired refresh token

---

### POST /auth/logout

Invalidate refresh token.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Successfully logged out"
  }
}
```

---

## User Endpoints

### GET /users/me

Get current user profile.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "created_at": "2025-01-19T12:00:00Z",
    "timezone": "UTC",
    "preferences": {
      "theme": "dark",
      "units": "lbs"
    }
  }
}
```

---

### PATCH /users/me

Update user profile.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "full_name": "John Smith",
  "timezone": "America/New_York",
  "preferences": {
    "theme": "dark",
    "units": "kg"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Smith",
    "timezone": "America/New_York",
    "preferences": {
      "theme": "dark",
      "units": "kg"
    }
  }
}
```

---

## Mesocycle Endpoints

### GET /mesocycles

List user's mesocycles.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status` (optional): `active`, `completed`, `archived`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Push Pull Legs - Jan 2025",
      "description": "6-day PPL split",
      "duration_weeks": 5,
      "current_week": 2,
      "status": "active",
      "days_per_week": 6,
      "start_date": "2025-01-13",
      "end_date": "2025-02-16",
      "created_at": "2025-01-13T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

---

### GET /mesocycles/{id}

Get mesocycle details with workouts.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Push Pull Legs - Jan 2025",
    "description": "6-day PPL split",
    "duration_weeks": 5,
    "current_week": 2,
    "status": "active",
    "days_per_week": 6,
    "start_date": "2025-01-13",
    "end_date": "2025-02-16",
    "workouts": [
      {
        "id": 1,
        "name": "Push",
        "day_of_week": 0,
        "position_in_week": 1,
        "exercise_count": 8
      },
      {
        "id": 2,
        "name": "Pull",
        "day_of_week": 1,
        "position_in_week": 2,
        "exercise_count": 7
      },
      {
        "id": 3,
        "name": "Legs",
        "day_of_week": 2,
        "position_in_week": 3,
        "exercise_count": 6
      }
    ],
    "created_at": "2025-01-13T10:00:00Z"
  }
}
```

**Errors:**
- `404`: Mesocycle not found
- `403`: User doesn't own this mesocycle

---

### POST /mesocycles

Create a new mesocycle.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "name": "Push Pull Legs - Jan 2025",
  "description": "6-day PPL split",
  "duration_weeks": 5,
  "days_per_week": 6,
  "start_date": "2025-01-13"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Push Pull Legs - Jan 2025",
    "description": "6-day PPL split",
    "duration_weeks": 5,
    "current_week": 1,
    "status": "active",
    "days_per_week": 6,
    "start_date": "2025-01-13",
    "end_date": "2025-02-16",
    "created_at": "2025-01-13T10:00:00Z"
  }
}
```

**Errors:**
- `422`: Validation error (duration not 3-7 weeks)

---

### POST /mesocycles/{id}/copy

Create new mesocycle from a specific week of an existing mesocycle.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "from_week": 3,
  "name": "Push Pull Legs - Feb 2025",
  "start_date": "2025-02-17",
  "duration_weeks": 6
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Push Pull Legs - Feb 2025",
    "duration_weeks": 6,
    "current_week": 1,
    "status": "active",
    "parent_mesocycle_id": 1,
    "copied_from_week": 3,
    "workouts_copied": 3,
    "created_at": "2025-02-17T10:00:00Z"
  }
}
```

**Errors:**
- `404`: Source mesocycle not found
- `422`: Invalid week number

---

### PATCH /mesocycles/{id}

Update mesocycle.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "name": "Updated Name",
  "current_week": 3,
  "status": "completed"
}
```

**Response:** `200 OK`

**Errors:**
- `404`: Mesocycle not found
- `422`: Invalid update (current_week > duration_weeks)

---

### DELETE /mesocycles/{id}

Delete (archive) mesocycle.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `204 No Content`

**Errors:**
- `404`: Mesocycle not found

---

## Workout Endpoints

### GET /workouts/{id}

Get workout details with exercises.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "mesocycle_id": 1,
    "name": "Push",
    "description": "Chest, shoulders, triceps",
    "day_of_week": 0,
    "position_in_week": 1,
    "exercises": [
      {
        "id": 10,
        "exercise_id": 1,
        "exercise_name": "Barbell Bench Press",
        "muscle_group": "chest",
        "exercise_type": "freeweight",
        "position": 1,
        "target_sets": 4,
        "target_reps_min": 8,
        "target_reps_max": 12,
        "target_weight": 185.0,
        "target_rir": 2
      },
      {
        "id": 11,
        "exercise_id": 5,
        "exercise_name": "Incline Dumbbell Press",
        "muscle_group": "chest",
        "exercise_type": "freeweight",
        "position": 2,
        "target_sets": 3,
        "target_reps_min": 10,
        "target_reps_max": 15,
        "target_weight": 60.0,
        "target_rir": 2
      }
    ],
    "created_at": "2025-01-13T10:00:00Z"
  }
}
```

**Errors:**
- `404`: Workout not found

---

### POST /workouts

Create a workout in a mesocycle.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "mesocycle_id": 1,
  "name": "Push",
  "description": "Chest, shoulders, triceps",
  "day_of_week": 0,
  "position_in_week": 1
}
```

**Response:** `201 Created`

---

### PATCH /workouts/{id}

Update workout details.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "name": "Push Day A",
  "day_of_week": 2
}
```

**Response:** `200 OK`

---

### DELETE /workouts/{id}

Delete workout.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `204 No Content`

---

### POST /workouts/{id}/exercises

Add exercise to workout.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "exercise_id": 1,
  "position": 1,
  "target_sets": 4,
  "target_reps_min": 8,
  "target_reps_max": 12,
  "target_weight": 185.0,
  "target_rir": 2
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 10,
    "workout_id": 1,
    "exercise_id": 1,
    "exercise_name": "Barbell Bench Press",
    "position": 1,
    "target_sets": 4,
    "target_reps_min": 8,
    "target_reps_max": 12,
    "target_weight": 185.0,
    "target_rir": 2
  }
}
```

**Errors:**
- `422`: Validation error (max 15 sets)

---

### PATCH /workouts/{workout_id}/exercises/{exercise_id}

Update exercise configuration in workout.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "target_sets": 5,
  "target_weight": 190.0,
  "position": 2
}
```

**Response:** `200 OK`

---

### DELETE /workouts/{workout_id}/exercises/{exercise_id}

Remove exercise from workout.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `204 No Content`

---

## Workout Log Endpoints (Active Workouts)

### GET /mesocycles/{id}/workouts/current

Get the current workout the user should do today.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "mesocycle_id": 1,
    "week_number": 2,
    "day_number": 6,
    "workout": {
      "id": 1,
      "name": "Push",
      "exercises": [
        {
          "exercise_id": 1,
          "name": "Barbell Bench Press",
          "muscle_group": "chest",
          "suggested_sets": [
            {
              "set_number": 1,
              "suggested_weight": 185.0,
              "suggested_reps": 10,
              "target_rir": 2
            },
            {
              "set_number": 2,
              "suggested_weight": 185.0,
              "suggested_reps": 10,
              "target_rir": 2
            }
          ]
        }
      ]
    }
  }
}
```

**Errors:**
- `404`: No workout scheduled for today

---

### POST /workout-logs

Start a new workout session.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "workout_id": 1,
  "mesocycle_id": 1,
  "week_number": 2
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 42,
    "workout_id": 1,
    "mesocycle_id": 1,
    "week_number": 2,
    "status": "in_progress",
    "started_at": "2025-01-19T14:30:00Z"
  }
}
```

---

### GET /workout-logs/{id}

Get workout log with all recorded sets.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 42,
    "workout_id": 1,
    "workout_name": "Push",
    "mesocycle_id": 1,
    "week_number": 2,
    "status": "in_progress",
    "started_at": "2025-01-19T14:30:00Z",
    "sets": [
      {
        "id": 100,
        "exercise_id": 1,
        "exercise_name": "Barbell Bench Press",
        "muscle_group": "chest",
        "set_number": 1,
        "weight": 185.0,
        "reps": 10,
        "performed_at": "2025-01-19T14:32:00Z"
      },
      {
        "id": 101,
        "exercise_id": 1,
        "exercise_name": "Barbell Bench Press",
        "muscle_group": "chest",
        "set_number": 2,
        "weight": 185.0,
        "reps": 9,
        "performed_at": "2025-01-19T14:35:00Z"
      }
    ],
    "feedback": [
      {
        "muscle_group": "chest",
        "soreness_level": 2,
        "pump_level": null,
        "challenge_level": null
      }
    ]
  }
}
```

---

### POST /workout-logs/{id}/sets

Record a completed set.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "exercise_id": 1,
  "set_number": 1,
  "weight": 185.0,
  "reps": 10
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 100,
    "workout_log_id": 42,
    "exercise_id": 1,
    "set_number": 1,
    "weight": 185.0,
    "reps": 10,
    "performed_at": "2025-01-19T14:32:00Z",
    "next_set_suggestion": {
      "weight": 185.0,
      "reps": 10,
      "rir": 2
    }
  }
}
```

**Errors:**
- `422`: Invalid weight or reps

---

### PATCH /workout-logs/{id}/sets/{set_id}

Update a recorded set (in case of mistake).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "weight": 190.0,
  "reps": 8
}
```

**Response:** `200 OK`

---

### DELETE /workout-logs/{id}/sets/{set_id}

Delete a recorded set.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `204 No Content`

---

### POST /workout-logs/{id}/feedback/soreness

Record soreness feedback before starting a muscle group.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "muscle_group": "chest",
  "soreness_level": 2
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "muscle_group": "chest",
    "soreness_level": 2,
    "soreness_recorded_at": "2025-01-19T14:30:00Z"
  }
}
```

**Errors:**
- `422`: Invalid soreness level (must be 0-3)

---

### POST /workout-logs/{id}/feedback/performance

Record pump and challenge feedback after completing a muscle group.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "muscle_group": "chest",
  "pump_level": 3,
  "challenge_level": 2
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "muscle_group": "chest",
    "pump_level": 3,
    "challenge_level": 2,
    "performance_recorded_at": "2025-01-19T15:00:00Z",
    "auto_regulation_adjustment": {
      "current_sets": 4,
      "suggested_next_sets": 5,
      "reason": "High pump and moderate challenge indicates good stimulus"
    }
  }
}
```

**Errors:**
- `422`: Invalid feedback levels (must be 0-3)

---

### POST /workout-logs/{id}/complete

Mark workout as completed.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "notes": "Great workout, felt strong"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 42,
    "status": "completed",
    "started_at": "2025-01-19T14:30:00Z",
    "completed_at": "2025-01-19T15:45:00Z",
    "duration_minutes": 75,
    "total_sets": 24,
    "total_volume": 18450.0,
    "next_workout": {
      "id": 2,
      "name": "Pull",
      "scheduled_date": "2025-01-20"
    }
  }
}
```

---

## Exercise Endpoints

### GET /exercises

List all exercises (system + user's custom).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `muscle_group` (optional): Filter by muscle group
- `exercise_type` (optional): Filter by type
- `search` (optional): Search by name
- `page` (optional): Page number
- `limit` (optional): Results per page (default: 50)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Barbell Bench Press",
      "description": "Flat barbell bench press",
      "muscle_group": "chest",
      "exercise_type": "freeweight",
      "is_system": true,
      "created_by_user": false
    },
    {
      "id": 50,
      "name": "My Custom Cable Fly",
      "description": "High to low cable fly",
      "muscle_group": "chest",
      "exercise_type": "cable",
      "is_system": false,
      "created_by_user": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 150
  }
}
```

---

### GET /exercises/{id}

Get exercise details with usage statistics.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Barbell Bench Press",
    "description": "Flat barbell bench press",
    "muscle_group": "chest",
    "exercise_type": "freeweight",
    "is_system": true,
    "stats": {
      "times_performed": 45,
      "current_max_weight": 225.0,
      "current_max_reps": 12,
      "last_performed": "2025-01-19T15:00:00Z"
    }
  }
}
```

---

### POST /exercises

Create a custom exercise.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "name": "My Custom Cable Fly",
  "description": "High to low cable fly variation",
  "muscle_group": "chest",
  "exercise_type": "cable"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 50,
    "name": "My Custom Cable Fly",
    "description": "High to low cable fly variation",
    "muscle_group": "chest",
    "exercise_type": "cable",
    "is_system": false,
    "created_at": "2025-01-19T16:00:00Z"
  }
}
```

**Errors:**
- `422`: Invalid muscle group or exercise type

---

### PATCH /exercises/{id}

Update custom exercise (can't edit system exercises).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "name": "Updated Exercise Name",
  "description": "Updated description"
}
```

**Response:** `200 OK`

**Errors:**
- `403`: Cannot edit system exercises
- `404`: Exercise not found

---

### DELETE /exercises/{id}

Delete custom exercise (can't delete system exercises).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `204 No Content`

**Errors:**
- `403`: Cannot delete system exercises
- `409`: Exercise is being used in workouts

---

## Template Endpoints

### GET /templates

List all templates (system + user's custom).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `type`: `system` or `user`
- `tags`: Comma-separated tags (e.g., `beginner,hypertrophy`)
- `page`, `limit`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Push Pull Legs - 6 Day",
      "description": "Classic PPL split for intermediate lifters",
      "is_system": true,
      "times_used": 1250,
      "tags": ["intermediate", "hypertrophy", "6-day"],
      "preview": {
        "duration_weeks": 5,
        "days_per_week": 6,
        "workout_count": 3
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 10
  }
}
```

---

### GET /templates/{id}

Get template details with full configuration.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Push Pull Legs - 6 Day",
    "description": "Classic PPL split",
    "is_system": true,
    "times_used": 1250,
    "tags": ["intermediate", "hypertrophy"],
    "config": {
      "duration_weeks": 5,
      "days_per_week": 6,
      "workouts": [
        {
          "name": "Push",
          "day_of_week": 0,
          "exercises": [
            {
              "exercise_id": 1,
              "exercise_name": "Barbell Bench Press",
              "target_sets": 4,
              "target_reps_min": 8,
              "target_reps_max": 12
            }
          ]
        }
      ]
    }
  }
}
```

---

### POST /templates/{id}/apply

Create a new mesocycle from a template.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "name": "My PPL - Jan 2025",
  "start_date": "2025-01-20",
  "customize_weights": {
    "1": 185.0,  // exercise_id: starting_weight
    "5": 60.0
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "mesocycle_id": 3,
    "name": "My PPL - Jan 2025",
    "workouts_created": 3,
    "exercises_added": 21
  }
}
```

---

### POST /templates

Save current mesocycle as template.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "mesocycle_id": 1,
  "name": "My Custom PPL Template",
  "description": "Modified PPL with extra arm work",
  "tags": ["custom", "arms", "hypertrophy"]
}
```

**Response:** `201 Created`

---

## Recommendations Endpoint (Progressive Overload)

### POST /recommendations/next-set

Get AI/algorithm recommendation for next set.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "exercise_id": 1,
  "previous_sets": [
    {"weight": 185.0, "reps": 10},
    {"weight": 185.0, "reps": 9}
  ],
  "week_number": 2,
  "total_weeks": 5,
  "target_rir": 2
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "suggested_weight": 185.0,
    "suggested_reps": 8,
    "target_rir": 2,
    "reasoning": "Maintain weight, reps decreasing as expected with fatigue",
    "algorithm_used": "rule_based_v1"
  }
}
```

---

### POST /recommendations/next-workout

Get recommendations for next workout based on feedback.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "mesocycle_id": 1,
  "workout_id": 1,
  "current_week": 2,
  "feedback": {
    "chest": {
      "soreness_level": 2,
      "pump_level": 3,
      "challenge_level": 2
    }
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "adjustments": [
      {
        "exercise_id": 1,
        "muscle_group": "chest",
        "current_sets": 4,
        "suggested_sets": 5,
        "reasoning": "Good recovery and excellent pump indicates capacity for more volume"
      }
    ],
    "algorithm_used": "auto_regulation_v1"
  }
}
```

---

## Analytics Endpoints (Future)

### GET /analytics/volume

Get volume trends over time.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `muscle_group` (optional)
- `period`: `week`, `month`, `mesocycle`
- `start_date`, `end_date`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "muscle_group": "chest",
    "period": "week",
    "data_points": [
      {
        "week": "2025-W02",
        "total_sets": 24,
        "total_volume": 18450.0,
        "avg_weight": 156.8,
        "avg_reps": 10.2
      }
    ]
  }
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "email",
      "constraint": "must be unique"
    }
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Request validation failed (422)
- `UNAUTHORIZED`: Missing or invalid token (401)
- `FORBIDDEN`: User doesn't have permission (403)
- `NOT_FOUND`: Resource not found (404)
- `CONFLICT`: Resource conflict (409)
- `SERVER_ERROR`: Internal server error (500)

---

## Rate Limiting

- **Authentication endpoints**: 5 requests per minute
- **Write endpoints** (POST/PATCH/DELETE): 60 requests per minute
- **Read endpoints** (GET): 120 requests per minute

**Rate Limit Headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642608000
```

**Rate Limit Exceeded Response:** `429 Too Many Requests`
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retry_after": 30
    }
  }
}
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (1-indexed, default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response Meta:**
```json
{
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## Filtering & Sorting

**Filtering:**
- Use query parameters matching field names
- Example: `?status=active&muscle_group=chest`

**Sorting:**
- Use `sort` parameter
- Prefix with `-` for descending
- Example: `?sort=-created_at` (newest first)

---

## Versioning

API versioned via URL: `/v1/...`

When breaking changes needed, release `/v2/...`

Support both versions for 6 months minimum.

---

## WebSocket Endpoints (Future - Real-time Features)

### WS /ws/workout/{workout_log_id}

Real-time workout updates (if multiple devices).

**Messages:**
```json
{
  "type": "set_completed",
  "data": {
    "set_id": 100,
    "exercise_id": 1,
    "weight": 185.0,
    "reps": 10
  }
}
```

---

## FastAPI Auto-Generated Docs

FastAPI automatically generates interactive API documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

Use these for testing and exploring the API during development.

---

## Request/Response Examples

### Starting and Completing a Workout (Full Flow)

```bash
# 1. Get current workout
GET /v1/mesocycles/1/workouts/current
Authorization: Bearer {token}

# 2. Start workout log
POST /v1/workout-logs
{
  "workout_id": 1,
  "mesocycle_id": 1,
  "week_number": 2
}
# Returns: {"data": {"id": 42, ...}}

# 3. Record soreness before chest exercises
POST /v1/workout-logs/42/feedback/soreness
{
  "muscle_group": "chest",
  "soreness_level": 2
}

# 4. Record sets
POST /v1/workout-logs/42/sets
{
  "exercise_id": 1,
  "set_number": 1,
  "weight": 185.0,
  "reps": 10
}

# Repeat for all sets...

# 5. Record performance feedback after chest
POST /v1/workout-logs/42/feedback/performance
{
  "muscle_group": "chest",
  "pump_level": 3,
  "challenge_level": 2
}

# 6. Complete workout
POST /v1/workout-logs/42/complete
{
  "notes": "Great workout!"
}
```

---

## Security Headers

All responses include:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

---

## CORS Configuration

**Development:**
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 3600
```

**Production:**
```
Access-Control-Allow-Origin: https://app.metricgain.com
```

---

## Next Steps

1. Implement FastAPI routers for each endpoint group
2. Add Pydantic schemas for request/response validation
3. Implement authentication middleware
4. Add rate limiting middleware
5. Write integration tests for all endpoints
6. Generate and review auto-generated OpenAPI docs
7. Create Postman/Insomnia collection for testing
