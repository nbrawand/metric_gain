# Database Schema

## Overview

PostgreSQL database design for the Workout PWA. Designed for:
- Efficient querying of workout data
- Support for ML analytics
- Scalability to millions of records
- Data integrity through foreign keys and constraints

## Entity Relationship Diagram

```
┌─────────────┐
│    users    │
└──────┬──────┘
       │ 1
       │
       │ *
┌──────┴───────────┐
│   mesocycles     │
└──────┬───────────┘
       │ 1
       │
       │ *
┌──────┴───────────┐       ┌────────────────────┐
│   workouts       │───────│  workout_exercises │
└──────┬───────────┘   *   └─────────┬──────────┘
       │ 1                            │ *
       │                              │ 1
       │ *                   ┌────────┴──────────┐
┌──────┴───────────┐         │    exercises      │
│  workout_logs    │         └───────────────────┘
└──────┬───────────┘
       │ 1
       │
       │ *
┌──────┴───────────┐
│      sets        │
└──────────────────┘

┌──────────────────┐
│ muscle_group_    │
│   feedback       │
└──────────────────┘

┌──────────────────┐
│   templates      │
└──────────────────┘
```

## Tables

### 1. users

Stores user account information.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Future fields
    timezone VARCHAR(50) DEFAULT 'UTC',
    preferences JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

**Columns:**
- `id`: Primary key
- `email`: User login email (unique)
- `password_hash`: Hashed password (bcrypt/argon2)
- `full_name`: User's display name
- `created_at`: Account creation timestamp
- `updated_at`: Last profile update
- `last_login`: Last login timestamp
- `is_active`: Soft delete flag
- `timezone`: User's timezone for workout scheduling
- `preferences`: JSON object for user settings (theme, units, etc.)

---

### 2. mesocycles

Stores mesocycle (training block) information.

```sql
CREATE TABLE mesocycles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Duration
    duration_weeks INTEGER NOT NULL CHECK (duration_weeks BETWEEN 3 AND 7),
    current_week INTEGER DEFAULT 1,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active',  -- active, completed, archived

    -- Dates
    start_date DATE,
    end_date DATE,

    -- Configuration
    days_per_week INTEGER NOT NULL,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Lineage (for tracking mesocycle progression)
    parent_mesocycle_id INTEGER REFERENCES mesocycles(id),
    copied_from_week INTEGER,  -- Which week of parent was used to start this meso

    CONSTRAINT check_weeks CHECK (current_week <= duration_weeks)
);

CREATE INDEX idx_mesocycles_user_id ON mesocycles(user_id);
CREATE INDEX idx_mesocycles_status ON mesocycles(status);
CREATE INDEX idx_mesocycles_created_at ON mesocycles(created_at DESC);
CREATE INDEX idx_mesocycles_parent ON mesocycles(parent_mesocycle_id);
```

**Columns:**
- `id`: Primary key
- `user_id`: Foreign key to users table
- `name`: Mesocycle name (e.g., "Push Pull Legs - Jan 2025")
- `description`: Optional notes
- `duration_weeks`: Total weeks (3-7, includes deload)
- `current_week`: Which week user is currently on
- `status`: active, completed, archived
- `start_date`: When mesocycle started
- `end_date`: When mesocycle ends/ended
- `days_per_week`: Training frequency (e.g., 3, 6)
- `parent_mesocycle_id`: If copied from another mesocycle
- `copied_from_week`: Which week of parent used as template

---

### 3. workouts

Stores workout templates within a mesocycle (e.g., "Push Day", "Pull Day").

```sql
CREATE TABLE workouts (
    id SERIAL PRIMARY KEY,
    mesocycle_id INTEGER NOT NULL REFERENCES mesocycles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Scheduling
    day_of_week INTEGER,  -- 0=Monday, 6=Sunday (NULL if not scheduled)
    position_in_week INTEGER,  -- For ordering workouts (1, 2, 3...)

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workouts_mesocycle_id ON workouts(mesocycle_id);
CREATE INDEX idx_workouts_day_of_week ON workouts(day_of_week);
```

