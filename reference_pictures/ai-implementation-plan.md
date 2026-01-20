# AI Implementation Plan

## Overview

This is MY implementation plan - the exact steps I (Claude) will take to build the Workout PWA. Each phase includes specific files I'll create, code I'll write, tests I'll run, and verification steps I'll perform.

**Working Directory:** `/Users/nbrawand/projects/personal/metric_gain/`

---

## Execution Principles

1. **Create all files**: I will use Write/Edit tools to create every file
2. **Test after each feature**: I will run tests using Bash tool after every feature
3. **Verify before proceeding**: I will check that tests pass before moving to next phase
4. **Checkpoint with user**: I will ask user to confirm before major phase transitions
5. **Fix broken tests**: If tests fail, I will debug and fix before proceeding

---

## Phase 0: Project Setup

### Goal
Create monorepo structure with working backend and frontend servers.

### Tasks I Will Perform

#### 0.1 - Create Directory Structure
**Files I'll create:**
```
metric_gain/
├── README.md
├── .gitignore
├── docker-compose.yml
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   └── __init__.py
│   │   ├── schemas/
│   │   │   └── __init__.py
│   │   ├── routers/
│   │   │   └── __init__.py
│   │   ├── services/
│   │   │   └── __init__.py
│   │   └── utils/
│   │       └── __init__.py
│   └── tests/
│       ├── __init__.py
│       └── conftest.py
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    ├── .env.example
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── api/
        ├── components/
        ├── hooks/
        ├── pages/
        ├── types/
        └── utils/
```

**Actions:**
1. Create all directories
2. Write README.md with setup instructions
3. Write .gitignore for Python and Node
4. Write docker-compose.yml for PostgreSQL

**Tests I'll run:**
```bash
# Verify directory structure
ls -R metric_gain/

# Verify files exist
cat metric_gain/README.md
cat metric_gain/.gitignore
cat metric_gain/docker-compose.yml
```

**Success criteria:**
- All directories exist
- README contains setup instructions
- docker-compose.yml is valid YAML

---

#### 0.2 - Setup Backend (FastAPI)
**Files I'll create:**
1. `backend/requirements.txt` - All Python dependencies
2. `backend/app/main.py` - FastAPI app with hello world endpoint
3. `backend/app/config.py` - Settings using Pydantic
4. `backend/app/database.py` - SQLAlchemy setup
5. `backend/.env.example` - Environment variables template

**Tests I'll run:**
```bash
cd metric_gain/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn app.main:app --reload &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Test health endpoint
curl http://localhost:8000/health

# Test docs
curl http://localhost:8000/docs

# Kill server
kill $SERVER_PID
```

**Success criteria:**
- Server starts without errors
- GET /health returns 200 OK
- /docs shows Swagger UI
- No import errors

---

#### 0.3 - Setup Frontend (React + TypeScript)
**Files I'll create:**
1. `frontend/package.json` - Dependencies and scripts
2. `frontend/tsconfig.json` - TypeScript config
3. `frontend/vite.config.ts` - Vite configuration
4. `frontend/tailwind.config.js` - Tailwind CSS config
5. `frontend/index.html` - HTML entry point
6. `frontend/src/main.tsx` - React entry point
7. `frontend/src/App.tsx` - Root component
8. `frontend/.env.example` - Environment variables

**Tests I'll run:**
```bash
cd metric_gain/frontend

# Install dependencies
npm install

# Run linter
npm run lint

# Build for production (test)
npm run build

# Start dev server
npm run dev &
DEV_PID=$!

# Wait for server
sleep 5

# Test frontend loads
curl http://localhost:5173

# Kill dev server
kill $DEV_PID
```

**Success criteria:**
- npm install completes without errors
- Build succeeds
- Dev server starts on port 5173
- No TypeScript errors
- Page loads in browser

---

#### 0.4 - Setup Database (PostgreSQL)
**Files I'll create:**
1. `docker-compose.yml` - PostgreSQL container
2. `backend/alembic.ini` - Alembic configuration
3. `backend/alembic/env.py` - Alembic environment
4. `backend/alembic/versions/` - Migrations directory

**Tests I'll run:**
```bash
cd metric_gain

# Start PostgreSQL
docker-compose up -d

# Wait for postgres to be ready
sleep 5

# Test connection
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "SELECT 1;"

# Initialize Alembic
cd backend
alembic init alembic

# Test alembic
alembic current
```

**Success criteria:**
- PostgreSQL container starts
- Can connect to database
- Alembic initialized
- No connection errors

---

### Phase 0 Checkpoint
**Before proceeding to Phase 1, I will:**
1. Verify all services start (backend, frontend, database)
2. Run all Phase 0 tests
3. Commit code to git (if repo exists)
4. Ask user: "Phase 0 complete. Backend, frontend, and database are running. Ready to proceed to Phase 1 (Authentication)?"

---

## Phase 1: Core Authentication

### Goal
Implement complete authentication system with JWT tokens.

### Tasks I Will Perform

#### 1.1 - Database Schema for Users
**Files I'll create:**
1. `backend/app/models/user.py` - SQLAlchemy User model
2. `backend/alembic/versions/001_create_users_table.py` - Migration

**Code I'll write:**
```python
# user.py
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # ... etc
```

**Tests I'll run:**
```bash
cd metric_gain/backend

# Run migration
alembic upgrade head

# Verify table exists
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "\d users"

# Test table structure
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';"
```

**Success criteria:**
- Migration runs without errors
- Users table exists
- All columns present
- Indexes created

---

#### 1.2 - Authentication Utils
**Files I'll create:**
1. `backend/app/utils/auth.py` - Password hashing and JWT functions

**Code I'll write:**
```python
def hash_password(password: str) -> str
def verify_password(plain: str, hashed: str) -> bool
def create_access_token(data: dict) -> str
def decode_access_token(token: str) -> dict
def get_current_user(token: str) -> User
```

**Tests I'll run:**
```bash
# Unit tests
cd metric_gain/backend
pytest tests/test_auth_utils.py -v

# Test cases I'll write:
# - test_hash_password_creates_different_hash_each_time
# - test_verify_password_correct_password_returns_true
# - test_verify_password_wrong_password_returns_false
# - test_create_access_token_returns_valid_jwt
# - test_decode_access_token_valid_token
# - test_decode_access_token_expired_token_raises_error
```

**Success criteria:**
- All 6+ auth util tests pass
- Password hashing works
- JWT tokens can be created and decoded

---

#### 1.3 - User Schemas
**Files I'll create:**
1. `backend/app/schemas/user.py` - Pydantic schemas

**Code I'll write:**
```python
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str | None
    created_at: datetime

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
```

**Tests I'll run:**
```bash
pytest tests/test_user_schemas.py -v

# Test cases:
# - test_user_create_validates_email
# - test_user_create_requires_password
# - test_user_response_excludes_password
# - test_token_has_default_bearer_type
```

**Success criteria:**
- Schema validation works
- Email validation works
- Password not exposed in response

---

#### 1.4 - Auth Endpoints
**Files I'll create:**
1. `backend/app/routers/auth.py` - Auth endpoints

**Endpoints I'll implement:**
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- GET /users/me

**Tests I'll run:**
```bash
# Start server
uvicorn app.main:app --reload &
SERVER_PID=$!
sleep 3

# Test registration
curl -X POST http://localhost:8000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","full_name":"Test User"}' \
  | jq .

# Test login
TOKEN=$(curl -X POST http://localhost:8000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}' \
  | jq -r .data.access_token)

echo "Token: $TOKEN"

# Test protected endpoint
curl http://localhost:8000/v1/users/me \
  -H "Authorization: Bearer $TOKEN" \
  | jq .

# Test invalid token
curl http://localhost:8000/v1/users/me \
  -H "Authorization: Bearer invalid_token"

kill $SERVER_PID
```

**Integration tests I'll run:**
```bash
pytest tests/test_auth_endpoints.py -v

# Test cases:
# - test_register_creates_user
# - test_register_duplicate_email_fails
# - test_register_weak_password_fails
# - test_login_correct_credentials
# - test_login_wrong_password_fails
# - test_login_nonexistent_user_fails
# - test_get_current_user_with_valid_token
# - test_get_current_user_with_invalid_token
# - test_refresh_token_works
```

**Success criteria:**
- All 9+ auth endpoint tests pass
- Can register new user
- Can login with correct credentials
- Cannot login with wrong credentials
- Protected endpoints require valid token

---

#### 1.5 - Frontend Auth (API Client)
**Files I'll create:**
1. `frontend/src/api/client.ts` - Axios client with interceptors
2. `frontend/src/api/auth.ts` - Auth API functions
3. `frontend/src/types/user.ts` - TypeScript types
4. `frontend/src/stores/authStore.ts` - Zustand auth store
5. `frontend/src/utils/tokenStorage.ts` - Token management

**Tests I'll run:**
```bash
cd metric_gain/frontend

# TypeScript compilation test
npm run build

# Test API functions manually
npm run dev &
sleep 5

# Open browser console and test
# (I'll provide test script for user to run in console)

# Test token storage
node -e "
const { setTokens, getAccessToken, clearTokens } = require('./src/utils/tokenStorage');
setTokens('access123', 'refresh123');
console.log('Access token:', getAccessToken());
clearTokens();
console.log('After clear:', getAccessToken());
"
```

**Success criteria:**
- TypeScript compiles without errors
- API client configured with base URL
- Token storage works
- Auth store manages state correctly

---

#### 1.6 - Frontend Auth UI
**Files I'll create:**
1. `frontend/src/pages/Login.tsx`
2. `frontend/src/pages/Register.tsx`
3. `frontend/src/components/ProtectedRoute.tsx`
4. `frontend/src/App.tsx` - Updated with routes