**Columns:**
- `id`: Primary key
- `mesocycle_id`: Foreign key to mesocycles
- `name`: Workout name (e.g., "Push", "Pull", "Legs")
- `day_of_week`: 0-6 for Mon-Sun (nullable)
- `position_in_week`: Order of workouts in the week

---

### 4. exercises

Master exercise library (shared across all users + user-specific).

```sql
CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Categorization
    muscle_group VARCHAR(50) NOT NULL,  -- chest, back, legs, shoulders, delts, bis, tris, calfs, abs
    exercise_type VARCHAR(50) NOT NULL,  -- freeweight, machine, bodyweight, cable

    -- Ownership
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- NULL = system exercise, NOT NULL = custom user exercise
    is_system BOOLEAN DEFAULT FALSE,  -- System exercises can't be modified

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Future: video/image URLs
    media_url VARCHAR(500),

    CONSTRAINT check_muscle_group CHECK (muscle_group IN ('chest', 'back', 'legs', 'shoulders', 'delts', 'bis', 'tris', 'calfs', 'abs')),
    CONSTRAINT check_exercise_type CHECK (exercise_type IN ('freeweight', 'machine', 'bodyweight', 'cable'))
);

CREATE INDEX idx_exercises_muscle_group ON exercises(muscle_group);
CREATE INDEX idx_exercises_user_id ON exercises(user_id);
CREATE INDEX idx_exercises_name ON exercises(name);
CREATE UNIQUE INDEX idx_exercises_system_name ON exercises(name) WHERE is_system = TRUE;
```

**Columns:**
- `id`: Primary key
- `name`: Exercise name (e.g., "Barbell Bench Press")
- `muscle_group`: One of the 9 predefined groups
- `exercise_type`: Equipment type
- `user_id`: NULL for system exercises, user ID for custom
- `is_system`: TRUE for pre-loaded exercises

---

### 5. workout_exercises

Junction table linking exercises to workouts with configuration.

```sql
CREATE TABLE workout_exercises (
    id SERIAL PRIMARY KEY,
    workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,

    -- Exercise configuration for this workout
    position INTEGER NOT NULL,  -- Order of exercise in workout
    target_sets INTEGER NOT NULL DEFAULT 3,
    target_reps_min INTEGER,
    target_reps_max INTEGER,
    target_weight DECIMAL(6, 2),  -- Starting weight suggestion
    target_rir INTEGER,  -- Target reps in reserve

    -- Notes
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_workout_exercise UNIQUE(workout_id, exercise_id),
    CONSTRAINT check_target_sets CHECK (target_sets <= 15)
);

CREATE INDEX idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);
CREATE INDEX idx_workout_exercises_position ON workout_exercises(workout_id, position);
```

**Columns:**
- `id`: Primary key
- `workout_id`: Foreign key to workouts
- `exercise_id`: Foreign key to exercises
- `position`: Order in workout (1, 2, 3...)
- `target_sets`: Number of sets planned
- `target_reps_min/max`: Rep range (e.g., 8-12)
- `target_weight`: Suggested starting weight
- `target_rir`: Recommended RIR

---

### 6. workout_logs

Tracks actual workout sessions (when user performs a workout).

```sql
CREATE TABLE workout_logs (
    id SERIAL PRIMARY KEY,
    workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mesocycle_id INTEGER NOT NULL REFERENCES mesocycles(id) ON DELETE CASCADE,

    -- When this workout was performed
    week_number INTEGER NOT NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress',  -- in_progress, completed, skipped

    -- Duration
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (completed_at - started_at)) / 60
    ) STORED,

    -- Notes
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workout_logs_user_id ON workout_logs(user_id);
CREATE INDEX idx_workout_logs_workout_id ON workout_logs(workout_id);
CREATE INDEX idx_workout_logs_mesocycle_id ON workout_logs(mesocycle_id);
CREATE INDEX idx_workout_logs_performed_at ON workout_logs(performed_at DESC);
CREATE INDEX idx_workout_logs_week_number ON workout_logs(mesocycle_id, week_number);
```