**Tests I'll run:**
```bash
cd metric_gain/frontend
npm run dev &
sleep 5

# Manual UI tests (I'll ask user to verify):
# 1. Navigate to http://localhost:5173/login
# 2. Try to login (should show error if wrong credentials)
# 3. Register new account
# 4. Login with new account
# 5. Verify redirect to home page
# 6. Verify token stored in localStorage
# 7. Refresh page (should stay logged in)
# 8. Logout (should clear token and redirect)
```

**Success criteria:**
- Login page renders
- Register page renders
- Can register and login via UI
- Protected routes redirect to login if not authenticated
- Matches dark theme from reference images

---

### Phase 1 Checkpoint
**Tests I'll run for complete Phase 1:**
```bash
# Backend tests
cd metric_gain/backend
pytest tests/ -v --cov=app

# Integration test: Complete auth flow
curl -X POST .../register
curl -X POST .../login
curl GET .../users/me with token

# Frontend tests
cd metric_gain/frontend
npm run build
npm run lint
```

**Before proceeding to Phase 2, I will:**
1. Verify all Phase 1 tests pass
2. Verify end-to-end auth flow works (register → login → access protected route)
3. Ask user: "Phase 1 complete. Users can register, login, and access protected routes. Ready for Phase 2 (Exercise Library)?"

---

## Phase 2: Exercise Library

### Goal
Pre-loaded exercise database with ability to create custom exercises.

### Tasks I Will Perform

#### 2.1 - Exercise Model & Migration
**Files I'll create:**
1. `backend/app/models/exercise.py`
2. `backend/alembic/versions/002_create_exercises_table.py`
3. `backend/app/seeds/exercises.py` - Seed 50+ exercises

**Tests I'll run:**
```bash
# Run migration
alembic upgrade head

# Verify table
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "\d exercises"

# Run seed
python -m app.seeds.exercises

# Verify seeded data
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "SELECT COUNT(*) FROM exercises WHERE is_system = true;"

# Verify muscle groups
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "SELECT DISTINCT muscle_group FROM exercises;"

# Should return: chest, back, legs, shoulders, delts, bis, tris, calfs, abs
```

**Success criteria:**
- Exercises table exists with all columns
- 50+ system exercises seeded
- All 9 muscle groups represented
- Constraints working (muscle_group enum, exercise_type enum)

---

#### 2.2 - Exercise Endpoints
**Files I'll create:**
1. `backend/app/schemas/exercise.py`
2. `backend/app/routers/exercises.py`

**Endpoints I'll implement:**
- GET /exercises (with filtering by muscle_group, exercise_type, search)
- GET /exercises/{id}
- POST /exercises (create custom)
- PATCH /exercises/{id}
- DELETE /exercises/{id}

**Tests I'll run:**
```bash
# Get all exercises
curl "http://localhost:8000/v1/exercises" | jq '.data | length'

# Filter by muscle group
curl "http://localhost:8000/v1/exercises?muscle_group=chest" | jq '.data[].muscle_group' | uniq

# Search
curl "http://localhost:8000/v1/exercises?search=bench" | jq '.data[].name'

# Get single exercise
curl "http://localhost:8000/v1/exercises/1" | jq .

# Create custom exercise (requires auth)
TOKEN=$(curl -X POST .../login | jq -r .data.access_token)
curl -X POST "http://localhost:8000/v1/exercises" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Custom Exercise","muscle_group":"chest","exercise_type":"cable"}' \
  | jq .

# Try to edit system exercise (should fail)
curl -X PATCH "http://localhost:8000/v1/exercises/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Hacked"}' \
  | jq .

# Should return 403 Forbidden
```

**Unit tests I'll run:**
```bash
pytest tests/test_exercise_endpoints.py -v

# Test cases:
# - test_get_exercises_returns_all_system_exercises
# - test_filter_by_muscle_group
# - test_filter_by_exercise_type
# - test_search_by_name
# - test_create_custom_exercise_authenticated
# - test_create_exercise_unauthenticated_fails
# - test_cannot_edit_system_exercise
# - test_can_edit_own_custom_exercise
# - test_cannot_delete_system_exercise
# - test_can_delete_own_custom_exercise
```

**Success criteria:**
- All 10+ exercise endpoint tests pass
- Filtering works correctly
- Can create custom exercises
- Cannot modify system exercises
- Authorization enforced

---

#### 2.3 - Exercise Frontend
**Files I'll create:**
1. `frontend/src/api/exercises.ts`
2. `frontend/src/types/exercise.ts`
3. `frontend/src/pages/Exercises.tsx`
4. `frontend/src/components/ExerciseCard.tsx`
5. `frontend/src/components/ExerciseForm.tsx`

**Tests I'll run:**
```bash
# TypeScript compilation
npm run build

# Visual tests (I'll ask user to verify):
# 1. Navigate to /exercises
# 2. See list of all exercises
# 3. Filter by muscle group (dropdown or tabs)
# 4. Search for "bench press"
# 5. Click "Add Custom Exercise"
# 6. Fill form and submit
# 7. See new exercise in list
# 8. Try to edit system exercise (should be disabled)
# 9. Edit custom exercise
# 10. Delete custom exercise
```

**Success criteria:**
- Exercise list displays all system exercises
- Filtering by muscle group works
- Search works
- Can create/edit/delete custom exercises
- UI matches dark theme

---

### Phase 2 Checkpoint
**Complete tests:**
```bash
# Backend
pytest tests/test_exercise* -v

# Integration: Full exercise CRUD flow
curl GET /exercises
curl POST /exercises (authenticated)
curl PATCH /exercises/{custom_id}
curl DELETE /exercises/{custom_id}

# Frontend
npm run build
npm run lint
```

**Before Phase 3, I will ask:**
"Phase 2 complete. Exercise library working with 50+ exercises. Ready for Phase 3 (Mesocycles & Workouts)?"

---

## Phase 3: Mesocycles & Workouts

### Goal
Users can create mesocycles with workouts containing exercises.

### Tasks I Will Perform

#### 3.1 - Database Models
**Files I'll create:**
1. `backend/app/models/mesocycle.py`
2. `backend/app/models/workout.py`
3. `backend/app/models/workout_exercise.py`
4. `backend/alembic/versions/003_create_mesocycle_tables.py`

**Tests I'll run:**
```bash
# Run migration
alembic upgrade head

# Verify tables
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "\dt"

# Should show: mesocycles, workouts, workout_exercises

# Verify relationships
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "\d mesocycles"
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "\d workouts"
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "\d workout_exercises"

# Test constraints
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "
  INSERT INTO mesocycles (user_id, name, duration_weeks, days_per_week)
  VALUES (1, 'Test', 8, 6);
"
# Should fail (duration must be 3-7)

docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "
  INSERT INTO workout_exercises (workout_id, exercise_id, position, target_sets)
  VALUES (1, 1, 1, 20);
"
# Should fail (max 15 sets)
```

**Success criteria:**
- All 3 tables created
- Foreign keys working
- Constraints enforced (duration 3-7, max 15 sets)
- Cascading deletes working

---

#### 3.2 - Mesocycle Endpoints
**Files I'll create:**
1. `backend/app/schemas/mesocycle.py`
2. `backend/app/routers/mesocycles.py`
3. `backend/app/services/mesocycle_manager.py`

**Endpoints:**
- GET /mesocycles
- GET /mesocycles/{id}
- POST /mesocycles
- PATCH /mesocycles/{id}
- DELETE /mesocycles/{id}

**Tests I'll run:**
```bash
TOKEN=$(curl -X POST .../login | jq -r .data.access_token)

# Create mesocycle
MESO_ID=$(curl -X POST "http://localhost:8000/v1/mesocycles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test PPL",
    "description": "Push Pull Legs",
    "duration_weeks": 5,
    "days_per_week": 6,
    "start_date": "2025-01-20"
  }' | jq -r .data.id)

echo "Created mesocycle: $MESO_ID"

# Get mesocycle
curl "http://localhost:8000/v1/mesocycles/$MESO_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .

# List mesocycles
curl "http://localhost:8000/v1/mesocycles" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Try invalid duration
curl -X POST "http://localhost:8000/v1/mesocycles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Invalid","duration_weeks":8,"days_per_week":6}' | jq .
# Should return 422 validation error
```

**Unit tests:**
```bash
pytest tests/test_mesocycle_endpoints.py -v

# Test cases:
# - test_create_mesocycle_valid
# - test_create_mesocycle_invalid_duration_fails
# - test_get_mesocycles_returns_only_user_mesocycles
# - test_cannot_access_other_user_mesocycle
# - test_update_mesocycle
# - test_delete_mesocycle
# - test_mesocycle_calculates_end_date_correctly
```

**Success criteria:**
- All mesocycle CRUD operations work
- Validation enforced
- Users can only see their own mesocycles
- End date calculated automatically

---

#### 3.3 - Workout Endpoints
**Files I'll create:**
1. `backend/app/schemas/workout.py`
2. `backend/app/routers/workouts.py`

**Endpoints:**
- GET /workouts/{id}
- POST /workouts
- PATCH /workouts/{id}
- DELETE /workouts/{id}
- POST /workouts/{id}/exercises
- PATCH /workouts/{workout_id}/exercises/{exercise_id}
- DELETE /workouts/{workout_id}/exercises/{exercise_id}

**Tests I'll run:**
```bash
TOKEN=$(curl -X POST .../login | jq -r .data.access_token)
MESO_ID=1  # from previous test

# Create workout
WORKOUT_ID=$(curl -X POST "http://localhost:8000/v1/workouts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mesocycle_id": '$MESO_ID',
    "name": "Push",
    "day_of_week": 0,
    "position_in_week": 1
  }' | jq -r .data.id)

# Add exercise to workout
curl -X POST "http://localhost:8000/v1/workouts/$WORKOUT_ID/exercises" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exercise_id": 1,
    "position": 1,
    "target_sets": 4,
    "target_reps_min": 8,
    "target_reps_max": 12,
    "target_weight": 185.0
  }' | jq .

# Add more exercises...

# Get workout with exercises
curl "http://localhost:8000/v1/workouts/$WORKOUT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Should show workout with exercises array

# Test max 15 sets constraint
curl -X POST "http://localhost:8000/v1/workouts/$WORKOUT_ID/exercises" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"exercise_id": 2, "position": 2, "target_sets": 20}' | jq .
# Should fail validation
```