**Columns:**
- `id`: Primary key
- `workout_id`: Which workout template was used
- `user_id`: Who performed it
- `mesocycle_id`: Which mesocycle it belongs to
- `week_number`: Which week of the mesocycle (1-7)
- `performed_at`: When workout happened
- `status`: in_progress, completed, skipped
- `duration_minutes`: Auto-calculated workout duration

---

### 7. sets

Records actual sets performed during workouts.

```sql
CREATE TABLE sets (
    id SERIAL PRIMARY KEY,
    workout_log_id INTEGER NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,

    -- Performance data
    set_number INTEGER NOT NULL,
    weight DECIMAL(6, 2) NOT NULL,
    reps INTEGER NOT NULL,

    -- Metadata
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Future: video form check
    video_url VARCHAR(500),

    CONSTRAINT check_reps CHECK (reps >= 0),
    CONSTRAINT check_weight CHECK (weight >= 0)
);

CREATE INDEX idx_sets_workout_log_id ON sets(workout_log_id);
CREATE INDEX idx_sets_exercise_id ON sets(exercise_id);
CREATE INDEX idx_sets_performed_at ON sets(performed_at DESC);

-- Index for analytics queries (finding user's history with an exercise)
CREATE INDEX idx_sets_user_exercise_time ON sets(exercise_id, performed_at DESC);
```

**Columns:**
- `id`: Primary key
- `workout_log_id`: Foreign key to workout_logs
- `exercise_id`: Which exercise
- `set_number`: 1, 2, 3... within the workout
- `weight`: Weight used (lbs or kg)
- `reps`: Reps completed
- `performed_at`: Timestamp of set completion

---

### 8. muscle_group_feedback

Stores soreness, pump, and challenge feedback per muscle group per workout.

```sql
CREATE TABLE muscle_group_feedback (
    id SERIAL PRIMARY KEY,
    workout_log_id INTEGER NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
    muscle_group VARCHAR(50) NOT NULL,

    -- Soreness feedback (asked BEFORE muscle group)
    soreness_level INTEGER CHECK (soreness_level BETWEEN 0 AND 3),
    -- 0: Didn't get sore
    -- 1: Recovered a while ago
    -- 2: Recovered just in time
    -- 3: Still sore

    -- Performance feedback (asked AFTER muscle group)
    pump_level INTEGER CHECK (pump_level BETWEEN 0 AND 3),
    -- 0: No pump
    -- 1: Light pump
    -- 2: Good pump
    -- 3: Amazing pump

    challenge_level INTEGER CHECK (challenge_level BETWEEN 0 AND 3),
    -- 0: Easy
    -- 1: Good
    -- 2: Difficult
    -- 3: Very difficult

    -- Timestamps
    soreness_recorded_at TIMESTAMP WITH TIME ZONE,
    performance_recorded_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_muscle_group CHECK (muscle_group IN ('chest', 'back', 'legs', 'shoulders', 'delts', 'bis', 'tris', 'calfs', 'abs')),
    CONSTRAINT unique_workout_muscle_feedback UNIQUE(workout_log_id, muscle_group)
);

CREATE INDEX idx_muscle_feedback_workout_log ON muscle_group_feedback(workout_log_id);
CREATE INDEX idx_muscle_feedback_muscle_group ON muscle_group_feedback(muscle_group);
```

**Columns:**
- `id`: Primary key
- `workout_log_id`: Which workout session
- `muscle_group`: Which muscle group (chest, back, etc.)
- `soreness_level`: 0-3 (asked before muscle group)
- `pump_level`: 0-3 (asked after muscle group)
- `challenge_level`: 0-3 (asked after muscle group)