**Unit tests:**
```bash
pytest tests/test_workout_endpoints.py -v

# Test cases:
# - test_create_workout_in_mesocycle
# - test_add_exercise_to_workout
# - test_add_exercise_with_more_than_15_sets_fails
# - test_workout_exercises_ordered_by_position
# - test_update_exercise_configuration
# - test_remove_exercise_from_workout
# - test_cannot_duplicate_exercise_in_workout
```

**Success criteria:**
- Can create workouts in mesocycle
- Can add exercises to workouts
- Max 15 sets enforced
- Exercise configuration stored correctly

---

#### 3.4 - Mesocycle Frontend
**Files I'll create:**
1. `frontend/src/api/mesocycles.ts`
2. `frontend/src/types/mesocycle.ts`
3. `frontend/src/pages/Mesocycles.tsx` (list view from reference)
4. `frontend/src/components/MesocycleCard.tsx`
5. `frontend/src/components/MesocycleForm.tsx`

**Tests I'll run:**
```bash
npm run build
npm run dev

# Visual tests:
# 1. Navigate to /mesocycles
# 2. Should match reference image (mesocycle_bottom_button_screen.png)
# 3. Click "+ Create Mesocycle"
# 4. Fill form (name, duration 3-7 weeks, days per week, start date)
# 5. Submit
# 6. See new mesocycle in list with "CURRENT" badge
# 7. Verify shows "X WEEKS - Y DAYS/WEEK"
```

**Success criteria:**
- Mesocycle list matches reference design
- Can create mesocycle via form
- Validation works (3-7 weeks)
- Current mesocycle highlighted

---

#### 3.5 - Workout Builder Frontend
**Files I'll create:**
1. `frontend/src/api/workouts.ts`
2. `frontend/src/types/workout.ts`
3. `frontend/src/pages/WorkoutBuilder.tsx`
4. `frontend/src/components/ExerciseSelector.tsx`
5. `frontend/src/components/WorkoutExerciseRow.tsx`

**Tests I'll run:**
```bash
# Visual tests:
# 1. Click on mesocycle from list
# 2. Click "Add Workout"
# 3. Enter workout name (e.g., "Push")
# 4. Click "Add Exercise"
# 5. Select exercise from list
# 6. Configure sets (max 15), reps range, starting weight
# 7. Add multiple exercises
# 8. Drag to reorder (optional for MVP)
# 9. Save workout
# 10. Verify workout shows in mesocycle detail
```

**Success criteria:**
- Can build complete workout
- Exercise selector works
- Can configure sets/reps/weight
- Validation enforced (max 15 sets)

---

### Phase 3 Checkpoint
```bash
# Backend tests
pytest tests/test_mesocycle* tests/test_workout* -v

# Integration: Create complete mesocycle with workouts
# 1. Create mesocycle
# 2. Create 3 workouts (Push, Pull, Legs)
# 3. Add 5-8 exercises to each workout
# 4. Verify all data stored correctly

# Frontend
npm run build
npm run lint
```

**Before Phase 4:**
"Phase 3 complete. Users can create mesocycles with workouts. Ready for Phase 4 (Workout Logging)?"

---

## Phase 4: Workout Logging

### Goal
Users can perform workouts and log sets in real-time.

### Tasks I Will Perform

#### 4.1 - Database Models
**Files I'll create:**
1. `backend/app/models/workout_log.py`
2. `backend/app/models/set.py`
3. `backend/alembic/versions/004_create_workout_log_tables.py`

**Tests I'll run:**
```bash
alembic upgrade head

# Verify tables
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "\d workout_logs"
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "\d sets"

# Test duration calculation (generated column)
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "
  INSERT INTO workout_logs (workout_id, user_id, mesocycle_id, week_number, started_at, completed_at)
  VALUES (1, 1, 1, 1, '2025-01-20 10:00:00', '2025-01-20 11:15:00');

  SELECT duration_minutes FROM workout_logs WHERE id = currval('workout_logs_id_seq');
"
# Should return 75 minutes

# Test set constraints
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "
  INSERT INTO sets (workout_log_id, exercise_id, set_number, weight, reps)
  VALUES (1, 1, 1, -10, 5);
"
# Should fail (weight must be >= 0)
```

**Success criteria:**
- workout_logs table created
- sets table created
- Duration auto-calculated
- Constraints working

---

#### 4.2 - Workout Logging Endpoints
**Files I'll create:**
1. `backend/app/schemas/workout_log.py`
2. `backend/app/routers/workout_logs.py`

**Endpoints:**
- GET /mesocycles/{id}/workouts/current
- POST /workout-logs (start workout)
- GET /workout-logs/{id}
- POST /workout-logs/{id}/sets
- PATCH /workout-logs/{id}/sets/{set_id}
- DELETE /workout-logs/{id}/sets/{set_id}
- POST /workout-logs/{id}/complete

**Tests I'll run:**
```bash
TOKEN=$(curl -X POST .../login | jq -r .data.access_token)

# Start workout
LOG_ID=$(curl -X POST "http://localhost:8000/v1/workout-logs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workout_id": 1,
    "mesocycle_id": 1,
    "week_number": 1
  }' | jq -r .data.id)

echo "Started workout log: $LOG_ID"

# Record sets
curl -X POST "http://localhost:8000/v1/workout-logs/$LOG_ID/sets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exercise_id": 1,
    "set_number": 1,
    "weight": 185.0,
    "reps": 10
  }' | jq .

curl -X POST "http://localhost:8000/v1/workout-logs/$LOG_ID/sets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exercise_id": 1,
    "set_number": 2,
    "weight": 185.0,
    "reps": 9
  }' | jq .

# Get workout log with sets
curl "http://localhost:8000/v1/workout-logs/$LOG_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Complete workout
curl -X POST "http://localhost:8000/v1/workout-logs/$LOG_ID/complete" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Great workout!"}' | jq .

# Should return duration, total sets, total volume
```

**Unit tests:**
```bash
pytest tests/test_workout_log_endpoints.py -v

# Test cases:
# - test_start_workout_log
# - test_record_set
# - test_record_multiple_sets_same_exercise
# - test_update_set
# - test_delete_set
# - test_complete_workout_calculates_stats
# - test_cannot_log_set_to_other_user_workout
# - test_get_current_workout_returns_todays_workout
```

**Success criteria:**
- Can start workout
- Can record sets
- Can complete workout
- Stats calculated correctly (duration, volume)

---

#### 4.3 - Progressive Overload Service (Basic)
**Files I'll create:**
1. `backend/app/services/progressive_overload.py`

**Functions I'll implement:**
```python
def calculate_next_weight(current_weight: float) -> float:
    """Apply 2% increase"""
    return round(current_weight * 1.02, 1)

def get_previous_performance(user_id: int, exercise_id: int, mesocycle_id: int, week_number: int) -> List[Set]:
    """Get last week's sets for this exercise"""
    pass

def suggest_next_set(exercise_id: int, previous_sets: List[Set], week_number: int, total_weeks: int) -> dict:
    """Return suggested weight and reps for next set"""
    pass

def calculate_target_rir(week_number: int, total_weeks: int) -> int:
    """RIR progression: week 1 = 3 RIR, final week = 0 RIR"""
    pass
```

**Tests I'll run:**
```bash
pytest tests/test_progressive_overload.py -v

# Test cases:
# - test_calculate_next_weight_2_percent_increase
# - test_get_previous_performance_returns_last_week_sets
# - test_suggest_next_set_first_set_of_workout
# - test_suggest_next_set_after_successful_set
# - test_suggest_next_set_after_failed_reps
# - test_calculate_target_rir_week_1_is_3
# - test_calculate_target_rir_final_week_is_0
# - test_calculate_target_rir_progresses_linearly
```

**Integration test:**
```bash
# Create workout log for week 1
# Record sets: 185 lbs x 10, 185 x 9, 185 x 8
# Complete workout

# Create workout log for week 2 (same workout)
# Get suggestion for first set
# Should suggest: 189 lbs (2% increase) x 10 reps
curl "http://localhost:8000/v1/workout-logs/$WEEK2_LOG_ID/suggestions?exercise_id=1" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Success criteria:**
- 2% weight increase calculated correctly
- Can retrieve previous week's performance
- Suggestions based on previous performance
- RIR progresses from 3 to 0

---

#### 4.4 - Active Workout Screen (Frontend)
**Files I'll create:**
1. `frontend/src/api/workoutLogs.ts`
2. `frontend/src/types/workoutLog.ts`
3. `frontend/src/pages/ActiveWorkout.tsx` (match workout_screen.png reference)
4. `frontend/src/components/SetRow.tsx`
5. `frontend/src/components/MuscleGroupSection.tsx`

**Tests I'll run:**
```bash
npm run build

# Visual tests (reference: workout_screen.png):
# 1. Start workout from mesocycle
# 2. Should show:
#    - Week and day at top
#    - Muscle group headers (QUADS, GLUTES, etc.)
#    - Exercise rows with:
#      * Exercise name
#      * Exercise type (MACHINE)
#      * Set rows with WEIGHT | REPS | LOG checkbox
# 3. Enter weight for set 1
# 4. Enter reps for set 1
# 5. Click checkbox to mark complete
# 6. Should save immediately
# 7. Next set should show suggested weight/reps
# 8. Complete all sets for exercise
# 9. Move to next exercise
# 10. Three-dot menu should show options
```

**Success criteria:**
- UI matches workout_screen.png reference
- Can log sets in real-time
- Suggestions displayed
- Auto-save on checkbox
- Muscle groups visually separated

---

### Phase 4 Checkpoint
```bash
# Backend tests
pytest tests/test_workout_log* tests/test_progressive_overload* -v