---

### 9. templates

Pre-built mesocycle templates that users can copy.

```sql
CREATE TABLE templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Template type
    is_system BOOLEAN DEFAULT FALSE,  -- System templates vs user-created
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- NULL for system templates

    -- Configuration (JSON to allow flexibility)
    config JSONB NOT NULL,
    -- Example config structure:
    -- {
    --   "duration_weeks": 5,
    --   "days_per_week": 6,
    --   "workouts": [
    --     {
    --       "name": "Push",
    --       "day_of_week": 0,
    --       "exercises": [
    --         {
    --           "exercise_id": 1,
    --           "target_sets": 3,
    --           "target_reps_min": 8,
    --           "target_reps_max": 12
    --         }
    --       ]
    --     }
    --   ]
    -- }

    -- Popularity
    times_used INTEGER DEFAULT 0,

    -- Tags for filtering
    tags TEXT[],

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_is_system ON templates(is_system);
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_times_used ON templates(times_used DESC);
CREATE INDEX idx_templates_tags ON templates USING GIN(tags);
```

**Columns:**
- `id`: Primary key
- `name`: Template name (e.g., "PPL 6-Day Split")
- `description`: What the template is for
- `is_system`: TRUE for pre-loaded templates
- `user_id`: NULL for system, user ID for custom
- `config`: JSON configuration for mesocycle structure
- `times_used`: Popularity counter
- `tags`: Array of tags (beginner, advanced, hypertrophy, etc.)

---

## Calculated Metrics (Views or Application Logic)

### Volume Calculation

```sql
-- Total volume for a workout
SELECT
    SUM(weight * reps) as total_volume
FROM sets
WHERE workout_log_id = ?;

-- Total volume for a muscle group in a workout
SELECT
    SUM(s.weight * s.reps) as total_volume
FROM sets s
JOIN exercises e ON s.exercise_id = e.id
WHERE s.workout_log_id = ? AND e.muscle_group = ?;

-- Volume progression across weeks
SELECT
    wl.week_number,
    e.muscle_group,
    SUM(s.weight * s.reps) as weekly_volume
FROM sets s
JOIN workout_logs wl ON s.workout_log_id = wl.id
JOIN exercises e ON s.exercise_id = e.id
WHERE wl.mesocycle_id = ?
GROUP BY wl.week_number, e.muscle_group
ORDER BY wl.week_number, e.muscle_group;
```

### Progressive Overload Tracking

```sql
-- Get previous week's performance for an exercise
SELECT
    weight,
    reps,
    set_number
FROM sets s
JOIN workout_logs wl ON s.workout_log_id = wl.id
WHERE wl.mesocycle_id = ?
  AND wl.week_number = ? - 1
  AND s.exercise_id = ?
ORDER BY set_number;

-- Get user's best performance for an exercise
SELECT
    MAX(weight) as max_weight,
    MAX(reps) as max_reps,
    MAX(weight * reps) as max_volume
FROM sets
WHERE exercise_id = ?
  AND workout_log_id IN (
    SELECT id FROM workout_logs WHERE user_id = ?
  );
```

### Auto-Regulation Analysis

```sql
-- Get feedback history for a muscle group
SELECT
    wl.week_number,
    mgf.soreness_level,
    mgf.pump_level,
    mgf.challenge_level,
    COUNT(DISTINCT s.id) as total_sets
FROM muscle_group_feedback mgf
JOIN workout_logs wl ON mgf.workout_log_id = wl.id
JOIN sets s ON s.workout_log_id = wl.id
JOIN exercises e ON s.exercise_id = e.id AND e.muscle_group = mgf.muscle_group
WHERE wl.mesocycle_id = ?
  AND mgf.muscle_group = ?
GROUP BY wl.week_number, mgf.soreness_level, mgf.pump_level, mgf.challenge_level
ORDER BY wl.week_number;
```