# Integration: Complete full workout
# 1. Start workout
# 2. Log 20+ sets across multiple exercises
# 3. Complete workout
# 4. Verify all data saved
# 5. Start next week's workout
# 6. Verify suggestions based on previous week

# Frontend
npm run build
npm run lint
```

**Before Phase 5:**
"Phase 4 complete. Users can log workouts with basic progressive overload. Ready for Phase 5 (Auto-Regulation)?"

---

## Phase 5: Auto-Regulation & Feedback

### Goal
Collect feedback and automatically adjust volume.

### Tasks I Will Perform

#### 5.1 - Feedback Model
**Files I'll create:**
1. `backend/app/models/muscle_group_feedback.py`
2. `backend/alembic/versions/005_create_feedback_table.py`

**Tests I'll run:**
```bash
alembic upgrade head

# Verify table
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "\d muscle_group_feedback"

# Test constraints
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "
  INSERT INTO muscle_group_feedback (workout_log_id, muscle_group, soreness_level, pump_level, challenge_level)
  VALUES (1, 'chest', 2, 3, 2);
"

# Test invalid values
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "
  INSERT INTO muscle_group_feedback (workout_log_id, muscle_group, soreness_level)
  VALUES (1, 'chest', 5);
"
# Should fail (soreness must be 0-3)

# Test unique constraint
docker-compose exec postgres psql -U metricgain -d metricgain_dev -c "
  INSERT INTO muscle_group_feedback (workout_log_id, muscle_group, soreness_level)
  VALUES (1, 'chest', 2);
"
# Should fail (duplicate workout_log + muscle_group)
```

**Success criteria:**
- Feedback table created
- Constraints enforced (0-3 range)
- Unique constraint working

---

#### 5.2 - Auto-Regulation Service
**Files I'll create:**
1. `backend/app/services/auto_regulation.py`

**Functions I'll implement:**
```python
def calculate_set_adjustment(soreness: int, pump: int, challenge: int) -> int:
    """
    Calculate how many sets to add/remove based on feedback.
    Returns: -1, 0, +1, or +2

    Logic (simple v1):
    - Still sore (3) → -1 set
    - No pump (0) + easy (0) → -1 set
    - Good pump (2) + good challenge (1) + recovered just in time (2) → +1 set
    - Amazing pump (3) + very difficult (3) → 0 sets (already maxed out)
    - etc.
    """
    pass

def apply_volume_adjustment(current_sets: int, adjustment: int, max_sets: int = 15) -> int:
    """Apply adjustment respecting constraints"""
    new_sets = current_sets + adjustment
    return max(1, min(new_sets, max_sets))

def get_next_week_sets(workout_id: int, exercise_id: int, current_week: int) -> int:
    """Get recommended sets for next week based on feedback"""
    pass
```

**Tests I'll run:**
```bash
pytest tests/test_auto_regulation.py -v

# Test cases:
# - test_calculate_adjustment_still_sore_reduces_volume
# - test_calculate_adjustment_no_pump_easy_reduces_volume
# - test_calculate_adjustment_good_response_increases_volume
# - test_calculate_adjustment_amazing_pump_very_hard_maintains
# - test_apply_volume_adjustment_respects_minimum_1_set
# - test_apply_volume_adjustment_respects_maximum_15_sets
# - test_apply_volume_adjustment_clamps_to_range
# - test_get_next_week_sets_integrates_feedback
```

**Integration test:**
```bash
# Week 1: Complete chest workout with 4 sets per exercise
# Submit feedback: soreness=2, pump=3, challenge=2
# Week 2: Check suggested sets
# Should be: 5 sets (added 1 based on good feedback)

curl "http://localhost:8000/v1/workouts/$WORKOUT_ID/exercises" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | {exercise_name, target_sets}'

# Should show increased sets for chest exercises
```

**Success criteria:**
- Set adjustment algorithm works
- Respects min/max constraints (1-15 sets)
- Feedback influences next week's volume

---

#### 5.3 - Feedback Endpoints
**Files I'll create:**
1. `backend/app/schemas/feedback.py`
2. Add endpoints to `backend/app/routers/workout_logs.py`:
   - POST /workout-logs/{id}/feedback/soreness
   - POST /workout-logs/{id}/feedback/performance

**Tests I'll run:**
```bash
TOKEN=$(curl -X POST .../login | jq -r .data.access_token)
LOG_ID=1

# Record soreness before chest exercises
curl -X POST "http://localhost:8000/v1/workout-logs/$LOG_ID/feedback/soreness" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "muscle_group": "chest",
    "soreness_level": 2
  }' | jq .

# After completing chest, record performance
curl -X POST "http://localhost:8000/v1/workout-logs/$LOG_ID/feedback/performance" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "muscle_group": "chest",
    "pump_level": 3,
    "challenge_level": 2
  }' | jq .

# Should return adjustment recommendation

# Try invalid values
curl -X POST "http://localhost:8000/v1/workout-logs/$LOG_ID/feedback/performance" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "muscle_group": "chest",
    "pump_level": 5
  }' | jq .
# Should fail validation
```

**Unit tests:**
```bash
pytest tests/test_feedback_endpoints.py -v

# Test cases:
# - test_record_soreness_feedback
# - test_record_performance_feedback
# - test_feedback_validates_0_to_3_range
# - test_feedback_returns_adjustment_recommendation
# - test_cannot_duplicate_feedback_for_same_muscle_group
# - test_feedback_affects_next_week_workout
```

**Success criteria:**
- Can record soreness feedback
- Can record performance feedback
- Validation enforced (0-3)
- Adjustments applied to next week

---

#### 5.4 - Feedback UI Components
**Files I'll create:**
1. `frontend/src/components/SorenessFeedback.tsx`
2. `frontend/src/components/PerformanceFeedback.tsx`
3. Update `frontend/src/pages/ActiveWorkout.tsx` to show feedback modals

**Tests I'll run:**
```bash
# Visual tests:
# 1. Start workout
# 2. Before first chest exercise, modal appears:
#    "When did you recover from your last Chest workout?"
#    Options: [Didn't get sore] [Recovered a while ago] [Recovered just in time] [Still sore]
# 3. Select option
# 4. Complete all chest exercises
# 5. After last chest exercise, modal appears:
#    "How was your pump?" [No pump] [Light pump] [Good pump] [Amazing pump]
#    "How challenging was it?" [Easy] [Good] [Difficult] [Very difficult]
# 6. Select options
# 7. See confirmation or adjustment info
# 8. Move to next muscle group
# 9. Repeat feedback flow

# Test data persistence:
# 10. Refresh page mid-workout
# 11. Feedback should be saved
```

**Success criteria:**
- Soreness modal shows before muscle group
- Performance modal shows after muscle group
- All 4 options displayed for each feedback type
- Data saved correctly (0-3)
- UI matches dark theme

---

### Phase 5 Checkpoint
```bash
# Backend tests
pytest tests/test_auto_regulation* tests/test_feedback* -v

# Integration: Complete workout with feedback
# 1. Start workout
# 2. Record soreness before each muscle group
# 3. Complete all exercises
# 4. Record pump/challenge after each muscle group
# 5. Complete workout
# 6. Check next week's workout
# 7. Verify sets adjusted based on feedback

# Frontend
npm run build
npm run lint
```

**Before Phase 6:**
"Phase 5 complete. Auto-regulation system working. Ready for Phase 6 (Deload & Mesocycle Transitions)?"

---

## Phases 6-10 Summary

I will continue with the same detailed approach for:

**Phase 6: Deload Week & Mesocycle Transition**
- Implement automatic deload (50% weight, 50% sets)
- Mesocycle copying from specific week
- Volume reduction when starting new mesocycle

**Phase 7: Templates**
- Seed 5 pre-built templates
- Template application flow
- Save custom templates

**Phase 8: PWA & Offline Support**
- Service worker configuration
- IndexedDB for offline storage
- Sync queue for offline mutations
- Installable app

**Phase 9: Polish & Testing**
- Match all UI to reference images
- Complete test coverage (80%+)
- Performance optimization
- Security audit

**Phase 10: Deployment**
- Deploy backend to Railway
- Deploy frontend to Vercel
- Configure production database
- DNS and SSL setup

---

## Testing Philosophy

**For every feature I implement, I will:**

1. **Write the code** (models, endpoints, services, UI)
2. **Run unit tests** (pytest for backend, vitest for frontend)
3. **Run integration tests** (curl commands, API flows)
4. **Test manually** (UI interactions, user flows)
5. **Verify success criteria** (all tests pass, feature works end-to-end)
6. **Only proceed if all tests pass**

**If tests fail:**
- I will debug and fix the issue
- I will re-run tests until they pass
- I will not move to next phase with failing tests

---

## Communication with User

**After each phase, I will:**
1. Report completion status
2. Show test results
3. Demonstrate working feature (if applicable)
4. Ask permission to proceed to next phase

**During implementation:**
- I will explain what I'm building
- I will show important code snippets
- I will report any issues encountered
- I will ask for clarification if requirements are unclear

---

## Ready to Start?

I am ready to begin implementation starting with **Phase 0: Project Setup**.

**First, I need to confirm:**
1. **Working directory**: Should I create the project at `/Users/nbrawand/projects/personal/metric_gain/`?
2. **Start immediately**: May I begin Phase 0 now, or would you like to review/modify this plan first?

Once you confirm, I will:
1. Create the complete project structure
2. Set up backend (FastAPI)
3. Set up frontend (React + TypeScript)
4. Set up database (PostgreSQL via Docker)
5. Run all Phase 0 tests
6. Report results and ask permission to proceed to Phase 1

Ready when you are!