---

## Data Integrity Rules

### Foreign Key Cascade Behavior

- **User deletion**: CASCADE - deletes all user data
- **Mesocycle deletion**: CASCADE - deletes all workouts and logs
- **Workout deletion**: CASCADE - deletes all logs and sets
- **Exercise deletion**: CASCADE - deletes references (careful with system exercises)

### Constraints

1. **Mesocycle duration**: 3-7 weeks
2. **Current week**: Cannot exceed duration_weeks
3. **Sets per exercise**: Maximum 15
4. **Feedback levels**: 0-3 range
5. **Muscle groups**: Enum constraint (9 fixed groups)
6. **Exercise types**: Enum constraint (4 types)
7. **Weights and reps**: Must be >= 0

### Unique Constraints

- `users.email`: One email per account
- `workout_exercises(workout_id, exercise_id)`: No duplicate exercises in workout
- `muscle_group_feedback(workout_log_id, muscle_group)`: One feedback per muscle group per workout

---

## Indexing Strategy

### Primary Indexes (created automatically)
- All `id` columns (primary keys)

### Foreign Key Indexes
- User lookups: `mesocycles(user_id)`, `workout_logs(user_id)`
- Mesocycle lookups: `workouts(mesocycle_id)`, `workout_logs(mesocycle_id)`
- Workout lookups: `workout_logs(workout_id)`, `sets(workout_log_id)`
- Exercise lookups: `sets(exercise_id)`, `workout_exercises(exercise_id)`

### Query Optimization Indexes
- **Time-series queries**: `workout_logs(performed_at DESC)`, `sets(performed_at DESC)`
- **Status filtering**: `mesocycles(status)`, `workout_logs(status)`
- **User exercise history**: Composite index on `(exercise_id, performed_at)`
- **Muscle group filtering**: `exercises(muscle_group)`, `muscle_group_feedback(muscle_group)`

### Full-Text Search Indexes (future)
```sql
-- For searching exercises
CREATE INDEX idx_exercises_name_trgm ON exercises USING GIN (name gin_trgm_ops);
```

---

## Sample Data

### System Exercises (Seed Data)

```sql
-- Chest exercises
INSERT INTO exercises (name, muscle_group, exercise_type, is_system) VALUES
('Barbell Bench Press', 'chest', 'freeweight', TRUE),
('Dumbbell Bench Press', 'chest', 'freeweight', TRUE),
('Incline Dumbbell Press', 'chest', 'freeweight', TRUE),
('Cable Fly', 'chest', 'cable', TRUE),
('Chest Press Machine', 'chest', 'machine', TRUE),
('Push-ups', 'chest', 'bodyweight', TRUE);

-- Back exercises
INSERT INTO exercises (name, muscle_group, exercise_type, is_system) VALUES
('Barbell Row', 'back', 'freeweight', TRUE),
('Pull-ups', 'back', 'bodyweight', TRUE),
('Lat Pulldown', 'back', 'cable', TRUE),
('Dumbbell Row', 'back', 'freeweight', TRUE),
('Seated Cable Row', 'back', 'cable', TRUE),
('T-Bar Row', 'back', 'machine', TRUE);

-- Continue for all muscle groups...
```

---

## Migration Strategy

### Initial Migration (Alembic)

```python
# alembic/versions/001_initial_schema.py

def upgrade():
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        # ... all columns
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )

    # Create mesocycles table
    # Create workouts table
    # Create exercises table
    # Create workout_exercises table
    # Create workout_logs table
    # Create sets table
    # Create muscle_group_feedback table
    # Create templates table

    # Create indexes
    op.create_index('idx_users_email', 'users', ['email'])
    # ... all indexes

    # Seed system exercises
    # ...

def downgrade():
    # Drop all tables in reverse order
    pass
```

---

## Analytics Queries (for ML)

### User Performance Over Time

```sql
SELECT
    u.id as user_id,
    e.id as exercise_id,
    e.name as exercise_name,
    e.muscle_group,
    wl.week_number,
    wl.performed_at,
    s.set_number,
    s.weight,
    s.reps,
    s.weight * s.reps as volume,
    mgf.soreness_level,
    mgf.pump_level,
    mgf.challenge_level
FROM sets s
JOIN workout_logs wl ON s.workout_log_id = wl.id
JOIN users u ON wl.user_id = u.id
JOIN exercises e ON s.exercise_id = e.id
LEFT JOIN muscle_group_feedback mgf ON mgf.workout_log_id = wl.id AND mgf.muscle_group = e.muscle_group
WHERE u.id = ?
ORDER BY wl.performed_at DESC, s.performed_at;
```

### Volume Trends

```sql
SELECT
    date_trunc('week', wl.performed_at) as week,
    e.muscle_group,
    COUNT(DISTINCT wl.id) as workouts_count,
    COUNT(s.id) as total_sets,
    SUM(s.weight * s.reps) as total_volume,
    AVG(s.weight) as avg_weight,
    AVG(s.reps) as avg_reps
FROM sets s
JOIN workout_logs wl ON s.workout_log_id = wl.id
JOIN exercises e ON s.exercise_id = e.id
WHERE wl.user_id = ?
  AND wl.performed_at >= NOW() - INTERVAL '6 months'
GROUP BY week, e.muscle_group
ORDER BY week DESC, e.muscle_group;
```

### Feedback Correlation

```sql
SELECT
    mgf.muscle_group,
    mgf.soreness_level,
    mgf.pump_level,
    mgf.challenge_level,
    COUNT(*) as occurrences,
    AVG(next_workout_sets) as avg_next_sets
FROM muscle_group_feedback mgf
JOIN LATERAL (
    SELECT COUNT(DISTINCT s.id) as next_workout_sets
    FROM sets s
    JOIN workout_logs wl ON s.workout_log_id = wl.id
    JOIN exercises e ON s.exercise_id = e.id
    WHERE wl.mesocycle_id = mgf.mesocycle_id
      AND wl.week_number = mgf.week_number + 1
      AND e.muscle_group = mgf.muscle_group
) next_data ON TRUE
GROUP BY mgf.muscle_group, mgf.soreness_level, mgf.pump_level, mgf.challenge_level;
```

---

## Database Backup Strategy

### Automated Backups
- **Frequency**: Daily (Supabase automatic)
- **Retention**: 30 days
- **Point-in-time recovery**: Last 7 days

### Manual Backups (before major changes)
```bash
pg_dump -h hostname -U username -d metricgain > backup_$(date +%Y%m%d).sql
```

---

## Performance Considerations

### Expected Data Growth

**Per User Per Year:**
- Mesocycles: ~10
- Workouts: ~60 (6 per mesocycle)
- Workout Logs: ~300 (assume 6 days/week × 50 weeks)
- Sets: ~9,000 (assume 30 sets per workout × 300 workouts)
- Muscle Group Feedback: ~1,800 (assume 6 muscle groups × 300 workouts)

**1,000 Users:**
- Sets: 9 million rows/year
- Workout Logs: 300k rows/year
- Muscle Group Feedback: 1.8 million rows/year

**Storage:** ~1-2 GB per 1,000 users per year (with indexes)

### Query Optimization Tips

1. **Use EXPLAIN ANALYZE** for slow queries
2. **Paginate** large result sets
3. **Denormalize** if needed (e.g., store calculated volume)
4. **Partition** sets table by date (when > 10M rows)
5. **Archive** old mesocycles (> 1 year) to separate table

---

## Next Steps

1. Set up PostgreSQL database (locally or Supabase)
2. Create Alembic migration for schema
3. Seed system exercises
4. Create SQLAlchemy models matching this schema
5. Write database access layer (repositories)
6. Add database tests
